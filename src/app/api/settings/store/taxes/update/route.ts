// FILE: apps/merchant/src/app/api/settings/store/taxes/update/route.ts

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function s(x: unknown) {
  return String(x ?? "").trim();
}

function toBool(x: unknown, fallback = false) {
  return typeof x === "boolean" ? x : fallback;
}

function toRate(x: unknown) {
  const n = Number(x ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(n, 0), 100);
}

function toInt(x: unknown, fallback = 0) {
  const n = Number(x ?? fallback);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

function cleanCountryCode(x: unknown) {
  const code = s(x).toUpperCase();

  if (!code || code === "ALL") return "ALL";
  if (/^[A-Z]{2}$/.test(code)) return code;

  return "";
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

function normalizeRateRow(storeId: string, row: any, index: number) {
  const countryCode = cleanCountryCode(row?.country_code ?? row?.countryCode);

  if (!countryCode) return null;

  return {
    store_id: storeId,
    country_code: countryCode,
    country_name_ar:
      s(row?.country_name_ar ?? row?.countryNameAr) ||
      (countryCode === "ALL" ? "كل الدول" : countryCode),
    country_name_en:
      s(row?.country_name_en ?? row?.countryNameEn) ||
      (countryCode === "ALL" ? "All Countries" : countryCode),
    rate: toRate(row?.rate),
    is_active: toBool(row?.is_active ?? row?.isActive, true),
    sort_order: toInt(row?.sort_order ?? row?.sortOrder, index),
  };
}

export async function PATCH(req: Request) {
  try {
    const storeId = await resolveStoreId();

    if (!storeId) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const settings = body?.settings ?? body ?? {};
    const admin = supabaseAdmin();

    const taxSettingsRow = {
      store_id: storeId,
      enabled: toBool(settings?.enabled, false),
      tax_number: s(settings?.tax_number ?? settings?.taxNumber) || null,
      tax_certificate_url:
        s(settings?.tax_certificate_url ?? settings?.taxCertificateUrl) || null,
      show_tax_number_in_footer: toBool(
        settings?.show_tax_number_in_footer ?? settings?.showTaxNumberInFooter,
        false,
      ),
      show_tax_certificate_icon: toBool(
        settings?.show_tax_certificate_icon ?? settings?.showTaxCertificateIcon,
        false,
      ),
      prices_include_tax: toBool(
        settings?.prices_include_tax ?? settings?.pricesIncludeTax,
        false,
      ),
      shipping_include_tax: toBool(
        settings?.shipping_include_tax ?? settings?.shippingIncludeTax,
        false,
      ),
      tax_label: s(settings?.tax_label ?? settings?.taxLabel) || "VAT",
      metadata:
        settings?.metadata && typeof settings.metadata === "object"
          ? settings.metadata
          : {},
    };

    const { error: settingsError } = await admin
      .from("store_tax_settings")
      .upsert(taxSettingsRow, { onConflict: "store_id" });

    if (settingsError) throw new Error(settingsError.message);

    if (Array.isArray(body?.rates)) {
      const normalizedRates = body.rates
        .map((row: any, index: number) => normalizeRateRow(storeId, row, index))
        .filter(Boolean) as Array<Record<string, any>>;

      const hasAll = normalizedRates.some((row) => row.country_code === "ALL");

      if (!hasAll) {
        normalizedRates.unshift({
          store_id: storeId,
          country_code: "ALL",
          country_name_ar: "كل الدول",
          country_name_en: "All Countries",
          rate: 0,
          is_active: true,
          sort_order: 0,
        });
      }

      const unique = new Map<string, Record<string, any>>();

      for (const row of normalizedRates) {
        unique.set(row.country_code, row);
      }

      const finalRates = Array.from(unique.values()).map((row, index) => ({
        ...row,
        sort_order: toInt(row.sort_order, index),
      }));

      const { error: deleteError } = await admin
        .from("store_tax_rates")
        .delete()
        .eq("store_id", storeId);

      if (deleteError) throw new Error(deleteError.message);

      if (finalRates.length) {
        const { error: insertError } = await admin
          .from("store_tax_rates")
          .insert(finalRates);

        if (insertError) throw new Error(insertError.message);
      }
    }

    const { data: savedSettings, error: savedSettingsError } = await admin
      .from("store_tax_settings")
      .select("*")
      .eq("store_id", storeId)
      .single();

    if (savedSettingsError) throw new Error(savedSettingsError.message);

    const { data: savedRates, error: savedRatesError } = await admin
      .from("store_tax_rates")
      .select("*")
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true })
      .order("country_code", { ascending: true });

    if (savedRatesError) throw new Error(savedRatesError.message);

    return NextResponse.json({
      ok: true,
      settings: savedSettings,
      rates: savedRates ?? [],
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "FAILED_TO_UPDATE_TAXES" },
      { status: 500 },
    );
  }
}