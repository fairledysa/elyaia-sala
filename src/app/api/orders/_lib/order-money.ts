// FILE: apps/merchant/src/app/api/orders/_lib/order-money.ts

import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof supabaseAdmin>;

type CurrencyRow = {
  id?: string | null;
  store_id?: string | null;
  currency_code?: string | null;
  symbol?: string | null;
  decimal_digits?: number | string | null;
  is_enabled?: boolean | null;
  is_default?: boolean | null;
  metadata?: Record<string, any> | string | null;
};

type OrderMoneyContext = {
  storeId: string;
  orderId?: string | null;
  orderCurrency: string;
  defaultCurrency: string;
  currencies: CurrencyRow[];
  currencyMap: Map<string, CurrencyRow>;
};

type ConversionResult = {
  amount_before_conversion: number;
  amount_after_conversion: number;
  source_currency: string;
  target_currency: string;
  source_rate_to_default: number;
  target_rate_to_default: number;
  exchange_rate: number;
};

type RecalcOrderTotalsInput = {
  admin: AdminClient;
  storeId: string;
  orderId: string;
  actorId?: string | null;
  auditAction?: string | null;
  auditBeforeData?: any;
  auditAfterData?: any;

  /**
   * يستخدم في عملية تحويل عملة الطلب.
   * لا نعيد حساب الكوبون من جدول coupons لأننا نحول قيمة الخصم الحالية المجمدة.
   */
  preserveExistingDiscount?: boolean;

  /**
   * يستخدم في عملية تحويل عملة الطلب.
   * لا نعيد قراءة رسوم COD من سعر الشحن، بل نحافظ على الرسوم الحالية بعد تحويلها.
   */
  preserveExistingPaymentFee?: boolean;
};

type RecalcOrderTotalsResult = {
  order_id: string;
  currency: string;
  before: {
    subtotal: number;
    shipping_amount: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
  };
  after: {
    subtotal: number;
    shipping_amount: number;
    order_options_fee: number;
    payment_fee: number;
    discount_amount: number;
    tax_amount: number;
    total_amount: number;
  };
  conversions: Record<string, any>;
};

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

