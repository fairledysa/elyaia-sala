// FILE: apps/merchant/src/app/api/settings/store/app/get/route.ts
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

export async function GET() {
  try {
    const { supabase, storeId } = await resolveStoreId();
    if (!storeId) return fail("NO_STORE", 403);

    const { data: setting, error } = await supabase
      .from("store_settings")
      .select("value")
      .eq("store_id", storeId)
      .eq("slug", "store.app")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return fail("READ_FAILED", 500, error);

    const v: any = setting?.value || {};
    return NextResponse.json({
      ok: true,
      app: {
        ios: String(v.ios || ""),
        android: String(v.android || ""),
      },
    });
  } catch (e: any) {
    return fail("UNHANDLED_ERROR", 500, String(e?.message || e));
  }
}
