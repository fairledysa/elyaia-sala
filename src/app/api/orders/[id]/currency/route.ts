// FILE: apps/merchant/src/app/api/orders/[id]/currency/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  convertMoney,
  getOrderTotalsSnapshot,
  loadOrderMoneyContext,
  recalcOrderTotalsForAdmin,
} from "@/app/api/orders/_lib/order-money";

type AdminClient = ReturnType<typeof supabaseAdmin>;
type MoneyContext = Awaited<ReturnType<typeof loadOrderMoneyContext>>;

function s(x: any) {
  return String(x ?? "").trim();
}

function n(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function hasValue(value: any) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function firstValue(...values: any[]) {
  for (const value of values) {
    if (hasValue(value)) return value;
  }

  return null;
}

function safeObject(value: any): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      //
    }
  }

  return {};
}

function safeArray(value: any): any[] {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function cleanCurrencyCode(value: any) {
  const code = s(value).toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : "";
}

function uniqStr(values: any[]) {
  return Array.from(
    new Set((Array.isArray(values) ? values : []).map((x) => s(x)).filter(Boolean)),
  );
}

async function resolveStoreUser() {
  const sb = await supabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) return null;

  const { data: storeUser } = await sb
    .from("store_users")
    .select("id, store_id, auth_user_id, name, email, role")
    .eq("auth_user_id", user.id)
    .single();

  return storeUser ?? null;
}

function isCurrencyEnabled(context: MoneyContext, currency: string) {
  const code = cleanCurrencyCode(currency);
  if (!code) return false;

  if (code === context.defaultCurrency) return true;

  const row = context.currencyMap.get(code);
  if (!row) return false;

  return row.is_enabled === true;
}

function moneyConversion(args: {
  context: MoneyContext;
  amount: any;
  fromCurrency: string;
  toCurrency: string;
}) {
  return convertMoney(
    args.context,
    n(args.amount),
    args.fromCurrency,
    args.toCurrency,
  );
}

function blockedStatus(order: any) {
  const status = s(order?.status).toLowerCase();
  const baseStatus = s(order?.base_status_key).toLowerCase();

  const blocked = new Set(["completed", "cancelled", "refunded", "failed"]);

  return blocked.has(status) || blocked.has(baseStatus);
}

function assertOrderCanChangeCurrency(order: any) {
  const paymentStatus = s(order?.payment_status).toLowerCase();

  if (paymentStatus !== "unpaid") {
    throw new Error("لا يمكن تغيير عملة طلب تم دفعه أو تمت عليه عملية دفع.");
  }

  if (blockedStatus(order)) {
    throw new Error("لا يمكن تغيير عملة طلب مكتمل أو ملغي أو مسترجع أو فاشل.");
  }
}

function convertObjectMoneyField(args: {
  context: MoneyContext;
  obj: Record<string, any>;
  field: string;
  fromCurrency: string;
  toCurrency: string;
  path: string;
  conversions: any[];
}) {
  if (!hasValue(args.obj[args.field])) return;

  const conversion = moneyConversion({
    context: args.context,
    amount: args.obj[args.field],
    fromCurrency: args.fromCurrency,
    toCurrency: args.toCurrency,
  });

  args.obj[args.field] = conversion.amount_after_conversion;

  if (args.fromCurrency !== args.toCurrency) {
    args.conversions.push({
      path: args.path,
      field: args.field,
      conversion,
    });
  }
}

function convertOptionChoice(args: {
  context: MoneyContext;
  choice: any;
  fromCurrency: string;
  toCurrency: string;
  path: string;
  conversions: any[];
}) {
  const choice = args.choice;

  if (!choice || typeof choice !== "object" || Array.isArray(choice)) {
    return choice;
  }

  const next = { ...choice };

  for (const field of ["price_customer", "priceCustomer"]) {
    convertObjectMoneyField({
      context: args.context,
      obj: next,
      field,
      fromCurrency: args.fromCurrency,
      toCurrency: args.toCurrency,
      path: `${args.path}.${field}`,
      conversions: args.conversions,
    });
  }

  return next;
}

