// FILE: apps/merchant/src/app/api/settings/store/support/whatsapp/request/route.ts
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
function randCode4() {
  return String(Math.floor(1000 + Math.random() * 9000));
}
function isValidE164(s: string) {
  return /^\+\d{8,15}$/.test(s);
}

function normalizeToE164(raw: string, callingCode?: string | null) {
  let s = String(raw || "").trim().replace(/\s+/g, "");
  if (!s) return "";
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (s.startsWith("+")) return s;

  if (callingCode && /^\+\d+$/.test(callingCode)) {
    const ccDigits = callingCode.slice(1);
    if (s.startsWith(ccDigits)) return `+${s}`;
    if (s.startsWith("0")) s = s.slice(1);
    return `${callingCode}${s}`;
  }
  return "";
}

async function resolveStoreIdAndCallingCode() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value, set() {}, remove() {} } }
  );

  const { data: au, error: auErr } = await supabase.auth.getUser();
  if (auErr || !au?.user) return { supabase, storeId: null as string | null, callingCode: null as string | null };

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

  const storeId = su?.store_id ?? null;
  if (!storeId) return { supabase, storeId: null, callingCode: null };

  const { data: loc } = await supabase
    .from("store_settings")
    .select("value")
    .eq("store_id", storeId)
    .eq("slug", "store.locale")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const callingCode = String((loc?.value as any)?.calling_code || "").trim() || null;
  return { supabase, storeId, callingCode };
}

export async function POST(req: Request) {
  try {
    const { supabase, storeId, callingCode } = await resolveStoreIdAndCallingCode();
    if (!storeId) return fail("NO_STORE", 403);

    const body = (await req.json().catch(() => null)) as any;
    if (!body) return fail("BAD_JSON", 400);

    const target = normalizeToE164(String(body.whatsapp || ""), callingCode);
    if (!target || !isValidE164(target)) return fail("INVALID_WHATSAPP", 400);

    const code = randCode4(); // ✅ 4 digits
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const codeHash = sha256(`${storeId}:${target}:${code}`);

    // store.support pending
    const { data: existing } = await supabase
      .from("store_settings")
      .select("id, value")
      .eq("store_id", storeId)
      .eq("slug", "store.support")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const prev: any = existing?.value || {};
    const nextValue = {
      ...prev,
      whatsapp_pending: target,
      whatsapp_pending_requested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      await supabase.from("store_settings").update({ value: nextValue }).eq("id", existing.id);
    } else {
      await supabase.from("store_settings").insert({
        store_id: storeId,
        slug: "store.support",
        type: "json",
        value: nextValue,
      });
    }

    await supabase.from("store_channel_verifications").insert({
      store_id: storeId,
      channel: "whatsapp",
      target,
      code_hash: codeHash,
      expires_at: expiresAt,
    });

    // ✅ إظهار الكود فقط إذا ENV مفعّل
    const exposeDevCode = process.env.WHATSAPP_OTP_DEV_EXPOSE === "1";

    return NextResponse.json({
      ok: true,
      expires_at: expiresAt,
      normalized: target,
      dev_code: exposeDevCode ? code : undefined,
    });
  } catch (e: any) {
    return fail("UNHANDLED_ERROR", 500, String(e?.message || e));
  }
}
