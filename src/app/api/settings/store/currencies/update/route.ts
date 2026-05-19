// FILE: apps/merchant/src/app/api/settings/store/currencies/update/route.ts

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type CurrencyPayload = {
  currency_code?: string;
  code?: string;
  name_ar?: string;
  name_en?: string;
  symbol?: string;
  decimal_digits?: number;
  is_enabled?: boolean;
  is_default?: boolean;
  sort_order?: number;
  metadata?: Record<string, any> | null;
  rate_to_default?: number;
  exchange_rate?: number;
  rate?: number;
};

type NormalizedCurrencyRow = {
  store_id: string;
  currency_code: string;
  name_ar: string;
  name_en: string;
  symbol: string;
  decimal_digits: number;
  is_enabled: boolean;
  is_default: boolean;
  sort_order: number;
  metadata: Record<string, any>;
};

const CURRENCY_CATALOG = [
  {
    code: "SAR",
    name_ar: "ريال سعودي",
    name_en: "Saudi Riyal",
    symbol: "ر.س",
    decimal_digits: 2,
  },
  {
    code: "AED",
    name_ar: "درهم إماراتي",
    name_en: "UAE Dirham",
    symbol: "د.إ",
    decimal_digits: 2,
  },
  {
    code: "USD",
    name_ar: "دولار أمريكي",
    name_en: "US Dollar",
    symbol: "$",
    decimal_digits: 2,
  },
  {
    code: "EUR",
    name_ar: "يورو",
    name_en: "Euro",
    symbol: "€",
    decimal_digits: 2,
  },
  {
    code: "KWD",
    name_ar: "دينار كويتي",
    name_en: "Kuwaiti Dinar",
    symbol: "د.ك",
    decimal_digits: 3,
  },
  {
    code: "BHD",
    name_ar: "دينار بحريني",
    name_en: "Bahraini Dinar",
    symbol: "د.ب",
    decimal_digits: 3,
  },
  {
    code: "OMR",
    name_ar: "ريال عماني",
    name_en: "Omani Rial",
    symbol: "ر.ع",
    decimal_digits: 3,
  },
  {
    code: "QAR",
    name_ar: "ريال قطري",
    name_en: "Qatari Riyal",
    symbol: "ر.ق",
    decimal_digits: 2,
  },
  {
    code: "YER",
    name_ar: "ريال يمني",
    name_en: "Yemeni Rial",
    symbol: "ر.ي",
    decimal_digits: 2,
  },
  {
    code: "EGP",
    name_ar: "جنيه مصري",
    name_en: "Egyptian Pound",
    symbol: "ج.م",
    decimal_digits: 2,
  },
  {
    code: "JOD",
    name_ar: "دينار أردني",
    name_en: "Jordanian Dinar",
    symbol: "د.أ",
    decimal_digits: 3,
  },
  {
    code: "GBP",
    name_ar: "جنيه إسترليني",
    name_en: "British Pound",
    symbol: "£",
    decimal_digits: 2,
  },
  {
    code: "CAD",
    name_ar: "دولار كندي",
    name_en: "Canadian Dollar",
    symbol: "CA$",
    decimal_digits: 2,
  },
  {
    code: "AUD",
    name_ar: "دولار أسترالي",
    name_en: "Australian Dollar",
    symbol: "A$",
    decimal_digits: 2,
  },
  {
    code: "CNY",
    name_ar: "يوان صيني",
    name_en: "Chinese Yuan",
    symbol: "¥",
    decimal_digits: 2,
  },
];

function s(x: unknown) {
  return String(x ?? "").trim();
}

function cleanCurrencyCode(x: unknown) {
  const code = s(x).toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : "";
}

function toBool(x: unknown, fallback = false) {
  return typeof x === "boolean" ? x : fallback;
}

function toInt(x: unknown, fallback = 0) {
  const n = Number(x ?? fallback);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

function safeObject(value: any): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      //
    }
  }

  return {};
}

function positiveRate(value: unknown, fallback = 1) {
  const next = Number(value ?? fallback);
  return Number.isFinite(next) && next > 0 ? next : fallback;
}

function readRateFromPayload(row: CurrencyPayload, fallback = 1) {
  const metadata = safeObject(row.metadata);

  return positiveRate(
    row.rate_to_default ??
      row.exchange_rate ??
      row.rate ??
      metadata.rate_to_default ??
      metadata.exchange_rate ??
      metadata.exchangeRate ??
      metadata.rate ??
      metadata.conversion_rate ??
      metadata.conversionRate,
    fallback,
  );
}

function buildRateMetadata(metadataInput: any, rate: number) {
  const metadata = safeObject(metadataInput);

  return {
    ...metadata,
    rate_to_default: rate,
    exchange_rate: rate,
    rate,
  };
}

async function resolveStoreId() {
  const sb = await supabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user?.id) return null;

  const { data } = await sb
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", user.id)
    .single();

  return data?.store_id ? String(data.store_id) : null;
}

function catalogByCode(code: string) {
  return CURRENCY_CATALOG.find((x) => x.code === code);
}

