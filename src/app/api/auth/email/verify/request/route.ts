// FILE: apps/merchant/src/app/api/auth/email/verify/request/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import crypto from "node:crypto";
import { Resend } from "resend";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function originFromInviteUrl(inviteUrl?: string) {
  // RESEND_INVITE_URL قد يكون فيه path، نحتاج origin فقط
  // مثال: https://elyaia.vercel.app/merchant/onboarding -> https://elyaia.vercel.app
  try {
    if (!inviteUrl) return null;
    const u = new URL(inviteUrl);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

function isEmailVerifiedValue(value: any) {
  // يدعم:
  // true
  // { verified: true }
  // { value: true } (لو أحد خزّنها كذا)
  if (value === true) return true;
  if (!value) return false;
  if (typeof value === "object") {
    if (value.verified === true) return true;
    if (value.value === true) return true;
  }
  return false;
}

export async function POST() {
  const cookieStore = await cookies();
  const hdrs = await headers();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );

  // لازم يكون مسجل
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user)
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const email = (user.email || "").toLowerCase();
  if (!email) return NextResponse.json({ error: "NO_EMAIL" }, { status: 400 });

  // نجيب store_id من store_users (حسب شغلك الحالي)
  const { data: su, error: suErr } = await supabase
    .from("store_users")
    .select("store_id")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (suErr) {
    return NextResponse.json(
      { error: `STORE_USER_LOOKUP_FAILED: ${suErr.message}` },
      { status: 400 }
    );
  }

  const store_id = su?.store_id as string | undefined;
  if (!store_id)
    return NextResponse.json({ error: "NO_STORE" }, { status: 400 });

  // ====== 1) Skip لو البريد متفعّل ======
  const { data: verifiedSetting, error: vsErr } = await supabase
    .from("store_settings")
    .select("value")
    .eq("store_id", store_id)
    .eq("slug", "auth.email_verified")
    .limit(1)
    .maybeSingle();

  // لو حصل خطأ ما نوقف النظام (بس نكمل إرسال)، إلا إذا تبي تشددها
  if (!vsErr && isEmailVerifiedValue(verifiedSetting?.value)) {
    return NextResponse.json({ ok: true, skipped: "ALREADY_VERIFIED" });
  }

  // ====== 2) Rate-limit: لو انرسل خلال آخر 5 دقائق ======
  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: recent, error: recentErr } = await supabase
    .from("email_verifications")
    .select("id, created_at")
    .eq("store_id", store_id)
    .eq("email", email)
    .is("used_at", null)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!recentErr && recent?.id) {
    return NextResponse.json({ ok: true, skipped: "RECENTLY_SENT" });
  }

  // إرسال عبر Resend (تحقق env قبل أي DB)
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY_MISSING" },
      { status: 400 }
    );
  }
  if (!from) {
    return NextResponse.json(
      { error: "RESEND_FROM_EMAIL_MISSING" },
      { status: 400 }
    );
  }

  // ✅ مصدر الـ origin يكون من ENV
  // APP_PUBLIC_URL="http://localhost:3002"
  // وفي الإنتاج: "https://m.elyaia.com"
  const appOrigin =
    originFromInviteUrl(process.env.APP_PUBLIC_URL) ||
    originFromInviteUrl(process.env.RESEND_INVITE_URL) ||
    "http://localhost:3002";

  // توليد token
  const token = crypto.randomBytes(24).toString("hex");
  const token_hash = sha256(token);
  const expires_at = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 دقيقة

  // ألغ أي توكنات غير مستخدمة سابقة (نظافة)
  await supabase
    .from("email_verifications")
    .update({ used_at: new Date().toISOString() })
    .eq("store_id", store_id)
    .eq("email", email)
    .is("used_at", null);

  const { error: insErr } = await supabase.from("email_verifications").insert({
    store_id,
    user_id: user.id,
    email,
    token_hash,
    expires_at,
  });

  if (insErr)
    return NextResponse.json(
      { error: `DB_INSERT_FAILED: ${insErr.message}` },
      { status: 400 }
    );

  const verifyUrl = `${appOrigin}/auth/email/verify?token=${encodeURIComponent(
    token
  )}`;

  const resend = new Resend(apiKey);

  // 🎨 ألوان الهوية (Boltify lime)
  const subject = "تأكيد البريد الإلكتروني";

  const BRAND = "#66ff4c";
  const BRAND_DARK = "#4ca53c";
  const BRAND_SOFT = "#E9FFD8";
  const BG = "#f3f4f6";
  const BORDER = "#e5e7eb";
  const MUTED = "#6b7280";

  const html = `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>تأكيد البريد الإلكتروني</title>
  </head>
  <body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Tahoma,Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:40px 12px;">
      <tr>
        <td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${BORDER};">
            <tr>
              <td style="padding:26px 26px 18px 26px;text-align:center;">
                <div style="font-size:0;line-height:0;margin-bottom:14px;">
                  <img
                    src="https://elyaia.com/logo.png"
                    alt="Elyaia Filters"
                    width="120"
                    style="display:inline-block;border:0;outline:none;text-decoration:none;"
                  />
                </div>

                <div style="font-size:18px;font-weight:900;color:#111827;margin-bottom:6px;">
                  الرجاء تفعيل البريد الإلكتروني
                </div>

                <div style="font-size:14px;color:${MUTED};line-height:1.8;margin:0 auto;max-width:440px;">
                  اضغط الزر لتأكيد بريدك الإلكتروني وإكمال إعدادات متجرك.
                </div>

                <div style="height:18px;"></div>

                <a href="${verifyUrl}"
                   style="display:inline-block;background:${BRAND};color:#0b0f14;text-decoration:none;font-weight:900;
                          padding:12px 22px;border-radius:14px;font-size:14px;border:1px solid rgba(0,0,0,0.06);">
                  تأكيد البريد
                </a>

                <div style="height:16px;"></div>

                <div style="font-size:12px;color:#9ca3af;line-height:1.7;">
                  إذا لم تطلب هذا، تجاهل الرسالة. ينتهي الرابط خلال <b>30 دقيقة</b>.
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:14px 18px;background:${BRAND_SOFT};border-top:1px solid #dcfce7;text-align:center;">
                <div style="font-size:12px;color:#0b0f14;line-height:1.9;">
                  <a href="https://elyaia.com/terms" style="color:${BRAND_DARK};text-decoration:underline;margin:0 10px;">اتفاقية الاستخدام</a>
                  <a href="https://elyaia.com/support" style="color:${BRAND_DARK};text-decoration:underline;margin:0 10px;">الدعم</a>
                  <a href="https://elyaia.com/contact" style="color:${BRAND_DARK};text-decoration:underline;margin:0 10px;">تواصل معنا</a>
                </div>
              </td>
            </tr>
          </table>

          <div style="max-width:560px;width:100%;margin-top:14px;color:#9ca3af;font-size:12px;text-align:center;">
            © ${new Date().getFullYear()} Elyaia Filters
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const { error: sendErr } = await resend.emails.send({
    from,
    to: email,
    subject,
    html,
  });

  if (sendErr)
    return NextResponse.json(
      { error: "RESEND_SEND_FAILED", details: String(sendErr) },
      { status: 400 }
    );

  return NextResponse.json({ ok: true });
}
