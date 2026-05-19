// FILE: apps/merchant/src/app/api/settings/store/shipping/carriers/update/route.ts
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
  const display_name = String(body.display_name || "").trim();

  if (!store_shipping_carrier_id) return resJson(false, null, { error: "store_shipping_carrier_id_required" });
  if (!display_name) return resJson(false, null, { error: "display_name_required" });

  const { data: upd, error } = await supabase
    .from("store_shipping_carriers")
    .update({ display_name, updated_at: new Date().toISOString() })
    .eq("id", store_shipping_carrier_id)
    .eq("store_id", storeId)
    .select("*")
    .maybeSingle();

  if (error) return resJson(false, null, { error: error.message });
  return resJson(true, upd);
}
