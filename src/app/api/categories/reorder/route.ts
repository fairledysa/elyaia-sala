// FILE: apps/merchant/src/app/api/categories/reorder/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ReorderItem = {
  id: string;
  parent_id: string | null;
  sort_order: number;
};

type CurrentCategory = {
  id: string;
  parent_id: string | null;
  slug: string;
  sort_order: number;
  depth: number;
  path: string;
  name: string;
  status: string;
};

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

function normalizeItems(items: ReorderItem[]) {
  return items.map((item, index) => ({
    id: String(item.id || "").trim(),
    parent_id: item.parent_id ? String(item.parent_id).trim() : null,
    sort_order: Number.isFinite(Number(item.sort_order))
      ? Number(item.sort_order)
      : index,
  }));
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  try {
    const storeId = await getStoreIdFromSession();
    const body = await req.json();

    const rawItems = Array.isArray(body?.items)
      ? (body.items as ReorderItem[])
      : [];

    if (rawItems.length === 0) {
      return errorResponse("items required", 400);
    }

    const items = normalizeItems(rawItems);
    const sb = supabaseAdmin();

    const { data: current, error: currentError } = await sb
      .from("categories")
      .select("id, parent_id, slug, sort_order, depth, path, name, status")
      .eq("store_id", storeId);

    if (currentError) throw new Error(currentError.message);

    const currentRows = (current ?? []) as CurrentCategory[];
    const currentMap = new Map(currentRows.map((row) => [row.id, row]));

    if (items.length !== currentRows.length) {
      return errorResponse("reorder items mismatch", 400);
    }

    const seenIds = new Set<string>();

    for (const item of items) {
      if (!item.id) {
        return errorResponse("invalid category id", 400);
      }

      if (seenIds.has(item.id)) {
        return errorResponse("duplicate category id", 400);
      }

      seenIds.add(item.id);

      if (!currentMap.has(item.id)) {
        return errorResponse("invalid category id", 400);
      }

      if (item.parent_id && !currentMap.has(item.parent_id)) {
        return errorResponse("invalid parent id", 400);
      }

      if (item.parent_id === item.id) {
        return errorResponse("category cannot be parent of itself", 400);
      }
    }

    const parentMap = new Map<string, string | null>();

    for (const item of items) {
      parentMap.set(item.id, item.parent_id ?? null);
    }

    const visiting = new Set<string>();
    const visited = new Set<string>();

    function assertNoCycle(id: string) {
      if (visited.has(id)) return;

      if (visiting.has(id)) {
        throw new Error("INVALID_TREE_CYCLE");
      }

      visiting.add(id);

      const parentId = parentMap.get(id);
      if (parentId) {
        assertNoCycle(parentId);
      }

      visiting.delete(id);
      visited.add(id);
    }

    for (const item of items) {
      assertNoCycle(item.id);
    }

    const childrenMap = new Map<string, ReorderItem[]>();
    const roots: ReorderItem[] = [];

    for (const item of items) {
      const parentId = item.parent_id ?? null;

      if (!parentId) {
        roots.push(item);
        continue;
      }

      const list = childrenMap.get(parentId) ?? [];
      list.push(item);
      childrenMap.set(parentId, list);
    }

    function sortByOrderThenName(a: ReorderItem, b: ReorderItem) {
      const orderA = Number.isFinite(Number(a.sort_order))
        ? Number(a.sort_order)
        : 0;
      const orderB = Number.isFinite(Number(b.sort_order))
        ? Number(b.sort_order)
        : 0;

      if (orderA !== orderB) return orderA - orderB;

      const rowA = currentMap.get(a.id);
      const rowB = currentMap.get(b.id);

      return String(rowA?.name || "").localeCompare(
        String(rowB?.name || ""),
        "ar",
      );
    }

    roots.sort(sortByOrderThenName);

    for (const [parentId, list] of childrenMap.entries()) {
      list.sort(sortByOrderThenName);
      childrenMap.set(parentId, list);
    }

    const computed = new Map<
      string,
      {
        parent_id: string | null;
        depth: number;
        path: string;
        sort_order: number;
      }
    >();

    function walk({
      list,
      parentId,
      parentDepth,
      parentPath,
      parentSlug,
    }: {
      list: ReorderItem[];
      parentId: string | null;
      parentDepth: number;
      parentPath: string;
      parentSlug: string | null;
    }) {
      list.forEach((item, index) => {
        const row = currentMap.get(item.id);

        if (!row) {
          throw new Error("CATEGORY_NOT_FOUND");
        }

        const depth = parentId ? parentDepth + 1 : 1;

        if (depth > 6) {
          throw new Error("MAX_DEPTH_EXCEEDED");
        }

        const path = !parentId
          ? "/"
          : parentPath === "/"
            ? `/${parentSlug || ""}`
            : `${parentPath}/${parentSlug || ""}`;

        computed.set(item.id, {
          parent_id: parentId,
          depth,
          path,
          sort_order: index,
        });

        const children = childrenMap.get(item.id) ?? [];

        walk({
          list: children,
          parentId: item.id,
          parentDepth: depth,
          parentPath: path,
          parentSlug: row.slug ?? "",
        });
      });
    }

    walk({
      list: roots,
      parentId: null,
      parentDepth: 0,
      parentPath: "/",
      parentSlug: null,
    });

    if (computed.size !== currentRows.length) {
      throw new Error("INVALID_TREE");
    }

    const now = new Date().toISOString();

    for (const [id, patch] of computed.entries()) {
      const { error } = await sb
        .from("categories")
        .update({
          parent_id: patch.parent_id,
          depth: patch.depth,
          path: patch.path,
          sort_order: patch.sort_order,
          updated_at: now,
        })
        .eq("store_id", storeId)
        .eq("id", id);

      if (error) throw new Error(error.message);
    }

    const { data, error } = await sb
      .from("categories")
      .select(
        "id, parent_id, name, slug, status, sort_order, depth, path, created_at",
      )
      .eq("store_id", storeId)
      .order("sort_order")
      .order("created_at");

    if (error) throw new Error(error.message);

    return NextResponse.json({
      data: data ?? [],
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