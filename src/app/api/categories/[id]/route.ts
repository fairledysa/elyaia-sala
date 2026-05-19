// FILE: apps/merchant/src/app/api/categories/[id]/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Ctx = {
  params: Promise<{ id: string }> | { id: string };
};

async function getParamId(ctx: Ctx) {
  const params = await ctx.params;
  return params.id;
}

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

async function buildPathAndDepth({
  sb,
  storeId,
  parentId,
}: {
  sb: ReturnType<typeof supabaseAdmin>;
  storeId: string;
  parentId: string | null;
}) {
  if (!parentId) {
    return {
      depth: 1,
      path: "/",
    };
  }

  const { data: parent, error } = await sb
    .from("categories")
    .select("id, depth, path, slug")
    .eq("store_id", storeId)
    .eq("id", parentId)
    .single();

  if (error || !parent) {
    throw new Error(error?.message || "PARENT_NOT_FOUND");
  }

  const parentDepth = parent.depth ?? 1;
  const parentPath = parent.path ?? "/";
  const parentSlug = parent.slug ?? "";

  const depth = parentDepth + 1;

  if (depth > 6) {
    throw new Error("MAX_DEPTH_EXCEEDED");
  }

  const path =
    parentPath === "/" ? `/${parentSlug}` : `${parentPath}/${parentSlug}`;

  return {
    depth,
    path,
  };
}

