// FILE: apps/merchant/src/app/api/settings/store/shipping/rates/delete/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function resJson(ok: boolean, value: any, extra?: Record<string, any>) {
  return NextResponse.json(
    { ok, value, ...(extra || {}) },
    { headers: { "Cache-Control": "no-store" } }
  );
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
  const rateId = String(body.rate_id || "").trim();
  if (!rateId) return resJson(false, null, { error: "rate_id_required" });

  // تأكد أنها ملك المتجر
  const { data: row, error: rErr } = await supabase
    .from("store_shipping_rates")
    .select("id, store_id")
    .eq("id", rateId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (rErr) return resJson(false, null, { error: rErr.message });
  if (!row?.id) return resJson(false, null, { error: "not_found" });

  const { error } = await supabase
    .from("store_shipping_rates")
    .delete()
    .eq("id", rateId)
    .eq("store_id", storeId);

  if (error) return resJson(false, null, { error: error.message });

  return resJson(true, { deleted: true, rate_id: rateId });
}
