// FILE: apps/merchant/src/app/api/orders/[id]/items/[itemId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  getOrderTotalsSnapshot,
  loadOrderMoneyContext,
  recalcOrderTotalsForAdmin,
  roundMoney,
} from "@/app/api/orders/_lib/order-money";

function s(x: any) {
  return String(x ?? "").trim();
}

function n(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function uniqStr(arr: any[]) {
  return Array.from(
    new Set((Array.isArray(arr) ? arr : []).map((v) => s(v)).filter(Boolean)),
  );
}

function normalizeSelectedOptionValueIds(x: any): string[] {
  if (!Array.isArray(x)) return [];
  return uniqStr(x);
}

function normalizeSelectedOptions(x: any) {
  if (!Array.isArray(x)) return [];
  return x
    .map((row) => ({
      name: s(row?.name),
      value: s(row?.value),
    }))
    .filter((row) => row.name && row.value);
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

function itemAuditShape(item: any) {
  return {
    id: s(item?.id) || null,
    product_id: s(item?.product_id) || null,
    name: s(item?.name) || "منتج",
    sku: s(item?.sku) || null,
    qty: n(item?.qty),
    currency: s(item?.currency) || null,
    unit_price: n(item?.unit_price),
    total_price:
      item?.total_price != null
        ? n(item?.total_price)
        : n(item?.qty) * n(item?.unit_price),
    variant_id: s(item?.variant_id) || null,
    selected_option_value_ids: Array.isArray(item?.selected_option_value_ids)
      ? item.selected_option_value_ids.map((x: any) => s(x)).filter(Boolean)
      : [],
    selected_options: Array.isArray(item?.selected_options)
      ? normalizeSelectedOptions(item.selected_options)
      : [],
  };
}

export async function PATCH(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; itemId: string }>;
  },
) {
  try {
    const storeUser = await resolveStoreUser();

    if (!storeUser?.store_id) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const { id, itemId } = await params;
    const orderId = s(id);
    const orderItemId = s(itemId);

    if (!orderId || !orderItemId) {
      return NextResponse.json(
        { error: "بيانات الطلب أو المنتج غير مكتملة" },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const admin = supabaseAdmin();

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id, store_id, currency")
      .eq("id", orderId)
      .eq("store_id", storeUser.store_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    const moneyContext = await loadOrderMoneyContext({
      admin,
      storeId: s(storeUser.store_id),
      orderId: s(order.id),
      orderCurrency: s(order.currency),
    });

    const orderCurrency = moneyContext.orderCurrency;

    const beforeTotals = await getOrderTotalsSnapshot({
      admin,
      storeId: s(storeUser.store_id),
      orderId,
    });

    const { data: item, error: itemError } = await admin
      .from("order_items")
      .select(
        `
        id,
        order_id,
        store_id,
        product_id,
        name,
        qty,
        currency,
        unit_price,
        total_price,
        selected_options,
        selected_option_value_ids,
        variant_id,
        sku
      `,
      )
      .eq("id", orderItemId)
      .eq("order_id", orderId)
      .eq("store_id", storeUser.store_id)
      .single();

    if (itemError || !item) {
      return NextResponse.json(
        { error: "منتج الطلب غير موجود" },
        { status: 404 },
      );
    }

    const beforeData = itemAuditShape(item);
    const patch: any = {};

    const qty =
      body?.qty === undefined ? undefined : Math.max(1, Math.floor(n(body.qty)));
    const unitPrice =
      body?.unit_price === undefined ? undefined : n(body.unit_price);
    const weight = body?.weight === undefined ? undefined : n(body.weight);

    if (qty !== undefined) {
      if (!Number.isFinite(qty) || qty <= 0) {
        return NextResponse.json(
          { error: "الكمية يجب أن تكون أكبر من 0" },
          { status: 400 },
        );
      }

      patch.qty = qty;
    }

    if (unitPrice !== undefined) {
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return NextResponse.json({ error: "السعر غير صحيح" }, { status: 400 });
      }

      patch.unit_price = roundMoney(moneyContext, unitPrice, orderCurrency);
      patch.currency = orderCurrency;
    }

    if (body?.variant_id !== undefined) {
      patch.variant_id = s(body.variant_id) || null;
    }

    if (body?.sku !== undefined) {
      patch.sku = s(body.sku) || null;
    }

    if (body?.selected_option_value_ids !== undefined) {
      patch.selected_option_value_ids = normalizeSelectedOptionValueIds(
        body.selected_option_value_ids,
      );
    }

    const existingSelectedOptions = Array.isArray(item?.selected_options)
      ? normalizeSelectedOptions(item.selected_options)
      : [];

    let nextSelectedOptions =
      body?.selected_options !== undefined
        ? normalizeSelectedOptions(body.selected_options)
        : existingSelectedOptions;

    if (weight !== undefined) {
      if (!Number.isFinite(weight) || weight < 0) {
        return NextResponse.json({ error: "الوزن غير صحيح" }, { status: 400 });
      }

      nextSelectedOptions = nextSelectedOptions.filter(
        (row) => s(row?.name) !== "الوزن",
      );

      if (weight > 0) {
        nextSelectedOptions.push({
          name: "الوزن",
          value: String(weight),
        });
      }
    }

    if (body?.selected_options !== undefined || weight !== undefined) {
      patch.selected_options = nextSelectedOptions;
    }

    const nextQty = qty !== undefined ? qty : n(item.qty);
    const nextUnitPrice =
      unitPrice !== undefined
        ? roundMoney(moneyContext, unitPrice, orderCurrency)
        : n(item.unit_price);

    if (qty !== undefined || unitPrice !== undefined) {
      const targetCurrency =
        unitPrice !== undefined ? orderCurrency : s(item.currency) || orderCurrency;

      patch.total_price = roundMoney(
        moneyContext,
        nextQty * nextUnitPrice,
        targetCurrency,
      );
    }

    if (!Object.keys(patch).length) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const { error: updateError } = await admin
      .from("order_items")
      .update(patch)
      .eq("id", orderItemId)
      .eq("order_id", orderId)
      .eq("store_id", storeUser.store_id);

    if (updateError) {
      return NextResponse.json(
        { error: "تعذر حفظ التعديلات على المنتج" },
        { status: 500 },
      );
    }

    const { data: updatedItem, error: updatedItemError } = await admin
      .from("order_items")
      .select(
        `
        id,
        order_id,
        store_id,
        product_id,
        name,
        qty,
        currency,
        unit_price,
        total_price,
        selected_options,
        selected_option_value_ids,
        variant_id,
        sku
      `,
      )
      .eq("id", orderItemId)
      .eq("order_id", orderId)
      .eq("store_id", storeUser.store_id)
      .single();

    if (updatedItemError || !updatedItem) {
      return NextResponse.json(
        { error: "تعذر قراءة المنتج بعد التعديل" },
        { status: 500 },
      );
    }

    const afterData = itemAuditShape(updatedItem);

    const totals = await recalcOrderTotalsForAdmin({
      admin,
      storeId: s(storeUser.store_id),
      orderId,
      actorId: s(storeUser.id),
      auditAction: "order.item.updated",
      auditBeforeData: {
        item: beforeData,
        totals: beforeTotals,
      },
      auditAfterData: {
        item: afterData,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        currency: totals.currency,
        subtotal: totals.after.subtotal,
        total_amount: totals.after.total_amount,
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "فشل تحديث المنتج في الطلب" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; itemId: string }>;
  },
) {
  try {
    const storeUser = await resolveStoreUser();

    if (!storeUser?.store_id) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const { id, itemId } = await params;
    const orderId = s(id);
    const orderItemId = s(itemId);

    if (!orderId || !orderItemId) {
      return NextResponse.json(
        { error: "بيانات الطلب أو المنتج غير مكتملة" },
        { status: 400 },
      );
    }

    const admin = supabaseAdmin();

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id, store_id, currency")
      .eq("id", orderId)
      .eq("store_id", storeUser.store_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    const beforeTotals = await getOrderTotalsSnapshot({
      admin,
      storeId: s(storeUser.store_id),
      orderId,
    });

    const { data: item, error: itemError } = await admin
      .from("order_items")
      .select(
        `
        id,
        order_id,
        store_id,
        product_id,
        name,
        qty,
        currency,
        unit_price,
        total_price,
        selected_options,
        selected_option_value_ids,
        variant_id,
        sku
      `,
      )
      .eq("id", orderItemId)
      .eq("order_id", orderId)
      .eq("store_id", storeUser.store_id)
      .single();

    if (itemError || !item) {
      return NextResponse.json(
        { error: "منتج الطلب غير موجود" },
        { status: 404 },
      );
    }

    const beforeData = itemAuditShape(item);

    const { error: deleteError } = await admin
      .from("order_items")
      .delete()
      .eq("id", orderItemId)
      .eq("order_id", orderId)
      .eq("store_id", storeUser.store_id);

    if (deleteError) {
      return NextResponse.json(
        { error: "تعذر حذف المنتج من الطلب" },
        { status: 500 },
      );
    }

    const totals = await recalcOrderTotalsForAdmin({
      admin,
      storeId: s(storeUser.store_id),
      orderId,
      actorId: s(storeUser.id),
      auditAction: "order.item.deleted",
      auditBeforeData: {
        item: beforeData,
        totals: beforeTotals,
      },
      auditAfterData: {
        item: null,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        currency: totals.currency,
        subtotal: totals.after.subtotal,
        total_amount: totals.after.total_amount,
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "فشل حذف المنتج من الطلب" },
      { status: 500 },
    );
  }
}