async function getPrimaryCategoryImage({
  sb,
  storeId,
  categoryId,
}: {
  sb: ReturnType<typeof supabaseAdmin>;
  storeId: string;
  categoryId: string;
}) {
  const { data, error } = await sb
    .from("category_media")
    .select("url")
    .eq("store_id", storeId)
    .eq("category_id", categoryId)
    .eq("is_primary", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data?.url ?? null;
}

async function setPrimaryCategoryImage({
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

  if (!cleanUrl) {
    const { error } = await sb
      .from("category_media")
      .delete()
      .eq("store_id", storeId)
      .eq("category_id", categoryId)
      .eq("is_primary", true);

    if (error) throw new Error(error.message);
    return null;
  }

  const { data: existing, error: existingError } = await sb
    .from("category_media")
    .select("id")
    .eq("store_id", storeId)
    .eq("category_id", categoryId)
    .eq("is_primary", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  if (existing?.id) {
    const { error } = await sb
      .from("category_media")
      .update({
        url: cleanUrl,
        alt,
        sort_order: 0,
        is_primary: true,
        updated_at: new Date().toISOString(),
      })
      .eq("store_id", storeId)
      .eq("id", existing.id);

    if (error) throw new Error(error.message);
    return cleanUrl;
  }

  const { error } = await sb.from("category_media").insert({
    store_id: storeId,
    category_id: categoryId,
    url: cleanUrl,
    alt,
    sort_order: 0,
    is_primary: true,
  });

  if (error) throw new Error(error.message);

  return cleanUrl;
}

async function updateDescendantPaths({
  sb,
  storeId,
  categoryId,
}: {
  sb: ReturnType<typeof supabaseAdmin>;
  storeId: string;
  categoryId: string;
}) {
  const { data: allRows, error } = await sb
    .from("categories")
    .select("id, parent_id, slug, depth, path")
    .eq("store_id", storeId);

  if (error) throw new Error(error.message);

  const rows = allRows ?? [];
  const map = new Map(rows.map((row) => [row.id, row]));
  const childrenMap = new Map<string, typeof rows>();

  for (const row of rows) {
    if (!row.parent_id) continue;

    const list = childrenMap.get(row.parent_id) ?? [];
    list.push(row);
    childrenMap.set(row.parent_id, list);
  }

  async function walk(parentId: string) {
    const parent = map.get(parentId);
    if (!parent) return;

    const children = childrenMap.get(parentId) ?? [];

    for (const child of children) {
      const nextDepth = (parent.depth ?? 1) + 1;

      if (nextDepth > 6) {
        throw new Error("MAX_DEPTH_EXCEEDED");
      }

      const nextPath =
        parent.path === "/"
          ? `/${parent.slug ?? ""}`
          : `${parent.path}/${parent.slug ?? ""}`;

      const { error: updateError } = await sb
        .from("categories")
        .update({
          depth: nextDepth,
          path: nextPath,
          updated_at: new Date().toISOString(),
        })
        .eq("store_id", storeId)
        .eq("id", child.id);

      if (updateError) throw new Error(updateError.message);

      map.set(child.id, {
        ...child,
        depth: nextDepth,
        path: nextPath,
      });

      await walk(child.id);
    }
  }

  await walk(categoryId);
}

async function assertValidParent({
  sb,
  storeId,
  categoryId,
  parentId,
}: {
  sb: ReturnType<typeof supabaseAdmin>;
  storeId: string;
  categoryId: string;
  parentId: string | null;
}) {
  if (!parentId) return;

  if (parentId === categoryId) {
    throw new Error("CATEGORY_CANNOT_BE_PARENT_OF_ITSELF");
  }

  const { data: rows, error } = await sb
    .from("categories")
    .select("id, parent_id")
    .eq("store_id", storeId);

  if (error) throw new Error(error.message);

  const map = new Map((rows ?? []).map((row) => [row.id, row.parent_id]));

  let currentParentId: string | null | undefined = parentId;

  while (currentParentId) {
    if (currentParentId === categoryId) {
      throw new Error("INVALID_PARENT_CYCLE");
    }

    currentParentId = map.get(currentParentId) ?? null;
  }
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const id = await getParamId(ctx);
    const storeId = await getStoreIdFromSession();
    const sb = supabaseAdmin();

    const { data, error } = await sb
      .from("categories")
      .select(
        "id, parent_id, name, slug, status, sort_order, depth, path, created_at, updated_at",
      )
      .eq("store_id", storeId)
      .eq("id", id)
      .single();

    if (error) throw new Error(error.message);

    const imageUrl = await getPrimaryCategoryImage({
      sb,
      storeId,
      categoryId: id,
    });

    return NextResponse.json({
      data: {
        ...data,
        image_url: imageUrl,
      },
    });
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

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const id = await getParamId(ctx);
    const storeId = await getStoreIdFromSession();
    const body = await req.json();

    const sb = supabaseAdmin();

    const { data: old, error: oldError } = await sb
      .from("categories")
      .select("id, parent_id, name, slug, depth, path")
      .eq("store_id", storeId)
      .eq("id", id)
      .single();

    if (oldError || !old) {
      throw new Error(oldError?.message || "CATEGORY_NOT_FOUND");
    }

    const patch: any = {
      updated_at: new Date().toISOString(),
    };

    let nextName = old.name;

    if (typeof body.name === "string") {
      const cleanName = body.name.trim();

      if (!cleanName) {
        return NextResponse.json(
          { error: "اسم القسم مطلوب" },
          { status: 400 },
        );
      }

      patch.name = cleanName;
      nextName = cleanName;
    }

    if (typeof body.status === "string") {
      patch.status = body.status;
    }

    if (Number.isFinite(Number(body.sort_order))) {
      patch.sort_order = Number(body.sort_order);
    }

    if (typeof body.slug === "string" && body.slug.trim()) {
      patch.slug = slugify(body.slug);
    } else if (typeof body.name === "string" && body.name.trim()) {
      patch.slug = slugify(body.name);
    }

    const parentChanged = body.parent_id !== undefined;

    const nextParentId: string | null = parentChanged
      ? body.parent_id || null
      : old.parent_id ?? null;

    if (parentChanged) {
      await assertValidParent({
        sb,
        storeId,
        categoryId: id,
        parentId: nextParentId,
      });

      const { depth, path } = await buildPathAndDepth({
        sb,
        storeId,
        parentId: nextParentId,
      });

      patch.parent_id = nextParentId;
      patch.depth = depth;
      patch.path = path;
    }

    const { data, error } = await sb
      .from("categories")
      .update(patch)
      .eq("store_id", storeId)
      .eq("id", id)
      .select(
        "id, parent_id, name, slug, status, sort_order, depth, path, created_at, updated_at",
      )
      .single();

    if (error) throw new Error(error.message);

    if (parentChanged || patch.slug) {
      await updateDescendantPaths({
        sb,
        storeId,
        categoryId: id,
      });
    }

    let imageUrl = await getPrimaryCategoryImage({
      sb,
      storeId,
      categoryId: id,
    });

    if (body.image_url !== undefined) {
      imageUrl = await setPrimaryCategoryImage({
        sb,
        storeId,
        categoryId: id,
        imageUrl:
          typeof body.image_url === "string" && body.image_url.trim()
            ? body.image_url.trim()
            : null,
        alt: nextName,
      });
    }

    return NextResponse.json({
      data: {
        ...data,
        image_url: imageUrl,
      },
    });
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
                : message === "INVALID_PARENT_CYCLE"
                  ? 400
                  : message === "CATEGORY_CANNOT_BE_PARENT_OF_ITSELF"
                    ? 400
                    : 500,
      },
    );
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const id = await getParamId(ctx);
    const storeId = await getStoreIdFromSession();
    const sb = supabaseAdmin();

    const { data: children, error: childrenError } = await sb
      .from("categories")
      .select("id")
      .eq("store_id", storeId)
      .eq("parent_id", id)
      .limit(1);

    if (childrenError) throw new Error(childrenError.message);

    if ((children ?? []).length > 0) {
      return NextResponse.json(
        { error: "لا يمكن حذف قسم يحتوي على فروع" },
        { status: 400 },
      );
    }

    const { error: mediaError } = await sb
      .from("category_media")
      .delete()
      .eq("store_id", storeId)
      .eq("category_id", id);

    if (mediaError) throw new Error(mediaError.message);

    const { error } = await sb
      .from("categories")
      .delete()
      .eq("store_id", storeId)
      .eq("id", id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
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