// FILE: apps/merchant/src/app/api/settings/store/support/whatsapp/verify/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import crypto from "node:crypto";

function fail(error: string, status = 400, details?: any) {
  return NextResponse.json({ ok: false, error, details }, { status });
}
function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

async function resolveStoreId() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value, set() {}, remove() {} } }
  );

  const { data: au, error: auErr } = await supabase.auth.getUser();
  if (auErr || !au?.user) return { supabase, storeId: null as string | null, reason: "NO_USER" };

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

  return { supabase, storeId: su?.store_id ?? null, reason: "OK" };
}

export async function POST(req: Request) {
  try {
    const { supabase, storeId, reason } = await resolveStoreId();
    if (!storeId) return fail("NO_STORE", 403, { reason });

    const body = (await req.json().catch(() => null)) as any;
    if (!body) return fail("BAD_JSON", 400);

    const code = String(body.code || "").trim();
    if (!/^\d{4}$/.test(code)) return fail("INVALID_CODE", 400); // ✅ 4 digits

    const { data: setting } = await supabase
      .from("store_settings")
      .select("id, value")
      .eq("store_id", storeId)
      .eq("slug", "store.support")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const v: any = setting?.value || {};
    const pending = String(v.whatsapp_pending || "");
    if (!pending) return fail("NO_PENDING_WHATSAPP", 400);

    const codeHash = sha256(`${storeId}:${pending}:${code}`);

    const { data: ver } = await supabase
      .from("store_channel_verifications")
      .select("*")
      .eq("store_id", storeId)
      .eq("channel", "whatsapp")
      .eq("target", pending)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!ver) return fail("CODE_NOT_FOUND", 400);
    if (ver.verified_at) return fail("ALREADY_VERIFIED", 400);
    if (new Date(ver.expires_at).getTime() < Date.now()) return fail("CODE_EXPIRED", 400);

    await supabase.from("store_channel_verifications").update({ attempts: Number(ver.attempts || 0) + 1 }).eq("id", ver.id);
    if (ver.code_hash !== codeHash) return fail("CODE_INVALID", 400);

    await supabase.from("store_channel_verifications").update({ verified_at: new Date().toISOString() }).eq("id", ver.id);

    const nextValue = {
      ...v,
      whatsapp: pending,
      whatsapp_pending: "",
      whatsapp_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (setting?.id) {
      await supabase.from("store_settings").update({ value: nextValue }).eq("id", setting.id);
    }

    return NextResponse.json({ ok: true, whatsapp: pending, support: nextValue });
  } catch (e: any) {
    return fail("UNHANDLED_ERROR", 500, String(e?.message || e));
  }
}
