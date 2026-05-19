// FILE: apps/merchant/src/app/(app)/orders/[id]/_components/OrderDetailsPageClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import OrderHeaderNav from "./OrderHeaderNav";
import OrderOverviewCard from "./OrderOverviewCard";
import OrderPaymentCard from "./OrderPaymentCard";
import OrderShippingCard from "./OrderShippingCard";
import OrderCustomerCard from "./OrderCustomerCard";
import OrderItemsCard from "./OrderItemsCard";
import OrderSummaryCard from "./OrderSummaryCard";
import OrderCustomerNoteCard from "./OrderCustomerNoteCard";
import OrderAdminNotesCard from "./OrderAdminNoteCard";
import OrderTimelineCard from "./OrderTimelineCard";
import OrderBottomActions from "./OrderBottomActions";
import OrderDetailsSkeleton from "./OrderDetailsSkeleton";
import ChangeOrderStatusDialog from "./ChangeOrderStatusDialog";
import { FileText, ListChecks } from "lucide-react";

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
  price_customer?: number | null;
  priceCustomer?: number | null;
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

  value?: string | number | null;
  display_value?: string | number | null;
  displayValue?: string | number | null;
  answer_value?: string | number | null;
  answerValue?: string | number | null;

  choices?: OrderOptionChoice[] | null;
  choice_labels?: string[] | null;
  choiceLabels?: string[] | null;

  metadata?: any;

  price_customer?: number | null;
  priceCustomer?: number | null;
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

export type AuditLogItem = {
  id: string;
  store_id?: string | null;
  actor_type?: string | null;
  actor_id?: string | null;
  action?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  before_data?: any;
  after_data?: any;
  created_at?: string | null;
  actor_name?: string | null;
  actor_email?: string | null;
  actor_role?: string | null;
};

