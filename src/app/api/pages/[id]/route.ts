// FILE: apps/merchant/src/app/api/pages/[id]/route.ts
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

function hasOwn(obj: any, key: string) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function normalizePageType(value: unknown) {
  const v = s(value);

  if (!v) return "general";
  if (v === "general") return "general";
  if (v === "privacy") return "privacy";
  if (v === "returns") return "returns";
  if (v === "return_policy") return "returns";
  if (v === "html") return "html";

  return "general";
}

function normalizeSlug(value: unknown, fallback: string) {
  const raw = s(value) || s(fallback);
  if (!raw) return "";

  return raw
    .toLowerCase()
    .replace(/^\s+|\s+$/g, "")
    .replace(/^\/+/, "")
    .replace(/^pages\/+/i, "")
    .replace(/\s+/g, "-")
    .replace(/[^\u0600-\u06FFa-z0-9-_]+/gi, "-")
    .replace(/-+/g, "-")
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
      email: null as string | null,
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

  if (!(su as any)?.store_id && email) {
    const r = await admin
      .from("store_users")
      .select("store_id")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (r.error) {
      return {
        storeId: null as string | null,
        userId,
        email,
        reason: r.error.message,
      };
    }

    su = r.data as any;
  }

  return {
    storeId: (su as any)?.store_id ? String((su as any).store_id) : null,
    userId,
    email,
    reason: "OK",
  };
}

function mapPage(row: any) {
  return {
    id: row.id,
    store_id: row.store_id,
    title: row.title,
    page_type: row.page_type,
    content: row.content,
    show_in_footer: Boolean(row.show_in_footer),
    is_active: Boolean(row.is_active),
    seo_title: row.seo_title || "",
    seo_slug: row.seo_slug || "",
    seo_description: row.seo_description || "",
    sort_order: Number(row.sort_order || 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
    href: `/pages/${row.seo_slug || row.id}`,
  };
}

const PAGE_SELECT = [
  "id",
  "store_id",
  "title",
  "page_type",
  "content",
  "show_in_footer",
  "is_active",
  "seo_title",
  "seo_slug",
  "seo_description",
  "sort_order",
  "created_at",
  "updated_at",
].join(",");

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const pageId = s(id);

    if (!pageId) return fail("PAGE_ID_REQUIRED", 400);

    const { storeId, reason } = await resolveStoreId();
    if (!storeId) return fail("NO_STORE", 403, { reason });

    const admin = supabaseAdmin();

    const { data, error } = await admin
      .from("store_pages")
      .select(PAGE_SELECT)
      .eq("store_id", storeId)
      .eq("id", pageId)
      .limit(1)
      .maybeSingle();

    if (error) return fail("PAGE_GET_FAILED", 500, error.message);
    if (!data) return fail("PAGE_NOT_FOUND", 404);

    return NextResponse.json({
      ok: true,
      page: mapPage(data as any),
    });
  } catch (e: any) {
    return fail("UNHANDLED_ERROR", 500, String(e?.message || e));
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const pageId = s(id);

    if (!pageId) return fail("PAGE_ID_REQUIRED", 400);

    const { storeId, reason } = await resolveStoreId();
    if (!storeId) return fail("NO_STORE", 403, { reason });

    const body = (await req.json().catch(() => null)) as any;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return fail("BAD_JSON", 400);
    }

    const admin = supabaseAdmin();

    const { data: existingData, error: existingError } = await admin
      .from("store_pages")
      .select(PAGE_SELECT)
      .eq("store_id", storeId)
      .eq("id", pageId)
      .limit(1)
      .maybeSingle();

    if (existingError) {
      return fail("PAGE_LOOKUP_FAILED", 500, existingError.message);
    }

    const existing: any = existingData;

    if (!existing?.id) {
      return fail("PAGE_NOT_FOUND", 404);
    }

    const nextTitle = hasOwn(body, "title") ? s(body.title) : s(existing.title);

    const nextContent = hasOwn(body, "content")
      ? String(body.content ?? "")
      : String(existing.content ?? "");

    const nextPageType = hasOwn(body, "page_type")
      ? normalizePageType(body.page_type)
      : normalizePageType(existing.page_type);

    const nextSeoTitle = hasOwn(body, "seo_title")
      ? s(body.seo_title) || nextTitle
      : s(existing.seo_title) || nextTitle;

    const nextSeoSlug =
      hasOwn(body, "seo_slug") || hasOwn(body, "title")
        ? normalizeSlug(body.seo_slug, nextTitle)
        : normalizeSlug(existing.seo_slug, nextTitle);

    const nextSeoDescription = hasOwn(body, "seo_description")
      ? s(body.seo_description)
      : s(existing.seo_description);

    const nextShowInFooter = hasOwn(body, "show_in_footer")
      ? bool(body.show_in_footer, true)
      : bool(existing.show_in_footer, true);

    const nextIsActive = hasOwn(body, "is_active")
      ? bool(body.is_active, true)
      : bool(existing.is_active, true);

    const nextSortOrder = hasOwn(body, "sort_order")
      ? num(body.sort_order, 0)
      : num(existing.sort_order, 0);

    if (!nextTitle) return fail("TITLE_REQUIRED", 400);
    if (!nextSeoSlug) return fail("SEO_SLUG_REQUIRED", 400);

    const { data: duplicateData, error: duplicateError } = await admin
      .from("store_pages")
      .select("id")
      .eq("store_id", storeId)
      .eq("seo_slug", nextSeoSlug)
      .neq("id", pageId)
      .limit(1)
      .maybeSingle();

    if (duplicateError) {
      return fail("PAGE_DUPLICATE_CHECK_FAILED", 500, duplicateError.message);
    }

    const duplicate: any = duplicateData;

    if (duplicate?.id) {
      return fail("SEO_SLUG_ALREADY_EXISTS", 409);
    }

    const payload = {
      title: nextTitle,
      page_type: nextPageType,
      content: nextContent,
      show_in_footer: nextShowInFooter,
      is_active: nextIsActive,
      seo_title: nextSeoTitle,
      seo_slug: nextSeoSlug,
      seo_description: nextSeoDescription,
      sort_order: nextSortOrder,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await admin
      .from("store_pages")
      .update(payload)
      .eq("store_id", storeId)
      .eq("id", pageId)
      .select(PAGE_SELECT)
      .single();

    if (error) {
      return fail("PAGE_UPDATE_FAILED", 500, error.message);
    }

    return NextResponse.json({
      ok: true,
      page: mapPage(data as any),
    });
  } catch (e: any) {
    return fail("UNHANDLED_ERROR", 500, String(e?.message || e));
  }
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return PATCH(req, ctx);
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const pageId = s(id);

    if (!pageId) return fail("PAGE_ID_REQUIRED", 400);

    const { storeId, reason } = await resolveStoreId();
    if (!storeId) return fail("NO_STORE", 403, { reason });

    const admin = supabaseAdmin();

    const { error } = await admin
      .from("store_pages")
      .delete()
      .eq("store_id", storeId)
      .eq("id", pageId);

    if (error) return fail("PAGE_DELETE_FAILED", 500, error.message);

    return NextResponse.json({
      ok: true,
    });
  } catch (e: any) {
    return fail("UNHANDLED_ERROR", 500, String(e?.message || e));
  }
}