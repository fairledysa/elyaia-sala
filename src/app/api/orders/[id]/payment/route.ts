// FILE: apps/merchant/src/app/api/orders/[id]/payment/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  convertToOrderCurrency,
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

function cleanCurrencyCode(value: any) {
  const code = s(value).toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : "";
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

function money(amount: number, currency: string) {
  const safe = n(amount);

  return `${currency} ${new Intl.NumberFormat("en-SA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(safe)}`;
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
    .select("id,store_id,auth_user_id,name,email")
    .eq("auth_user_id", user.id)
    .single();

  return storeUser ?? null;
}

function paymentTitle(code: string) {
  const x = s(code).toLowerCase();

  if (x === "cod") return "الدفع عند الاستلام";
  if (x === "bank_transfer") return "تحويل بنكي";
  if (x.startsWith("provider:")) return x.replace("provider:", "");
  return code || "وسيلة دفع";
}

async function getOrderContext(
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
      status,
      currency,
      payment_method,
      payment_status,
      base_status_key,
      store_status_id,
      status_updated_at,
      shipping_id,
      address_id,
      shipping_amount,
      subtotal,
      tax_amount,
      discount_amount,
      total_amount,
      shipping_snapshot
    `,
    )
    .eq("id", orderId)
    .eq("store_id", storeId)
    .single();

  if (error || !order) {
    throw new Error(error?.message || "الطلب غير موجود");
  }

  return order;
}

async function getShippingRate(
  admin: ReturnType<typeof supabaseAdmin>,
  storeId: string,
  shippingId?: string | null,
) {
  if (!shippingId) return null;

  const { data, error } = await admin
    .from("store_shipping_rates")
    .select(
      `
      id,
      store_id,
      store_shipping_carrier_id,
      cod_enabled,
      cod_fee_customer,
      currency,
      enabled,
      status
    `,
    )
    .eq("id", shippingId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ?? null;
}

function isCodAllowed(rate: any) {
  if (!rate) return false;

  const enabled = rate.enabled === true || rate.enabled === 1;
  const active = s(rate.status) === "active";

  return enabled && active && rate.cod_enabled === true;
}

function buildNextShippingSnapshot(args: {
  currentSnapshot: any;
  paymentMethod: string;
  currency: string;
  codFee: number;
  codSourceAmount?: number | null;
  codSourceCurrency?: string | null;
  codExchangeRate?: number | null;
}) {
  const current = safeObject(args.currentSnapshot);
  const isCod = args.paymentMethod === "cod";

  return {
    ...current,
    payment_method: args.paymentMethod,

    cod_fee_customer: isCod ? args.codFee : 0,
    cod_fee: isCod ? args.codFee : 0,
    payment_fee: isCod ? args.codFee : 0,

    cod_fee_currency: args.currency,
    payment_fee_currency: args.currency,
    currency: args.currency,

    cod_fee_source_currency:
      isCod && args.codSourceCurrency && args.codSourceCurrency !== args.currency
        ? args.codSourceCurrency
        : null,
    cod_fee_before_conversion:
      isCod && args.codSourceCurrency && args.codSourceCurrency !== args.currency
        ? args.codSourceAmount ?? null
        : null,
    cod_fee_after_conversion: isCod ? args.codFee : 0,
    cod_fee_exchange_rate:
      isCod && args.codSourceCurrency && args.codSourceCurrency !== args.currency
        ? args.codExchangeRate ?? null
        : null,
  };
}

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const storeUser = await resolveStoreUser();

    if (!storeUser?.store_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const orderId = s(id);

    const admin = supabaseAdmin();
    const order = await getOrderContext(admin, orderId, storeUser.store_id);

    const context = await loadOrderMoneyContext({
      admin,
      storeId: s(storeUser.store_id),
      orderId,
      orderCurrency: s(order.currency),
    });

    const currency = context.orderCurrency;

    const shippingRate = await getShippingRate(
      admin,
      storeUser.store_id,
      s(order.shipping_id) || null,
    );

    const options: Array<{
      id: string;
      code: string;
      title: string;
      subtitle?: string | null;
      badge?: string | null;
      details?: string[] | null;
      banks?: Array<{
        id: string;
        bank_name?: string | null;
        account_holder?: string | null;
        iban?: string | null;
        is_primary?: boolean | null;
      }>;
    }> = [];

    const { data: bankAccounts, error: bankError } = await admin
      .from("store_bank_accounts")
      .select("id,bank_name,account_holder,iban,status,is_primary")
      .eq("store_id", storeUser.store_id)
      .eq("status", "active")
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });

    if (bankError) {
      throw new Error(bankError.message);
    }

    if (Array.isArray(bankAccounts) && bankAccounts.length > 0) {
      options.push({
        id: "bank_transfer",
        code: "bank_transfer",
        title: "تحويل بنكي",
        subtitle: `${bankAccounts.length} حسابات بنكية متاحة`,
        badge: "موصى به",
        details: [],
        banks: bankAccounts.map((row: any) => ({
          id: s(row?.id),
          bank_name: s(row?.bank_name) || null,
          account_holder: s(row?.account_holder) || null,
          iban: s(row?.iban) || null,
          is_primary: Boolean(row?.is_primary),
        })),
      });
    }

    if (shippingRate && isCodAllowed(shippingRate)) {
      const sourceCurrency =
        cleanCurrencyCode(shippingRate.currency) || context.defaultCurrency;

      const codConversion = convertToOrderCurrency(
        context,
        n(shippingRate.cod_fee_customer),
        sourceCurrency,
      );

      const codFee = codConversion.amount_after_conversion;

      options.push({
        id: "cod",
        code: "cod",
        title: "الدفع عند الاستلام",
        subtitle: "ادفع عند وصول الطلب",
        badge: "موصى به",
        details: [
          codFee > 0
            ? `رسوم الدفع عند الاستلام: ${money(codFee, currency)}`
            : "بدون رسوم إضافية",
        ],
      });
    }

    const { data: providerMethods, error: providersError } = await admin
      .from("store_payment_methods")
      .select("id,provider_code,enabled,status,config,sort_order")
      .eq("store_id", storeUser.store_id)
      .eq("enabled", true)
      .eq("status", "active")
      .order("sort_order", { ascending: true });

    if (providersError) {
      throw new Error(providersError.message);
    }

    for (const row of providerMethods ?? []) {
      const code = s(row?.provider_code);
      if (!code) continue;

      options.push({
        id: s(row?.id) || `provider:${code}`,
        code: `provider:${code}`,
        title: paymentTitle(`provider:${code}`),
        subtitle: "الدفع الإلكتروني",
        details: [],
      });
    }

    return NextResponse.json({
      ok: true,
      current_payment_method: s(order.payment_method) || null,
      current_payment_status:
        normalizePaymentStatus(order.payment_status) || "unpaid",
      options,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load payment options" },
      { status: 500 },
    );
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
    const body = await req.json().catch(() => ({}));

    const paymentMethod = s(body?.payment_method);
    const requestedPaymentStatus =
      normalizePaymentStatus(body?.payment_status) || "unpaid";

    if (!paymentMethod) {
      return NextResponse.json(
        { error: "وسيلة الدفع مطلوبة" },
        { status: 400 },
      );
    }

    const admin = supabaseAdmin();
    const order = await getOrderContext(admin, orderId, storeUser.store_id);

    const context = await loadOrderMoneyContext({
      admin,
      storeId: s(storeUser.store_id),
      orderId,
      orderCurrency: s(order.currency),
    });

    const beforeState = {
      currency: context.orderCurrency,
      payment_method: s(order.payment_method) || null,
      payment_status: s(order.payment_status) || null,
      status: s(order.status) || null,
      base_status_key: s(order.base_status_key) || null,
      store_status_id: s(order.store_status_id) || null,
      status_updated_at: order.status_updated_at ?? null,
      subtotal: n(order.subtotal),
      shipping_amount: n(order.shipping_amount),
      tax_amount: n(order.tax_amount),
      discount_amount: n(order.discount_amount),
      total_amount: n(order.total_amount),
      shipping_snapshot:
        order.shipping_snapshot && typeof order.shipping_snapshot === "object"
          ? order.shipping_snapshot
          : null,
    };

    let codFee = 0;
    let codSourceAmount: number | null = null;
    let codSourceCurrency: string | null = null;
    let codExchangeRate: number | null = null;

    if (paymentMethod === "bank_transfer") {
      const { data: bankAccounts, error: bankError } = await admin
        .from("store_bank_accounts")
        .select("id")
        .eq("store_id", storeUser.store_id)
        .eq("status", "active")
        .limit(1);

      if (bankError) {
        throw new Error(bankError.message);
      }

      if (!Array.isArray(bankAccounts) || bankAccounts.length === 0) {
        return NextResponse.json(
          { error: "التحويل البنكي غير متاح" },
          { status: 400 },
        );
      }
    }

    if (paymentMethod === "cod") {
      const shippingRate = await getShippingRate(
        admin,
        storeUser.store_id,
        s(order.shipping_id) || null,
      );

      if (!isCodAllowed(shippingRate)) {
        return NextResponse.json(
          { error: "الدفع عند الاستلام غير متاح مع شركة الشحن الحالية" },
          { status: 400 },
        );
      }

      codSourceCurrency =
        cleanCurrencyCode(shippingRate?.currency) || context.defaultCurrency;

      const codConversion = convertToOrderCurrency(
        context,
        n(shippingRate?.cod_fee_customer),
        codSourceCurrency,
      );

      codFee = codConversion.amount_after_conversion;
      codSourceAmount = codConversion.amount_before_conversion;
      codExchangeRate = codConversion.exchange_rate;
    }

    if (paymentMethod.startsWith("provider:")) {
      const providerCode = s(paymentMethod.replace("provider:", ""));

      if (!providerCode) {
        return NextResponse.json(
          { error: "وسيلة الدفع غير صحيحة" },
          { status: 400 },
        );
      }

      const { data: methodRow, error: methodError } = await admin
        .from("store_payment_methods")
        .select("id,enabled,status")
        .eq("store_id", storeUser.store_id)
        .eq("provider_code", providerCode)
        .eq("enabled", true)
        .eq("status", "active")
        .maybeSingle();

      if (methodError) {
        throw new Error(methodError.message);
      }

      if (!methodRow?.id) {
        return NextResponse.json(
          { error: "وسيلة الدفع غير متاحة" },
          { status: 400 },
        );
      }
    }

    const nextShippingSnapshot = buildNextShippingSnapshot({
      currentSnapshot: order.shipping_snapshot,
      paymentMethod,
      currency: context.orderCurrency,
      codFee,
      codSourceAmount,
      codSourceCurrency,
      codExchangeRate,
    });

    const nowIso = new Date().toISOString();

    const { error: updateError } = await admin
      .from("orders")
      .update({
        payment_method: paymentMethod,
        payment_status: requestedPaymentStatus,
        shipping_snapshot: nextShippingSnapshot,
        updated_at: nowIso,
      })
      .eq("id", orderId)
      .eq("store_id", storeUser.store_id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    const totals = await recalcOrderTotalsForAdmin({
      admin,
      storeId: s(storeUser.store_id),
      orderId,
      actorId: s(storeUser.id),
      auditAction: "order.payment.updated",
      auditBeforeData: {
        payment: beforeState,
      },
      auditAfterData: {
        payment: {
          currency: context.orderCurrency,
          payment_method: paymentMethod,
          payment_status: requestedPaymentStatus,
          cod_fee: codFee,
          cod_fee_source_amount: codSourceAmount,
          cod_fee_source_currency: codSourceCurrency,
          cod_fee_exchange_rate: codExchangeRate,
          shipping_snapshot: nextShippingSnapshot,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      currency: totals.currency,
      total_amount: totals.after.total_amount,
      cod_fee: totals.after.payment_fee,
      payment_method: paymentMethod,
      payment_status: requestedPaymentStatus,
      status: s(order.status) || "draft",
      base_status_key: s(order.base_status_key) || "draft",
      store_status_id: s(order.store_status_id) || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update payment method" },
      { status: 500 },
    );
  }
}