import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function json(ok: boolean, value: any, extra?: Record<string, any>) {
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

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return json(false, null, { error: "UNAUTHENTICATED" });

  const storeId = await resolveStoreId(supabase, auth.user.id, auth.user.email);
  if (!storeId) return json(false, null, { error: "STORE_NOT_FOUND" });

  // 1) كتالوج شركات المنصة
  const { data: catalog, error: catErr } = await supabase
    .from("shipping_carriers")
    .select("id, code, name, logo_url, provider_kind, status")
    .eq("status", "active")
    .order("name", { ascending: true });

  if (catErr) return json(false, null, { error: catErr.message });

  // 2) شركات/طرق الشحن التي أنشأها/فعّلها التاجر
  const { data: storeCarriers, error: scErr } = await supabase
    .from("store_shipping_carriers")
    .select("id, store_id, carrier_id, type, display_name, bill_store_name, bill_merchant_name, bill_phone, label_auto_print, allow_status_updates, enabled, status, created_at, updated_at")
    .eq("store_id", storeId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (scErr) return json(false, null, { error: scErr.message });

  return json(true, {
    store_id: storeId,
    catalog: catalog || [],
    store_carriers: storeCarriers || [],
  });
}
