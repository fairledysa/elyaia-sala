// FILE: apps/merchant/src/app/api/pages/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
 
import { supabaseAdmin } from "@/lib/supabase/admin";
function fail(error: string, status = 400, details?: any) {
  return NextResponse.json({ ok: false, error, details }, { status });
}

function s(value: unknown) {
  return String(value ?? "").trim();
}

function bool(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  return fallback;
}

function num(value: unknown, fallback = 0) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

function normalizePageType(value: unknown) {
  const v = s(value);
  if (!v) return "general";

  if (v === "general") return "general";
  if (v === "terms") return "terms";
  if (v === "privacy") return "privacy";
  if (v === "return_policy") return "return_policy";
  if (v === "shipping_policy") return "shipping_policy";
  if (v === "html") return "html";

  return v;
}

function normalizeSlug(value: unknown, fallback: string) {
  const raw = s(value) || s(fallback);
  if (!raw) return "";

  return raw
    .toLowerCase()
    .replace(/[\\?#%]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/\/+/g, "-")
    .replace(/^-+|-+$/g, "");
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
    },
  );

  const { data: au, error: auErr } = await supabase.auth.getUser();

  if (auErr || !au?.user) {
    return {
      storeId: null as string | null,
      userId: null as string | null,
      email: "",
      reason: "NO_USER",
    };
  }

  const userId = au.user.id;
  const email = String(au.user.email || "").toLowerCase();

  const admin = supabaseAdmin();

  let { data: su, error: suErr } = await admin
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (suErr) {
    return {
      storeId: null as string | null,
      userId,
      email,
      reason: suErr.message,
    };
  }

  if (!su?.store_id && email) {
    const r = await admin
      .from("store_users")
      .select("store_id")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    su = r.data as any;
  }

  return {
    storeId: su?.store_id ? String(su.store_id) : null,
    userId,
    email,
    reason: "OK",
  };
}

export async function GET(req: Request) {
  try {
    const { storeId, reason } = await resolveStoreId();
    if (!storeId) return fail("NO_STORE", 403, { reason });

    const url = new URL(req.url);

    const q = s(url.searchParams.get("q"));
    const status = s(url.searchParams.get("status"));
    const footer = s(url.searchParams.get("footer"));

    const admin = supabaseAdmin();

    let query = admin
      .from("store_pages")
      .select(
        `
        id,
        store_id,
        title,
        page_type,
        content,
        show_in_footer,
        is_active,
        seo_title,
        seo_slug,
        seo_description,
        sort_order,
        created_at,
        updated_at
      `,
      )
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (q) {
      query = query.or(
        `title.ilike.%${q}%,seo_slug.ilike.%${q}%,seo_title.ilike.%${q}%`,
      );
    }

    if (status === "active") {
      query = query.eq("is_active", true);
    }

    if (status === "inactive") {
      query = query.eq("is_active", false);
    }

    if (footer === "true") {
      query = query.eq("show_in_footer", true);
    }

    if (footer === "false") {
      query = query.eq("show_in_footer", false);
    }

    const { data, error } = await query;

    if (error) {
      return fail("PAGES_LIST_FAILED", 500, error.message);
    }

    return NextResponse.json({
      ok: true,
      pages: Array.isArray(data) ? data : [],
    });
  } catch (e: any) {
    return fail("UNHANDLED_ERROR", 500, String(e?.message || e));
  }
}

export async function POST(req: Request) {
  try {
    const { storeId, reason } = await resolveStoreId();
    if (!storeId) return fail("NO_STORE", 403, { reason });

    const body = (await req.json().catch(() => null)) as any;
    if (!body) return fail("BAD_JSON", 400);

    const title = s(body.title);
    if (!title) return fail("TITLE_REQUIRED", 400);

    const pageType = normalizePageType(body.page_type);
    const content = String(body.content ?? "");

    const seoTitle = s(body.seo_title) || title;
    const seoSlug = normalizeSlug(body.seo_slug, title);
    const seoDescription = s(body.seo_description);

    if (!seoSlug) return fail("SEO_SLUG_REQUIRED", 400);

    const admin = supabaseAdmin();

    const { data: exists, error: existsErr } = await admin
      .from("store_pages")
      .select("id")
      .eq("store_id", storeId)
      .eq("seo_slug", seoSlug)
      .limit(1)
      .maybeSingle();

    if (existsErr) {
      return fail("PAGE_SLUG_CHECK_FAILED", 500, existsErr.message);
    }

    if (exists?.id) {
      return fail("PAGE_SLUG_ALREADY_EXISTS", 409);
    }

    const payload = {
      store_id: storeId,
      title,
      page_type: pageType,
      content,
      show_in_footer: bool(body.show_in_footer, true),
      is_active: bool(body.is_active, true),
      seo_title: seoTitle || null,
      seo_slug: seoSlug || null,
      seo_description: seoDescription || null,
      sort_order: num(body.sort_order, 0),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await admin
      .from("store_pages")
      .insert(payload)
      .select(
        `
        id,
        store_id,
        title,
        page_type,
        content,
        show_in_footer,
        is_active,
        seo_title,
        seo_slug,
        seo_description,
        sort_order,
        created_at,
        updated_at
      `,
      )
      .single();

    if (error) {
      return fail("PAGE_INSERT_FAILED", 500, error.message);
    }

    return NextResponse.json({
      ok: true,
      page: data,
    });
  } catch (e: any) {
    return fail("UNHANDLED_ERROR", 500, String(e?.message || e));
  }
}