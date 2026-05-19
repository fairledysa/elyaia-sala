// FILE: apps/merchant/src/app/api/orders/[id]/coupon/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  calculateCouponDiscountForOrder,
  loadOrderMoneyContext,
  recalcOrderTotalsForAdmin,
} from "@/app/api/orders/_lib/order-money";

function s(x: any) {
  return String(x ?? "").trim();
}

function n(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function round2(x: number) {
  return Math.round((Number(x || 0) + Number.EPSILON) * 100) / 100;
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

async function loadOrderOrThrow(
  admin: ReturnType<typeof supabaseAdmin>,
  orderId: string,
  storeId: string,
) {
  const { data: order, error } = await admin
    .from("orders")
    .select(
      `
      id,
      store_id,
      cart_id,
      currency,
      subtotal,
      shipping_amount,
      tax_amount,
      discount_amount,
      total_amount,
      payment_method,
      shipping_id,
      shipping_snapshot,
      created_at,
      updated_at
    `,
    )
    .eq("id", orderId)
    .eq("store_id", storeId)
    .single();

  if (error || !order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  return order;
}

async function createCartWithFallbacks(
  admin: ReturnType<typeof supabaseAdmin>,
  storeId: string,
  orderCurrency: string,
) {
  const nowIso = new Date().toISOString();
  const currency = s(orderCurrency);

  const attempts = [
    {
      store_id: storeId,
      currency,
      created_at: nowIso,
      updated_at: nowIso,
      last_activity_at: nowIso,
    },
    {
      store_id: storeId,
      currency,
    },
    {
      store_id: storeId,
      created_at: nowIso,
      updated_at: nowIso,
    },
    {
      store_id: storeId,
    },
  ];

  let lastError: any = null;

  for (const payload of attempts) {
    const { data, error } = await admin
      .from("carts")
      .insert(payload as any)
      .select("id")
      .single();

    if (!error && data?.id) {
      return s(data.id);
    }

    lastError = error;
  }

  throw new Error(lastError?.message || "FAILED_TO_CREATE_CART");
}

async function ensureCartIdForOrder(
  admin: ReturnType<typeof supabaseAdmin>,
  order: any,
) {
  const currentCartId = s(order?.cart_id);

  if (currentCartId) {
    const { data: existingCart, error: cartCheckError } = await admin
      .from("carts")
      .select("id")
      .eq("id", currentCartId)
      .maybeSingle();

    if (cartCheckError) {
      throw new Error(cartCheckError.message);
    }

    if (existingCart?.id) {
      return currentCartId;
    }
  }

  const newCartId = await createCartWithFallbacks(
    admin,
    s(order.store_id),
    s(order.currency),
  );

  const nowIso = new Date().toISOString();

  const { error: updateOrderError } = await admin
    .from("orders")
    .update({
      cart_id: newCartId,
      updated_at: nowIso,
    })
    .eq("id", s(order.id))
    .eq("store_id", s(order.store_id));

  if (updateOrderError) {
    throw new Error(updateOrderError.message);
  }

  return newCartId;
}

async function loadAppliedCoupon(
  admin: ReturnType<typeof supabaseAdmin>,
  storeId: string,
  cartId: string,
) {
  const { data, error } = await admin
    .from("cart_coupons")
    .select("id, coupon_id, code, discount_amount")
    .eq("store_id", storeId)
    .eq("cart_id", cartId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.coupon_id) {
    return null;
  }

  const { data: couponMeta, error: couponMetaError } = await admin
    .from("coupons")
    .select("id, code, discount_type, amount, maximum_amount")
    .eq("id", data.coupon_id)
    .maybeSingle();

  if (couponMetaError) {
    throw new Error(couponMetaError.message);
  }

  return {
    coupon_id: s(data.coupon_id) || null,
    code: s(data.code) || s(couponMeta?.code) || null,
    discount_amount: round2(n(data.discount_amount)),
    discount_type: s(couponMeta?.discount_type) || null,
    amount: round2(n(couponMeta?.amount)),
    maximum_amount:
      couponMeta?.maximum_amount == null ? null : round2(n(couponMeta.maximum_amount)),
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const storeUser = await resolveStoreUser();

    if (!storeUser?.store_id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { id } = await params;
    const orderId = s(id);
    const q = s(req.nextUrl.searchParams.get("q"));

    if (!orderId) {
      return NextResponse.json({ error: "رقم الطلب مطلوب" }, { status: 400 });
    }

    const admin = supabaseAdmin();
    await loadOrderOrThrow(admin, orderId, storeUser.store_id);

    let query = admin
      .from("coupons")
      .select("id, code, discount_type, amount, maximum_amount")
      .eq("store_id", storeUser.store_id)
      .order("code", { ascending: true })
      .limit(20);

    if (q) {
      query = query.ilike("code", `%${q}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message || "تعذر جلب الكوبونات" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      rows: Array.isArray(data) ? data : [],
    });
  } catch (error: any) {
    const message =
      error?.message === "ORDER_NOT_FOUND"
        ? "الطلب غير موجود"
        : error?.message || "تعذر جلب الكوبونات";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const storeUser = await resolveStoreUser();

    if (!storeUser?.store_id || !storeUser?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { id } = await params;
    const orderId = s(id);

    if (!orderId) {
      return NextResponse.json({ error: "رقم الطلب مطلوب" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const couponCode = s(body?.code);

    if (!couponCode) {
      return NextResponse.json({ error: "اختر كوبون الخصم" }, { status: 400 });
    }

    const admin = supabaseAdmin();
    const order = await loadOrderOrThrow(admin, orderId, storeUser.store_id);

    const moneyContext = await loadOrderMoneyContext({
      admin,
      storeId: s(storeUser.store_id),
      orderId: s(order.id),
      orderCurrency: s(order.currency),
    });

    const cartId = await ensureCartIdForOrder(admin, order);

    const beforeCoupon = await loadAppliedCoupon(
      admin,
      storeUser.store_id,
      cartId,
    );

    const { data: coupon, error: couponError } = await admin
      .from("coupons")
      .select("id, code, discount_type, amount, maximum_amount")
      .eq("store_id", storeUser.store_id)
      .ilike("code", couponCode)
      .maybeSingle();

    if (couponError) {
      return NextResponse.json(
        { error: couponError.message || "تعذر قراءة الكوبون" },
        { status: 500 },
      );
    }

    if (!coupon?.id) {
      return NextResponse.json({ error: "الكوبون غير موجود" }, { status: 404 });
    }

    const discountResult = calculateCouponDiscountForOrder({
      context: moneyContext,
      subtotal: n(order.subtotal),
      couponType: s(coupon.discount_type),
      couponAmount: n(coupon.amount),
      couponCurrency: moneyContext.defaultCurrency,
      maximumAmount:
        coupon.maximum_amount == null ? null : n(coupon.maximum_amount),
      maximumAmountCurrency: moneyContext.defaultCurrency,
    });

    const discountAmount = discountResult.discount_amount;

    const { error: deleteOldError } = await admin
      .from("cart_coupons")
      .delete()
      .eq("store_id", storeUser.store_id)
      .eq("cart_id", cartId);

    if (deleteOldError) {
      return NextResponse.json(
        { error: deleteOldError.message || "تعذر تحديث الكوبون" },
        { status: 500 },
      );
    }

    const { error: insertCouponError } = await admin.from("cart_coupons").insert({
      store_id: storeUser.store_id,
      cart_id: cartId,
      coupon_id: coupon.id,
      code: s(coupon.code),
      discount_amount: discountAmount,
    });

    if (insertCouponError) {
      return NextResponse.json(
        { error: insertCouponError.message || "تعذر تطبيق الكوبون" },
        { status: 500 },
      );
    }

    const afterCoupon = {
      coupon_id: s(coupon.id) || null,
      code: s(coupon.code) || null,
      discount_type: s(coupon.discount_type) || null,

      amount: round2(n(coupon.amount)),
      amount_currency: moneyContext.defaultCurrency,
      amount_in_order_currency: round2(
        n(discountResult.coupon_amount_in_order_currency),
      ),

      maximum_amount:
        coupon.maximum_amount == null ? null : round2(n(coupon.maximum_amount)),
      maximum_amount_currency:
        coupon.maximum_amount == null ? null : moneyContext.defaultCurrency,

      discount_amount: round2(discountAmount),
      order_currency: moneyContext.orderCurrency,
      cart_id: cartId,

      conversion: discountResult.conversion,
      maximum_conversion: discountResult.maximum_conversion,
    };

    const totals = await recalcOrderTotalsForAdmin({
      admin,
      storeId: s(storeUser.store_id),
      orderId: s(order.id),
      actorId: s(storeUser.id),
      auditAction: "order.coupon.applied",
      auditBeforeData: {
        coupon: beforeCoupon,
        order: {
          cart_id: s(order.cart_id) || null,
          currency: s(order.currency) || null,
          subtotal: round2(n(order.subtotal)),
          shipping_amount: round2(n(order.shipping_amount)),
          discount_amount: round2(n(order.discount_amount)),
          tax_amount: round2(n(order.tax_amount)),
          total_amount: round2(n(order.total_amount)),
        },
      },
      auditAfterData: {
        coupon: afterCoupon,
      },
    });

    return NextResponse.json({
      ok: true,
      discount_amount: totals.after.discount_amount,
      tax_amount: totals.after.tax_amount,
      total_amount: totals.after.total_amount,
      currency: totals.currency,
    });
  } catch (error: any) {
    const message =
      error?.message === "ORDER_NOT_FOUND"
        ? "الطلب غير موجود"
        : error?.message === "FAILED_TO_CREATE_CART"
          ? "تعذر إنشاء سلة لهذا الطلب"
          : error?.message || "تعذر تطبيق الكوبون";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const storeUser = await resolveStoreUser();

    if (!storeUser?.store_id || !storeUser?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { id } = await params;
    const orderId = s(id);

    if (!orderId) {
      return NextResponse.json({ error: "رقم الطلب مطلوب" }, { status: 400 });
    }

    const admin = supabaseAdmin();
    const order = await loadOrderOrThrow(admin, orderId, storeUser.store_id);

    const cartId = s(order.cart_id);
    if (!cartId) {
      return NextResponse.json({ ok: true });
    }

    const beforeCoupon = await loadAppliedCoupon(
      admin,
      storeUser.store_id,
      cartId,
    );

    const { error: deleteError } = await admin
      .from("cart_coupons")
      .delete()
      .eq("store_id", storeUser.store_id)
      .eq("cart_id", cartId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message || "تعذر حذف الكوبون" },
        { status: 500 },
      );
    }

    const nowIso = new Date().toISOString();

    const { error: clearDiscountError } = await admin
      .from("orders")
      .update({
        discount_amount: 0,
        updated_at: nowIso,
      })
      .eq("id", order.id)
      .eq("store_id", storeUser.store_id);

    if (clearDiscountError) {
      return NextResponse.json(
        { error: clearDiscountError.message || "تعذر تصفير الخصم" },
        { status: 500 },
      );
    }

    const totals = await recalcOrderTotalsForAdmin({
      admin,
      storeId: s(storeUser.store_id),
      orderId: s(order.id),
      actorId: s(storeUser.id),
      auditAction: "order.coupon.removed",
      auditBeforeData: {
        coupon: beforeCoupon,
        order: {
          cart_id: cartId,
          currency: s(order.currency) || null,
          subtotal: round2(n(order.subtotal)),
          shipping_amount: round2(n(order.shipping_amount)),
          discount_amount: round2(n(order.discount_amount)),
          tax_amount: round2(n(order.tax_amount)),
          total_amount: round2(n(order.total_amount)),
        },
      },
      auditAfterData: {
        coupon: null,
      },
    });

    return NextResponse.json({
      ok: true,
      discount_amount: totals.after.discount_amount,
      tax_amount: totals.after.tax_amount,
      total_amount: totals.after.total_amount,
      currency: totals.currency,
    });
  } catch (error: any) {
    const message =
      error?.message === "ORDER_NOT_FOUND"
        ? "الطلب غير موجود"
        : error?.message || "تعذر حذف الكوبون";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}