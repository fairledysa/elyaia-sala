// FILE: apps/merchant/src/app/(app)/orders/[id]/edit/OrderEditPageClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  FileText,
  ListChecks,
  Loader2,
  Pencil,
  Save,
  X,
} from "lucide-react";

import OrderCustomerCard from "./_components/OrderCustomerCard";
import OrderItemsCard from "./_components/OrderItemsCard";
import OrderPaymentCard from "./_components/OrderPaymentCard";
import OrderShippingCard from "./_components/OrderShippingCard";
import OrderSummaryCard from "./_components/OrderSummaryCard";
import OrderBottomActions from "./_components/OrderBottomActions";

export type OrderItem = {
  id: string;
  order_id?: string | null;
  product_id?: string | null;
  variant_id?: string | null;
  name?: string | null;
  sku?: string | null;
  qty?: number | null;
  currency?: string | null;
  unit_price?: number | null;
  total_price?: number | null;
  selected_option_value_ids?: string[] | null;
  selected_options?: any;
  created_at?: string | null;

  image_url?: string | null;

  product?: {
    id?: string | null;
    store_id?: string | null;
    name?: string | null;
    status?: string | null;
    brand_id?: string | null;
    product_type?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  } | null;

  variant?: {
    id?: string | null;
    product_id?: string | null;
    sku?: string | null;
    barcode?: string | null;
    price?: number | null;
    sale_price?: number | null;
    stock_quantity?: number | null;
    unlimited_quantity?: boolean | null;
    created_at?: string | null;
    updated_at?: string | null;
  } | null;
};

export type OrderOptionChoice = {
  id?: string | null;
  label?: string | null;
  name?: string | null;
  value?: string | null;
  price_customer?: number | string | null;
  priceCustomer?: number | string | null;
};

export type OrderOptionLine = {
  id?: string | null;
  option_id?: string | null;
  optionId?: string | null;

  name?: string | null;
  title?: string | null;
  label?: string | null;
  option_name?: string | null;
  optionName?: string | null;

  type?: string | null;
  field_type?: string | null;
  fieldType?: string | null;

  value?: string | number | Record<string, any> | any[] | null;
  display_value?: string | number | Record<string, any> | any[] | null;
  displayValue?: string | number | Record<string, any> | any[] | null;
  answer_value?: string | number | Record<string, any> | any[] | null;
  answerValue?: string | number | Record<string, any> | any[] | null;

  choices?: OrderOptionChoice[] | null;
  choice_labels?: string[] | null;
  choiceLabels?: string[] | null;

  metadata?: any;

  price_customer?: number | string | null;
  priceCustomer?: number | string | null;
  currency?: string | null;
};

export type CustomerMini = {
  id?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone_e164?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  total_orders?: number | null;
  total_spent?: number | null;
  last_order_at?: string | null;
};

export type CustomerAddress = {
  id?: string | null;
  label?: string | null;
  recipient_name?: string | null;
  phone_e164?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  postal_code?: string | null;
  notes?: string | null;
  lat?: number | null;
  lng?: number | null;
  is_default?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  city_id?: string | null;
  district_id?: string | null;
  country_id?: string | null;
  ref_cities?: {
    id?: string | null;
    name_ar?: string | null;
    name_en?: string | null;
  } | null;
  ref_districts?: {
    id?: string | null;
    name_ar?: string | null;
    name_en?: string | null;
  } | null;
  ref_countries?: {
    id?: string | null;
    iso2?: string | null;
    name_ar?: string | null;
    name_en?: string | null;
  } | null;
};

