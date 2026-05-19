// app/api/orders/statuses/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function s(x: any) {
  return String(x ?? "").trim();
}

async function resolveStoreUser() {
  const sb = await supabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) return null;

  const { data: storeUser } = await sb
    .from("store_users")
    .select("id, store_id")
    .eq("auth_user_id", user.id)
    .single();

  return storeUser ?? null;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const storeUser = await resolveStoreUser();

    if (!storeUser?.store_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const patch: any = {
      updated_at: new Date().toISOString(),
    };

    if ("name" in body) patch.name = s(body?.name);
    if ("slug" in body) patch.slug = s(body?.slug) || null;
    if ("icon" in body) patch.icon = s(body?.icon) || null;
    if ("color" in body) patch.color = s(body?.color) || null;
    if ("is_active" in body) patch.is_active = Boolean(body?.is_active);
    if ("notify_customer" in body) patch.notify_customer = Boolean(body?.notify_customer);
    if ("message_template" in body) patch.message_template = s(body?.message_template) || null;
    if ("email_template" in body) patch.email_template = s(body?.email_template) || null;
    if ("sms_template" in body) patch.sms_template = s(body?.sms_template) || null;

    if ("name" in patch && !patch.name) {
      return NextResponse.json({ error: "اسم الحالة مطلوب" }, { status: 400 });
    }

    const admin = supabaseAdmin();

    const { data, error } = await admin
      .from("store_order_statuses")
      .update(patch)
      .eq("id", id)
      .eq("store_id", storeUser.store_id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, item: data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update status" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const storeUser = await resolveStoreUser();

    if (!storeUser?.store_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = supabaseAdmin();

    const { data: statusRow, error: statusError } = await admin
      .from("store_order_statuses")
      .select("id, store_id, base_status_key, name")
      .eq("id", id)
      .eq("store_id", storeUser.store_id)
      .single();

    if (statusError || !statusRow) {
      return NextResponse.json(
        { error: statusError?.message || "الحالة غير موجودة" },
        { status: 404 }
      );
    }

    const nowIso = new Date().toISOString();

    const { data: affectedOrders, error: affectedOrdersError } = await admin
      .from("orders")
      .select("id, base_status_key, store_status_id")
      .eq("store_id", storeUser.store_id)
      .eq("store_status_id", id);

    if (affectedOrdersError) {
      return NextResponse.json(
        { error: affectedOrdersError.message },
        { status: 500 }
      );
    }

    const ordersToMove = affectedOrders ?? [];

    if (ordersToMove.length > 0) {
      const updatePromises = ordersToMove.map((order: any) =>
        admin
          .from("orders")
          .update({
            base_status_key: s(statusRow.base_status_key) || null,
            store_status_id: null,
            status_updated_at: nowIso,
          })
          .eq("id", order.id)
          .eq("store_id", storeUser.store_id)
      );

      const updateResults = await Promise.all(updatePromises);
      const failedUpdate = updateResults.find((r) => r.error);

      if (failedUpdate?.error) {
        return NextResponse.json(
          { error: failedUpdate.error.message },
          { status: 500 }
        );
      }

      const historyRows = ordersToMove.map((order: any) => ({
        store_id: storeUser.store_id,
        order_id: order.id,
        from_base_status_key: s(order.base_status_key) || null,
        to_base_status_key: s(statusRow.base_status_key) || null,
        from_store_status_id: s(order.store_status_id) || null,
        to_store_status_id: null,
        changed_by_store_user_id: storeUser.id,
        note: `تم حذف الحالة الفرعية "${s(statusRow.name)}" وإرجاع الطلب إلى الحالة الأساسية`,
        created_at: nowIso,
      }));

      const { error: historyError } = await admin
        .from("order_status_history")
        .insert(historyRows);

      if (historyError) {
        return NextResponse.json(
          { error: historyError.message },
          { status: 500 }
        );
      }
    }

    const { error: deleteError } = await admin
      .from("store_order_statuses")
      .delete()
      .eq("id", id)
      .eq("store_id", storeUser.store_id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        ok: true,
        moved_orders_count: ordersToMove.length,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to delete status" },
      { status: 500 }
    );
  }
}