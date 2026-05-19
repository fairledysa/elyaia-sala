// FILE: apps/merchant/src/app/api/settings/store/shipping/rates/create/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function resJson(ok: boolean, value: any, extra?: Record<string, any>) {
  return NextResponse.json(
    { ok, value, ...(extra || {}) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

async function resolveStoreId(
  supabase: any,
  authUserId: string,
  email?: string | null,
) {
  const r1 = await supabase
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", authUserId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (r1.data?.store_id) return r1.data.store_id as string;

  const e = String(email || "").toLowerCase().trim();
  if (!e) return null;

  const r2 = await supabase
    .from("store_users")
    .select("store_id")
    .ilike("email", e)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return r2.data?.store_id || null;
}

function uniqSortedIds(xs: any): string[] {
  if (!Array.isArray(xs)) return [];

  const set = new Set<string>();

  for (const x of xs) {
    const v = String(x || "").trim();
    if (v) set.add(v);
  }

  return Array.from(set).sort();
}

function toMoney(x: unknown) {
  const n = Number(x ?? 0);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export async function POST(req: Request) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );

  const { data: auth, error: authErr } = await supabase.auth.getUser();

  if (authErr || !auth?.user) {
    return resJson(false, null, { error: "UNAUTHENTICATED" });
  }

  const storeId = await resolveStoreId(
    supabase,
    auth.user.id,
    auth.user.email,
  );

  if (!storeId) {
    return resJson(false, null, { error: "STORE_NOT_FOUND" });
  }

  const body = await req.json().catch(() => ({}));

  const store_shipping_carrier_id = String(
    body.store_shipping_carrier_id || "",
  ).trim();

  if (!store_shipping_carrier_id) {
    return resJson(false, null, {
      error: "store_shipping_carrier_id_required",
    });
  }

  const scope = String(body.scope || "all_cities").trim() as
    | "all_cities"
    | "include_cities";

  const pricing_type = "flat";

  const excluded_city_ids = uniqSortedIds(body.excluded_city_ids);
  const included_city_ids = uniqSortedIds(body.included_city_ids);

  const merchant_cost = toMoney(body.merchant_cost);
  const customer_price = toMoney(body.customer_price);

  const eta_text = String(body.eta_text || "").trim() || null;
  const cod_enabled = Boolean(body.cod_enabled);
  const currency = String(body.currency || "YER").trim() || "YER";

  const cod_fee_customer = toMoney(body.cod_fee_customer);
  const cod_fee_include_tax = cod_enabled
    ? Boolean(body.cod_fee_include_tax)
    : false;

  const { data: carrierRow, error: carrierError } = await supabase
    .from("store_shipping_carriers")
    .select("id,type")
    .eq("id", store_shipping_carrier_id)
    .eq("store_id", storeId)
    .maybeSingle();

  if (carrierError) {
    return resJson(false, null, { error: carrierError.message });
  }

  if (!carrierRow?.id) {
    return resJson(false, null, { error: "carrier_not_found" });
  }

  if (carrierRow.type === "pickup") {
    return resJson(false, null, { error: "pickup_has_no_rates" });
  }

  if (scope === "include_cities" && included_city_ids.length === 0) {
    return resJson(false, null, { error: "included_city_ids_required" });
  }

  const { data: existingRates, error: existingRatesError } = await supabase
    .from("store_shipping_rates")
    .select("id, scope, included_city_ids, excluded_city_ids, status")
    .eq("store_id", storeId)
    .eq("store_shipping_carrier_id", store_shipping_carrier_id)
    .eq("status", "active");

  if (existingRatesError) {
    return resJson(false, null, { error: existingRatesError.message });
  }

  const existing = (existingRates || []).filter(
    (rate: any) => rate.status === "active",
  );

  if (scope === "all_cities") {
    const hasAll = existing.some((rate: any) => rate.scope === "all_cities");

    if (hasAll) {
      return resJson(false, null, { error: "DUPLICATE_ALL_CITIES_RATE" });
    }
  }

  if (scope === "include_cities") {
    const hasAll = existing.some((rate: any) => rate.scope === "all_cities");

    if (hasAll) {
      return resJson(false, null, {
        error: "ALL_CITIES_RATE_ALREADY_EXISTS",
      });
    }

    const key = included_city_ids.join(",");

    const duplicate = existing.some((rate: any) => {
      if (rate.scope !== "include_cities") return false;

      const ids = uniqSortedIds(rate.included_city_ids);
      return ids.join(",") === key;
    });

    if (duplicate) {
      return resJson(false, null, { error: "DUPLICATE_SAME_CITIES_RATE" });
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from("store_shipping_rates")
    .insert({
      store_id: storeId,
      store_shipping_carrier_id,
      scope,
      excluded_city_ids,
      included_city_ids,
      pricing_type,
      merchant_cost,
      customer_price,
      first_weight_kg: null,
      additional_kg_cost: null,
      eta_text,
      cod_enabled,
      currency,
      cod_fee_customer: cod_enabled ? cod_fee_customer : 0,
      cod_fee_include_tax,
      enabled: true,
      status: "active",
    })
    .select("*")
    .maybeSingle();

  if (insertError) {
    return resJson(false, null, { error: insertError.message });
  }

  return resJson(true, inserted);
}