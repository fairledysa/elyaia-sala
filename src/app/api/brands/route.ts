// FILE: apps/merchant/src/app/api/brands/route.ts
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
    {
      cookies: { get: (name) => cookieStore.get(name)?.value },
    },
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

// نحول Row DB -> الشكل اللي يبيه الـ UI (Brand type عندك)
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

// نحول Payload UI -> أعمدة DB الفعلية
function buildDbPayload(body: any, store_id: string) {
  const payload: any = { store_id };

  if (typeof body?.name !== "undefined")
    payload.name = String(body.name).trim();
  if (typeof body?.description !== "undefined")
    payload.description = body.description ? String(body.description) : null;

  if (typeof body?.logo_url !== "undefined")
    payload.logo_url = body.logo_url ? String(body.logo_url) : null;

  if (typeof body?.banner_url !== "undefined")
    payload.banner_url = body.banner_url ? String(body.banner_url) : null;

  // ✅ is_active -> status (عمود موجود)
  if (typeof body?.is_active !== "undefined")
    payload.status = Boolean(body.is_active);

  // ✅ seo_* -> metadata.seo (jsonb موجود)
  const hasSeo =
    typeof body?.seo_title !== "undefined" ||
    typeof body?.seo_slug !== "undefined" ||
    typeof body?.seo_description !== "undefined";

  if (hasSeo) {
    const title =
      typeof body?.seo_title === "undefined"
        ? undefined
        : body.seo_title
          ? String(body.seo_title)
          : null;
    const slug =
      typeof body?.seo_slug === "undefined"
        ? undefined
        : body.seo_slug
          ? String(body.seo_slug)
          : null;
    const description =
      typeof body?.seo_description === "undefined"
        ? undefined
        : body.seo_description
          ? String(body.seo_description)
          : null;

    // نكتب seo داخل metadata (بدون ما نكسر أي metadata موجودة)
    payload.metadata = {
      ...(body?.metadata && typeof body.metadata === "object"
        ? body.metadata
        : {}),
      seo: { title, slug, description },
    };
  }

  return payload;
}

export async function GET() {
  try {
    const store_id = await getStoreIdOrThrow();
    const sb = supabaseAdmin();

    const { data, error } = await sb
      .from("brands")
      .select(
        "id,store_id,name,description,logo_url,banner_url,metadata,status,created_at,updated_at",
      )
      .eq("store_id", store_id)
      .order("name", { ascending: true });

    if (error) return fail("DB_SELECT_ERROR", 500, error);
    return ok({ items: (data || []).map(shapeBrand) });
  } catch (e: any) {
    return fail("BRANDS_GET_ERROR", 500, String(e?.message || e));
  }
}

export async function POST(req: Request) {
  try {
    const store_id = await getStoreIdOrThrow();
    const sb = supabaseAdmin();

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim();
    if (!name) return fail("NAME_REQUIRED", 400);

    const dbPayload = buildDbPayload({ ...body, name }, store_id);

    const { data, error } = await sb
      .from("brands")
      .insert(dbPayload)
      .select(
        "id,store_id,name,description,logo_url,banner_url,metadata,status,created_at,updated_at",
      )
      .single();

    if (error) return fail("DB_INSERT_ERROR", 500, { error, dbPayload });
    return ok({ item: shapeBrand(data) }, 201);
  } catch (e: any) {
    return fail("BRANDS_POST_ERROR", 500, String(e?.message || e));
  }
}