function convertOptionLine(args: {
  context: MoneyContext;
  line: any;
  fromCurrency: string;
  toCurrency: string;
  path: string;
  conversions: any[];
  nowIso: string;
  actorId: string | null;
}) {
  const line = args.line;

  if (!line || typeof line !== "object" || Array.isArray(line)) {
    return line;
  }

  const metadata = safeObject(line.metadata);

  const sourceCurrency =
    cleanCurrencyCode(
      firstValue(
        line.currency,
        line.currency_code,
        line.currencyCode,
        metadata.currency,
        metadata.currency_code,
        metadata.currencyCode,
        args.fromCurrency,
      ),
    ) || args.fromCurrency;

  const next: Record<string, any> = {
    ...line,
  };

  const beforeConversionsCount = args.conversions.length;

  for (const field of [
    "price_customer",
    "priceCustomer",
    "price",
    "amount",
    "fee",
  ]) {
    convertObjectMoneyField({
      context: args.context,
      obj: next,
      field,
      fromCurrency: sourceCurrency,
      toCurrency: args.toCurrency,
      path: `${args.path}.${field}`,
      conversions: args.conversions,
    });
  }

  const choices = safeArray(
    firstValue(
      next.choices,
      next.selected_choices,
      next.choice_values,
      next.choiceValues,
      [],
    ),
  );

  if (choices.length) {
    const nextChoices = choices.map((choice, index) =>
      convertOptionChoice({
        context: args.context,
        choice,
        fromCurrency: sourceCurrency,
        toCurrency: args.toCurrency,
        path: `${args.path}.choices.${index}`,
        conversions: args.conversions,
      }),
    );

    next.choices = nextChoices;

    if (Array.isArray(next.selected_choices)) {
      next.selected_choices = nextChoices;
    }

    if (Array.isArray(next.choice_values)) {
      next.choice_values = nextChoices;
    }

    if (Array.isArray(next.choiceValues)) {
      next.choiceValues = nextChoices;
    }
  }

  const wasConverted = args.conversions.length > beforeConversionsCount;

  next.currency = args.toCurrency;
  next.currency_code = args.toCurrency;
  next.currencyCode = args.toCurrency;

  next.metadata = {
    ...metadata,
    currency: args.toCurrency,
    currency_code: args.toCurrency,
    currencyCode: args.toCurrency,
    converted_by_admin: true,
    converted_at: args.nowIso,
    converted_by_store_user_id: args.actorId,

    source_currency:
      wasConverted && sourceCurrency !== args.toCurrency
        ? sourceCurrency
        : metadata.source_currency,

    target_currency: args.toCurrency,
  };

  return next;
}