export type BaseStatus = {
  key?: string | null;
  name_ar?: string | null;
  name_en?: string | null;
  icon?: string | null;
  color?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
  is_system?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type StoreStatus = {
  id?: string | null;
  store_id?: string | null;
  base_status_key?: string | null;
  name?: string | null;
  slug?: string | null;
  icon?: string | null;
  color?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
  notify_customer?: boolean | null;
  message_template?: string | null;
  email_template?: string | null;
  sms_template?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type StatusHistoryItem = {
  id: string;
  store_id?: string | null;
  order_id?: string | null;
  from_base_status_key?: string | null;
  to_base_status_key?: string | null;
  from_store_status_id?: string | null;
  to_store_status_id?: string | null;
  changed_by_store_user_id?: string | null;
  note?: string | null;
  created_at?: string | null;
  actor_name?: string | null;
  actor_email?: string | null;
  actor_role?: string | null;
  actor_type?: string | null;
};

export type OrderDetails = {
  id: string;
  store_id?: string | null;
  order_number?: number | string | null;
  status?: string | null;
  currency?: string | null;
  subtotal?: number | null;
  shipping_amount?: number | null;
  tax_amount?: number | null;
  discount_amount?: number | null;
  total_amount?: number | null;
  payment_method?: string | null;
  payment_status?: string | null;
  shipping_address?: any;
  shipping_id?: string | null;
  shipping_snapshot?: any;
  public_token?: string | null;
  public_no?: number | null;
  invoice_no?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  address_id?: string | null;
  customer_id?: string | null;
  base_status_key?: string | null;
  store_status_id?: string | null;
  status_updated_at?: string | null;
  status_note?: string | null;

  order_options?: OrderOptionLine[] | null;
  orderOptions?: OrderOptionLine[] | null;
  order_options_fee?: number | string | null;
  orderOptionsFee?: number | string | null;
  order_options_base?: number | string | null;
  orderOptionsBase?: number | string | null;
  order_options_tax?: number | string | null;
  orderOptionsTax?: number | string | null;
  order_options_total?: number | string | null;
  orderOptionsTotal?: number | string | null;

  customers?: CustomerMini | CustomerMini[] | null;
  order_items?: OrderItem[] | null;

  customer_address?: CustomerAddress | null;
  current_store_status?: StoreStatus | null;
  current_base_status?: BaseStatus | null;
  status_history?: StatusHistoryItem[] | null;
  shipping_carrier?: any;

  coupon_code?: string | null;
  coupon_type?: string | null;
  coupon_amount?: number | null;
  coupon_discount_amount?: number | null;
};

type EditableOrderOption = {
  id: string;
  option_id: string | null;
  title: string;
  value: string;
  price_customer: number;
  currency: string;
};

export function s(v: unknown) {
  return String(v ?? "").trim();
}

export function n(v: unknown) {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

export function money(amount: unknown, currency = "SAR") {
  const value = n(amount);
  return `${new Intl.NumberFormat("en-SA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)} ${currency || "SAR"}`;
}

export function labelPaymentMethod(v: unknown) {
  const x = s(v).toLowerCase();
  if (!x) return "غير محدد";
  if (x.includes("tamara")) return "تم الدفع بواسطة تمارا";
  if (x.includes("tabby")) return "تم الدفع بواسطة تابي";
  if (x.includes("cod")) return "الدفع عند الاستلام";
  if (x.includes("cash")) return "نقدي";
  if (x.includes("bank")) return "تحويل بنكي";
  if (x.includes("card")) return "بطاقة";
  return s(v);
}

export function labelPaymentStatus(v: unknown) {
  const x = s(v).toLowerCase();
  if (x === "paid") return "مدفوع";
  if (x === "unpaid") return "غير مدفوع";
  if (x === "failed") return "فشل الدفع";
  if (x === "refunded") return "تم الاسترجاع";
  return s(v) || "غير محدد";
}

function pickCustomer(order: OrderDetails): CustomerMini | null {
  const raw = order.customers;
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw;
}

function itemSku(item: OrderItem) {
  return s(item?.sku) || s(item?.variant?.sku) || "-";
}

function itemName(item: OrderItem) {
  return s(item?.name) || s(item?.product?.name) || "منتج";
}

function itemImage(item: OrderItem) {
  return s(item?.image_url) || "";
}

function itemWeight(item: OrderItem) {
  const qty = n(item.qty);
  const per = 0.25;
  const total = qty * per;

  return `${new Intl.NumberFormat("ar-SA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(total)} كجم`;
}

function selectedOptionsText(item: OrderItem) {
  const raw = Array.isArray(item?.selected_options) ? item.selected_options : [];

  const parts = raw
    .map((x: any) => {
      const name = s(x?.name);
      const value = s(x?.value);

      if (!name || !value) return "";
      if (name.startsWith("__")) return "";
      if (name === "ملاحظة" || name === "مرفق") return "";

      return `${name}: ${value}`;
    })
    .filter(Boolean);

  return parts.join(" - ");
}

function totalWeight(order: OrderDetails) {
  const items = Array.isArray(order.order_items) ? order.order_items : [];
  const weight = items.reduce((sum, item) => sum + n(item.qty) * 0.25, 0);

  return `${new Intl.NumberFormat("ar-SA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(weight)} كجم`;
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

function firstValue(...values: any[]) {
  for (const value of values) {
    if (value !== null && value !== undefined && s(value) !== "") {
      return value;
    }
  }

  return null;
}

function safeArray<T = any>(value: any): T[] {
  return Array.isArray(value) ? value : [];
}

function stringifyOrderOptionValue(value: any): string {
  if (value === null || value === undefined) return "";

  if (Array.isArray(value)) {
    return value
      .map((item: any) => stringifyOrderOptionValue(item))
      .filter(Boolean)
      .join("، ");
  }

  if (typeof value === "object") {
    const obj = safeObject(value);

    const date = s(
      firstValue(
        obj.date,
        obj.date_value,
        obj.dateValue,
        obj.selected_date,
        obj.selectedDate,
      ),
    );

    const time = s(
      firstValue(
        obj.time,
        obj.time_value,
        obj.timeValue,
        obj.selected_time,
        obj.selectedTime,
      ),
    );

    const from = s(
      firstValue(
        obj.from,
        obj.start,
        obj.start_time,
        obj.startTime,
        obj.from_time,
        obj.fromTime,
      ),
    );

    const to = s(
      firstValue(
        obj.to,
        obj.end,
        obj.end_time,
        obj.endTime,
        obj.to_time,
        obj.toTime,
      ),
    );

    if (date && from && to) return `${date} من ${from} إلى ${to}`;
    if (date && time) return `${date} - ${time}`;
    if (date) return date;
    if (from && to) return `من ${from} إلى ${to}`;

    return s(
      firstValue(
        obj.label,
        obj.name,
        obj.title,
        obj.value,
        obj.display_value,
        obj.displayValue,
        obj.text,
        "",
      ),
    );
  }

  return s(value);
}

function optionLineTitle(line: OrderOptionLine) {
  return (
    s(line.option_name) ||
    s(line.optionName) ||
    s(line.title) ||
    s(line.name) ||
    s(line.label) ||
    "خيار الطلب"
  );
}

function optionLineChoices(line: OrderOptionLine) {
  const choices = safeArray<OrderOptionChoice>(line.choices);

  const labels = choices
    .map((choice) => s(choice?.label) || s(choice?.name) || s(choice?.value))
    .filter(Boolean);

  const snakeLabels = safeArray<string>(line.choice_labels)
    .map((x) => s(x))
    .filter(Boolean);

  const camelLabels = safeArray<string>(line.choiceLabels)
    .map((x) => s(x))
    .filter(Boolean);

  return Array.from(new Set([...labels, ...snakeLabels, ...camelLabels]));
}

function optionLineValue(line: OrderOptionLine) {
  const direct = stringifyOrderOptionValue(
    firstValue(
      line.display_value,
      line.displayValue,
      line.answer_value,
      line.answerValue,
      line.value,
    ),
  );

  if (direct) return direct;

  const choices = optionLineChoices(line);
  if (choices.length) return choices.join("، ");

  return "";
}

function optionLinePrice(line: OrderOptionLine) {
  const direct = n(firstValue(line.price_customer, line.priceCustomer, 0));

  if (direct > 0) return direct;

  const choices = safeArray<OrderOptionChoice>(line.choices);

  return choices.reduce((sum, choice) => {
    return sum + n(firstValue(choice.price_customer, choice.priceCustomer, 0));
  }, 0);
}

function normalizeOrderOptionLine(row: any): OrderOptionLine | null {
  if (!row || typeof row !== "object") return null;

  const line: OrderOptionLine = {
    id: row.id ? s(row.id) : null,
    option_id: row.option_id ? s(row.option_id) : null,
    optionId: row.optionId ? s(row.optionId) : null,

    name: row.name ? s(row.name) : null,
    title: row.title ? s(row.title) : null,
    label: row.label ? s(row.label) : null,
    option_name: row.option_name ? s(row.option_name) : null,
    optionName: row.optionName ? s(row.optionName) : null,

    type: row.type ? s(row.type) : null,
    field_type: row.field_type ? s(row.field_type) : null,
    fieldType: row.fieldType ? s(row.fieldType) : null,

    value: row.value ?? null,
    display_value: row.display_value ?? null,
    displayValue: row.displayValue ?? null,
    answer_value: row.answer_value ?? null,
    answerValue: row.answerValue ?? null,

    choices: safeArray<OrderOptionChoice>(row.choices),
    choice_labels: safeArray<string>(row.choice_labels),
    choiceLabels: safeArray<string>(row.choiceLabels),

    metadata: row.metadata ?? null,

    price_customer: row.price_customer ?? null,
    priceCustomer: row.priceCustomer ?? null,
    currency: row.currency ? s(row.currency) : null,
  };

  const title = optionLineTitle(line);
  const value = optionLineValue(line);
  const price = optionLinePrice(line);

  if (!title && !value && price <= 0) return null;

  return line;
}

export function orderOptionsLines(order: OrderDetails) {
  const direct = safeArray<OrderOptionLine>(order.order_options)
    .map(normalizeOrderOptionLine)
    .filter(Boolean) as OrderOptionLine[];

  const camel = safeArray<OrderOptionLine>(order.orderOptions)
    .map(normalizeOrderOptionLine)
    .filter(Boolean) as OrderOptionLine[];

  const shippingSnapshot = safeObject((order as any)?.shipping_snapshot);
  const checkout = safeObject(shippingSnapshot.checkout);

  const snapshotLines = safeArray<OrderOptionLine>(
    firstValue(
      checkout.order_options,
      checkout.orderOptions,
      shippingSnapshot.order_options,
      shippingSnapshot.orderOptions,
    ),
  )
    .map(normalizeOrderOptionLine)
    .filter(Boolean) as OrderOptionLine[];

  if (direct.length) return direct;
  if (camel.length) return camel;
  return snapshotLines;
}

export function orderOptionsFee(order: OrderDetails) {
  const shippingSnapshot = safeObject((order as any)?.shipping_snapshot);
  const checkout = safeObject(shippingSnapshot.checkout);

  const raw = firstValue(
    order.order_options_fee,
    order.orderOptionsFee,
    order.order_options_total,
    order.orderOptionsTotal,

    (order as any)?.order_options_amount,
    (order as any)?.orderOptionsAmount,
    (order as any)?.options_amount,
    (order as any)?.options_total_amount,
    (order as any)?.custom_options_amount,

    checkout.order_options_fee,
    checkout.orderOptionsFee,
    checkout.order_options_total,
    checkout.orderOptionsTotal,
    checkout.order_options_amount,
    checkout.options_amount,

    shippingSnapshot.order_options_fee,
    shippingSnapshot.orderOptionsFee,
    shippingSnapshot.order_options_total,
    shippingSnapshot.orderOptionsTotal,
  );

  if (raw !== null) return n(raw);

  return orderOptionsLines(order).reduce((sum, line) => {
    return sum + optionLinePrice(line);
  }, 0);
}

function buildEditableOrderOptions(order: OrderDetails): EditableOrderOption[] {
  const currency = s(order.currency) || "SAR";

  return orderOptionsLines(order).map((line, index) => {
    const title = optionLineTitle(line);
    const value = optionLineValue(line);
    const price = optionLinePrice(line);

    return {
      id: s(line.id) || s(line.option_id) || s(line.optionId) || `${title}-${index}`,
      option_id: s(line.option_id) || s(line.optionId) || null,
      title,
      value,
      price_customer: price,
      currency: s(line.currency) || currency,
    };
  });
}

function OrderOptionsEditModal({
  open,
  order,
  onClose,
  onSaved,
}: {
  open: boolean;
  order: OrderDetails;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [drafts, setDrafts] = useState<EditableOrderOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    setError("");
    setDrafts(buildEditableOrderOptions(order));
  }, [open, order]);

  if (!open) return null;

  const currency = s(order.currency) || "SAR";
  const total = drafts.reduce((sum, row) => sum + n(row.price_customer), 0);

  function updateDraft(
    id: string,
    patch: Partial<Pick<EditableOrderOption, "value" | "price_customer">>,
  ) {
    setDrafts((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  async function saveOptions() {
    try {
      setSaving(true);
      setError("");

      const res = await fetch(`/api/orders/${order.id}/order-options`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          options: drafts.map((row) => ({
            id: row.id,
            option_id: row.option_id,
            title: row.title,
            value: row.value,
            price_customer: n(row.price_customer),
            currency: row.currency || currency,
          })),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "تعذر حفظ خيارات الطلب");
      }

      await onSaved();
      onClose();
    } catch (e: any) {
      setError(s(e?.message) || "تعذر حفظ خيارات الطلب");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="adm-order-edit-optionsModal" dir="rtl">
      <div
        className="adm-order-edit-optionsModal__backdrop"
        onClick={saving ? undefined : onClose}
      />

      <div className="adm-order-edit-optionsModal__shell">
        <div className="adm-order-edit-optionsModal__panel">
          <div className="adm-order-edit-optionsModal__head">
            <div>
              <h3>تعديل خيارات الطلب</h3>
              <p>عدّل القيم التي اختارها العميل لهذا الطلب فقط.</p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="adm-order-edit-optionsModal__close"
              aria-label="إغلاق"
            >
              <X size={18} />
            </button>
          </div>

          <div className="adm-order-edit-optionsModal__body">
            {error ? (
              <div className="adm-order-edit-optionsModal__error">
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            ) : null}

            {drafts.length ? (
              <div className="adm-order-edit-optionsModal__list">
                {drafts.map((row) => (
                  <div key={row.id} className="adm-order-edit-optionsModal__item">
                    <div className="adm-order-edit-optionsModal__itemHead">
                      <div className="adm-order-edit-optionsModal__itemTitle">
                        {row.title}
                      </div>

                      <div dir="ltr" className="adm-order-edit-optionsModal__itemPrice">
                        {money(row.price_customer, row.currency || currency)}
                      </div>
                    </div>

                    <label className="adm-order-edit-optionsModal__field">
                      <span>القيمة</span>
                      <textarea
                        value={row.value}
                        onChange={(event) =>
                          updateDraft(row.id, { value: event.target.value })
                        }
                        disabled={saving}
                        rows={2}
                      />
                    </label>

                    <label className="adm-order-edit-optionsModal__field adm-order-edit-optionsModal__field--price">
                      <span>رسوم الخيار</span>
                      <input
                        dir="ltr"
                        type="number"
                        min="0"
                        step="0.01"
                        value={String(row.price_customer)}
                        onChange={(event) =>
                          updateDraft(row.id, {
                            price_customer: n(event.target.value),
                          })
                        }
                        disabled={saving}
                      />
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="adm-order-edit-optionsModal__empty">
                لا توجد خيارات طلب قابلة للتعديل.
              </div>
            )}
          </div>

          <div className="adm-order-edit-optionsModal__footer">
            <div className="adm-order-edit-optionsModal__total">
              <span>الإجمالي الجديد</span>
              <strong dir="ltr">{money(total, currency)}</strong>
            </div>

            <div className="adm-order-edit-optionsModal__actions">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="adm-order-edit-btn adm-order-edit-btn--light"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={saveOptions}
                disabled={saving || !drafts.length}
                className="adm-order-edit-btn adm-order-edit-btn--primary"
              >
                {saving ? (
                  <Loader2 size={16} className="adm-order-edit-spin" />
                ) : (
                  <Save size={16} />
                )}
                {saving ? "جارٍ الحفظ..." : "حفظ التعديل"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderOptionsCard({
  order,
  onOpenEdit,
}: {
  order: OrderDetails;
  onOpenEdit: () => void;
}) {
  const lines = orderOptionsLines(order);
  const fee = orderOptionsFee(order);
  const currency = s(order.currency) || "SAR";

  if (!lines.length && fee <= 0) return null;

  return (
    <section className="adm-order-edit-card adm-order-edit-options">
      <div className="adm-order-edit-options__head">
        <div className="adm-order-edit-card__titleRow">
          <ListChecks className="adm-order-edit-card__titleIcon" size={21} />
          <div>
            <h3 className="adm-order-edit-options__title">خيارات الطلب</h3>
            <p className="adm-order-edit-options__desc">
              الخيارات الإضافية التي اختارها العميل أثناء إتمام الطلب.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenEdit}
          className="adm-order-edit-options__editBtn"
        >
          <Pencil size={15} />
          تعديل الخيارات
        </button>
      </div>

      {lines.length ? (
        <div className="adm-order-edit-options__body">
          {lines.map((line, index) => {
            const title = optionLineTitle(line);
            const value = optionLineValue(line);
            const price = optionLinePrice(line);
            const key = s(line.id) || `${title}-${index}`;

            return (
              <div key={key} className="adm-order-edit-options__item">
                <div className="adm-order-edit-options__main">
                  <span className="adm-order-edit-options__icon">
                    <FileText size={14} strokeWidth={2.2} />
                  </span>

                  <div className="adm-order-edit-options__content">
                    <div className="adm-order-edit-options__name">{title}</div>

                    {value ? (
                      <div className="adm-order-edit-options__value">{value}</div>
                    ) : null}
                  </div>
                </div>

                {price > 0 ? (
                  <div dir="ltr" className="adm-order-edit-options__price">
                    + {money(price, currency)}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {fee > 0 ? (
        <div className="adm-order-edit-options__total">
          <span>إجمالي خيارات الطلب</span>
          <strong dir="ltr">{money(fee, currency)}</strong>
        </div>
      ) : null}
    </section>
  );
}

export function useOrderHelpers(order: OrderDetails | null) {
  return useMemo(() => {
    const customer = order ? pickCustomer(order) : null;
    const items = Array.isArray(order?.order_items) ? order.order_items : [];
    const address = order?.customer_address ?? null;

    const city =
      s(address?.ref_cities?.name_ar) ||
      s(address?.ref_cities?.name_en) ||
      "المدينة غير محددة";

    const district =
      s(address?.ref_districts?.name_ar) ||
      s(address?.ref_districts?.name_en);

    const fullAddress = [
      s(address?.address_line1),
      s(address?.address_line2),
      s(address?.ref_districts?.name_ar),
      s(address?.ref_cities?.name_ar),
      address?.postal_code ? `الرمز البريدي ${address.postal_code}` : "",
    ]
      .filter(Boolean)
      .join("، ");

    return {
      customer,
      items,
      city,
      district,
      fullAddress,
      totalWeight: order ? totalWeight(order) : "0 كجم",
      itemName,
      itemSku,
      itemImage,
      itemWeight,
      selectedOptionsText,
    };
  }, [order]);
}

export default function OrderEditPageClient({ id }: { id: string }) {
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [optionsModalOpen, setOptionsModalOpen] = useState(false);

  async function loadOrder(mode: "initial" | "refresh" = "initial") {
    try {
      if (mode === "initial") {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      const res = await fetch(`/api/orders/${id}`, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          s(data?.error?.message || data?.error) || "تعذر تحميل الطلب",
        );
      }

      setOrder(data);
    } catch (e: any) {
      setError(s(e?.message) || "تعذر تحميل الطلب");
    } finally {
      if (mode === "initial") {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }

  useEffect(() => {
    void loadOrder("initial");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const helpers = useOrderHelpers(order);

  if (loading) {
    return (
      <div dir="rtl" className="adm-order-edit">
        <div className="adm-order-edit__inner">
          <div className="adm-order-edit-stateBox">جارٍ تحميل الطلب...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div dir="rtl" className="adm-order-edit">
        <div className="adm-order-edit__inner">
          <div className="adm-order-edit-stateBox adm-order-edit-stateBox--error">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div dir="rtl" className="adm-order-edit">
      <div className="adm-order-edit__inner">
        {refreshing ? (
          <div className="adm-order-edit-refresh">جارٍ تحديث بيانات الطلب...</div>
        ) : null}

        <div className="adm-order-edit-topGrid">
          <OrderCustomerCard
            order={order}
            customer={helpers.customer}
            onUpdated={() => loadOrder("refresh")}
          />

          <OrderShippingCard
            order={order}
            city={helpers.city}
            fullAddress={helpers.fullAddress}
            onUpdated={() => loadOrder("refresh")}
          />

          <OrderPaymentCard
            order={order}
            onUpdated={() => loadOrder("refresh")}
          />
        </div>

        <OrderItemsCard
          order={order}
          itemName={helpers.itemName}
          itemSku={helpers.itemSku}
          itemImage={helpers.itemImage}
          itemWeight={helpers.itemWeight}
          selectedOptionsText={helpers.selectedOptionsText}
          onUpdated={() => loadOrder("refresh")}
        />

        <OrderOptionsCard
          order={order}
          onOpenEdit={() => setOptionsModalOpen(true)}
        />

        <OrderSummaryCard
          order={order}
          totalWeight={helpers.totalWeight}
          onUpdated={() => loadOrder("refresh")}
        />

        <OrderBottomActions order={order} />
      </div>

      <OrderOptionsEditModal
        open={optionsModalOpen}
        order={order}
        onClose={() => setOptionsModalOpen(false)}
        onSaved={() => loadOrder("refresh")}
      />
    </div>
  );
}