export type OrderAdminNote = {
  id: string;
  store_id?: string | null;
  order_id?: string | null;
  note?: string | null;
  created_by_store_user_id?: string | null;
  updated_by_store_user_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  created_by_name?: string | null;
  updated_by_name?: string | null;
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
  order_options_fee?: number | null;
  orderOptionsFee?: number | null;
  order_options_base?: number | null;
  orderOptionsBase?: number | null;
  order_options_tax?: number | null;
  orderOptionsTax?: number | null;
  order_options_total?: number | null;
  orderOptionsTotal?: number | null;

  customers?: CustomerMini | CustomerMini[] | null;
  order_items?: OrderItem[] | null;

  customer_address?: CustomerAddress | null;
  current_store_status?: StoreStatus | null;
  current_base_status?: BaseStatus | null;
  status_history?: StatusHistoryItem[] | null;
  audit_logs?: AuditLogItem[] | null;
  shipping_carrier?: any;

  coupon_code?: string | null;
  coupon_type?: string | null;
  coupon_amount?: number | null;
  coupon_discount_amount?: number | null;

  order_admin_note?: OrderAdminNote | null;
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

export function dt(value: unknown) {
  const x = s(value);
  if (!x) return "-";
  const d = new Date(x);
  if (Number.isNaN(d.getTime())) return x;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function shortDt(value: unknown) {
  const x = s(value);
  if (!x) return "-";
  const d = new Date(x);
  if (Number.isNaN(d.getTime())) return x;
  return new Intl.DateTimeFormat("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  }).format(d);
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

export function labelBaseStatus(v: unknown) {
  const x = s(v).toLowerCase();
  if (x === "pending") return "قيد التجهيز";
  if (x === "paid") return "مدفوع";
  if (x === "failed") return "فشل";
  if (x === "cancelled") return "ملغي";
  if (x === "shipped") return "تم الشحن";
  if (x === "completed") return "مكتمل";
  if (x === "pending_payment") return "بانتظار الدفع";
  if (x === "pending_review") return "بانتظار المراجعة";
  return s(v) || "قيد التجهيز";
}

export function getCurrentStatusLabel(order: OrderDetails) {
  return (
    s(order.current_store_status?.name) ||
    s(order.current_base_status?.name_ar) ||
    labelBaseStatus(order.base_status_key)
  );
}

function pickCustomer(order: OrderDetails): CustomerMini | null {
  const raw = order.customers;
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw;
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

function totalWeight(order: OrderDetails) {
  const items = Array.isArray(order.order_items) ? order.order_items : [];
  const weight = items.reduce((sum, item) => sum + n(item.qty) * 0.25, 0);

  return `${new Intl.NumberFormat("ar-SA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(weight)} كجم`;
}

function safeObject(value: any): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {}
  }

  return {};
}

function firstValue(...values: any[]) {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return value;
    }
  }

  return null;
}

function stringifyOptionValue(value: any): string {
  if (value === null || value === undefined) return "";

  if (Array.isArray(value)) {
    return value
      .map((item: any) => stringifyOptionValue(item))
      .filter((item: string) => Boolean(item))
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
  const choices = Array.isArray(line.choices) ? line.choices : [];

  const labels = choices
    .map((choice) => {
      return s(choice?.label) || s(choice?.name) || s(choice?.value);
    })
    .filter(Boolean);

  const choiceLabels = Array.isArray(line.choice_labels)
    ? line.choice_labels.map((x) => s(x)).filter(Boolean)
    : [];

  const camelChoiceLabels = Array.isArray(line.choiceLabels)
    ? line.choiceLabels.map((x) => s(x)).filter(Boolean)
    : [];

  return Array.from(new Set([...labels, ...choiceLabels, ...camelChoiceLabels]));
}

function optionLineValue(line: OrderOptionLine) {
  const direct = stringifyOptionValue(
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
  return n(firstValue(line.price_customer, line.priceCustomer, 0));
}

function orderOptionsLines(order: OrderDetails) {
  const direct = Array.isArray(order.order_options) ? order.order_options : [];
  const camel = Array.isArray(order.orderOptions) ? order.orderOptions : [];
  const lines = direct.length ? direct : camel;

  return lines.filter((line) => {
    const title = optionLineTitle(line);
    const value = optionLineValue(line);
    const price = optionLinePrice(line);

    return Boolean(title || value || price > 0);
  });
}

function orderOptionsFee(order: OrderDetails) {
  const raw = firstValue(
    order.order_options_fee,
    order.orderOptionsFee,
    order.order_options_total,
    order.orderOptionsTotal,
  );

  if (raw !== null) return n(raw);

  return orderOptionsLines(order).reduce((sum, line) => {
    return sum + optionLinePrice(line);
  }, 0);
}

 function OrderOptionsCard({ order }: { order: OrderDetails }) {
  const lines = orderOptionsLines(order);
  const fee = orderOptionsFee(order);
  const currency = s(order.currency) || "SAR";

  if (!lines.length && fee <= 0) return null;

  return (
    <div className="adm-order-options-card">
      <div className="adm-order-options-card__head">
        <div className="adm-order-options-card__titleWrap">
          <h3 className="adm-order-options-card__title">خيارات الطلب</h3>
          <p className="adm-order-options-card__desc">
            الخيارات الإضافية التي اختارها العميل أثناء إتمام الطلب.
          </p>
        </div>

        <span className="adm-order-options-card__icon">
          <ListChecks size={18} strokeWidth={2.2} />
        </span>
      </div>

      <div className="adm-order-options-card__body">
        {lines.map((line, index) => {
          const title = optionLineTitle(line);
          const value = optionLineValue(line);
          const price = optionLinePrice(line);
          const key = s(line.id) || `${title}-${index}`;

          return (
            <div key={key} className="adm-order-options-card__row">
              <div className="adm-order-options-card__main">
                <div className="adm-order-options-card__rowTitle">
                  <span className="adm-order-options-card__rowIcon">
                    <FileText size={13} strokeWidth={2.2} />
                  </span>

                  <span>{title}</span>
                </div>

                {value ? (
                  <div className="adm-order-options-card__value">{value}</div>
                ) : (
                  <div className="adm-order-options-card__emptyValue">
                    بدون قيمة مدخلة
                  </div>
                )}
              </div>

              {price > 0 ? (
                <div dir="ltr" className="adm-order-options-card__price">
                  + {money(price, currency)}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {fee > 0 ? (
        <div className="adm-order-options-card__total">
          <span>إجمالي خيارات الطلب</span>
          <strong dir="ltr">{money(fee, currency)}</strong>
        </div>
      ) : null}
    </div>
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
      currentStatusLabel: order ? getCurrentStatusLabel(order) : "قيد التجهيز",
      totalWeight: order ? totalWeight(order) : "0 كجم",
      itemName,
      itemSku,
      itemImage,
      itemWeight,
      selectedOptionsText,
    };
  }, [order]);
}

export default function OrderDetailsPageClient({ id }: { id: string }) {
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  async function loadOrder() {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrder();
  }, [id]);

  const helpers = useOrderHelpers(order);

  if (loading) return <OrderDetailsSkeleton />;

  if (error) {
    return (
      <div dir="rtl" className="adm-order-details">
        <div className="adm-order-details__error">{error}</div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div dir="rtl" className="adm-order-details">
      <div className="adm-order-details__inner">
        <OrderHeaderNav orderId={order.id} />

        <OrderOverviewCard
          order={order}
          currentStatusLabel={helpers.currentStatusLabel}
          onOpenChangeStatus={() => setStatusDialogOpen(true)}
        />

        <div className="adm-order-details__grid3">
          <OrderCustomerCard order={order} customer={helpers.customer} />
          <OrderShippingCard
            order={order}
            city={helpers.city}
            fullAddress={helpers.fullAddress}
          />
          <OrderPaymentCard order={order} />
        </div>

        <OrderItemsCard
          order={order}
          itemName={helpers.itemName}
          itemSku={helpers.itemSku}
          itemImage={helpers.itemImage}
          itemWeight={helpers.itemWeight}
          selectedOptionsText={helpers.selectedOptionsText}
        />

        <OrderOptionsCard order={order} />

        <OrderSummaryCard order={order} totalWeight={helpers.totalWeight} />

        <OrderAdminNotesCard order={order} onUpdated={loadOrder} />

        <OrderCustomerNoteCard order={order} />

        <OrderTimelineCard
          order={order}
          customer={helpers.customer}
          currentStatusLabel={helpers.currentStatusLabel}
        />

        <OrderBottomActions order={order} />

        <ChangeOrderStatusDialog
          orderId={order.id}
          open={statusDialogOpen}
          currentBaseStatusKey={order.base_status_key}
          currentStoreStatusId={order.store_status_id}
          currentStatusLabel={helpers.currentStatusLabel}
          onClose={() => setStatusDialogOpen(false)}
          onUpdated={loadOrder}
        />
      </div>
    </div>
  );
}