function convertSnapshotMoney(args: {
  context: MoneyContext;
  snapshot: any;
  fromCurrency: string;
  toCurrency: string;
  actorId: string | null;
}) {
  const root = safeObject(args.snapshot);
  const nowIso = new Date().toISOString();
  const conversions: any[] = [];

  const rootCurrency =
    cleanCurrencyCode(
      firstValue(
        root.currency,
        root.shipping_currency,
        root.customer_price_currency,
        args.fromCurrency,
      ),
    ) || args.fromCurrency;

  const rootFields = [
    "customer_price",
    "shipping_amount",
    "order_options_fee",
    "orderOptionsFee",
    "order_options_base",
    "orderOptionsBase",
    "order_options_tax",
    "orderOptionsTax",
    "order_options_total",
    "orderOptionsTotal",
    "order_options_amount",
    "options_amount",
    "cod_fee_customer",
    "cod_fee",
    "payment_fee",
    "payment_fee_amount",
  ];

  for (const field of rootFields) {
    convertObjectMoneyField({
      context: args.context,
      obj: root,
      field,
      fromCurrency: rootCurrency,
      toCurrency: args.toCurrency,
      path: `shipping_snapshot.${field}`,
      conversions,
    });
  }

  const checkout = safeObject(root.checkout);
  const hasCheckout = Object.keys(checkout).length > 0;

  if (hasCheckout) {
    const checkoutCurrency =
      cleanCurrencyCode(
        firstValue(
          checkout.currency,
          checkout.shipping_currency,
          checkout.customer_price_currency,
          rootCurrency,
        ),
      ) || rootCurrency;

    const checkoutFields = [
      "customer_price",
      "shipping_amount",
      "order_options_fee",
      "orderOptionsFee",
      "order_options_base",
      "orderOptionsBase",
      "order_options_tax",
      "orderOptionsTax",
      "order_options_total",
      "orderOptionsTotal",
      "order_options_amount",
      "options_amount",
      "cod_fee_customer",
      "cod_fee",
      "payment_fee",
      "payment_fee_amount",
    ];

    for (const field of checkoutFields) {
      convertObjectMoneyField({
        context: args.context,
        obj: checkout,
        field,
        fromCurrency: checkoutCurrency,
        toCurrency: args.toCurrency,
        path: `shipping_snapshot.checkout.${field}`,
        conversions,
      });
    }

    const checkoutLines = safeArray(
      firstValue(
        checkout.order_options,
        checkout.orderOptions,
        checkout.order_options_lines,
        checkout.orderOptionsLines,
        [],
      ),
    );

    if (checkoutLines.length) {
      const nextLines = checkoutLines.map((line, index) =>
        convertOptionLine({
          context: args.context,
          line,
          fromCurrency: checkoutCurrency,
          toCurrency: args.toCurrency,
          path: `shipping_snapshot.checkout.order_options.${index}`,
          conversions,
          nowIso,
          actorId: args.actorId,
        }),
      );

      checkout.order_options = nextLines;
      checkout.orderOptions = nextLines;
    }

    checkout.currency = args.toCurrency;
    root.checkout = checkout;
  }

  const rootLines = safeArray(
    firstValue(
      root.order_options,
      root.orderOptions,
      root.order_options_lines,
      root.orderOptionsLines,
      [],
    ),
  );

  if (rootLines.length) {
    const nextRootLines = rootLines.map((line, index) =>
      convertOptionLine({
        context: args.context,
        line,
        fromCurrency: rootCurrency,
        toCurrency: args.toCurrency,
        path: `shipping_snapshot.order_options.${index}`,
        conversions,
        nowIso,
        actorId: args.actorId,
      }),
    );

    root.order_options = nextRootLines;
    root.orderOptions = nextRootLines;
  }

  const money = safeObject(root.money);
  if (Object.keys(money).length) {
    const moneyCurrency =
      cleanCurrencyCode(firstValue(money.currency, rootCurrency)) || rootCurrency;

    for (const field of [
      "subtotal",
      "shipping_amount",
      "order_options_fee",
      "payment_fee",
      "discount_amount",
      "tax_amount",
      "total_amount",
    ]) {
      convertObjectMoneyField({
        context: args.context,
        obj: money,
        field,
        fromCurrency: moneyCurrency,
        toCurrency: args.toCurrency,
        path: `shipping_snapshot.money.${field}`,
        conversions,
      });
    }

    money.currency = args.toCurrency;
    root.money = money;
  }

  root.currency = args.toCurrency;
  root.shipping_currency = args.toCurrency;
  root.customer_price_currency = args.toCurrency;
  root.cod_fee_currency = args.toCurrency;
  root.payment_fee_currency = args.toCurrency;

  root.currency_change = {
    from_currency: args.fromCurrency,
    to_currency: args.toCurrency,
    changed_at: nowIso,
    changed_by_store_user_id: args.actorId,
  };

  return {
    snapshot: root,
    conversions,
  };
}

