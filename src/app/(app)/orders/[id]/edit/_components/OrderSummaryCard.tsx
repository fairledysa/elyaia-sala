// FILE: apps/merchant/src/app/(app)/orders/[id]/edit/_components/OrderSummaryCard.tsx
"use client";

import {
  Check,
  Coins,
  FileText as FileIcon,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { OrderDetails } from "../OrderEditPageClient";
import { n, orderOptionsFee, s } from "../OrderEditPageClient";

type CouponRow = {
  id?: string | null;
  code?: string | null;
  discount_type?: string | null;
  amount?: number | null;
};

type CurrencyRow = {
  id?: string | null;
  currency_code?: string | null;
  symbol?: string | null;
  decimal_digits?: number | string | null;
  is_enabled?: boolean | null;
  is_default?: boolean | null;
  metadata?: Record<string, any> | null;
};

type CurrencyPreviewPack = {
  from_currency?: string | null;
  to_currency?: string | null;
  subtotal?: any;
  shipping_amount?: any;
  tax_amount?: any;
  discount_amount?: any;
  total_amount?: any;
};

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
    <div
      className={[
        "adm-order-edit-summary__row",
        strong ? "adm-order-edit-summary__row--strong" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="adm-order-edit-summary__label">{label}</div>

      <div dir={valueDir} className="adm-order-edit-summary__value">
        {value}
      </div>
    </div>
  );
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

function hasNumericValue(value: any) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return false;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed);
}

function firstNumericValue(...values: any[]) {
  for (const value of values) {
    if (hasNumericValue(value)) {
      return n(value);
    }
  }

  return 0;
}

function readPaymentFee(order: any) {
  const shippingSnapshot = safeObject(order?.shipping_snapshot);
  const moneyPack = safeObject(shippingSnapshot.money);

  return firstNumericValue(
    order?.payment_fee,
    order?.payment_fee_amount,
    order?.cod_fee,
    order?.cod_fee_amount,

    moneyPack.payment_fee,
    moneyPack.cod_fee,
    moneyPack.cod_fee_customer,

    shippingSnapshot.payment_fee,
    shippingSnapshot.payment_fee_amount,
    shippingSnapshot.cod_fee,
    shippingSnapshot.cod_fee_after_conversion,
    shippingSnapshot.cod_fee_customer,

    0,
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
  const shippingSnapshot = safeObject((order as any)?.shipping_snapshot);
  const moneyPack = safeObject(shippingSnapshot.money);

  const taxRate =
    n((order as any)?.tax_rate) ||
    n(moneyPack.tax_rate) ||
    n(shippingSnapshot?.tax_rate) ||
    15;

  const normalized = Number.isFinite(taxRate) ? taxRate : 15;
  const text =
    Math.floor(normalized) === normalized
      ? String(Math.floor(normalized))
      : normalized.toFixed(2);

  return `الضريبة (%${text})`;
}

function couponTypeLabel(rawType: unknown) {
  const x = s(rawType).toLowerCase();

  if (!x) return "";
  if (x === "percentage" || x === "percent" || x === "p") return "percentage";
  if (x === "fixed" || x === "amount" || x === "flat" || x === "f") {
    return "fixed";
  }

  return x;
}

function readCouponCode(order: any) {
  return (
    s(order?.coupon_code) ||
    s(order?.coupon?.code) ||
    s(order?.discount_code) ||
    s(order?.coupon_snapshot?.code) ||
    s(order?.coupon_snapshot?.coupon_code) ||
    ""
  );
}

function readCouponType(order: any) {
  return couponTypeLabel(
    s(order?.coupon_type) ||
      s(order?.coupon?.type) ||
      s(order?.coupon_snapshot?.type),
  );
}

function buildDiscountAmountLabel(order: any) {
  const couponCode = readCouponCode(order);
  const couponType = readCouponType(order);

  if (!couponCode) {
    return <span>إجمالي الخصم</span>;
  }

  return (
    <span className="adm-order-edit-summary__couponLabel">
      <span>{couponType === "percentage" ? "كوبون خصم" : "كوبون خصم"}</span>
      <span dir="ltr">{couponCode}</span>
    </span>
  );
}

function CouponPicker({
  orderId,
  onApplied,
  onCancel,
}: {
  orderId: string;
  onApplied: () => Promise<void> | void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<CouponRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCode, setSelectedCode] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCoupons() {
      try {
        setLoading(true);

        const res = await fetch(
          `/api/orders/${orderId}/coupon?q=${encodeURIComponent(query)}`,
          {
            cache: "no-store",
            credentials: "include",
          },
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "تعذر جلب الكوبونات");
        }

        if (cancelled) return;

        const nextRows = Array.isArray(data?.rows) ? data.rows : [];
        setRows(nextRows);

        if (nextRows.length > 0) {
          const exact =
            nextRows.find((row: any) => s(row?.code) === s(selectedCode)) ||
            null;

          if (!exact) {
            setSelectedCode(s(nextRows[0]?.code));
          }
        } else {
          setSelectedCode("");
        }
      } catch {
        if (cancelled) return;
        setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadCoupons();

    return () => {
      cancelled = true;
    };
  }, [orderId, query, selectedCode]);

  async function applyCoupon() {
    try {
      const code = s(selectedCode || query);

      if (!code) {
        alert("اختر كوبون الخصم");
        return;
      }

      setSaving(true);

      const res = await fetch(`/api/orders/${orderId}/coupon`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "تعذر تطبيق الكوبون");
      }

      await onApplied();
    } catch (e: any) {
      alert(s(e?.message) || "تعذر تطبيق الكوبون");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="adm-order-edit-couponPicker">
      <div className="adm-order-edit-couponPicker__title">اختر الكوبون</div>

      <div className="adm-order-edit-couponPicker__search">
        <Search size={16} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن كوبون"
        />
      </div>

      <select
        value={selectedCode}
        onChange={(e) => setSelectedCode(e.target.value)}
        className="adm-order-edit-couponPicker__select"
      >
        {loading ? (
          <option value="">جارٍ التحميل...</option>
        ) : rows.length === 0 ? (
          <option value="">لا توجد كوبونات</option>
        ) : (
          rows.map((row, index) => (
            <option key={`${s(row?.id)}-${index}`} value={s(row?.code)}>
              {s(row?.code)}
            </option>
          ))
        )}
      </select>

      <div className="adm-order-edit-couponPicker__actions">
        <button
          type="button"
          onClick={onCancel}
          className="adm-order-edit-couponPicker__iconBtn adm-order-edit-couponPicker__iconBtn--light"
          aria-label="إلغاء"
        >
          <X size={16} />
        </button>

        <button
          type="button"
          onClick={applyCoupon}
          disabled={saving || loading || (!selectedCode && !s(query))}
          className="adm-order-edit-couponPicker__iconBtn adm-order-edit-couponPicker__iconBtn--primary"
          aria-label="تطبيق الكوبون"
        >
          <Check size={16} />
        </button>

        <div className="adm-order-edit-couponPicker__preview">
          {s(selectedCode || query) || "-"}
        </div>
      </div>
    </div>
  );
}

