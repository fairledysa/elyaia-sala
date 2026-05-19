// app/api/orders/[id]/finalize/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function s(x: any) {
  return String(x ?? "").trim();
}

function n(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function normalizePaymentStatus(value: any) {
  const x = s(value).toLowerCase();

  if (x === "paid") return "paid";
  if (x === "unpaid") return "unpaid";
  if (x === "failed") return "failed";
  if (x === "refunded") return "refunded";

  return "";
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

async function resolveStoreStatusIdByBaseKey(
  admin: ReturnType<typeof supabaseAdmin>,
  storeId: string,
  baseStatusKey: string
) {
  const { data, error } = await admin
    .from("store_order_statuses")
    .select("id")
    .eq("store_id", storeId)
    .eq("base_status_key", baseStatusKey)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return s(data?.id) || null;
}

function shippingRequired(order: any) {
  const snapshot =
    order?.shipping_snapshot && typeof order.shipping_snapshot === "object"
      ? order.shipping_snapshot
      : null;

  if (snapshot?.requires_shipping === true) return true;
  if (snapshot?.requires_shipping === false) return false;

  return Boolean(s(order?.shipping_id));
}

export async function POST(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const storeUser = await resolveStoreUser();

    if (!storeUser?.store_id || !storeUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const orderId = s(id);

    if (!orderId) {
      return NextResponse.json(
        { error: "Order id is required" },
        { status: 400 }
      );
    }

    const admin = supabaseAdmin();

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select(
        `
        id,
        store_id,
        status,
        base_status_key,
        store_status_id,
        customer_id,
        payment_method,
        payment_status,
        shipping_id,
        shipping_address,
        shipping_snapshot,
        total_amount,
        order_items (
          id,
          qty
        )
      `
      )
      .eq("id", orderId)
      .eq("store_id", storeUser.store_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    const isDraft =
      s(order.status).toLowerCase() === "draft" ||
      s(order.base_status_key).toLowerCase() === "draft" ||
      (!s(order.base_status_key) && !s(order.store_status_id));

    if (!isDraft) {
      return NextResponse.json(
        { error: "هذا الطلب تم إنشاؤه مسبقًا" },
        { status: 400 }
      );
    }

    if (!s(order.customer_id)) {
      return NextResponse.json(
        { error: "يجب تحديد العميل أولًا" },
        { status: 400 }
      );
    }

    const items = Array.isArray(order.order_items) ? order.order_items : [];
    const validItems = items.filter((item: any) => n(item?.qty) > 0);

    if (validItems.length === 0) {
      return NextResponse.json(
        { error: "يجب إضافة منتج واحد على الأقل" },
        { status: 400 }
      );
    }

    const paymentMethod = s(order.payment_method).toLowerCase();
    if (!paymentMethod) {
      return NextResponse.json(
        { error: "يجب تحديد نوع الدفع أولًا" },
        { status: 400 }
      );
    }

    const paymentStatus = normalizePaymentStatus(order.payment_status);
    if (!paymentStatus) {
      return NextResponse.json(
        { error: "يجب تحديد حالة الدفع أولًا" },
        { status: 400 }
      );
    }

    const needsShipping = shippingRequired(order);
    const shippingAddress =
      order?.shipping_address && typeof order.shipping_address === "object"
        ? order.shipping_address
        : null;

    if (needsShipping) {
      if (!s(order.shipping_id)) {
        return NextResponse.json(
          { error: "يجب تحديد شركة الشحن أولًا" },
          { status: 400 }
        );
      }

      if (!shippingAddress) {
        return NextResponse.json(
          { error: "يجب إدخال عنوان الشحن أولًا" },
          { status: 400 }
        );
      }

      if (!s(shippingAddress.address_line1)) {
        return NextResponse.json(
          { error: "العنوان مطلوب" },
          { status: 400 }
        );
      }

      if (!s(shippingAddress.city_id) && !s(shippingAddress.city_name)) {
        return NextResponse.json(
          { error: "يجب اختيار المدينة أولًا" },
          { status: 400 }
        );
      }
    }

    // ✅ القاعدة الصحيحة حسب طلبك الآن:
    // paid   -> pending_review
    // unpaid -> pending_payment
    const targetBaseStatusKey =
      paymentStatus === "paid" ? "pending_review" : "pending_payment";

    const targetStoreStatusId = await resolveStoreStatusIdByBaseKey(
      admin,
      s(storeUser.store_id),
      targetBaseStatusKey
    );

    const nowIso = new Date().toISOString();

    const { error: updateError } = await admin
      .from("orders")
      .update({
        status: "pending",
        base_status_key: targetBaseStatusKey,
        store_status_id: targetStoreStatusId,
        status_updated_at: nowIso,
        status_note: "تم إنشاء الطلب من المسودة",
        updated_at: nowIso,
      })
      .eq("id", orderId)
      .eq("store_id", storeUser.store_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const { error: historyError } = await admin
      .from("order_status_history")
      .insert({
        store_id: storeUser.store_id,
        order_id: orderId,
        from_base_status_key: "draft",
        to_base_status_key: targetBaseStatusKey,
        from_store_status_id: null,
        to_store_status_id: targetStoreStatusId,
        changed_by_store_user_id: storeUser.id,
        note: "تم إنشاء الطلب من المسودة",
        created_at: nowIso,
      });

    if (historyError) {
      return NextResponse.json({ error: historyError.message }, { status: 500 });
    }

    const { error: auditError } = await admin.from("audit_logs").insert({
      store_id: storeUser.store_id,
      actor_type: "store_user",
      actor_id: storeUser.id,
      action: "order.finalized",
      entity_type: "order",
      entity_id: orderId,
      before_data: {
        status: "draft",
        base_status_key: "draft",
        store_status_id: null,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
      },
      after_data: {
        status: "pending",
        base_status_key: targetBaseStatusKey,
        store_status_id: targetStoreStatusId,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
      },
      created_at: nowIso,
    });

    if (auditError) {
      return NextResponse.json({ error: auditError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      id: orderId,
      status: "pending",
      base_status_key: targetBaseStatusKey,
      store_status_id: targetStoreStatusId,
      payment_status: paymentStatus,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to finalize order" },
      { status: 500 }
    );
  }
}