async function convertOrderItems(args: {
  admin: AdminClient;
  context: MoneyContext;
  orderId: string;
  storeId: string;
  fromCurrency: string;
  toCurrency: string;
}) {
  const { data, error } = await args.admin
    .from("order_items")
    .select("id, product_id, qty, currency, unit_price, total_price")
    .eq("order_id", args.orderId)
    .eq("store_id", args.storeId);

  if (error) {
    throw new Error(error.message);
  }

  const rows = Array.isArray(data) ? data : [];
  const conversions: any[] = [];
  const productIds: string[] = [];

  for (const row of rows) {
    const itemId = s((row as any).id);
    const productId = s((row as any).product_id);
    const qty = Math.max(1, Math.floor(n((row as any).qty)));
    const sourceCurrency =
      cleanCurrencyCode((row as any).currency) || args.fromCurrency;

    if (productId) productIds.push(productId);

    const unitConversion = moneyConversion({
      context: args.context,
      amount: (row as any).unit_price,
      fromCurrency: sourceCurrency,
      toCurrency: args.toCurrency,
    });

    const rawTotal =
      (row as any).total_price != null
        ? n((row as any).total_price)
        : qty * n((row as any).unit_price);

    const totalConversion = moneyConversion({
      context: args.context,
      amount: rawTotal,
      fromCurrency: sourceCurrency,
      toCurrency: args.toCurrency,
    });

    const { error: updateError } = await args.admin
      .from("order_items")
      .update({
        currency: args.toCurrency,
        unit_price: unitConversion.amount_after_conversion,
        total_price: totalConversion.amount_after_conversion,
      })
      .eq("id", itemId)
      .eq("order_id", args.orderId)
      .eq("store_id", args.storeId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    conversions.push({
      item_id: itemId,
      product_id: productId || null,
      qty,
      unit_price: unitConversion,
      total_price: totalConversion,
    });
  }

  return {
    productIds: uniqStr(productIds),
    conversions,
  };
}

async function convertOrderOptionAnswers(args: {
  admin: AdminClient;
  context: MoneyContext;
  orderId: string;
  storeId: string;
  fromCurrency: string;
  toCurrency: string;
  actorId: string | null;
}) {
  const { data, error } = await args.admin
    .from("order_option_answers")
    .select("*")
    .eq("order_id", args.orderId)
    .eq("store_id", args.storeId);

  if (error) {
    throw new Error(error.message);
  }

  const rows = Array.isArray(data) ? data : [];
  const conversions: any[] = [];
  const nowIso = new Date().toISOString();

  for (const row of rows) {
    const answerId = s((row as any).id);
    const metadata = safeObject((row as any).metadata);

    const sourceCurrency =
      cleanCurrencyCode(
        firstValue(
          (row as any).currency,
          metadata.currency,
          metadata.currency_code,
          metadata.currencyCode,
          args.fromCurrency,
        ),
      ) || args.fromCurrency;

    const priceConversion = moneyConversion({
      context: args.context,
      amount: (row as any).price_customer,
      fromCurrency: sourceCurrency,
      toCurrency: args.toCurrency,
    });

    const nextMetadata = {
      ...metadata,
      currency: args.toCurrency,
      price_customer: priceConversion.amount_after_conversion,
      priceCustomer: priceConversion.amount_after_conversion,
      source_currency_before_order_currency_change: sourceCurrency,
      amount_before_order_currency_change: priceConversion.amount_before_conversion,
      amount_after_order_currency_change: priceConversion.amount_after_conversion,
      order_currency_exchange_rate: priceConversion.exchange_rate,
      order_currency_changed_at: nowIso,
      order_currency_changed_by_store_user_id: args.actorId,
    };

    const { error: updateError } = await args.admin
      .from("order_option_answers")
      .update({
        currency: args.toCurrency,
        price_customer: priceConversion.amount_after_conversion,
        metadata: nextMetadata,
      })
      .eq("id", answerId)
      .eq("order_id", args.orderId)
      .eq("store_id", args.storeId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    conversions.push({
      answer_id: answerId,
      option_id: s((row as any).option_id) || null,
      conversion: priceConversion,
    });
  }

  return conversions;
}

async function convertCartCoupon(args: {
  admin: AdminClient;
  context: MoneyContext;
  storeId: string;
  cartId?: string | null;
  fromCurrency: string;
  toCurrency: string;
}) {
  const cartId = s(args.cartId);
  if (!cartId) return null;

  const { data, error } = await args.admin
    .from("cart_coupons")
    .select("id, coupon_id, code, discount_amount")
    .eq("store_id", args.storeId)
    .eq("cart_id", cartId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.id) return null;

  const conversion = moneyConversion({
    context: args.context,
    amount: data.discount_amount,
    fromCurrency: args.fromCurrency,
    toCurrency: args.toCurrency,
  });

  const { error: updateError } = await args.admin
    .from("cart_coupons")
    .update({
      discount_amount: conversion.amount_after_conversion,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.id)
    .eq("store_id", args.storeId)
    .eq("cart_id", cartId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return {
    cart_coupon_id: s(data.id),
    coupon_id: s(data.coupon_id) || null,
    code: s(data.code) || null,
    discount_amount: conversion,
  };
}

async function convertCustomOrderProducts(args: {
  admin: AdminClient;
  context: MoneyContext;
  orderId: string;
  storeId: string;
  productIds: string[];
  fromCurrency: string;
  toCurrency: string;
}) {
  const productIds = uniqStr(args.productIds);
  if (!productIds.length) return [];

  const { data: products, error: productsError } = await args.admin
    .from("products")
    .select("id, metadata")
    .eq("store_id", args.storeId)
    .in("id", productIds);

  if (productsError) {
    throw new Error(productsError.message);
  }

  const customProductIds = (products ?? [])
    .filter((product: any) => {
      const metadata = safeObject(product?.metadata);
      return (
        metadata.custom_order_item === true &&
        s(metadata.custom_order_item_order_id) === args.orderId
      );
    })
    .map((product: any) => s(product?.id))
    .filter(Boolean);

  if (!customProductIds.length) return [];

  const { data: prices, error: pricingError } = await args.admin
    .from("product_pricing")
    .select("product_id, currency, price, sale_price, cost_price")
    .in("product_id", customProductIds);

  if (pricingError) {
    throw new Error(pricingError.message);
  }

  const conversions: any[] = [];

  for (const row of prices ?? []) {
    const productId = s((row as any).product_id);
    const sourceCurrency =
      cleanCurrencyCode((row as any).currency) || args.fromCurrency;

    const priceConversion = moneyConversion({
      context: args.context,
      amount: (row as any).price,
      fromCurrency: sourceCurrency,
      toCurrency: args.toCurrency,
    });

    const salePriceConversion = moneyConversion({
      context: args.context,
      amount: (row as any).sale_price,
      fromCurrency: sourceCurrency,
      toCurrency: args.toCurrency,
    });

    const costPriceConversion = moneyConversion({
      context: args.context,
      amount: (row as any).cost_price,
      fromCurrency: sourceCurrency,
      toCurrency: args.toCurrency,
    });

    const { error: updateError } = await args.admin
      .from("product_pricing")
      .update({
        currency: args.toCurrency,
        price: priceConversion.amount_after_conversion,
        sale_price: salePriceConversion.amount_after_conversion,
        cost_price: costPriceConversion.amount_after_conversion,
      })
      .eq("product_id", productId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    conversions.push({
      product_id: productId,
      price: priceConversion,
      sale_price: salePriceConversion,
      cost_price: costPriceConversion,
    });
  }

  return conversions;
}

async function writeOrderAuditLog(args: {
  admin: AdminClient;
  storeId: string;
  actorId?: string | null;
  orderId: string;
  action: string;
  beforeData: any;
  afterData: any;
}) {
  const { error } = await args.admin.from("audit_logs").insert({
    store_id: args.storeId,
    actor_type: "store_user",
    actor_id: s(args.actorId) || null,
    action: args.action,
    entity_type: "order",
    entity_id: args.orderId,
    before_data: args.beforeData,
    after_data: args.afterData,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function loadOrderForCurrencyChange(args: {
  admin: AdminClient;
  storeId: string;
  orderId: string;
}) {
  const { data, error } = await args.admin
    .from("orders")
    .select(
      `
      id,
      store_id,
      cart_id,
      order_number,
      status,
      base_status_key,
      payment_status,
      payment_method,
      invoice_no,
      currency,
      subtotal,
      shipping_amount,
      tax_amount,
      discount_amount,
      total_amount,
      shipping_id,
      shipping_snapshot,
      updated_at
    `,
    )
    .eq("id", args.orderId)
    .eq("store_id", args.storeId)
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message || "ORDER_NOT_FOUND");
  }

  return data;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const storeUser = await resolveStoreUser();

    if (!storeUser?.store_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const orderId = s(id);

    if (!orderId) {
      return NextResponse.json({ error: "رقم الطلب مطلوب" }, { status: 400 });
    }

    const admin = supabaseAdmin();

    const order = await loadOrderForCurrencyChange({
      admin,
      storeId: s(storeUser.store_id),
      orderId,
    });

    const currentCurrency = cleanCurrencyCode(order.currency);

    if (!currentCurrency) {
      return NextResponse.json(
        { error: "عملة الطلب غير صحيحة" },
        { status: 400 },
      );
    }

    const context = await loadOrderMoneyContext({
      admin,
      storeId: s(storeUser.store_id),
      orderId,
      orderCurrency: currentCurrency,
    });

    let canChange = true;
    let blockedReason: string | null = null;

    try {
      assertOrderCanChangeCurrency(order);
    } catch (error: any) {
      canChange = false;
      blockedReason = s(error?.message) || "لا يمكن تغيير عملة هذا الطلب.";
    }

    const currencies = context.currencies
      .map((row: any) => {
        const code = cleanCurrencyCode(row?.currency_code);
        if (!code) return null;

        return {
          id: s(row?.id) || null,
          currency_code: code,
          symbol: s(row?.symbol) || code,
          decimal_digits: Number(row?.decimal_digits ?? 2),
          is_enabled: Boolean(row?.is_enabled),
          is_default: Boolean(row?.is_default),
          metadata: row?.metadata ?? {},
        };
      })
      .filter(Boolean)
      .filter(
        (row: any) =>
          row.is_enabled || row.currency_code === context.defaultCurrency,
      );

    const requestedTarget = cleanCurrencyCode(
      req.nextUrl.searchParams.get("currency"),
    );

    let preview: any = null;

    if (requestedTarget && requestedTarget !== currentCurrency) {
      if (!isCurrencyEnabled(context, requestedTarget)) {
        return NextResponse.json(
          { error: "العملة المطلوبة غير مفعلة في المتجر" },
          { status: 400 },
        );
      }

      preview = {
        from_currency: currentCurrency,
        to_currency: requestedTarget,
        subtotal: moneyConversion({
          context,
          amount: order.subtotal,
          fromCurrency: currentCurrency,
          toCurrency: requestedTarget,
        }),
        shipping_amount: moneyConversion({
          context,
          amount: order.shipping_amount,
          fromCurrency: currentCurrency,
          toCurrency: requestedTarget,
        }),
        tax_amount: moneyConversion({
          context,
          amount: order.tax_amount,
          fromCurrency: currentCurrency,
          toCurrency: requestedTarget,
        }),
        discount_amount: moneyConversion({
          context,
          amount: order.discount_amount,
          fromCurrency: currentCurrency,
          toCurrency: requestedTarget,
        }),
        total_amount: moneyConversion({
          context,
          amount: order.total_amount,
          fromCurrency: currentCurrency,
          toCurrency: requestedTarget,
        }),
      };
    }

    return NextResponse.json({
      ok: true,
      order_id: order.id,
      current_currency: currentCurrency,
      default_currency: context.defaultCurrency,
      can_change: canChange,
      blocked_reason: blockedReason,
      currencies,
      preview,
    });
  } catch (error: any) {
    const message =
      error?.message === "ORDER_NOT_FOUND"
        ? "الطلب غير موجود"
        : error?.message || "تعذر قراءة عملات الطلب";

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const orderId = s(id);

    if (!orderId) {
      return NextResponse.json({ error: "رقم الطلب مطلوب" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const targetCurrency = cleanCurrencyCode(
      body?.currency ?? body?.target_currency ?? body?.targetCurrency,
    );

    if (!targetCurrency) {
      return NextResponse.json(
        { error: "اختر العملة الجديدة للطلب" },
        { status: 400 },
      );
    }

    const admin = supabaseAdmin();

    const order = await loadOrderForCurrencyChange({
      admin,
      storeId: s(storeUser.store_id),
      orderId,
    });

    assertOrderCanChangeCurrency(order);

    const fromCurrency = cleanCurrencyCode(order.currency);

    if (!fromCurrency) {
      return NextResponse.json(
        { error: "عملة الطلب الحالية غير صحيحة" },
        { status: 400 },
      );
    }

    if (fromCurrency === targetCurrency) {
      return NextResponse.json({
        ok: true,
        order_id: order.id,
        currency: targetCurrency,
        unchanged: true,
      });
    }

    const context = await loadOrderMoneyContext({
      admin,
      storeId: s(storeUser.store_id),
      orderId,
      orderCurrency: targetCurrency,
    });

    if (!isCurrencyEnabled(context, targetCurrency)) {
      return NextResponse.json(
        { error: "العملة الجديدة غير مفعلة في المتجر" },
        { status: 400 },
      );
    }

    const beforeTotals = await getOrderTotalsSnapshot({
      admin,
      storeId: s(storeUser.store_id),
      orderId,
    });

    const masterConversion = moneyConversion({
      context,
      amount: 1,
      fromCurrency,
      toCurrency: targetCurrency,
    });

    const itemResult = await convertOrderItems({
      admin,
      context,
      orderId,
      storeId: s(storeUser.store_id),
      fromCurrency,
      toCurrency: targetCurrency,
    });

    const orderOptionConversions = await convertOrderOptionAnswers({
      admin,
      context,
      orderId,
      storeId: s(storeUser.store_id),
      fromCurrency,
      toCurrency: targetCurrency,
      actorId: s(storeUser.id) || null,
    });

    const cartCouponConversion = await convertCartCoupon({
      admin,
      context,
      storeId: s(storeUser.store_id),
      cartId: s(order.cart_id) || null,
      fromCurrency,
      toCurrency: targetCurrency,
    });

    const snapshotResult = convertSnapshotMoney({
      context,
      snapshot: order.shipping_snapshot,
      fromCurrency,
      toCurrency: targetCurrency,
      actorId: s(storeUser.id) || null,
    });

    const customProductConversions = await convertCustomOrderProducts({
      admin,
      context,
      orderId,
      storeId: s(storeUser.store_id),
      productIds: itemResult.productIds,
      fromCurrency,
      toCurrency: targetCurrency,
    });

    const subtotalConversion = moneyConversion({
      context,
      amount: order.subtotal,
      fromCurrency,
      toCurrency: targetCurrency,
    });

    const shippingConversion = moneyConversion({
      context,
      amount: order.shipping_amount,
      fromCurrency,
      toCurrency: targetCurrency,
    });

    const taxConversion = moneyConversion({
      context,
      amount: order.tax_amount,
      fromCurrency,
      toCurrency: targetCurrency,
    });

    const discountConversion = moneyConversion({
      context,
      amount: order.discount_amount,
      fromCurrency,
      toCurrency: targetCurrency,
    });

    const totalConversion = moneyConversion({
      context,
      amount: order.total_amount,
      fromCurrency,
      toCurrency: targetCurrency,
    });

    const nowIso = new Date().toISOString();

    const { error: updateOrderError } = await admin
      .from("orders")
      .update({
        currency: targetCurrency,
        subtotal: subtotalConversion.amount_after_conversion,
        shipping_amount: shippingConversion.amount_after_conversion,
        tax_amount: taxConversion.amount_after_conversion,
        discount_amount: discountConversion.amount_after_conversion,
        total_amount: totalConversion.amount_after_conversion,
        shipping_snapshot: snapshotResult.snapshot,
        updated_at: nowIso,
      })
      .eq("id", orderId)
      .eq("store_id", storeUser.store_id);

    if (updateOrderError) {
      throw new Error(updateOrderError.message);
    }

    const recalcResult = await recalcOrderTotalsForAdmin({
      admin,
      storeId: s(storeUser.store_id),
      orderId,
    });

    await writeOrderAuditLog({
      admin,
      storeId: s(storeUser.store_id),
      actorId: s(storeUser.id),
      orderId,
      action: "order.currency.changed",
      beforeData: {
        from_currency: fromCurrency,
        to_currency: targetCurrency,
        totals: beforeTotals,
        order: {
          id: order.id,
          order_number: order.order_number ?? null,
          payment_status: order.payment_status ?? null,
          payment_method: order.payment_method ?? null,
          status: order.status ?? null,
          base_status_key: order.base_status_key ?? null,
          invoice_no: order.invoice_no ?? null,
        },
      },
      afterData: {
        from_currency: fromCurrency,
        to_currency: targetCurrency,
        exchange_rate: masterConversion.exchange_rate,
        source_rate_to_default: masterConversion.source_rate_to_default,
        target_rate_to_default: masterConversion.target_rate_to_default,
        totals: recalcResult.after,
        conversions: {
          order_amounts: {
            subtotal: subtotalConversion,
            shipping_amount: shippingConversion,
            tax_amount: taxConversion,
            discount_amount: discountConversion,
            total_amount: totalConversion,
          },
          items: itemResult.conversions,
          order_options: orderOptionConversions,
          cart_coupon: cartCouponConversion,
          shipping_snapshot: snapshotResult.conversions,
          custom_products: customProductConversions,
          recalc: recalcResult.conversions,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      order_id: orderId,
      from_currency: fromCurrency,
      to_currency: targetCurrency,
      exchange_rate: masterConversion.exchange_rate,
      before: beforeTotals,
      after: recalcResult.after,
      conversions: {
        items: itemResult.conversions,
        order_options: orderOptionConversions,
        cart_coupon: cartCouponConversion,
        shipping_snapshot: snapshotResult.conversions,
        custom_products: customProductConversions,
        recalc: recalcResult.conversions,
      },
    });
  } catch (error: any) {
    const raw = s(error?.message);

    const message =
      raw === "ORDER_NOT_FOUND"
        ? "الطلب غير موجود"
        : raw.startsWith("CURRENCY_NOT_CONFIGURED:")
          ? "العملة غير مضافة في إعدادات عملات المتجر"
          : raw.startsWith("ORDER_CURRENCY_NOT_CONFIGURED:")
            ? "عملة الطلب غير مضافة في إعدادات عملات المتجر"
            : raw.startsWith("INVALID_EXCHANGE_RATE:")
              ? "سعر الصرف غير صحيح في إعدادات العملات"
              : raw || "تعذر تغيير عملة الطلب";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}