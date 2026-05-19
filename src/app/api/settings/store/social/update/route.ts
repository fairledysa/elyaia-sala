// FILE: apps/merchant/src/app/api/settings/store/social/update/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function fail(error: string, status = 400, details?: any) {
  return NextResponse.json({ ok: false, error, details }, { status });
}

async function resolveStoreId() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value, set() {}, remove() {} } }
  );

  const { data: au, error: auErr } = await supabase.auth.getUser();
  if (auErr || !au?.user) return { supabase, storeId: null as string | null };

  const userId = au.user.id;
  const email = (au.user.email || "").toLowerCase();

  let { data: su } = await supabase
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!su?.store_id && email) {
    const r = await supabase
      .from("store_users")
      .select("store_id")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    su = r.data as any;
  }

  return { supabase, storeId: su?.store_id ?? null };
}

export async function POST(req: Request) {
  try {
    const { supabase, storeId } = await resolveStoreId();
    if (!storeId) return fail("NO_STORE", 403);

    const body = (await req.json().catch(() => null)) as any;
    if (!body) return fail("BAD_JSON", 400);

    const nextValue = {
      instagram: String(body.instagram || ""),
      x: String(body.x || ""),
      snapchat: String(body.snapchat || ""),
      tiktok: String(body.tiktok || ""),
      youtube: String(body.youtube || ""),
      facebook: String(body.facebook || ""),
      updated_at: new Date().toISOString(),
    };

    const { data: existing, error: readErr } = await supabase
      .from("store_settings")
      .select("id")
      .eq("store_id", storeId)
      .eq("slug", "store.social")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (readErr) return fail("READ_FAILED", 500, readErr);

    if (existing?.id) {
      const { error: updErr } = await supabase
        .from("store_settings")
        .update({ value: nextValue, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (updErr) return fail("UPDATE_FAILED", 500, updErr);
    } else {
      const { error: insErr } = await supabase.from("store_settings").insert({
        store_id: storeId,
        slug: "store.social",
        type: "json",
        value: nextValue,
      });
      if (insErr) return fail("INSERT_FAILED", 500, insErr);
    }

    return NextResponse.json({ ok: true, social: nextValue });
  } catch (e: any) {
    return fail("UNHANDLED_ERROR", 500, String(e?.message || e));
  }
}