function CouponRemoveDialog({
  open,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  loading: boolean;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="adm-order-edit-couponDialog" dir="rtl">
      <div className="adm-order-edit-couponDialog__panel">
        <div className="adm-order-edit-couponDialog__head">
          <div>
            <h3>حذف الكوبون</h3>
            <p>هل أنت متأكد من حذف الكوبون من هذا الطلب؟</p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="adm-order-edit-couponDialog__close"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        <div className="adm-order-edit-couponDialog__footer">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="adm-order-edit-btn adm-order-edit-btn--light"
          >
            تراجع
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="adm-order-edit-btn adm-order-edit-btn--primary"
          >
            {loading ? "جارٍ الحذف..." : "تأكيد الحذف"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CouponBadgeRow({
  couponCode,
  onAskRemove,
}: {
  couponCode: string;
  onAskRemove: () => void;
}) {
  if (!couponCode) return null;

  return (
    <div className="adm-order-edit-summary__row">
      <div className="adm-order-edit-summary__label">كوبونات التخفيض</div>

      <div className="adm-order-edit-couponBadge">
        <button
          type="button"
          onClick={onAskRemove}
          className="adm-order-edit-couponBadge__remove"
          aria-label="حذف الكوبون"
          title="حذف الكوبون"
        >
          <X size={14} />
        </button>

        <span dir="ltr">{couponCode}</span>
      </div>
    </div>
  );
}

function CouponSearchRow({
  open,
  orderId,
  onOpen,
  onApplied,
  onCancel,
}: {
  open: boolean;
  orderId: string;
  onOpen: () => void;
  onApplied: () => Promise<void> | void;
  onCancel: () => void;
}) {
  return (
    <div className="adm-order-edit-summary__row adm-order-edit-summary__row--couponSearch">
      <div className="adm-order-edit-summary__label">كوبونات التخفيض</div>

      {open ? (
        <CouponPicker
          orderId={orderId}
          onApplied={onApplied}
          onCancel={onCancel}
        />
      ) : (
        <button
          type="button"
          onClick={onOpen}
          className="adm-order-edit-btn adm-order-edit-btn--outline"
        >
          ابحث عن كوبون
        </button>
      )}
    </div>
  );
}

function previewMoneyValue(
  preview: CurrencyPreviewPack | null,
  key:
    | "subtotal"
    | "shipping_amount"
    | "tax_amount"
    | "discount_amount"
    | "total_amount",
) {
  const pack = preview ? (preview as any)[key] : null;

  return {
    beforeAmount: n(pack?.amount_before_conversion),
    afterAmount: n(pack?.amount_after_conversion),
    beforeCurrency: s(pack?.source_currency),
    afterCurrency: s(pack?.target_currency),
  };
}

function CurrencyPreviewRow({
  label,
  preview,
  field,
}: {
  label: string;
  preview: CurrencyPreviewPack | null;
  field:
    | "subtotal"
    | "shipping_amount"
    | "tax_amount"
    | "discount_amount"
    | "total_amount";
}) {
  if (!preview) return null;

  const value = previewMoneyValue(preview, field);

  if (!value.afterCurrency) return null;

  return (
    <div className="adm-order-edit-summary__row">
      <div className="adm-order-edit-summary__label">{label}</div>

      <div dir="ltr" className="adm-order-edit-summary__value">
        {summaryMoney(value.afterAmount, value.afterCurrency)}
      </div>
    </div>
  );
}

function CurrencyChangeDialog({
  open,
  order,
  onChanged,
  onCancel,
}: {
  open: boolean;
  order: OrderDetails;
  onChanged: () => Promise<void> | void;
  onCancel: () => void;
}) {
  const orderId = s(order.id);
  const orderCurrency = s(order.currency) || "SAR";

  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [currentCurrency, setCurrentCurrency] = useState(orderCurrency);
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);
  const [canChange, setCanChange] = useState(true);
  const [blockedReason, setBlockedReason] = useState("");
  const [preview, setPreview] = useState<CurrencyPreviewPack | null>(null);

  async function loadCurrencyData() {
    try {
      setLoading(true);
      setError("");
      setPreview(null);

      const res = await fetch(`/api/orders/${orderId}/currency`, {
        cache: "no-store",
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "تعذر تحميل عملات الطلب");
      }

      const nextCurrent = s(data?.current_currency) || orderCurrency;
      const rows = Array.isArray(data?.currencies) ? data.currencies : [];

      setCurrentCurrency(nextCurrent);
      setSelectedCurrency("");
      setCurrencies(rows);
      setCanChange(data?.can_change !== false);
      setBlockedReason(s(data?.blocked_reason));
    } catch (e: any) {
      setError(s(e?.message) || "تعذر تحميل عملات الطلب");
      setCurrencies([]);
      setSelectedCurrency("");
    } finally {
      setLoading(false);
    }
  }

  async function loadPreview(nextCurrency: string) {
    const target = s(nextCurrency).toUpperCase();

    if (!target || target === currentCurrency || !canChange) {
      setPreview(null);
      return;
    }

    try {
      setPreviewLoading(true);
      setError("");

      const res = await fetch(
        `/api/orders/${orderId}/currency?currency=${encodeURIComponent(
          target,
        )}`,
        {
          cache: "no-store",
          credentials: "include",
        },
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "تعذر تجهيز معاينة العملة");
      }

      setPreview(data?.preview ?? null);
    } catch (e: any) {
      setPreview(null);
      setError(s(e?.message) || "تعذر تجهيز معاينة العملة");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function saveCurrencyChange() {
    try {
      const target = s(selectedCurrency).toUpperCase();

      if (!canChange) {
        setError(blockedReason || "لا يمكن تغيير عملة هذا الطلب.");
        return;
      }

      if (!target) {
        setError("اختر العملة الجديدة");
        return;
      }

      if (target === currentCurrency) {
        setError("اختر عملة مختلفة عن العملة الحالية.");
        return;
      }

      setSaving(true);
      setError("");

      const res = await fetch(`/api/orders/${orderId}/currency`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          currency: target,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "تعذر تغيير عملة الطلب");
      }

      await onChanged();
      onCancel();
    } catch (e: any) {
      setError(s(e?.message) || "تعذر تغيير عملة الطلب");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!open) return;

    void loadCurrencyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderId]);

  useEffect(() => {
    if (!open || !selectedCurrency || !currentCurrency || !canChange) return;

    const timer = window.setTimeout(() => {
      void loadPreview(selectedCurrency);
    }, 150);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedCurrency, currentCurrency, canChange]);

  if (!open) return null;

  const normalizedCurrentCurrency = s(currentCurrency).toUpperCase();

  const availableCurrencies = currencies.filter((row) => {
    const code = s(row.currency_code).toUpperCase();
    if (!code) return false;
    if (code === normalizedCurrentCurrency) return false;

    return row.is_enabled === true;
  });

  const selectedIsCurrent =
    Boolean(selectedCurrency) && selectedCurrency === normalizedCurrentCurrency;

  const canShowCurrencyPicker = canChange && !blockedReason;
  const canSelectAnotherCurrency =
    canShowCurrencyPicker && availableCurrencies.length > 0;
  const canConfirmCurrencyChange =
    canSelectAnotherCurrency &&
    Boolean(selectedCurrency) &&
    !selectedIsCurrent &&
    !loading &&
    !saving &&
    !previewLoading;

  return (
    <div className="adm-order-edit-couponDialog" dir="rtl">
      <div className="adm-order-edit-couponDialog__panel">
        <div className="adm-order-edit-couponDialog__head">
          <div>
            <h3>تغيير عملة الطلب</h3>
            <p>
              سيتم تحويل مبالغ الطلب والمنتجات والشحن والدفع والخصومات إلى
              العملة الجديدة.
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="adm-order-edit-couponDialog__close"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        <div className="adm-order-edit-couponPicker">
          {loading ? (
            <div className="adm-order-edit-stateBox">جارٍ تحميل العملات...</div>
          ) : (
            <>
              <div className="adm-order-edit-summary__row">
                <div className="adm-order-edit-summary__label">
                  العملة الحالية
                </div>

                <div dir="ltr" className="adm-order-edit-summary__value">
                  {normalizedCurrentCurrency}
                </div>
              </div>

              {!canShowCurrencyPicker ? (
                <div className="adm-order-edit-stateBox adm-order-edit-stateBox--error">
                  {blockedReason || "لا يمكن تغيير عملة هذا الطلب."}
                </div>
              ) : !canSelectAnotherCurrency ? (
                <div className="adm-order-edit-stateBox">
                  لا توجد عملات أخرى مفعلة لهذا المتجر. فعّل عملة إضافية من
                  إعدادات العملات أولًا.
                </div>
              ) : (
                <>
                  <div className="adm-order-edit-couponPicker__title">
                    اختر العملة الجديدة
                  </div>

                  <select
                    value={selectedCurrency}
                    onChange={(event) =>
                      setSelectedCurrency(
                        s(event.currentTarget.value).toUpperCase(),
                      )
                    }
                    disabled={saving}
                    className="adm-order-edit-couponPicker__select"
                  >
                    <option value="">اختر عملة مختلفة لعرض المعاينة</option>

                    {availableCurrencies.map((row) => {
                      const code = s(row.currency_code).toUpperCase();
                      const symbol = s(row.symbol) || code;

                      return (
                        <option key={code} value={code}>
                          {code} - {symbol}
                        </option>
                      );
                    })}
                  </select>

                  {previewLoading ? (
                    <div className="adm-order-edit-stateBox">
                      جارٍ تجهيز المعاينة...
                    </div>
                  ) : preview ? (
                    <div className="adm-order-edit-summary">
                      <CurrencyPreviewRow
                        label="مجموع السلة بعد التحويل"
                        preview={preview}
                        field="subtotal"
                      />

                      <CurrencyPreviewRow
                        label="الشحن بعد التحويل"
                        preview={preview}
                        field="shipping_amount"
                      />

                      <CurrencyPreviewRow
                        label="الخصم بعد التحويل"
                        preview={preview}
                        field="discount_amount"
                      />

                      <CurrencyPreviewRow
                        label="الضريبة بعد التحويل"
                        preview={preview}
                        field="tax_amount"
                      />

                      <CurrencyPreviewRow
                        label="الإجمالي بعد التحويل"
                        preview={preview}
                        field="total_amount"
                      />
                    </div>
                  ) : (
                    <div className="adm-order-edit-stateBox">
                      اختر عملة مختلفة لعرض المعاينة.
                    </div>
                  )}
                </>
              )}

              {error ? (
                <div className="adm-order-edit-stateBox adm-order-edit-stateBox--error">
                  {error}
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="adm-order-edit-couponDialog__footer">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="adm-order-edit-btn adm-order-edit-btn--light"
          >
            {canShowCurrencyPicker ? "إلغاء" : "إغلاق"}
          </button>

          {canSelectAnotherCurrency ? (
            <button
              type="button"
              onClick={saveCurrencyChange}
              disabled={!canConfirmCurrencyChange}
              className="adm-order-edit-btn adm-order-edit-btn--primary"
            >
              {saving ? (
                <Loader2 size={16} className="adm-order-edit-spin" />
              ) : null}
              {saving ? "جارٍ التغيير..." : "تأكيد تغيير العملة"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function OrderSummaryCard({
  order,
  totalWeight,
  onUpdated,
}: {
  order: OrderDetails;
  totalWeight: string;
  onUpdated: () => Promise<void> | void;
}) {
  const currency = s(order.currency) || "SAR";

  const subtotal = n(order.subtotal);
  const shippingAmount = n(order.shipping_amount);
  const taxAmount = n(order.tax_amount);
  const discountAmount =
    n((order as any)?.coupon_discount_amount) || n(order.discount_amount);
  const totalAmount = n(order.total_amount);

  const optionsAmount = orderOptionsFee(order);
  const paymentFee = readPaymentFee(order);

  const paymentMethod = s(order.payment_method).toLowerCase();
  const isCod =
    paymentMethod.includes("cod") ||
    paymentMethod.includes("cash") ||
    paymentMethod.includes("الدفع عند الاستلام");

  const shippingValue =
    shippingAmount > 0 ? formatPlusMoney(shippingAmount, currency) : "مجاني";

  const shippingValueDir = shippingAmount > 0 ? "ltr" : "rtl";

  const couponCode = readCouponCode(order);
  const discountLabel = buildDiscountAmountLabel(order);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);

  useEffect(() => {
    if (couponCode) {
      setPickerOpen(false);
    }
  }, [couponCode]);

  async function removeCoupon() {
    try {
      setRemoving(true);

      const res = await fetch(`/api/orders/${order.id}/coupon`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "تعذر حذف الكوبون");
      }

      setRemoveOpen(false);
      await onUpdated();
    } catch (e: any) {
      alert(s(e?.message) || "تعذر حذف الكوبون");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      <section className="adm-order-edit-card adm-order-edit-summary">
        <div className="adm-order-edit-card__head">
          <div className="adm-order-edit-card__titleRow">
            <FileIcon className="adm-order-edit-card__titleIcon" size={22} />
            <h3 className="adm-order-edit-card__title">ملخص الطلب</h3>
          </div>

          <button
            type="button"
            onClick={() => setCurrencyOpen(true)}
            className="adm-order-edit-btn adm-order-edit-btn--outline"
          >
            <Coins size={15} />
            تغيير العملة
          </button>
        </div>

        <SummaryRow
          label="مجموع السلة"
          value={summaryMoney(subtotal, currency)}
          valueDir="ltr"
        />

        {optionsAmount > 0 ? (
          <SummaryRow
            label="خيارات الطلب"
            value={formatPlusMoney(optionsAmount, currency)}
            valueDir="ltr"
          />
        ) : null}

        {discountAmount > 0 ? (
          <SummaryRow
            label={discountLabel}
            value={formatMinusMoney(discountAmount, currency)}
            valueDir="ltr"
          />
        ) : null}

        {couponCode ? (
          <CouponBadgeRow
            couponCode={couponCode}
            onAskRemove={() => setRemoveOpen(true)}
          />
        ) : (
          <CouponSearchRow
            open={pickerOpen}
            orderId={order.id}
            onOpen={() => setPickerOpen(true)}
            onCancel={() => setPickerOpen(false)}
            onApplied={async () => {
              setPickerOpen(false);
              await onUpdated();
            }}
          />
        )}

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
            value={summaryMoney(taxAmount, currency)}
            valueDir="ltr"
          />
        ) : null}

        <div className="adm-order-edit-summary__total">
          <div className="adm-order-edit-summary__totalLabel">إجمالي الطلب</div>

          <div className="adm-order-edit-summary__totalWeight">
            {totalWeight}
          </div>

          <div dir="ltr" className="adm-order-edit-summary__totalValue">
            {summaryMoney(totalAmount, currency)}
          </div>
        </div>
      </section>

      <CurrencyChangeDialog
        open={currencyOpen}
        order={order}
        onCancel={() => setCurrencyOpen(false)}
        onChanged={async () => {
          await onUpdated();
        }}
      />

      <CouponRemoveDialog
        open={removeOpen}
        loading={removing}
        onCancel={() => setRemoveOpen(false)}
        onConfirm={removeCoupon}
      />
    </>
  );
}