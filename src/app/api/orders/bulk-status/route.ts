//app/api/orders/bulk-status/route.ts
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
    .select("id, store_id, auth_user_id")
    .eq("auth_user_id", user.id)
    .single();

  return storeUser ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const storeUser = await resolveStoreUser();

    if (!storeUser?.store_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const orderIds = Array.isArray(body?.order_ids)
      ? body.order_ids.map((x: any) => s(x)).filter(Boolean)
      : [];

    const storeStatusId = s(body?.store_status_id);
    const baseStatusKey = s(body?.base_status_key);
    const note = s(body?.note) || null;

    if (orderIds.length === 0) {
      return NextResponse.json(
        { error: "يجب اختيار طلب واحد على الأقل" },
        { status: 400 }
      );
    }

    if (!storeStatusId && !baseStatusKey) {
      return NextResponse.json(
        { error: "الحالة المطلوبة غير محددة" },
        { status: 400 }
      );
    }

    const admin = supabaseAdmin();

    let targetBaseStatusKey = "";
    let targetStoreStatusId: string | null = null;
    let targetName = "";
    let targetIcon = "";
    let targetColor = "";

    if (storeStatusId) {
      const { data: targetStatus, error: targetStatusError } = await admin
        .from("store_order_statuses")
        .select(
          `
          id,
          store_id,
          name,
          icon,
          color,
          is_active,
          base_status_key
        `
        )
        .eq("id", storeStatusId)
        .eq("store_id", storeUser.store_id)
        .single();

      if (targetStatusError || !targetStatus) {
        return NextResponse.json(
          { error: "الحالة الفرعية المحددة غير موجودة" },
          { status: 404 }
        );
      }

      if (targetStatus.is_active === false) {
        return NextResponse.json(
          { error: "الحالة الفرعية المحددة غير مفعلة" },
          { status: 400 }
        );
      }

      targetBaseStatusKey = s(targetStatus.base_status_key);
      targetStoreStatusId = s(targetStatus.id) || null;
      targetName = s(targetStatus.name);
      targetIcon = s(targetStatus.icon);
      targetColor = s(targetStatus.color);
    } else {
      const { data: targetBase, error: targetBaseError } = await admin
        .from("order_status_bases")
        .select("key, name_ar, icon, color, is_active")
        .eq("key", baseStatusKey)
        .single();

      if (targetBaseError || !targetBase) {
        return NextResponse.json(
          { error: "الحالة الأساسية المحددة غير موجودة" },
          { status: 404 }
        );
      }

      if (targetBase.is_active === false) {
        return NextResponse.json(
          { error: "الحالة الأساسية المحددة غير مفعلة" },
          { status: 400 }
        );
      }

      targetBaseStatusKey = s(targetBase.key);
      targetStoreStatusId = null;
      targetName = s(targetBase.name_ar) || targetBaseStatusKey;
      targetIcon = s(targetBase.icon);
      targetColor = s(targetBase.color);
    }

    const { data: orders, error: ordersError } = await admin
      .from("orders")
      .select("id, store_id, base_status_key, store_status_id")
      .eq("store_id", storeUser.store_id)
      .in("id", orderIds);

    if (ordersError) {
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    const validOrders = (orders ?? []).filter(Boolean);

    if (validOrders.length === 0) {
      return NextResponse.json(
        { error: "لم يتم العثور على الطلبات المحددة" },
        { status: 404 }
      );
    }

    const toUpdate = validOrders.filter((order: any) => {
      const sameBase = s(order.base_status_key) === s(targetBaseStatusKey);
      const sameStore = s(order.store_status_id) === s(targetStoreStatusId);
      return !(sameBase && sameStore);
    });

    if (toUpdate.length === 0) {
      return NextResponse.json({
        ok: true,
        updated_count: 0,
        skipped_count: validOrders.length,
        status: {
          base_status_key: targetBaseStatusKey,
          store_status_id: targetStoreStatusId,
          name: targetName,
          icon: targetIcon,
          color: targetColor,
        },
      });
    }

    const nowIso = new Date().toISOString();

    const updatePromises = toUpdate.map((order: any) =>
      admin
        .from("orders")
        .update({
          base_status_key: targetBaseStatusKey,
          store_status_id: targetStoreStatusId,
          status_updated_at: nowIso,
          status_note: note,
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

    const historyRows = toUpdate.map((order: any) => ({
      store_id: storeUser.store_id,
      order_id: order.id,
      from_base_status_key: s(order.base_status_key) || null,
      to_base_status_key: s(targetBaseStatusKey) || null,
      from_store_status_id: s(order.store_status_id) || null,
      to_store_status_id: s(targetStoreStatusId) || null,
      changed_by_store_user_id: storeUser.id,
      note,
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

    return NextResponse.json({
      ok: true,
      updated_count: toUpdate.length,
      skipped_count: validOrders.length - toUpdate.length,
      status: {
        base_status_key: targetBaseStatusKey,
        store_status_id: targetStoreStatusId,
        name: targetName,
        icon: targetIcon,
        color: targetColor,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update order statuses" },
      { status: 500 }
    );
  }
}