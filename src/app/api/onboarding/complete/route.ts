// FILE: apps/merchant/src/app/api/onboarding/complete/route.ts

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { Resend } from "resend";

function slugify(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

type CountryCode = "YE" | "SA" | "AE" | "OTHER";

type CurrencyInfo = {
  code: string;
  name_ar: string;
  name_en: string;
  symbol: string;
  decimal_digits: number;
};

const CURRENCY_CATALOG: Record<string, CurrencyInfo> = {
  YER: {
    code: "YER",
    name_ar: "ريال يمني",
    name_en: "Yemeni Rial",
    symbol: "ر.ي",
    decimal_digits: 2,
  },
  SAR: {
    code: "SAR",
    name_ar: "ريال سعودي",
    name_en: "Saudi Riyal",
    symbol: "ر.س",
    decimal_digits: 2,
  },
  AED: {
    code: "AED",
    name_ar: "درهم إماراتي",
    name_en: "UAE Dirham",
    symbol: "د.إ",
    decimal_digits: 2,
  },
  USD: {
    code: "USD",
    name_ar: "دولار أمريكي",
    name_en: "US Dollar",
    symbol: "$",
    decimal_digits: 2,
  },
};

function normalizeCountry(value: unknown): CountryCode {
  const code = String(value ?? "").trim().toUpperCase();

  if (code === "YE") return "YE";
  if (code === "SA") return "SA";
  if (code === "AE") return "AE";
  if (code === "OTHER") return "OTHER";

  return "YE";
}

function normalizeCurrencyCode(value: unknown) {
  const code = String(value ?? "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : "";
}

function resolveCurrency(country: unknown) {
  const normalized = normalizeCountry(country);

  if (normalized === "YE") return "YER";
  if (normalized === "SA") return "SAR";
  if (normalized === "AE") return "AED";

  return "SAR";
}

async function ensureDefaultStoreCurrency(opts: {
  supabase: any;
  store_id: string;
  currency_code: string;
}) {
  const { supabase, store_id } = opts;
  const currencyCode = normalizeCurrencyCode(opts.currency_code) || "SAR";

  const item: CurrencyInfo = CURRENCY_CATALOG[currencyCode] ?? {
    code: currencyCode,
    name_ar: currencyCode,
    name_en: currencyCode,
    symbol: currencyCode,
    decimal_digits: 2,
  };

  const { error: clearErr } = await supabase
    .from("store_currencies")
    .update({ is_default: false })
    .eq("store_id", store_id);

  if (clearErr) {
    return {
      ok: false,
      error: `STORE_CURRENCY_CLEAR_DEFAULT_FAILED: ${clearErr.message}`,
    };
  }

  const { error: upsertErr } = await supabase.from("store_currencies").upsert(
    {
      store_id,
      currency_code: item.code,
      name_ar: item.name_ar,
      name_en: item.name_en,
      symbol: item.symbol,
      decimal_digits: item.decimal_digits,
      is_enabled: true,
      is_default: true,
      sort_order: 0,
    },
    { onConflict: "store_id,currency_code" },
  );

  if (upsertErr) {
    return {
      ok: false,
      error: `STORE_CURRENCY_UPSERT_FAILED: ${upsertErr.message}`,
    };
  }

  return { ok: true, currency_code: item.code };
}

async function storeHasOrders(opts: { supabase: any; store_id: string }) {
  const { supabase, store_id } = opts;

  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("store_id", store_id)
    .neq("status", "draft");

  if (error) return true;

  return Number(count ?? 0) > 0;
}

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function originFromInviteUrl(inviteUrl?: string) {
  try {
    if (!inviteUrl) return null;
    const u = new URL(inviteUrl);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

function isEmailVerifiedValue(value: any) {
  if (value === true) return true;
  if (!value) return false;
  if (typeof value === "object") {
    if (value.verified === true) return true;
    if (value.value === true) return true;
  }
  return false;
}

type EmailVerifyResult =
  | { ok: true; sent: true }
  | { ok: true; sent: false; skipped: "ALREADY_VERIFIED" | "RECENTLY_SENT" }
  | { ok: false; error: string };

async function sendEmailVerificationIfNeeded(opts: {
  supabase: any;
  store_id: string;
  user_id: string;
  email: string;
}): Promise<EmailVerifyResult> {
  const { supabase, store_id, user_id, email } = opts;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey) return { ok: false, error: "RESEND_API_KEY_MISSING" };
  if (!from) return { ok: false, error: "RESEND_FROM_EMAIL_MISSING" };

  const appOrigin =
    originFromInviteUrl(process.env.APP_PUBLIC_URL) ||
    originFromInviteUrl(process.env.RESEND_INVITE_URL) ||
    "http://localhost:3002";

  const { data: verifiedSetting, error: vsErr } = await supabase
    .from("store_settings")
    .select("value")
    .eq("store_id", store_id)
    .eq("slug", "auth.email_verified")
    .limit(1)
    .maybeSingle();

  if (!vsErr && isEmailVerifiedValue(verifiedSetting?.value)) {
    return { ok: true, sent: false, skipped: "ALREADY_VERIFIED" };
  }

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
    return { ok: true, sent: false, skipped: "RECENTLY_SENT" };
  }

  const token = crypto.randomBytes(24).toString("hex");
  const token_hash = sha256(token);
  const expires_at = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  await supabase
    .from("email_verifications")
    .update({ used_at: new Date().toISOString() })
    .eq("store_id", store_id)
    .eq("email", email)
    .is("used_at", null);

  const { error: insErr } = await supabase.from("email_verifications").insert({
    store_id,
    user_id,
    email,
    token_hash,
    expires_at,
  });

  if (insErr) {
    return { ok: false, error: `DB_INSERT_FAILED: ${insErr.message}` };
  }

  const verifyUrl = `${appOrigin}/auth/email/verify?token=${encodeURIComponent(
    token,
  )}`;

  const resend = new Resend(apiKey);
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
                  <img src="https://elyaia.com/logo.png" alt="Elyaia Filters" width="120" style="display:inline-block;border:0;outline:none;text-decoration:none;" />
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

  if (sendErr) {
    return { ok: false, error: `RESEND_SEND_FAILED: ${String(sendErr)}` };
  }

  return { ok: true, sent: true };
}

async function ensureDefaultTheme(opts: { supabase: any; store_id: string }) {
  const { supabase, store_id } = opts;

  const { data: existingTheme } = await supabase
    .from("store_themes")
    .select("id")
    .eq("store_id", store_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingTheme?.id) return { ok: true, created: false };

  const DEFAULT_CODE = process.env.DEFAULT_FREE_THEME_CODE || "classic";

  let { data: theme } = await supabase
    .from("themes")
    .select("id, default_settings, status, code")
    .eq("code", DEFAULT_CODE)
    .eq("status", "active")
    .maybeSingle();

  if (!theme?.id) {
    const r = await supabase
      .from("themes")
      .select("id, default_settings, status, code")
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    theme = r.data;
  }

  if (!theme?.id) {
    return { ok: false, error: "NO_ACTIVE_THEME_FOUND" };
  }

  const settings = theme.default_settings || {};

  const { error: insErr } = await supabase.from("store_themes").insert({
    store_id,
    theme_id: theme.id,
    status: "published",
    settings,
  });

  if (insErr) return { ok: false, error: insErr.message };

  return { ok: true, created: true, theme_code: theme.code };
}

async function ensureDefaultPayments(opts: { supabase: any; store_id: string }) {
  const { supabase, store_id } = opts;

  const defaults = [
    { provider_code: "card", sort_order: 10 },
    { provider_code: "apple_pay", sort_order: 20 },
    { provider_code: "tabby", sort_order: 30 },
    { provider_code: "tamara", sort_order: 40 },
    { provider_code: "emkan", sort_order: 50 },
    { provider_code: "mokafaa", sort_order: 60 },
  ];

  const { error: upErr } = await supabase.from("store_payment_methods").upsert(
    defaults.map((d) => ({
      store_id,
      provider_code: d.provider_code,
      sort_order: d.sort_order,
      enabled: false,
      status: "inactive",
      config: {},
    })),
    { onConflict: "store_id,provider_code" },
  );

  if (upErr) {
    return { ok: false, error: `PAYMENTS_UPSERT_FAILED: ${upErr.message}` };
  }

  const { error: ckErr } = await supabase.from("store_checkout_settings").upsert(
    {
      store_id,
      prefill_from_last_order: true,
      company_purchase_enabled: false,
    },
    { onConflict: "store_id" },
  );

  if (ckErr) {
    return { ok: false, error: `CHECKOUT_UPSERT_FAILED: ${ckErr.message}` };
  }

  return { ok: true };
}

async function ensureDefaultSeoUrlMode(opts: {
  supabase: any;
  store_id: string;
}) {
  const { supabase, store_id } = opts;

  const { data: existing, error: exErr } = await supabase
    .from("store_settings")
    .select("id")
    .eq("store_id", store_id)
    .eq("slug", "seo.url_mode")
    .limit(1)
    .maybeSingle();

  if (!exErr && existing?.id) return { ok: true, created: false };

  const { error: insErr } = await supabase.from("store_settings").insert({
    store_id,
    slug: "seo.url_mode",
    type: "json",
    value: { mode: "short" },
  });

  if (insErr) {
    return {
      ok: false,
      error: `SEO_URL_MODE_INSERT_FAILED: ${insErr.message}`,
    };
  }

  return { ok: true, created: true };
}

export async function POST(req: Request) {
  const cookieStore = await cookies();

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
    },
  );

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const meta: any = user.user_metadata || {};

  if (!meta.phone_verified) {
    return NextResponse.json({ error: "PHONE_NOT_VERIFIED" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const store_name = String(body.store_name || "").trim();
  const store_slug = slugify(body.store_slug || store_name);
  const country = normalizeCountry(body.country);
  const countryCurrency = resolveCurrency(country);

  if (store_name.length < 2) {
    return NextResponse.json({ error: "STORE_NAME_REQUIRED" }, { status: 400 });
  }

  if (store_slug.length < 3) {
    return NextResponse.json({ error: "STORE_SLUG_INVALID" }, { status: 400 });
  }

  const email = (user.email || "").toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "NO_EMAIL" }, { status: 400 });
  }

  const { data: existingStoreUser } = await supabase
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const existingStoreId: string | null = existingStoreUser?.store_id ?? null;

  let email_verification: any = null;
  let default_theme: any = null;
  let default_payments: any = null;

  if (!existingStoreId) {
    const currency = countryCurrency;

    const { data: storeRow, error: storeErr } = await supabase
      .from("stores")
      .insert({
        slug: store_slug,
        name: store_name,
        status: "active",
        plan: "free",
        default_currency: currency,
      })
      .select("id")
      .single();

    if (storeErr) {
      return NextResponse.json({ error: storeErr.message }, { status: 400 });
    }

    const storeId: string = storeRow.id;

    await supabase.from("store_domains").insert({
      store_id: storeId,
      domain: `${store_slug}.elyaia.com`,
      type: "subdomain",
      is_primary: true,
    });

    await supabase.from("store_users").insert({
      store_id: storeId,
      auth_user_id: user.id,
      email,
      name: meta.full_name || "Owner",
      password_hash: "supabase_auth",
      role: "owner",
      status: "active",
    });

    await supabase.from("store_settings").upsert(
      [
        {
          store_id: storeId,
          slug: "onboarding.answers",
          type: "json",
          value: {
            ...body,
            country,
            default_currency: currency,
          },
        },
        {
          store_id: storeId,
          slug: "onboarding.done",
          type: "json",
          value: { done: true, at: new Date().toISOString() },
        },
        {
          store_id: storeId,
          slug: "onboarding.loading_pending",
          type: "json",
          value: { pending: true, at: new Date().toISOString() },
        },
        {
          store_id: storeId,
          slug: "auth.verification_channel",
          type: "json",
          value: { channel: "whatsapp" },
        },
        {
          store_id: storeId,
          slug: "store.country",
          type: "json",
          value: { country, default_currency: currency },
        },
      ],
      { onConflict: "store_id,slug" },
    );

    const default_currency = await ensureDefaultStoreCurrency({
      supabase,
      store_id: storeId,
      currency_code: currency,
    });

    await ensureDefaultSeoUrlMode({ supabase, store_id: storeId });

    default_theme = await ensureDefaultTheme({ supabase, store_id: storeId });

    default_payments = await ensureDefaultPayments({
      supabase,
      store_id: storeId,
    });

    try {
      email_verification = await sendEmailVerificationIfNeeded({
        supabase,
        store_id: storeId,
        user_id: user.id,
        email,
      });
    } catch (e: any) {
      email_verification = {
        ok: false,
        error: `EMAIL_VERIFY_EXCEPTION: ${String(e?.message || e)}`,
      };
    }

    await supabase.from("audit_logs").insert({
      store_id: storeId,
      actor_type: "merchant_user",
      actor_id: user.id,
      action: "store.onboarding_completed",
      entity_type: "store",
      entity_id: storeId,
      after_data: {
        ...body,
        country,
        default_currency: currency,
        store_currency: default_currency,
        email_verification,
        default_theme,
        default_payments,
      },
    });

    return NextResponse.json({
      ok: true,
      store_id: storeId,
      country,
      default_currency: currency,
      store_currency: default_currency,
      email_verification,
      default_theme,
      default_payments,
    });
  }

  const storeId: string = existingStoreId;

  const { data: currentStore } = await supabase
    .from("stores")
    .select("default_currency")
    .eq("id", storeId)
    .maybeSingle();

  const currentDefaultCurrency =
    normalizeCurrencyCode(currentStore?.default_currency) || countryCurrency;

  const hasOrders = await storeHasOrders({ supabase, store_id: storeId });

  const finalDefaultCurrency = hasOrders
    ? currentDefaultCurrency
    : countryCurrency;

  await supabase
    .from("stores")
    .update({
      name: store_name,
      slug: store_slug,
      ...(hasOrders ? {} : { default_currency: finalDefaultCurrency }),
    })
    .eq("id", storeId);

  await supabase
    .from("store_users")
    .update({ email })
    .eq("auth_user_id", user.id)
    .eq("store_id", storeId);

  await supabase.from("store_settings").upsert(
    [
      {
        store_id: storeId,
        slug: "onboarding.answers",
        type: "json",
        value: {
          ...body,
          country,
          default_currency: finalDefaultCurrency,
        },
      },
      {
        store_id: storeId,
        slug: "onboarding.done",
        type: "json",
        value: { done: true, at: new Date().toISOString() },
      },
      {
        store_id: storeId,
        slug: "onboarding.loading_pending",
        type: "json",
        value: { pending: true, at: new Date().toISOString() },
      },
      {
        store_id: storeId,
        slug: "store.country",
        type: "json",
        value: { country, default_currency: finalDefaultCurrency },
      },
    ],
    { onConflict: "store_id,slug" },
  );

  const default_currency = await ensureDefaultStoreCurrency({
    supabase,
    store_id: storeId,
    currency_code: finalDefaultCurrency,
  });

  await ensureDefaultSeoUrlMode({ supabase, store_id: storeId });

  default_theme = await ensureDefaultTheme({ supabase, store_id: storeId });

  default_payments = await ensureDefaultPayments({
    supabase,
    store_id: storeId,
  });

  try {
    email_verification = await sendEmailVerificationIfNeeded({
      supabase,
      store_id: storeId,
      user_id: user.id,
      email,
    });
  } catch (e: any) {
    email_verification = {
      ok: false,
      error: `EMAIL_VERIFY_EXCEPTION: ${String(e?.message || e)}`,
    };
  }

  await supabase.from("audit_logs").insert({
    store_id: storeId,
    actor_type: "merchant_user",
    actor_id: user.id,
    action: "store.onboarding_completed",
    entity_type: "store",
    entity_id: storeId,
    after_data: {
      ...body,
      country,
      default_currency: finalDefaultCurrency,
      store_currency: default_currency,
      email_verification,
      default_theme,
      default_payments,
    },
  });

  return NextResponse.json({
    ok: true,
    store_id: storeId,
    country,
    default_currency: finalDefaultCurrency,
    store_currency: default_currency,
    email_verification,
    default_theme,
    default_payments,
  });
}