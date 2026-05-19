// FILE: apps/merchant/src/app/api/brands/[id]/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";

function ok(data: any, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}
function fail(error: string, status = 400, details?: any) {
  return NextResponse.json({ ok: false, error, details }, { status });
}

async function getStoreIdOrThrow() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } },
  );

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) throw new Error("UNAUTHENTICATED");

  const sb = supabaseAdmin();
  const { data: storeUser, error } = await sb
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (error || !storeUser?.store_id) throw new Error("STORE_NOT_FOUND");
  return String(storeUser.store_id);
}

function shapeBrand(row: any) {
  const meta = row?.metadata || {};
  const seo = meta?.seo || {};
  return {
    id: row.id,
    store_id: row.store_id,
    name: row.name,
    description: row.description ?? null,
    logo_url: row.logo_url ?? null,
    banner_url: row.banner_url ?? null,
    seo_title: seo.title ?? null,
    seo_slug: seo.slug ?? null,
    seo_description: seo.description ?? null,
    is_active: row.status ?? true,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function getExisting(sb: any, id: string, store_id: string) {
  const { data, error } = await sb
    .from("brands")
    .select("id,metadata")
    .eq("id", id)
    .eq("store_id", store_id)
    .single();
  if (error) throw new Error("BRAND_NOT_FOUND");
  return data;
}

// Payload UI -> DB مع merge للـ metadata الحالي
function buildDbPayload(body: any, store_id: string, existingMeta: any) {
  const payload: any = {};

  if (typeof body?.name !== "undefined")
    payload.name = String(body.name).trim();
  if (typeof body?.description !== "undefined")
    payload.description = body.description ? String(body.description) : null;

  if (typeof body?.logo_url !== "undefined")
    payload.logo_url = body.logo_url ? String(body.logo_url) : null;

  if (typeof body?.banner_url !== "undefined")
    payload.banner_url = body.banner_url ? String(body.banner_url) : null;

  if (typeof body?.is_active !== "undefined")
    payload.status = Boolean(body.is_active);

  const hasSeo =
    typeof body?.seo_title !== "undefined" ||
    typeof body?.seo_slug !== "undefined" ||
    typeof body?.seo_description !== "undefined";

  if (hasSeo) {
    const prev = existingMeta || {};
    const prevSeo = prev?.seo || {};

    const nextSeo: any = { ...prevSeo };
    if (typeof body?.seo_title !== "undefined")
      nextSeo.title = body.seo_title ? String(body.seo_title) : null;
    if (typeof body?.seo_slug !== "undefined")
      nextSeo.slug = body.seo_slug ? String(body.seo_slug) : null;
    if (typeof body?.seo_description !== "undefined")
      nextSeo.description = body.seo_description
        ? String(body.seo_description)
        : null;

    payload.metadata = { ...prev, seo: nextSeo };
  }

  // مهم: store_id للـ where فقط (مو لازم نحدثه)
  return payload;
}

// ✅ Next 15/16: params Promise
type Ctx = { params: Promise<{ id: string }> };

async function getId(ctx: Ctx) {
  const { id } = await ctx.params;
  return String(id || "").trim();
}

export async function PUT(req: Request, ctx: Ctx) {
  try {
    const id = await getId(ctx);
    if (!id) return fail("ID_REQUIRED", 400);

    const store_id = await getStoreIdOrThrow();
    const sb = supabaseAdmin();

    const body = await req.json().catch(() => ({}));
    const cleanName =
      typeof body?.name === "undefined" ? "" : String(body.name).trim();
    if (!cleanName) return fail("NAME_REQUIRED", 400);

    const existing = await getExisting(sb, id, store_id);
    const dbPayload = buildDbPayload(
      { ...body, name: cleanName },
      store_id,
      existing.metadata,
    );

    const { data, error } = await sb
      .from("brands")
      .update(dbPayload)
      .eq("id", id)
      .eq("store_id", store_id)
      .select(
        "id,store_id,name,description,logo_url,banner_url,metadata,status,created_at,updated_at",
      )
      .single();

    if (error) return fail("DB_UPDATE_ERROR", 500, { error, dbPayload, id });
    return ok({ item: shapeBrand(data) });
  } catch (e: any) {
    return fail("BRANDS_PUT_ERROR", 500, String(e?.message || e));
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const id = await getId(ctx);
    if (!id) return fail("ID_REQUIRED", 400);

    const store_id = await getStoreIdOrThrow();
    const sb = supabaseAdmin();

    const body = await req.json().catch(() => ({}));
    const existing = await getExisting(sb, id, store_id);

    const dbPayload = buildDbPayload(body, store_id, existing.metadata);

    // لا تحدث لو مافي حقول
    if (!Object.keys(dbPayload).length) return fail("NO_FIELDS", 400);

    const { data, error } = await sb
      .from("brands")
      .update(dbPayload)
      .eq("id", id)
      .eq("store_id", store_id)
      .select(
        "id,store_id,name,description,logo_url,banner_url,metadata,status,created_at,updated_at",
      )
      .single();

    if (error) return fail("DB_PATCH_ERROR", 500, { error, dbPayload, id });
    return ok({ item: shapeBrand(data) });
  } catch (e: any) {
    return fail("BRANDS_PATCH_ERROR", 500, String(e?.message || e));
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const id = await getId(ctx);
    if (!id) return fail("ID_REQUIRED", 400);

    const store_id = await getStoreIdOrThrow();
    const sb = supabaseAdmin();

    const { error } = await sb
      .from("brands")
      .delete()
      .eq("id", id)
      .eq("store_id", store_id);

    if (error) return fail("DB_DELETE_ERROR", 500, { error, id });
    return ok({ id });
  } catch (e: any) {
    return fail("BRANDS_DELETE_ERROR", 500, String(e?.message || e));
  }
}
