// FILE: apps/merchant/src/app/api/categories/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[^\u0600-\u06FFa-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/* 🔐 جلب store_id من الجلسة */
async function getStoreIdFromSession() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
      },
    },
  );

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("UNAUTHENTICATED");

  const { data, error } = await supabase
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (error || !data) throw new Error("STORE_NOT_FOUND");

  return data.store_id;
}

async function buildPathAndDepth(
  sb: ReturnType<typeof supabaseAdmin>,
  storeId: string,
  parentId: string | null,
) {
  if (!parentId) return { depth: 1, path: "/" };

  const { data: parent, error } = await sb
    .from("categories")
    .select("depth, path, slug")
    .eq("store_id", storeId)
    .eq("id", parentId)
    .single();

  if (error || !parent) {
    throw new Error(error?.message || "PARENT_NOT_FOUND");
  }

  const nextDepth = (parent.depth ?? 1) + 1;

  if (nextDepth > 6) {
    throw new Error("MAX_DEPTH_EXCEEDED");
  }

  const nextPath =
    parent.path === "/" ? `/${parent.slug}` : `${parent.path}/${parent.slug}`;

  return { depth: nextDepth, path: nextPath };
}

async function attachCategoryImages({
  sb,
  storeId,
  rows,
}: {
  sb: ReturnType<typeof supabaseAdmin>;
  storeId: string;
  rows: any[];
}) {
  const ids = rows.map((row) => row.id).filter(Boolean);

  if (ids.length === 0) return rows;

  const { data: media, error } = await sb
    .from("category_media")
    .select("category_id, url")
    .eq("store_id", storeId)
    .eq("is_primary", true)
    .in("category_id", ids)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  const imageMap = new Map<string, string>();

  for (const item of media ?? []) {
    if (!imageMap.has(item.category_id)) {
      imageMap.set(item.category_id, item.url);
    }
  }

  return rows.map((row) => ({
    ...row,
    image_url: imageMap.get(row.id) ?? null,
  }));
}

async function savePrimaryCategoryImage({
  sb,
  storeId,
  categoryId,
  imageUrl,
  alt,
}: {
  sb: ReturnType<typeof supabaseAdmin>;
  storeId: string;
  categoryId: string;
  imageUrl: string | null;
  alt: string;
}) {
  const cleanUrl = typeof imageUrl === "string" ? imageUrl.trim() : "";

  if (!cleanUrl) return;

  const { error } = await sb.from("category_media").insert({
    store_id: storeId,
    category_id: categoryId,
    url: cleanUrl,
    alt,
    sort_order: 0,
    is_primary: true,
  });

  if (error) throw new Error(error.message);
}

/* ===================== GET ===================== */
export async function GET() {
  try {
    const storeId = await getStoreIdFromSession();
    const sb = supabaseAdmin();

    const { data, error } = await sb
      .from("categories")
      .select(
        "id, parent_id, name, slug, status, sort_order, depth, path, created_at",
      )
      .eq("store_id", storeId)
      .order("sort_order")
      .order("created_at");

    if (error) throw error;

    const rows = await attachCategoryImages({
      sb,
      storeId,
      rows: data ?? [],
    });

    return NextResponse.json({ data: rows });
  } catch (e: any) {
    const message = e?.message ?? "Unknown error";

    return NextResponse.json(
      { error: message },
      {
        status:
          message === "UNAUTHENTICATED"
            ? 401
            : message === "STORE_NOT_FOUND"
              ? 403
              : 500,
      },
    );
  }
}

/* ===================== POST ===================== */
export async function POST(req: Request) {
  try {
    const storeId = await getStoreIdFromSession();
    const body = await req.json();

    const name = (body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }

    const parentId = body.parent_id ?? null;
    const status = body.status ?? "active";
    const sortOrder = Number.isFinite(Number(body.sort_order))
      ? Number(body.sort_order)
      : 0;

    const imageUrl =
      typeof body.image_url === "string" && body.image_url.trim()
        ? body.image_url.trim()
        : null;

    const sb = supabaseAdmin();

    const slug = slugify(body.slug?.trim?.() || name);
    const { depth, path } = await buildPathAndDepth(sb, storeId, parentId);

    const { data, error } = await sb
      .from("categories")
      .insert({
        store_id: storeId,
        parent_id: parentId,
        name,
        slug,
        status,
        sort_order: sortOrder,
        depth,
        path,
      })
      .select(
        "id, parent_id, name, slug, status, sort_order, depth, path, created_at",
      )
      .single();

    if (error) throw error;

    await savePrimaryCategoryImage({
      sb,
      storeId,
      categoryId: data.id,
      imageUrl,
      alt: name,
    });

    return NextResponse.json(
      {
        data: {
          ...data,
          image_url: imageUrl,
        },
      },
      { status: 201 },
    );
  } catch (e: any) {
    const message = e?.message ?? "Unknown error";

    return NextResponse.json(
      { error: message },
      {
        status:
          message === "UNAUTHENTICATED"
            ? 401
            : message === "STORE_NOT_FOUND"
              ? 403
              : message === "MAX_DEPTH_EXCEEDED"
                ? 400
                : 500,
      },
    );
  }
}