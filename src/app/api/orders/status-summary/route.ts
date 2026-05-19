// app/api/orders/status-summary/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type BaseStatusRow = {
  key: string;
  name_ar: string;
  name_en?: string | null;
  icon?: string | null;
  color?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
};

type StoreStatusRow = {
  id: string;
  store_id: string;
  base_status_key: string;
  name: string;
  slug?: string | null;
  icon?: string | null;
  color?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
};

function s(x: any) {
  return String(x ?? "").trim();
}

function sortNum(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? v : 0;
}

async function resolveStoreId() {
  const sb = await supabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) return null;

  const { data: storeUser } = await sb
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", user.id)
    .single();

  return storeUser?.store_id ?? null;
}

export async function GET(_: NextRequest) {
  try {
    const storeId = await resolveStoreId();

    if (!storeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = supabaseAdmin();

    const [
      { data: baseStatusesRaw, error: baseError },
      { data: storeStatusesRaw, error: storeStatusesError },
    ] = await Promise.all([
      admin
        .from("order_status_bases")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      admin
        .from("store_order_statuses")
        .select("*")
        .eq("store_id", storeId)
        .order("base_status_key", { ascending: true })
        .order("sort_order", { ascending: true }),
    ]);

    if (baseError) {
      return NextResponse.json({ error: baseError.message }, { status: 500 });
    }

    if (storeStatusesError) {
      return NextResponse.json(
        { error: storeStatusesError.message },
        { status: 500 }
      );
    }

    const baseStatuses = (baseStatusesRaw ?? []) as BaseStatusRow[];
    const storeStatuses = (storeStatusesRaw ?? []) as StoreStatusRow[];
    const activeStoreStatuses = storeStatuses.filter((x) => x.is_active !== false);

    const visibleBaseStatuses = baseStatuses.filter(
      (x) => s(x.key).toLowerCase() !== "draft"
    );

    const cards: Array<{
      key: string;
      label: string;
      count: number;
      dotColor: string;
      icon: string;
      type: "base" | "store";
      base_status_key: string;
      store_status_id?: string | null;
      sort_bucket: number;
      sort_order: number;
    }> = [];

    for (const base of visibleBaseStatuses) {
      const baseKey = s(base.key);
      const baseLabel = s(base.name_ar) || baseKey;
      const baseColor = s(base.color) || "#94a3b8";
      const baseIcon = s(base.icon) || "package";
      const baseSort = sortNum(base.sort_order);

      const { count: baseCount, error: baseCountError } = await admin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId)
        .neq("status", "draft")
        .neq("base_status_key", "draft")
        .eq("base_status_key", baseKey)
        .is("store_status_id", null);

      if (baseCountError) {
        return NextResponse.json({ error: baseCountError.message }, { status: 500 });
      }

      cards.push({
        key: `base:${baseKey}`,
        label: baseLabel,
        count: baseCount ?? 0,
        dotColor: baseColor,
        icon: baseIcon,
        type: "base",
        base_status_key: baseKey,
        store_status_id: null,
        sort_bucket: baseSort,
        sort_order: 0,
      });

      const children = activeStoreStatuses
        .filter((x) => s(x.base_status_key) === baseKey)
        .sort((a, b) => sortNum(a.sort_order) - sortNum(b.sort_order));

      for (const child of children) {
        const { count: childCount, error: childCountError } = await admin
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("store_id", storeId)
          .neq("status", "draft")
          .neq("base_status_key", "draft")
          .eq("store_status_id", child.id);

        if (childCountError) {
          return NextResponse.json(
            { error: childCountError.message },
            { status: 500 }
          );
        }

        cards.push({
          key: `store:${child.id}`,
          label: s(child.name) || baseLabel,
          count: childCount ?? 0,
          dotColor: s(child.color) || baseColor,
          icon: s(child.icon) || baseIcon,
          type: "store",
          base_status_key: baseKey,
          store_status_id: child.id,
          sort_bucket: baseSort,
          sort_order: sortNum(child.sort_order),
        });
      }
    }

    cards.sort((a, b) => {
      if (a.sort_bucket !== b.sort_bucket) return a.sort_bucket - b.sort_bucket;
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.label.localeCompare(b.label, "ar");
    });

    return NextResponse.json(
      {
        cards: cards.map((item) => ({
          key: item.key,
          label: item.label,
          count: item.count,
          dotColor: item.dotColor,
          icon: item.icon,
          type: item.type,
          base_status_key: item.base_status_key,
          store_status_id: item.store_status_id ?? null,
        })),
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load status summary" },
      { status: 500 }
    );
  }
}