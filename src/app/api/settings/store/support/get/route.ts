// FILE: apps/merchant/src/app/api/settings/store/support/get/route.ts
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
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );

  const { data: au, error: auErr } = await supabase.auth.getUser();
  if (auErr || !au?.user) return { supabase, storeId: null as string | null, reason: "NO_USER" };

  const userId = au.user.id;
  const email = (au.user.email || "").toLowerCase();

  // ✅ 1) بالأولوية: auth_user_id
  let q = supabase
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let { data: su } = await q;

  // ✅ 2) fallback: email
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

  return { supabase, storeId: su?.store_id ?? null, reason: "OK" };
}

export async function GET() {
  try {
    const { supabase, storeId, reason } = await resolveStoreId();
    if (!storeId) return fail("NO_STORE", 403, { reason });

    const { data: setting } = await supabase
      .from("store_settings")
      .select("value")
      .eq("store_id", storeId)
      .eq("slug", "store.support")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const v: any = setting?.value || {};

    return NextResponse.json({
      ok: true,
      support: {
        phone: String(v.phone || ""),
        whatsapp: String(v.whatsapp || ""),
        whatsapp_pending: String(v.whatsapp_pending || ""),
        whatsapp_verified_at: v.whatsapp_verified_at || null,
        telegram: String(v.telegram || ""),
        email: String(v.email || ""),
      },
    });
  } catch (e: any) {
    return fail("UNHANDLED_ERROR", 500, String(e?.message || e));
  }
}
