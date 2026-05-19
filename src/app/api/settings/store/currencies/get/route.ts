// FILE: apps/merchant/src/app/api/settings/store/currencies/get/route.ts

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type CurrencyCatalogItem = {
  code: string;
  name_ar: string;
  name_en: string;
  symbol: string;
  decimal_digits: number;
};

const CURRENCY_CATALOG: CurrencyCatalogItem[] = [
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

function fallbackCurrencyItem(code: string): CurrencyCatalogItem {
  const item = catalogByCode(code);

  return (
    item ?? {
      code,
      name_ar: code,
      name_en: code,
      symbol: code,
      decimal_digits: 2,
    }
  );
}

async function syncDefaultCurrency(storeId: string, defaultCurrency: string) {
  const admin = supabaseAdmin();
  const code = cleanCurrencyCode(defaultCurrency) || "SAR";
  const item = fallbackCurrencyItem(code);

  const { error: clearError } = await admin
    .from("store_currencies")
    .update({ is_default: false })
    .eq("store_id", storeId);

  if (clearError) throw new Error(clearError.message);

  const { error: upsertError } = await admin.from("store_currencies").upsert(
    {
      store_id: storeId,
      currency_code: item.code,
      name_ar: item.name_ar,
      name_en: item.name_en,
      symbol: item.symbol,
      decimal_digits: item.decimal_digits,
      is_enabled: true,
      is_default: true,
      sort_order: 0,
      metadata: {
        rate_to_default: 1,
        exchange_rate: 1,
        rate: 1,
      },
    },
    { onConflict: "store_id,currency_code" },
  );

  if (upsertError) throw new Error(upsertError.message);
}

async function listStoreCurrencies(storeId: string) {
  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from("store_currencies")
    .select("*")
    .eq("store_id", storeId)
    .order("is_default", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("currency_code", { ascending: true });

  if (error) throw new Error(error.message);

  return data ?? [];
}

export async function GET() {
  try {
    const storeId = await resolveStoreId();

    if (!storeId) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const admin = supabaseAdmin();

    const { data: store, error: storeError } = await admin
      .from("stores")
      .select("id, default_currency")
      .eq("id", storeId)
      .single();

    if (storeError) throw new Error(storeError.message);

    const defaultCurrency = cleanCurrencyCode(store?.default_currency) || "SAR";

    const { count: ordersCount, error: ordersError } = await admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .neq("status", "draft");

    if (ordersError) throw new Error(ordersError.message);

    let currencies = await listStoreCurrencies(storeId);

    const currentDefaultRow = currencies.find((row: any) => row.is_default);
    const currentDefaultCode = cleanCurrencyCode(
      currentDefaultRow?.currency_code,
    );

    const needsSync =
      !currencies.length ||
      currentDefaultCode !== defaultCurrency ||
      !currencies.some(
        (row: any) => cleanCurrencyCode(row.currency_code) === defaultCurrency,
      );

    if (needsSync) {
      await syncDefaultCurrency(storeId, defaultCurrency);
      currencies = await listStoreCurrencies(storeId);
    }

    return NextResponse.json({
      defaultCurrency,
      canChangeDefaultCurrency: Number(ordersCount ?? 0) <= 0,
      hasOrders: Number(ordersCount ?? 0) > 0,
      currencies,
      catalog: CURRENCY_CATALOG,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: e?.message || "FAILED_TO_LOAD_CURRENCIES",
        defaultCurrency: "SAR",
        canChangeDefaultCurrency: false,
        hasOrders: false,
        currencies: [],
        catalog: CURRENCY_CATALOG,
      },
      { status: 500 },
    );
  }
}