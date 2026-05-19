// FILE: apps/merchant/src/app/(app)/orders/[id]/_components/OrderSummaryCard.tsx
"use client";

import { FileText, Printer } from "lucide-react";
import type { ReactNode } from "react";
import type { OrderDetails } from "./OrderDetailsPageClient";
import { n, s } from "./OrderDetailsPageClient";

function SummaryRow({
  label,
  value,
  strong,
  valueDir = "ltr",
}: {
  label: ReactNode;
  value: ReactNode;
  strong?: boolean;
  valueDir?: "ltr" | "rtl";
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 md:px-8">
      <div
        className={
          strong
            ? "text-[17px] font-semibold text-slate-700"
            : "text-[16px] text-slate-700"
        }
      >
        {label}
      </div>

      <div
        dir={valueDir}
        className={
          strong
            ? "text-right text-[17px] font-semibold text-slate-700"
            : "text-right text-[16px] text-slate-700"
        }
      >
        {value}
      </div>
    </div>
  );
}

function summaryMoney(amount: unknown, currency: string) {
  const value = n(amount);
  const formatted = new Intl.NumberFormat("en-SA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

  return `${currency} ${formatted}`;
}

function formatPlusMoney(amount: unknown, currency: string) {
  return `${summaryMoney(amount, currency)} +`;
}

function formatMinusMoney(amount: unknown, currency: string) {
  return `${summaryMoney(amount, currency)} -`;
}

function taxLabel(order: OrderDetails) {
  const taxRate =
    n((order as any)?.tax_rate) ||
    n((order as any)?.shipping_snapshot?.tax_rate) ||
    n((order as any)?.shipping_snapshot?.checkout?.tax_rate) ||
    15;

  return `الضريبة (%${taxRate.toFixed(2)})`;
}

function couponTypeLabel(rawType: unknown) {
  const x = s(rawType).toLowerCase();

  if (!x) return "";
  if (x === "percentage" || x === "percent" || x === "p") return "percentage";
  if (x === "fixed" || x === "amount" || x === "flat") return "fixed";

  return x;
}

function buildDiscountLabel(order: any, currency: string) {
  const couponCode =
    s(order?.coupon_code) ||
    s(order?.coupon?.code) ||
    s(order?.discount_code) ||
    "";

  const couponType = couponTypeLabel(
    s(order?.coupon_type) || s(order?.coupon?.type),
  );

  const couponAmount =
    n(order?.coupon_amount) ||
    n(order?.coupon?.amount) ||
    n(order?.coupon_value) ||
    n(order?.coupon?.value) ||
    0;

  if (!couponCode) {
    return <span className="text-right">إجمالي الخصم</span>;
  }

  if (couponType === "percentage" && couponAmount > 0) {
    return (
      <span className="inline-flex items-center gap-2 text-right">
        <span>رمز الخصم</span>
        <span dir="ltr" className="text-left">
          {couponCode}
        </span>
        <span dir="ltr" className="text-left">
          {couponAmount}%
        </span>
      </span>
    );
  }

  if (couponType === "fixed" && couponAmount > 0) {
    return (
      <span className="inline-flex items-center gap-2 text-right">
        <span>رمز الخصم</span>
        <span dir="ltr" className="text-left">
          {couponCode}
        </span>
        <span dir="ltr" className="text-left">
          {summaryMoney(couponAmount, currency)}
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 text-right">
      <span>رمز الخصم</span>
      <span dir="ltr" className="text-left">
        {couponCode}
      </span>
    </span>
  );
}

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    const amount = n(value);

    if (amount > 0) {
      return amount;
    }
  }

  return 0;
}

function optionLinePrice(line: any) {
  return firstNumber(
    line?.price_customer,
    line?.priceCustomer,
    line?.price,
    line?.amount,
    line?.total,
  );
}

function orderOptionsAmount(order: OrderDetails) {
  const snapshot = (order as any)?.shipping_snapshot ?? {};
  const checkout = snapshot?.checkout ?? {};

  const directAmount = firstNumber(
    (order as any)?.order_options_fee,
    (order as any)?.orderOptionsFee,
    (order as any)?.order_options_total,
    (order as any)?.orderOptionsTotal,
    (order as any)?.order_options_amount,
    (order as any)?.orderOptionsAmount,
    (order as any)?.options_amount,
    (order as any)?.options_total_amount,
    (order as any)?.custom_options_amount,

    checkout?.order_options_fee,
    checkout?.orderOptionsFee,
    checkout?.order_options_total,
    checkout?.orderOptionsTotal,
    checkout?.order_options_amount,
    checkout?.orderOptionsAmount,
    checkout?.options_amount,
    checkout?.options_total_amount,

    snapshot?.order_options_fee,
    snapshot?.orderOptionsFee,
    snapshot?.order_options_total,
    snapshot?.orderOptionsTotal,
    snapshot?.order_options_amount,
    snapshot?.orderOptionsAmount,
    snapshot?.options_amount,
    snapshot?.options_total_amount,
  );

  if (directAmount > 0) {
    return directAmount;
  }

  const directLines = Array.isArray((order as any)?.order_options)
    ? (order as any).order_options
    : [];

  const camelLines = Array.isArray((order as any)?.orderOptions)
    ? (order as any).orderOptions
    : [];

  const snapshotLines = Array.isArray(snapshot?.order_options)
    ? snapshot.order_options
    : Array.isArray(snapshot?.orderOptions)
      ? snapshot.orderOptions
      : [];

  const checkoutLines = Array.isArray(checkout?.order_options)
    ? checkout.order_options
    : Array.isArray(checkout?.orderOptions)
      ? checkout.orderOptions
      : [];

  const lines =
    directLines.length > 0
      ? directLines
      : camelLines.length > 0
        ? camelLines
        : checkoutLines.length > 0
          ? checkoutLines
          : snapshotLines;

  return lines.reduce((sum: number, line: any) => {
    return sum + optionLinePrice(line);
  }, 0);
}

