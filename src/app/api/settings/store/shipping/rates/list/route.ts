// FILE: apps/merchant/src/app/api/settings/store/shipping/rates/list/route.ts
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

export async function GET(req: Request) {
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

  const url = new URL(req.url);
  const store_shipping_carrier_id = String(
    url.searchParams.get("store_shipping_carrier_id") || "",
  ).trim();

  if (!store_shipping_carrier_id) {
    return resJson(false, null, {
      error: "store_shipping_carrier_id_required",
    });
  }

  const { data: carrierRow, error: carrierError } = await supabase
    .from("store_shipping_carriers")
    .select("id")
    .eq("id", store_shipping_carrier_id)
    .eq("store_id", storeId)
    .maybeSingle();

  if (carrierError) {
    return resJson(false, null, { error: carrierError.message });
  }

  if (!carrierRow?.id) {
    return resJson(false, null, { error: "carrier_not_found" });
  }

  const { data: rows, error } = await supabase
    .from("store_shipping_rates")
    .select(
      [
        "id",
        "scope",
        "excluded_city_ids",
        "included_city_ids",
        "pricing_type",
        "merchant_cost",
        "customer_price",
        "eta_text",
        "cod_enabled",
        "currency",
        "enabled",
        "status",
        "created_at",
        "cod_fee_customer",
        "cod_fee_include_tax",
      ].join(","),
    )
    .eq("store_id", storeId)
    .eq("store_shipping_carrier_id", store_shipping_carrier_id)
    .order("created_at", { ascending: false });

  if (error) {
    return resJson(false, null, { error: error.message });
  }

  return resJson(true, rows || []);
}