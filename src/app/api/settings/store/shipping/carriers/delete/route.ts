// FILE: apps/merchant/src/app/api/settings/store/shipping/carriers/delete/route.ts
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
  const storeCarrierId = String(body.store_shipping_carrier_id || "").trim();
  if (!storeCarrierId) return resJson(false, null, { error: "store_shipping_carrier_id_required" });

  // منع حذف platform (شركة المنصة)
  const { data: row, error: rErr } = await supabase
    .from("store_shipping_carriers")
    .select("id, type")
    .eq("id", storeCarrierId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (rErr) return resJson(false, null, { error: rErr.message });
  if (!row?.id) return resJson(false, null, { error: "not_found" });
  if (row.type === "platform") return resJson(false, null, { error: "platform_cannot_delete_use_disable" });

  // FK cascade يحذف rates تلقائيًا
  const { error } = await supabase
    .from("store_shipping_carriers")
    .delete()
    .eq("id", storeCarrierId)
    .eq("store_id", storeId);

  if (error) return resJson(false, null, { error: error.message });

  return resJson(true, { deleted: true, store_shipping_carrier_id: storeCarrierId });
}