export default function OrderSummaryCard({
  order,
  totalWeight,
}: {
  order: OrderDetails;
  totalWeight: string;
}) {
  const currency = s(order.currency) || "SAR";

  const subtotal = n(order.subtotal);
  const shippingAmount = n(order.shipping_amount);
  const taxAmount = n(order.tax_amount);
  const discountAmount = n(order.discount_amount);
  const totalAmount = n(order.total_amount);

  const shippingSnapshot = (order as any)?.shipping_snapshot ?? null;

  const optionsAmount = orderOptionsAmount(order);

  const paymentFee =
    n((order as any)?.payment_fee) ||
    n((order as any)?.payment_fee_amount) ||
    n((order as any)?.cod_fee) ||
    n((order as any)?.cod_fee_amount) ||
    n(shippingSnapshot?.checkout?.payment_fee_amount) ||
    n(shippingSnapshot?.checkout?.paymentFeeAmount) ||
    n(shippingSnapshot?.checkout?.payment_fee_total) ||
    n(shippingSnapshot?.checkout?.paymentFeeTotal) ||
    n(shippingSnapshot?.payment_fee_amount) ||
    n(shippingSnapshot?.paymentFeeAmount) ||
    n(shippingSnapshot?.payment_fee_total) ||
    n(shippingSnapshot?.paymentFeeTotal) ||
    n(shippingSnapshot?.cod_fee_customer) ||
    0;

  const paymentMethod = s(order.payment_method).toLowerCase();
  const isCod =
    paymentMethod.includes("cod") ||
    paymentMethod.includes("cash") ||
    paymentMethod.includes("الدفع عند الاستلام");

  const shippingValue =
    shippingAmount > 0 ? formatPlusMoney(shippingAmount, currency) : "مجاني";

  const shippingValueDir = shippingAmount > 0 ? "ltr" : "rtl";

  const discountLabel = buildDiscountLabel(order, currency);

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-5 py-5 md:px-8">
        <div className="inline-flex items-center gap-3">
          <FileText className="h-6 w-6 text-slate-500" />
          <div className="text-[28px] font-medium text-slate-700">
            ملخص الطلب
          </div>
        </div>
      </div>

      <SummaryRow
        label="مجموع السلة"
        value={summaryMoney(subtotal, currency)}
        valueDir="ltr"
      />

      {discountAmount > 0 ? (
        <SummaryRow
          label={discountLabel}
          value={formatMinusMoney(discountAmount, currency)}
          valueDir="ltr"
        />
      ) : null}

      {optionsAmount > 0 ? (
        <SummaryRow
          label="إجمالي خيارات الطلب"
          value={formatPlusMoney(optionsAmount, currency)}
          valueDir="ltr"
        />
      ) : null}

      <SummaryRow
        label="تكلفة الشحن"
        value={shippingValue}
        valueDir={shippingValueDir}
      />

      {isCod && paymentFee > 0 ? (
        <SummaryRow
          label="عمولة الدفع عند الاستلام"
          value={formatPlusMoney(paymentFee, currency)}
          valueDir="ltr"
        />
      ) : null}

      {taxAmount > 0 ? (
        <SummaryRow
          label={taxLabel(order)}
          value={formatPlusMoney(taxAmount, currency)}
          strong
          valueDir="ltr"
        />
      ) : null}

      <div className="border-b border-slate-100 px-5 py-6 md:px-8">
        <div className="flex items-center">
          <div className="w-1/3 text-right text-[18px] font-medium text-slate-700">
            إجمالي الطلب
          </div>

          <div className="w-1/3 text-center text-[18px] font-semibold text-[#0f7092]">
            {totalWeight}
          </div>

          <div
            dir="ltr"
            className="w-1/3 text-left text-[18px] font-semibold text-[#0f7092]"
          >
            {summaryMoney(totalAmount, currency)}
          </div>
        </div>
      </div>

      <div className="flex justify-center py-5">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-[18px] font-medium text-[#0f4c81] shadow-sm"
        >
          <Printer className="h-5 w-5" />
          طباعة الفاتورة
        </button>
      </div>
    </section>
  );
}