function positiveRate(value: any, fallback = 1) {
  const v = Number(value ?? fallback);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

function roundRate(value: number) {
  return Math.round((n(value) + Number.EPSILON) * 100000000) / 100000000;
}

function clampMoney(value: number) {
  return Math.max(0, n(value));
}

function readRateFromMetadata(metadataInput: any, fallback = 1) {
  const metadata = safeObject(metadataInput);

  return positiveRate(
    metadata.rate_to_default ??
      metadata.exchange_rate ??
      metadata.exchangeRate ??
      metadata.rate ??
      metadata.conversion_rate ??
      metadata.conversionRate,
    fallback,
  );
}

function readCurrencyDecimals(row: CurrencyRow | null | undefined) {
  const raw = Number(row?.decimal_digits ?? 2);
  if (!Number.isFinite(raw)) return 2;

  return Math.min(Math.max(Math.floor(raw), 0), 4);
}

function normalizeCouponType(value: any) {
  const x = s(value).toLowerCase();

  if (x === "p" || x === "percent" || x === "percentage") {
    return "percentage";
  }

  if (x === "f" || x === "fixed" || x === "amount") {
    return "fixed";
  }

  return x || "fixed";
}

function readTaxRate(order: any) {
  const snapshot = safeObject(order?.shipping_snapshot);
  const checkout = safeObject(snapshot.checkout);

  const raw = n(
    firstValue(
      order?.tax_rate,
      snapshot.tax_rate,
      snapshot.taxRate,
      checkout.tax_rate,
      checkout.taxRate,
      0,
    ),
  );

  return raw > 0 ? raw : 0;
}

function snapshotCheckout(snapshot: any) {
  const root = safeObject(snapshot);
  const checkout = safeObject(root.checkout);

  return {
    root,
    checkout,
    source: Object.keys(checkout).length ? checkout : root,
  };
}

function readSnapshotOptionLines(snapshot: any) {
  const { root, checkout } = snapshotCheckout(snapshot);

  return safeArray(
    firstValue(
      checkout.order_options,
      checkout.orderOptions,
      checkout.order_options_lines,
      checkout.orderOptionsLines,
      root.order_options,
      root.orderOptions,
      root.order_options_lines,
      root.orderOptionsLines,
      [],
    ),
  );
}

function readSnapshotOptionFee(snapshot: any) {
  const { root, checkout } = snapshotCheckout(snapshot);

  return n(
    firstValue(
      checkout.order_options_fee,
      checkout.orderOptionsFee,
      checkout.order_options_total,
      checkout.orderOptionsTotal,
      checkout.order_options_amount,
      checkout.options_amount,
      root.order_options_fee,
      root.orderOptionsFee,
      root.order_options_total,
      root.orderOptionsTotal,
      root.order_options_amount,
      root.options_amount,
      0,
    ),
  );
}

function readLinePrice(line: any) {
  const metadata = safeObject(line?.metadata);

  if (metadata.edited_by_admin && hasValue(metadata.price_customer)) {
    return n(metadata.price_customer);
  }

  return n(
    firstValue(
      line?.price_customer,
      line?.priceCustomer,
      line?.price,
      line?.amount,
      line?.fee,
      metadata.price_customer,
      metadata.priceCustomer,
      metadata.price,
      metadata.amount,
      metadata.fee,
      0,
    ),
  );
}

function readLineCurrency(line: any, fallbackCurrency: string) {
  const metadata = safeObject(line?.metadata);

  if (metadata.edited_by_admin) {
    const editedCurrency = cleanCurrencyCode(
      firstValue(
        metadata.currency,
        metadata.currency_code,
        metadata.currencyCode,
        null,
      ),
    );

    if (editedCurrency) return editedCurrency;
  }

  return (
    cleanCurrencyCode(
      firstValue(
        line?.currency,
        line?.currency_code,
        line?.currencyCode,
        metadata.currency,
        metadata.currency_code,
        metadata.currencyCode,
        fallbackCurrency,
      ),
    ) || fallbackCurrency
  );
}

function readAnswerPrice(row: any) {
  const metadata = safeObject(row?.metadata);

  if (metadata.edited_by_admin && hasValue(metadata.price_customer)) {
    return n(metadata.price_customer);
  }

  return n(
    firstValue(
      row?.price_customer,
      row?.priceCustomer,
      row?.price,
      row?.amount,
      row?.fee,
      metadata.price_customer,
      metadata.priceCustomer,
      metadata.price,
      metadata.amount,
      metadata.fee,
      0,
    ),
  );
}

function readAnswerCurrency(row: any, fallbackCurrency: string) {
  const metadata = safeObject(row?.metadata);

  if (metadata.edited_by_admin) {
    const editedCurrency = cleanCurrencyCode(
      firstValue(
        metadata.currency,
        metadata.currency_code,
        metadata.currencyCode,
        null,
      ),
    );

    if (editedCurrency) return editedCurrency;
  }

  return (
    cleanCurrencyCode(
      firstValue(
        row?.currency,
        row?.currency_code,
        row?.currencyCode,
        metadata.currency,
        metadata.currency_code,
        metadata.currencyCode,
        fallbackCurrency,
      ),
    ) || fallbackCurrency
  );
}

function readAnswerTitle(row: any) {
  const metadata = safeObject(row?.metadata);

  return s(
    firstValue(
      row?.option_name,
      row?.optionName,
      row?.name,
      row?.title,
      row?.label,
      metadata.option_name,
      metadata.optionName,
      metadata.name,
      metadata.title,
      metadata.label,
      "خيار الطلب",
    ),
  );
}

function readAnswerValue(row: any) {
  const metadata = safeObject(row?.metadata);

  return s(
    firstValue(
      row?.display_value,
      row?.displayValue,
      row?.answer_label,
      row?.answerLabel,
      row?.answer_value,
      row?.answerValue,
      row?.value,
      metadata.display_value,
      metadata.displayValue,
      metadata.answer_label,
      metadata.answerLabel,
      metadata.answer_value,
      metadata.answerValue,
      metadata.value,
      "",
    ),
  );
}

function readAnswerOptionId(row: any) {
  const metadata = safeObject(row?.metadata);

  return s(
    firstValue(
      row?.option_id,
      row?.optionId,
      row?.order_option_id,
      row?.orderOptionId,
      row?.store_order_option_id,
      row?.storeOrderOptionId,
      metadata.option_id,
      metadata.optionId,
      metadata.order_option_id,
      metadata.orderOptionId,
      metadata.store_order_option_id,
      metadata.storeOrderOptionId,
      null,
    ),
  );
}

async function writeOrderAuditLog(args: {
  admin: AdminClient;
  storeId: string;
  actorId?: string | null;
  orderId: string;
  action: string;
  beforeData?: any;
  afterData?: any;
}) {
  const storeId = s(args.storeId);
  const orderId = s(args.orderId);
  const action = s(args.action);

  if (!storeId || !orderId || !action) return;

  const { error } = await args.admin.from("audit_logs").insert({
    store_id: storeId,
    actor_type: "store_user",
    actor_id: s(args.actorId) || null,
    action,
    entity_type: "order",
    entity_id: orderId,
    before_data: args.beforeData ?? null,
    after_data: args.afterData ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function loadOrderMoneyContext(args: {
  admin: AdminClient;
  storeId: string;
  orderId?: string | null;
  orderCurrency?: string | null;
}): Promise<OrderMoneyContext> {
  const storeId = s(args.storeId);
  if (!storeId) throw new Error("STORE_ID_REQUIRED");

  const { data: store, error: storeError } = await args.admin
    .from("stores")
    .select("id, default_currency")
    .eq("id", storeId)
    .single();

  if (storeError || !store?.id) {
    throw new Error(storeError?.message || "STORE_NOT_FOUND");
  }

  const defaultCurrency = cleanCurrencyCode(store.default_currency);
  if (!defaultCurrency) {
    throw new Error("STORE_DEFAULT_CURRENCY_MISSING");
  }

  const orderCurrency =
    cleanCurrencyCode(args.orderCurrency) || defaultCurrency;

  const { data: currencies, error: currenciesError } = await args.admin
    .from("store_currencies")
    .select("*")
    .eq("store_id", storeId)
    .order("is_default", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("currency_code", { ascending: true });

  if (currenciesError) {
    throw new Error(currenciesError.message);
  }

  const rows = Array.isArray(currencies) ? (currencies as CurrencyRow[]) : [];
  const currencyMap = new Map<string, CurrencyRow>();

  for (const row of rows) {
    const code = cleanCurrencyCode(row.currency_code);
    if (!code) continue;

    currencyMap.set(code, row);
  }

  if (!currencyMap.has(defaultCurrency)) {
    currencyMap.set(defaultCurrency, {
      store_id: storeId,
      currency_code: defaultCurrency,
      decimal_digits: 2,
      is_enabled: true,
      is_default: true,
      metadata: {
        rate_to_default: 1,
        exchange_rate: 1,
        rate: 1,
      },
    });
  }

  if (!currencyMap.has(orderCurrency)) {
    throw new Error(`ORDER_CURRENCY_NOT_CONFIGURED:${orderCurrency}`);
  }

  return {
    storeId,
    orderId: s(args.orderId) || null,
    orderCurrency,
    defaultCurrency,
    currencies: rows,
    currencyMap,
  };
}

export function getRateToDefault(
  context: OrderMoneyContext,
  currencyInput: any,
) {
  const currency = cleanCurrencyCode(currencyInput);

  if (!currency) {
    throw new Error("CURRENCY_REQUIRED");
  }

  if (currency === context.defaultCurrency) return 1;

  const row = context.currencyMap.get(currency);
  if (!row) {
    throw new Error(`CURRENCY_NOT_CONFIGURED:${currency}`);
  }

  const rate = readRateFromMetadata(row.metadata, 0);

  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(`INVALID_EXCHANGE_RATE:${currency}`);
  }

  return rate;
}

export function getCurrencyDecimals(
  context: OrderMoneyContext,
  currencyInput?: any,
) {
  const currency = cleanCurrencyCode(currencyInput) || context.orderCurrency;
  const row = context.currencyMap.get(currency);

  return readCurrencyDecimals(row);
}

export function roundMoney(
  context: OrderMoneyContext,
  amount: any,
  currencyInput?: any,
) {
  const currency = cleanCurrencyCode(currencyInput) || context.orderCurrency;
  const digits = getCurrencyDecimals(context, currency);
  const factor = 10 ** digits;

  return Math.round((n(amount) + Number.EPSILON) * factor) / factor;
}

export function convertMoney(
  context: OrderMoneyContext,
  amountInput: any,
  fromCurrencyInput: any,
  toCurrencyInput?: any,
): ConversionResult {
  const amount = n(amountInput);
  const fromCurrency = cleanCurrencyCode(fromCurrencyInput);
  const toCurrency = cleanCurrencyCode(toCurrencyInput) || context.orderCurrency;

  if (!fromCurrency) {
    throw new Error("SOURCE_CURRENCY_REQUIRED");
  }

  if (!toCurrency) {
    throw new Error("TARGET_CURRENCY_REQUIRED");
  }

  const sourceRate = getRateToDefault(context, fromCurrency);
  const targetRate = getRateToDefault(context, toCurrency);

  const exchangeRate = sourceRate / targetRate;
  const converted =
    fromCurrency === toCurrency
      ? roundMoney(context, amount, toCurrency)
      : roundMoney(context, amount * exchangeRate, toCurrency);

  return {
    amount_before_conversion: roundMoney(context, amount, fromCurrency),
    amount_after_conversion: converted,
    source_currency: fromCurrency,
    target_currency: toCurrency,
    source_rate_to_default: sourceRate,
    target_rate_to_default: targetRate,
    exchange_rate: roundRate(exchangeRate),
  };
}

export function convertToOrderCurrency(
  context: OrderMoneyContext,
  amountInput: any,
  sourceCurrencyInput: any,
) {
  return convertMoney(
    context,
    amountInput,
    sourceCurrencyInput,
    context.orderCurrency,
  );
}

export function calculateCouponDiscountForOrder(args: {
  context: OrderMoneyContext;
  subtotal: number;
  couponType: string;
  couponAmount: number;
  couponCurrency?: string | null;
  maximumAmount?: number | null;
  maximumAmountCurrency?: string | null;
}) {
  const subtotal = clampMoney(args.subtotal);
  const couponType = normalizeCouponType(args.couponType);
  const couponAmount = clampMoney(args.couponAmount);

  if (subtotal <= 0 || couponAmount <= 0) {
    return {
      discount_amount: 0,
      coupon_amount_in_order_currency: 0,
      conversion: null as ConversionResult | null,
      maximum_conversion: null as ConversionResult | null,
    };
  }

  if (couponType === "percentage") {
    let discount = subtotal * (couponAmount / 100);
    let maximumConversion: ConversionResult | null = null;

    if (args.maximumAmount != null && n(args.maximumAmount) > 0) {
      maximumConversion = convertToOrderCurrency(
        args.context,
        args.maximumAmount,
        cleanCurrencyCode(args.maximumAmountCurrency) ||
          args.context.defaultCurrency,
      );

      discount = Math.min(discount, maximumConversion.amount_after_conversion);
    }

    return {
      discount_amount: roundMoney(
        args.context,
        Math.min(subtotal, discount),
        args.context.orderCurrency,
      ),
      coupon_amount_in_order_currency: couponAmount,
      conversion: null as ConversionResult | null,
      maximum_conversion: maximumConversion,
    };
  }

  const conversion = convertToOrderCurrency(
    args.context,
    couponAmount,
    cleanCurrencyCode(args.couponCurrency) || args.context.defaultCurrency,
  );

  return {
    discount_amount: roundMoney(
      args.context,
      Math.min(subtotal, conversion.amount_after_conversion),
      args.context.orderCurrency,
    ),
    coupon_amount_in_order_currency: conversion.amount_after_conversion,
    conversion,
    maximum_conversion: null as ConversionResult | null,
  };
}

async function normalizeOrderItems(args: {
  admin: AdminClient;
  context: OrderMoneyContext;
  orderId: string;
  storeId: string;
}) {
  const { data: items, error } = await args.admin
    .from("order_items")
    .select("id, qty, unit_price, total_price, currency")
    .eq("order_id", args.orderId)
    .eq("store_id", args.storeId);

  if (error) {
    throw new Error(error.message);
  }

  const rows = Array.isArray(items) ? items : [];
  const conversions: any[] = [];
  let subtotal = 0;

  for (const item of rows) {
    const itemId = s((item as any)?.id);
    const qty = Math.max(1, Math.floor(n((item as any)?.qty)));
    const sourceCurrency =
      cleanCurrencyCode((item as any)?.currency) || args.context.orderCurrency;

    const unitConversion = convertToOrderCurrency(
      args.context,
      n((item as any)?.unit_price),
      sourceCurrency,
    );

    const rawTotal =
      (item as any)?.total_price != null
        ? n((item as any)?.total_price)
        : qty * n((item as any)?.unit_price);

    const totalConversion = convertToOrderCurrency(
      args.context,
      rawTotal,
      sourceCurrency,
    );

    const nextUnitPrice = unitConversion.amount_after_conversion;
    const nextTotalPrice = totalConversion.amount_after_conversion;

    subtotal += nextTotalPrice;

    const shouldUpdate =
      sourceCurrency !== args.context.orderCurrency ||
      n((item as any)?.unit_price) !== nextUnitPrice ||
      n((item as any)?.total_price) !== nextTotalPrice ||
      cleanCurrencyCode((item as any)?.currency) !== args.context.orderCurrency;

    if (shouldUpdate && itemId) {
      const { error: updateError } = await args.admin
        .from("order_items")
        .update({
          currency: args.context.orderCurrency,
          unit_price: nextUnitPrice,
          total_price: nextTotalPrice,
        })
        .eq("id", itemId)
        .eq("order_id", args.orderId)
        .eq("store_id", args.storeId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      conversions.push({
        item_id: itemId,
        unit_price: unitConversion,
        total_price: totalConversion,
      });
    }
  }

  return {
    subtotal: roundMoney(args.context, subtotal, args.context.orderCurrency),
    conversions,
  };
}

function computeShippingMoney(args: {
  context: OrderMoneyContext;
  order: any;
}) {
  const snapshot = safeObject(args.order?.shipping_snapshot);
  const requiresShipping =
    snapshot.requires_shipping === false
      ? false
      : Boolean(s(args.order?.shipping_id));

  if (!requiresShipping) {
    return {
      amount: 0,
      snapshot: {
        ...snapshot,
        requires_shipping: false,
        customer_price: 0,
        shipping_amount: 0,
        currency: args.context.orderCurrency,
      },
      conversion: null as ConversionResult | null,
    };
  }

  if (snapshot.free_shipping === true) {
    return {
      amount: 0,
      snapshot: {
        ...snapshot,
        free_shipping: true,
        customer_price: 0,
        shipping_amount: 0,
        currency: args.context.orderCurrency,
      },
      conversion: null as ConversionResult | null,
    };
  }

  const sourceAmount = n(
    firstValue(
      snapshot.customer_price,
      snapshot.shipping_amount,
      args.order?.shipping_amount,
      0,
    ),
  );

  const sourceCurrency =
    cleanCurrencyCode(
      firstValue(
        snapshot.shipping_currency,
        snapshot.customer_price_currency,
        snapshot.currency,
        args.context.orderCurrency,
      ),
    ) || args.context.orderCurrency;

  const conversion = convertToOrderCurrency(
    args.context,
    sourceAmount,
    sourceCurrency,
  );

  const nextSnapshot = {
    ...snapshot,
    requires_shipping: true,
    customer_price: conversion.amount_after_conversion,
    shipping_amount: conversion.amount_after_conversion,
    shipping_currency: args.context.orderCurrency,
    customer_price_currency: args.context.orderCurrency,
    currency: args.context.orderCurrency,
    source_currency:
      sourceCurrency === args.context.orderCurrency ? undefined : sourceCurrency,
    amount_before_conversion:
      sourceCurrency === args.context.orderCurrency
        ? undefined
        : conversion.amount_before_conversion,
    amount_after_conversion:
      sourceCurrency === args.context.orderCurrency
        ? undefined
        : conversion.amount_after_conversion,
    exchange_rate:
      sourceCurrency === args.context.orderCurrency
        ? undefined
        : conversion.exchange_rate,
  };

  return {
    amount: conversion.amount_after_conversion,
    snapshot: nextSnapshot,
    conversion:
      sourceCurrency === args.context.orderCurrency ? null : conversion,
  };
}

async function loadCodFeeFromShippingRate(args: {
  admin: AdminClient;
  context: OrderMoneyContext;
  shippingId?: string | null;
}) {
  const shippingId = s(args.shippingId);
  if (!shippingId) return null;

  const { data, error } = await args.admin
    .from("store_shipping_rates")
    .select("id, store_id, cod_enabled, cod_fee_customer, currency, enabled, status")
    .eq("id", shippingId)
    .eq("store_id", args.context.storeId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.id) return null;

  const enabled = data.enabled === true || data.enabled === 1;
  const active = s(data.status) === "active";

  if (!enabled || !active || data.cod_enabled !== true) {
    return null;
  }

  const sourceCurrency =
    cleanCurrencyCode((data as any).currency) || args.context.defaultCurrency;

  const sourceAmount = n((data as any).cod_fee_customer);

  const conversion = convertToOrderCurrency(
    args.context,
    sourceAmount,
    sourceCurrency,
  );

  return {
    rate_id: s((data as any).id),
    source_amount: conversion.amount_before_conversion,
    amount: conversion.amount_after_conversion,
    source_currency: sourceCurrency,
    conversion:
      sourceCurrency === args.context.orderCurrency ? null : conversion,
  };
}

async function computePaymentFeeMoney(args: {
  admin: AdminClient;
  context: OrderMoneyContext;
  order: any;
  snapshot: any;
  preserveExistingPaymentFee?: boolean;
}) {
  const paymentMethod = s(args.order?.payment_method).toLowerCase();

  if (paymentMethod !== "cod") {
    return {
      amount: 0,
      snapshot: {
        ...args.snapshot,
        payment_method: s(args.order?.payment_method) || null,
        cod_fee_customer: 0,
        cod_fee: 0,
        payment_fee: 0,
        cod_fee_currency: args.context.orderCurrency,
        payment_fee_currency: args.context.orderCurrency,
      },
      conversion: null as ConversionResult | null,
    };
  }

  const fromRate = args.preserveExistingPaymentFee
    ? null
    : await loadCodFeeFromShippingRate({
        admin: args.admin,
        context: args.context,
        shippingId: s(args.order?.shipping_id) || null,
      });

  let sourceAmount = 0;
  let sourceCurrency = args.context.orderCurrency;
  let conversion: ConversionResult;

  if (fromRate) {
    sourceAmount = fromRate.source_amount;
    sourceCurrency = fromRate.source_currency;
    conversion = convertToOrderCurrency(args.context, sourceAmount, sourceCurrency);
  } else {
    sourceAmount = n(
      firstValue(
        args.snapshot.cod_fee_before_conversion,
        args.snapshot.cod_fee_customer,
        args.snapshot.cod_fee,
        args.snapshot.payment_fee,
        args.snapshot.payment_fee_amount,
        0,
      ),
    );

    sourceCurrency =
      cleanCurrencyCode(
        firstValue(
          args.snapshot.cod_fee_source_currency,
          args.snapshot.cod_fee_currency,
          args.snapshot.payment_fee_currency,
          args.snapshot.currency,
          args.context.orderCurrency,
        ),
      ) || args.context.orderCurrency;

    conversion = convertToOrderCurrency(args.context, sourceAmount, sourceCurrency);
  }

  const nextSnapshot = {
    ...args.snapshot,
    payment_method: "cod",
    cod_fee_customer: conversion.amount_after_conversion,
    cod_fee: conversion.amount_after_conversion,
    payment_fee: conversion.amount_after_conversion,
    cod_fee_currency: args.context.orderCurrency,
    payment_fee_currency: args.context.orderCurrency,
    currency: args.context.orderCurrency,

    cod_fee_source_currency:
      sourceCurrency === args.context.orderCurrency ? null : sourceCurrency,
    cod_fee_before_conversion:
      sourceCurrency === args.context.orderCurrency
        ? null
        : conversion.amount_before_conversion,
    cod_fee_after_conversion:
      sourceCurrency === args.context.orderCurrency
        ? null
        : conversion.amount_after_conversion,
    cod_fee_exchange_rate:
      sourceCurrency === args.context.orderCurrency ? null : conversion.exchange_rate,
  };

  return {
    amount: conversion.amount_after_conversion,
    snapshot: nextSnapshot,
    conversion:
      sourceCurrency === args.context.orderCurrency ? null : conversion,
  };
}

function updateSnapshotOrderOptions(args: {
  context: OrderMoneyContext;
  snapshot: any;
  lines: any[];
  fee: number;
}) {
  const root = safeObject(args.snapshot);
  const checkout =
    root.checkout && typeof root.checkout === "object" && !Array.isArray(root.checkout)
      ? { ...root.checkout }
      : {};

  const normalizedLines = args.lines.map((line) => ({
    ...line,
    price_customer: roundMoney(
      args.context,
      line.price_customer,
      args.context.orderCurrency,
    ),
    priceCustomer: roundMoney(
      args.context,
      line.price_customer,
      args.context.orderCurrency,
    ),
    currency: args.context.orderCurrency,
  }));

  const fee = roundMoney(args.context, args.fee, args.context.orderCurrency);

  const nextCheckout = {
    ...checkout,
    order_options: normalizedLines,
    orderOptions: normalizedLines,
    order_options_fee: fee,
    orderOptionsFee: fee,
    order_options_base: fee,
    orderOptionsBase: fee,
    order_options_tax: 0,
    orderOptionsTax: 0,
    order_options_total: fee,
    orderOptionsTotal: fee,
    currency: args.context.orderCurrency,
  };

  return {
    ...root,
    checkout: nextCheckout,
    order_options: normalizedLines,
    orderOptions: normalizedLines,
    order_options_fee: fee,
    orderOptionsFee: fee,
    order_options_base: fee,
    orderOptionsBase: fee,
    order_options_tax: 0,
    orderOptionsTax: 0,
    order_options_total: fee,
    orderOptionsTotal: fee,
    currency: args.context.orderCurrency,
  };
}

async function computeOrderOptionsMoney(args: {
  admin: AdminClient;
  context: OrderMoneyContext;
  order: any;
}) {
  const { data: answers, error } = await args.admin
    .from("order_option_answers")
    .select("*")
    .eq("store_id", args.context.storeId)
    .eq("order_id", args.order.id);

  if (error) {
    throw new Error(error.message);
  }

  const rows = Array.isArray(answers) ? answers : [];
  const conversions: any[] = [];
  const lines: any[] = [];
  let fee = 0;

  if (rows.length) {
    for (const row of rows) {
      const rowId = s((row as any)?.id);
      const metadata = safeObject((row as any)?.metadata);
      const sourceCurrency = readAnswerCurrency(row, args.context.orderCurrency);
      const sourceAmount = readAnswerPrice(row);

      const conversion = convertToOrderCurrency(
        args.context,
        sourceAmount,
        sourceCurrency,
      );

      const convertedAmount = conversion.amount_after_conversion;
      fee += convertedAmount;

      const optionId = readAnswerOptionId(row);
      const title = readAnswerTitle(row);
      const value = readAnswerValue(row);

      const nextMetadata = {
        ...metadata,
        price_customer: convertedAmount,
        priceCustomer: convertedAmount,
        currency: args.context.orderCurrency,
        source_currency:
          sourceCurrency === args.context.orderCurrency
            ? metadata.source_currency
            : sourceCurrency,
        amount_before_conversion:
          sourceCurrency === args.context.orderCurrency
            ? metadata.amount_before_conversion
            : conversion.amount_before_conversion,
        amount_after_conversion:
          sourceCurrency === args.context.orderCurrency
            ? metadata.amount_after_conversion
            : conversion.amount_after_conversion,
        exchange_rate:
          sourceCurrency === args.context.orderCurrency
            ? metadata.exchange_rate
            : conversion.exchange_rate,
      };

      lines.push({
        id: rowId || optionId || title,
        option_id: optionId || null,
        optionId: optionId || null,
        name: title,
        title,
        label: title,
        option_name: title,
        optionName: title,
        value,
        display_value: value,
        displayValue: value,
        answer_value: value,
        answerValue: value,
        price_customer: convertedAmount,
        priceCustomer: convertedAmount,
        currency: args.context.orderCurrency,
        metadata: nextMetadata,
      });

      const shouldUpdate =
        rowId &&
        (sourceCurrency !== args.context.orderCurrency ||
          n((row as any)?.price_customer) !== convertedAmount ||
          cleanCurrencyCode((row as any)?.currency) !== args.context.orderCurrency);

      if (shouldUpdate) {
        const { error: updateError } = await args.admin
          .from("order_option_answers")
          .update({
            price_customer: convertedAmount,
            currency: args.context.orderCurrency,
            metadata: nextMetadata,
          })
          .eq("id", rowId)
          .eq("store_id", args.context.storeId)
          .eq("order_id", args.order.id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        conversions.push({
          answer_id: rowId,
          conversion,
        });
      }
    }

    fee = roundMoney(args.context, fee, args.context.orderCurrency);

    return {
      fee,
      lines,
      snapshot: updateSnapshotOrderOptions({
        context: args.context,
        snapshot: args.order.shipping_snapshot,
        lines,
        fee,
      }),
      conversions,
    };
  }

  const snapshotLines = readSnapshotOptionLines(args.order.shipping_snapshot);

  if (snapshotLines.length) {
    for (const line of snapshotLines) {
      const sourceCurrency = readLineCurrency(line, args.context.orderCurrency);
      const sourceAmount = readLinePrice(line);
      const conversion = convertToOrderCurrency(
        args.context,
        sourceAmount,
        sourceCurrency,
      );

      const convertedAmount = conversion.amount_after_conversion;
      const metadata = safeObject(line?.metadata);

      fee += convertedAmount;

      const nextLine = {
        ...line,
        price_customer: convertedAmount,
        priceCustomer: convertedAmount,
        currency: args.context.orderCurrency,
        metadata: {
          ...metadata,
          price_customer: convertedAmount,
          priceCustomer: convertedAmount,
          currency: args.context.orderCurrency,
          source_currency:
            sourceCurrency === args.context.orderCurrency
              ? metadata.source_currency
              : sourceCurrency,
          amount_before_conversion:
            sourceCurrency === args.context.orderCurrency
              ? metadata.amount_before_conversion
              : conversion.amount_before_conversion,
          amount_after_conversion:
            sourceCurrency === args.context.orderCurrency
              ? metadata.amount_after_conversion
              : conversion.amount_after_conversion,
          exchange_rate:
            sourceCurrency === args.context.orderCurrency
              ? metadata.exchange_rate
              : conversion.exchange_rate,
        },
      };

      lines.push(nextLine);

      if (sourceCurrency !== args.context.orderCurrency) {
        conversions.push({
          line_id: s(line?.id) || null,
          conversion,
        });
      }
    }
  } else {
    fee = readSnapshotOptionFee(args.order.shipping_snapshot);
  }

  fee = roundMoney(args.context, fee, args.context.orderCurrency);

  return {
    fee,
    lines,
    snapshot: updateSnapshotOrderOptions({
      context: args.context,
      snapshot: args.order.shipping_snapshot,
      lines,
      fee,
    }),
    conversions,
  };
}

async function computeAppliedDiscount(args: {
  admin: AdminClient;
  context: OrderMoneyContext;
  order: any;
  subtotal: number;
  preserveExistingDiscount?: boolean;
}) {
  const cartId = s(args.order?.cart_id);

  if (args.preserveExistingDiscount) {
    const existingDiscount = roundMoney(
      args.context,
      Math.min(clampMoney(args.order?.discount_amount), args.subtotal),
      args.context.orderCurrency,
    );

    let coupon: any = null;

    if (cartId) {
      const { data: cartCoupon, error: cartCouponError } = await args.admin
        .from("cart_coupons")
        .select("id, coupon_id, code, discount_amount")
        .eq("store_id", args.context.storeId)
        .eq("cart_id", cartId)
        .maybeSingle();

      if (cartCouponError) {
        throw new Error(cartCouponError.message);
      }

      if (cartCoupon?.id) {
        const { error: updateCartCouponError } = await args.admin
          .from("cart_coupons")
          .update({
            discount_amount: existingDiscount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", cartCoupon.id)
          .eq("store_id", args.context.storeId)
          .eq("cart_id", cartId);

        if (updateCartCouponError) {
          throw new Error(updateCartCouponError.message);
        }

        coupon = {
          id: s(cartCoupon.coupon_id) || null,
          code: s(cartCoupon.code) || null,
          discount_amount: existingDiscount,
          preserved_existing_discount: true,
        };
      }
    }

    return {
      discount: existingDiscount,
      coupon,
      conversion: null as any,
    };
  }

  if (!cartId) {
    const existingDiscount = roundMoney(
      args.context,
      Math.min(clampMoney(args.order?.discount_amount), args.subtotal),
      args.context.orderCurrency,
    );

    return {
      discount: existingDiscount,
      coupon: null as any,
      conversion: null as any,
    };
  }

  const { data: cartCoupon, error: cartCouponError } = await args.admin
    .from("cart_coupons")
    .select("id, coupon_id, code, discount_amount")
    .eq("store_id", args.context.storeId)
    .eq("cart_id", cartId)
    .maybeSingle();

  if (cartCouponError) {
    throw new Error(cartCouponError.message);
  }

  if (!cartCoupon?.coupon_id) {
    const existingDiscount = roundMoney(
      args.context,
      Math.min(clampMoney(args.order?.discount_amount), args.subtotal),
      args.context.orderCurrency,
    );

    return {
      discount: existingDiscount,
      coupon: null as any,
      conversion: null as any,
    };
  }

  const { data: coupon, error: couponError } = await args.admin
    .from("coupons")
    .select("id, code, discount_type, amount, maximum_amount")
    .eq("id", cartCoupon.coupon_id)
    .eq("store_id", args.context.storeId)
    .maybeSingle();

  if (couponError) {
    throw new Error(couponError.message);
  }

  if (!coupon?.id) {
    const existingDiscount = roundMoney(
      args.context,
      Math.min(clampMoney(args.order?.discount_amount), args.subtotal),
      args.context.orderCurrency,
    );

    return {
      discount: existingDiscount,
      coupon: null as any,
      conversion: null as any,
    };
  }

  const result = calculateCouponDiscountForOrder({
    context: args.context,
    subtotal: args.subtotal,
    couponType: s(coupon.discount_type),
    couponAmount: n(coupon.amount),
    couponCurrency: args.context.defaultCurrency,
    maximumAmount: coupon.maximum_amount == null ? null : n(coupon.maximum_amount),
    maximumAmountCurrency: args.context.defaultCurrency,
  });

  const { error: updateCartCouponError } = await args.admin
    .from("cart_coupons")
    .update({
      code: s(coupon.code) || s(cartCoupon.code),
      discount_amount: result.discount_amount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cartCoupon.id)
    .eq("store_id", args.context.storeId)
    .eq("cart_id", cartId);

  if (updateCartCouponError) {
    throw new Error(updateCartCouponError.message);
  }

  return {
    discount: result.discount_amount,
    coupon: {
      id: s(coupon.id),
      code: s(coupon.code),
      discount_type: s(coupon.discount_type),
      amount: n(coupon.amount),
      amount_currency: args.context.defaultCurrency,
      amount_in_order_currency: result.coupon_amount_in_order_currency,
      discount_amount: result.discount_amount,
    },
    conversion: result.conversion,
  };
}

export async function getOrderTotalsSnapshot(args: {
  admin: AdminClient;
  storeId: string;
  orderId: string;
}) {
  const { data, error } = await args.admin
    .from("orders")
    .select(
      "id, store_id, currency, subtotal, shipping_amount, tax_amount, discount_amount, total_amount",
    )
    .eq("id", args.orderId)
    .eq("store_id", args.storeId)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "ORDER_NOT_FOUND");
  }

  return {
    id: s(data.id),
    store_id: s(data.store_id),
    currency: cleanCurrencyCode(data.currency),
    subtotal: n(data.subtotal),
    shipping_amount: n(data.shipping_amount),
    tax_amount: n(data.tax_amount),
    discount_amount: n(data.discount_amount),
    total_amount: n(data.total_amount),
  };
}

export async function recalcOrderTotalsForAdmin(
  input: RecalcOrderTotalsInput,
): Promise<RecalcOrderTotalsResult> {
  const admin = input.admin;
  const storeId = s(input.storeId);
  const orderId = s(input.orderId);

  if (!storeId) throw new Error("STORE_ID_REQUIRED");
  if (!orderId) throw new Error("ORDER_ID_REQUIRED");

  const { data: order, error: orderError } = await admin
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
      updated_at
    `,
    )
    .eq("id", orderId)
    .eq("store_id", storeId)
    .single();

  if (orderError || !order?.id) {
    throw new Error(orderError?.message || "ORDER_NOT_FOUND");
  }

  const orderCurrency = cleanCurrencyCode(order.currency);

  if (!orderCurrency) {
    throw new Error("ORDER_CURRENCY_MISSING");
  }

  const context = await loadOrderMoneyContext({
    admin,
    storeId,
    orderId,
    orderCurrency,
  });

  const before = {
    subtotal: roundMoney(context, order.subtotal, context.orderCurrency),
    shipping_amount: roundMoney(
      context,
      order.shipping_amount,
      context.orderCurrency,
    ),
    tax_amount: roundMoney(context, order.tax_amount, context.orderCurrency),
    discount_amount: roundMoney(
      context,
      order.discount_amount,
      context.orderCurrency,
    ),
    total_amount: roundMoney(context, order.total_amount, context.orderCurrency),
  };

  const itemResult = await normalizeOrderItems({
    admin,
    context,
    orderId,
    storeId,
  });

  const shippingResult = computeShippingMoney({
    context,
    order,
  });

  const optionsResult = await computeOrderOptionsMoney({
    admin,
    context,
    order: {
      ...order,
      shipping_snapshot: shippingResult.snapshot,
    },
  });

  const paymentResult = await computePaymentFeeMoney({
    admin,
    context,
    order,
    snapshot: optionsResult.snapshot,
    preserveExistingPaymentFee: Boolean(input.preserveExistingPaymentFee),
  });

  const subtotal = roundMoney(
    context,
    itemResult.subtotal,
    context.orderCurrency,
  );

  const shippingAmount = roundMoney(
    context,
    shippingResult.amount,
    context.orderCurrency,
  );

  const orderOptionsFee = roundMoney(
    context,
    optionsResult.fee,
    context.orderCurrency,
  );

  const paymentFee = roundMoney(
    context,
    paymentResult.amount,
    context.orderCurrency,
  );

  const discountResult = await computeAppliedDiscount({
    admin,
    context,
    order,
    subtotal,
    preserveExistingDiscount: Boolean(input.preserveExistingDiscount),
  });

  const discountAmount = roundMoney(
    context,
    Math.min(subtotal, clampMoney(discountResult.discount)),
    context.orderCurrency,
  );

  const taxRate = readTaxRate({
    ...order,
    shipping_snapshot: paymentResult.snapshot,
  });

  const taxableBase = roundMoney(
    context,
    Math.max(0, subtotal - discountAmount) +
      shippingAmount +
      orderOptionsFee +
      paymentFee,
    context.orderCurrency,
  );

  const taxAmount =
    taxRate > 0
      ? roundMoney(
          context,
          taxableBase * (taxRate / 100),
          context.orderCurrency,
        )
      : roundMoney(context, order.tax_amount, context.orderCurrency);

  const totalAmount = roundMoney(
    context,
    Math.max(0, subtotal - discountAmount) +
      shippingAmount +
      orderOptionsFee +
      paymentFee +
      taxAmount,
    context.orderCurrency,
  );

  const nextSnapshot = {
    ...paymentResult.snapshot,
    currency: context.orderCurrency,
    money: {
      currency: context.orderCurrency,
      subtotal,
      shipping_amount: shippingAmount,
      order_options_fee: orderOptionsFee,
      payment_fee: paymentFee,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      tax_rate: taxRate,
      updated_at: new Date().toISOString(),
    },
  };

  const nowIso = new Date().toISOString();

  const { error: updateError } = await admin
    .from("orders")
    .update({
      currency: context.orderCurrency,
      subtotal,
      shipping_amount: shippingAmount,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      shipping_snapshot: nextSnapshot,
      updated_at: nowIso,
    })
    .eq("id", orderId)
    .eq("store_id", storeId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const after = {
    subtotal,
    shipping_amount: shippingAmount,
    order_options_fee: orderOptionsFee,
    payment_fee: paymentFee,
    discount_amount: discountAmount,
    tax_amount: taxAmount,
    total_amount: totalAmount,
  };

  const conversions = {
    items: itemResult.conversions,
    shipping: shippingResult.conversion,
    order_options: optionsResult.conversions,
    payment_fee: paymentResult.conversion,
    coupon: discountResult.conversion,
    coupon_data: discountResult.coupon,
  };

  if (input.auditAction && input.actorId) {
    await writeOrderAuditLog({
      admin,
      storeId,
      actorId: input.actorId,
      orderId,
      action: input.auditAction,
      beforeData: {
        totals: before,
        ...(input.auditBeforeData ?? {}),
      },
      afterData: {
        totals: after,
        conversions,
        ...(input.auditAfterData ?? {}),
      },
    });
  }

  return {
    order_id: orderId,
    currency: context.orderCurrency,
    before,
    after,
    conversions,
  };
}