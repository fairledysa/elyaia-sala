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

export async function POST(req: Request) {
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

  const body = await req.json().catch(() => ({}));
  const carrierCode = String(body.carrier_code || "").trim();
  const displayName = String(body.display_name || "").trim(); // اختياري

  if (!carrierCode) return json(false, null, { error: "carrier_code_required" });

  // 1) get carrier_id
  const { data: carrier, error: cErr } = await supabase
    .from("shipping_carriers")
    .select("id, name, status")
    .eq("code", carrierCode)
    .eq("status", "active")
    .maybeSingle();

  if (cErr) return json(false, null, { error: cErr.message });
  if (!carrier?.id) return json(false, null, { error: "carrier_not_found" });

  // 2) check existing store carrier
  const { data: existing, error: eErr } = await supabase
    .from("store_shipping_carriers")
    .select("id, enabled")
    .eq("store_id", storeId)
    .eq("type", "platform")
    .eq("carrier_id", carrier.id)
    .maybeSingle();

  // PGRST116 = no rows
  if (eErr && eErr.code !== "PGRST116") return json(false, null, { error: eErr.message });

  if (existing?.id) {
    const { data: upd, error: uErr } = await supabase
      .from("store_shipping_carriers")
      .update({
        enabled: true,
        display_name: displayName || carrier.name,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("*")
      .maybeSingle();

    if (uErr) return json(false, null, { error: uErr.message });
    return json(true, upd);
  }

  const { data: ins, error: iErr } = await supabase
    .from("store_shipping_carriers")
    .insert({
      store_id: storeId,
      carrier_id: carrier.id,
      type: "platform",
      display_name: displayName || carrier.name,
      enabled: true,
      status: "active",
    })
    .select("*")
    .maybeSingle();

  if (iErr) return json(false, null, { error: iErr.message });

  return json(true, ins);
}
