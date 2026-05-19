// app/api/orders/statuses/reorder/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function s(x: any) {
  return String(x ?? "").trim();
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

export async function PATCH(req: NextRequest) {
  try {
    const storeId = await resolveStoreId();
    if (!storeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const base_status_key = s(body?.base_status_key);
    const items = Array.isArray(body?.items) ? body.items : [];

    if (!base_status_key) {
      return NextResponse.json({ error: "base_status_key مطلوب" }, { status: 400 });
    }

    if (!items.length) {
      return NextResponse.json({ error: "items مطلوبة" }, { status: 400 });
    }

    const admin = supabaseAdmin();

    for (const item of items) {
      const id = s(item?.id);
      const sort_order = Number(item?.sort_order ?? 0);

      if (!id || !Number.isFinite(sort_order)) continue;

      const { error } = await admin
        .from("store_order_statuses")
        .update({
          sort_order,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("store_id", storeId)
        .eq("base_status_key", base_status_key);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to reorder statuses" },
      { status: 500 }
    );
  }
}