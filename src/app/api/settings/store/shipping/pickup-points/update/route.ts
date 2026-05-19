// FILE: apps/merchant/src/app/api/settings/store/shipping/pickup-points/update/route.ts
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
  const id = String(body.id || "").trim();
  if (!id) return resJson(false, null, { error: "id_required" });

  const { data: row, error: rErr } = await supabase
    .from("store_pickup_points")
    .select("id,store_id,store_shipping_carrier_id")
    .eq("id", id)
    .eq("store_id", storeId)
    .maybeSingle();

  if (rErr) return resJson(false, null, { error: rErr.message });
  if (!row?.id) return resJson(false, null, { error: "not_found" });

  const update: any = { updated_at: new Date().toISOString() };

  if (body.city_id !== undefined) update.city_id = String(body.city_id || "").trim();
  if (body.title !== undefined) update.title = String(body.title || "").trim();
  if (body.address !== undefined) update.address = String(body.address || "").trim();
  if (body.map_url !== undefined) update.map_url = String(body.map_url || "").trim() || null;
  if (body.lat !== undefined) update.lat = body.lat === "" || body.lat === null ? null : Number(body.lat);
  if (body.lng !== undefined) update.lng = body.lng === "" || body.lng === null ? null : Number(body.lng);
  if (body.phone !== undefined) update.phone = String(body.phone || "").trim() || null;
  if (body.notes !== undefined) update.notes = String(body.notes || "").trim() || null;
  if (body.status !== undefined) update.status = String(body.status || "active").trim() === "inactive" ? "inactive" : "active";

  const { data: upd, error: uErr } = await supabase
    .from("store_pickup_points")
    .update(update)
    .eq("id", id)
    .eq("store_id", storeId)
    .select("*")
    .maybeSingle();

  if (uErr) return resJson(false, null, { error: uErr.message });
  return resJson(true, upd);
}
