// FILE: apps/merchant/src/app/api/settings/store/taxes/get/route.ts

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

async function ensureMissingTaxSettings(storeId: string) {
  const admin = supabaseAdmin();

  const { data: existing, error: existingError } = await admin
    .from("store_tax_settings")
    .select("store_id")
    .eq("store_id", storeId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existing?.store_id) return;

  const { error } = await admin.from("store_tax_settings").insert({
    store_id: storeId,
    enabled: false,
    tax_number: null,
    tax_certificate_url: null,
    tax_label: "VAT",
    prices_include_tax: false,
    shipping_include_tax: false,
    show_tax_number_in_footer: false,
    show_tax_certificate_icon: false,
    metadata: {},
  });

  if (error) throw new Error(error.message);
}

async function ensureMissingDefaultRate(storeId: string) {
  const admin = supabaseAdmin();

  const { data: existing, error: existingError } = await admin
    .from("store_tax_rates")
    .select("store_id,country_code")
    .eq("store_id", storeId)
    .eq("country_code", "ALL")
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existing?.country_code) return;

  const { error } = await admin.from("store_tax_rates").insert({
    store_id: storeId,
    country_code: "ALL",
    country_name_ar: "كل الدول",
    country_name_en: "All Countries",
    rate: 0,
    is_active: true,
    sort_order: 0,
  });

  if (error) throw new Error(error.message);
}

export async function GET() {
  try {
    const storeId = await resolveStoreId();

    if (!storeId) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const admin = supabaseAdmin();

    await ensureMissingTaxSettings(storeId);
    await ensureMissingDefaultRate(storeId);

    const { data: settings, error: settingsError } = await admin
      .from("store_tax_settings")
      .select("*")
      .eq("store_id", storeId)
      .maybeSingle();

    if (settingsError) throw new Error(settingsError.message);

    const { data: rates, error: ratesError } = await admin
      .from("store_tax_rates")
      .select("*")
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true })
      .order("country_code", { ascending: true });

    if (ratesError) throw new Error(ratesError.message);

    return NextResponse.json({
      settings,
      rates: rates ?? [],
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: e?.message || "FAILED_TO_LOAD_TAXES",
        settings: null,
        rates: [],
      },
      { status: 500 },
    );
  }
}