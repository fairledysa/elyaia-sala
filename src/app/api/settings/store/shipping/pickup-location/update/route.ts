import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const SLUG = "shipping.pickup_location";

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

function mustString(v: any) {
  return String(v || "").trim();
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

  const value = {
    city_id: mustString(body.city_id),
    city_name: mustString(body.city_name),
    district_id: mustString(body.district_id),
    district_name: mustString(body.district_name),
    street: mustString(body.street),
    landmark: mustString(body.landmark),
    notes: mustString(body.notes),
    updated_at: new Date().toISOString(),
  };

  // Validation (الحقول الأساسية)
  if (!value.city_id || !value.district_id || !value.street || !value.landmark) {
    return json(false, null, { error: "VALIDATION_ERROR" });
  }

  // upsert على (store_id, slug) — إذا ما عندك unique constraint ما يهم: بنسوي update ثم insert
  const existing = await supabase
    .from("store_settings")
    .select("id")
    .eq("store_id", storeId)
    .eq("slug", SLUG)
    .maybeSingle();

  if (existing.error && existing.error.code !== "PGRST116") {
    // PGRST116 = No rows
    return json(false, null, { error: existing.error.message });
  }

  if (existing.data?.id) {
    const upd = await supabase
      .from("store_settings")
      .update({ value, type: "json", updated_at: new Date().toISOString() })
      .eq("id", existing.data.id)
      .select("value")
      .maybeSingle();

    if (upd.error) return json(false, null, { error: upd.error.message });
    return json(true, upd.data?.value || value);
  }

  const ins = await supabase
    .from("store_settings")
    .insert({ store_id: storeId, slug: SLUG, type: "json", value })
    .select("value")
    .maybeSingle();

  if (ins.error) return json(false, null, { error: ins.error.message });

  return json(true, ins.data?.value || value);
}
