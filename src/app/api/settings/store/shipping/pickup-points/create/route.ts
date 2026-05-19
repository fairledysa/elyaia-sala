// FILE: apps/merchant/src/app/api/settings/store/shipping/pickup-points/create/route.ts
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

export async function POST(req: Request) {
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

  const body = await req.json().catch(() => ({}));

  const store_shipping_carrier_id = String(body.store_shipping_carrier_id || "").trim();
  const city_id = String(body.city_id || "").trim();
  const title = String(body.title || "").trim();
  const address = String(body.address || "").trim();

  if (!store_shipping_carrier_id) return resJson(false, null, { error: "store_shipping_carrier_id_required" });
  if (!city_id) return resJson(false, null, { error: "city_id_required" });
  if (!title) return resJson(false, null, { error: "title_required" });
  if (!address) return resJson(false, null, { error: "address_required" });

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

  const map_url = String(body.map_url || "").trim() || null;
  const lat = body.lat === null || body.lat === undefined || body.lat === "" ? null : Number(body.lat);
  const lng = body.lng === null || body.lng === undefined || body.lng === "" ? null : Number(body.lng);
  const phone = String(body.phone || "").trim() || null;
  const notes = String(body.notes || "").trim() || null;
  const status = String(body.status || "active").trim() === "inactive" ? "inactive" : "active";

  const { data: ins, error: iErr } = await supabase
    .from("store_pickup_points")
    .insert({
      store_id: storeId,
      store_shipping_carrier_id,
      city_id,
      title,
      address,
      map_url,
      lat,
      lng,
      phone,
      notes,
      status,
    })
    .select("*")
    .maybeSingle();

  if (iErr) return resJson(false, null, { error: iErr.message });
  return resJson(true, ins);
}