function normalizeCurrencyRow(
  storeId: string,
  row: CurrencyPayload,
  index: number,
): NormalizedCurrencyRow | null {
  const code = cleanCurrencyCode(row.currency_code ?? row.code);
  if (!code) return null;

  const catalog = catalogByCode(code);

  const decimalDigitsRaw = toInt(
    row.decimal_digits,
    catalog?.decimal_digits ?? 2,
  );
  const decimalDigits = Math.min(Math.max(decimalDigitsRaw, 0), 4);

  const rate = readRateFromPayload(row, 1);

  return {
    store_id: storeId,
    currency_code: code,
    name_ar: s(row.name_ar) || catalog?.name_ar || code,
    name_en: s(row.name_en) || catalog?.name_en || code,
    symbol: s(row.symbol) || catalog?.symbol || code,
    decimal_digits: decimalDigits,
    is_enabled: toBool(row.is_enabled, true),
    is_default: toBool(row.is_default, false),
    sort_order: toInt(row.sort_order, index),
    metadata: buildRateMetadata(row.metadata, rate),
  };
}

export async function PATCH(req: Request) {
  try {
    const storeId = await resolveStoreId();

    if (!storeId) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const admin = supabaseAdmin();

    const { data: store, error: storeError } = await admin
      .from("stores")
      .select("id, default_currency")
      .eq("id", storeId)
      .single();

    if (storeError) throw new Error(storeError.message);

    const currentDefault = cleanCurrencyCode(store?.default_currency) || "SAR";
    const requestedDefault =
      cleanCurrencyCode(body?.defaultCurrency) || currentDefault;

    const { count: ordersCount, error: ordersError } = await admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .neq("status", "draft");

    if (ordersError) throw new Error(ordersError.message);

    if (requestedDefault !== currentDefault && Number(ordersCount ?? 0) > 0) {
      return NextResponse.json(
        {
          error: "لا يمكن تغيير عملة المتجر الأساسية بعد وجود طلبات شراء.",
        },
        { status: 409 },
      );
    }

    const incoming = Array.isArray(body?.currencies) ? body.currencies : [];

    const normalized = incoming
      .map((row: CurrencyPayload, index: number) =>
        normalizeCurrencyRow(storeId, row, index),
      )
      .filter(Boolean) as NormalizedCurrencyRow[];

    const rowsMap = new Map<string, NormalizedCurrencyRow>();

    for (const row of normalized) {
      rowsMap.set(row.currency_code, row);
    }

    if (!rowsMap.has(requestedDefault)) {
      const catalog = catalogByCode(requestedDefault);

      rowsMap.set(requestedDefault, {
        store_id: storeId,
        currency_code: requestedDefault,
        name_ar: catalog?.name_ar || requestedDefault,
        name_en: catalog?.name_en || requestedDefault,
        symbol: catalog?.symbol || requestedDefault,
        decimal_digits: catalog?.decimal_digits ?? 2,
        is_enabled: true,
        is_default: true,
        sort_order: 0,
        metadata: {
          rate_to_default: 1,
          exchange_rate: 1,
          rate: 1,
        },
      });
    }

    const finalRows = Array.from(rowsMap.values()).map((row, index) => {
      const isDefault = row.currency_code === requestedDefault;
      const rate = isDefault ? 1 : positiveRate(row.metadata.rate_to_default, 1);

      return {
        ...row,
        is_enabled: isDefault ? true : row.is_enabled,
        is_default: isDefault,
        sort_order: Number.isFinite(Number(row.sort_order))
          ? Number(row.sort_order)
          : index,
        metadata: buildRateMetadata(row.metadata, rate),
      };
    });

    for (const row of finalRows) {
      if (row.currency_code === requestedDefault) continue;
      if (!row.is_enabled) continue;

      const rate = positiveRate(row.metadata.rate_to_default, 0);

      if (rate <= 0) {
        return NextResponse.json(
          {
            error: `أدخل سعر صرف صحيح للعملة ${row.currency_code} مقابل ${requestedDefault}.`,
          },
          { status: 400 },
        );
      }
    }

    const { error: clearDefaultError } = await admin
      .from("store_currencies")
      .update({ is_default: false })
      .eq("store_id", storeId);

    if (clearDefaultError) throw new Error(clearDefaultError.message);

    if (finalRows.length) {
      const { error: upsertError } = await admin
        .from("store_currencies")
        .upsert(finalRows, { onConflict: "store_id,currency_code" });

      if (upsertError) throw new Error(upsertError.message);
    }

    if (requestedDefault !== currentDefault) {
      const { error: updateStoreError } = await admin
        .from("stores")
        .update({ default_currency: requestedDefault })
        .eq("id", storeId);

      if (updateStoreError) throw new Error(updateStoreError.message);
    }

    const { data: currencies, error: listError } = await admin
      .from("store_currencies")
      .select("*")
      .eq("store_id", storeId)
      .order("is_default", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("currency_code", { ascending: true });

    if (listError) throw new Error(listError.message);

    return NextResponse.json({
      ok: true,
      defaultCurrency: requestedDefault,
      currencies: currencies ?? [],
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "FAILED_TO_UPDATE_CURRENCIES" },
      { status: 500 },
    );
  }
}