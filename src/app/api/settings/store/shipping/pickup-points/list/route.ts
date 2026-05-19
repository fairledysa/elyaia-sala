// FILE: apps/merchant/src/app/api/settings/store/shipping/pickup-points/list/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function resJson(ok: boolean, value: any, extra?: Record<string, any>) {
  return NextResponse.json({ ok, value, ...(extra || {}) }, { headers: { "Cache-Control": "no-store" } });
}

async function resolveStoreId(supabase: any, authUserId: string, email?: string | null) {
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
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return resJson(false, null, { error: "UNAUTHENTICATED" });

  const storeId = await resolveStoreId(supabase, auth.user.id, auth.user.email);
  if (!storeId) return resJson(false, null, { error: "STORE_NOT_FOUND" });

  const url = new URL(req.url);
  const store_shipping_carrier_id = String(url.searchParams.get("store_shipping_carrier_id") || "").trim();
  if (!store_shipping_carrier_id) return resJson(false, null, { error: "store_shipping_carrier_id_required" });

  // ownership check
  const { data: carrier, error: cErr } = await supabase
    .from("store_shipping_carriers")
    .select("id,type")
    .eq("id", store_shipping_carrier_id)
    .eq("store_id", storeId)
    .maybeSingle();

  if (cErr) return resJson(false, null, { error: cErr.message });
  if (!carrier?.id) return resJson(false, null, { error: "carrier_not_found" });
  if (carrier.type !== "pickup") return resJson(false, null, { error: "carrier_not_pickup" });

  const { data: rows, error } = await supabase
    .from("store_pickup_points")
    .select("id,store_id,store_shipping_carrier_id,city_id,title,address,map_url,lat,lng,phone,notes,status,created_at,updated_at")
    .eq("store_id", storeId)
    .eq("store_shipping_carrier_id", store_shipping_carrier_id)
    .order("created_at", { ascending: false });

  if (error) return resJson(false, null, { error: error.message });

  // add city names (cheap join on ref_cities)
  const cityIds = Array.from(new Set((rows || []).map((r: any) => r.city_id).filter(Boolean)));
  let cityMap: Record<string, any> = {};
  if (cityIds.length) {
    const { data: cities, error: ce } = await supabase
      .from("ref_cities")
      .select("id,name_ar,name_en")
      .in("id", cityIds);
    if (!ce) {
      for (const c of cities || []) cityMap[c.id] = c;
    }
  }

  const value = (rows || []).map((r: any) => ({
    ...r,
    city_name: cityMap[r.city_id]?.name_ar || cityMap[r.city_id]?.name_en || "",
  }));

  return resJson(true, value);
}
