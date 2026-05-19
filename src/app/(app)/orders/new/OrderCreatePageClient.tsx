// FILE: apps/merchant/src/app/(app)/orders/new/OrderCreatePageClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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

export default function OrderCreatePageClient({ id }: { id?: string }) {
  const router = useRouter();

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [error, setError] = useState("");

  const didStartRef = useRef(false);

  async function createDraftIfNeeded() {
    if (id || order?.id || didStartRef.current) return;

    try {
      didStartRef.current = true;
      setCreatingDraft(true);
      setError("");

      if (typeof window !== "undefined") {
        const inFlight = sessionStorage.getItem("orders_new_creating");
        const existingId = sessionStorage.getItem("orders_new_created_id");

        if (existingId) {
          router.replace(`/orders/${existingId}/new`);
          return;
        }

        if (inFlight === "1") {
          const startedAt = Date.now();

          const waitForCreatedId = async () => {
            while (Date.now() - startedAt < 8000) {
              const createdId = sessionStorage.getItem("orders_new_created_id");
              if (createdId) {
                router.replace(`/orders/${createdId}/new`);
                return true;
              }

              await new Promise((resolve) => setTimeout(resolve, 250));
            }

            return false;
          };

          const found = await waitForCreatedId();
          if (found) return;
        }

        sessionStorage.setItem("orders_new_creating", "1");
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          mode: "draft",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(s(data?.error) || "تعذر إنشاء الطلب");
      }

      const newId = s(data?.id);
      if (!newId) {
        throw new Error("لم يتم إرجاع رقم الطلب");
      }

      if (typeof window !== "undefined") {
        sessionStorage.setItem("orders_new_created_id", newId);
        sessionStorage.removeItem("orders_new_creating");
      }

      router.replace(`/orders/${newId}/new`);
    } catch (e: any) {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("orders_new_creating");
      }

      setError(s(e?.message) || "تعذر إنشاء الطلب");
      setLoading(false);
    } finally {
      setCreatingDraft(false);
    }
  }

  async function loadOrder(
    orderId: string,
    mode: "initial" | "refresh" = "initial"
  ) {
    try {
      if (mode === "initial") {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      const res = await fetch(`/api/orders/${orderId}`, {
        cache: "no-store",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          s(data?.error?.message || data?.error) || "تعذر تحميل الطلب"
        );
      }

      setOrder(data);

      if (typeof window !== "undefined") {
        sessionStorage.removeItem("orders_new_creating");
        sessionStorage.removeItem("orders_new_created_id");
      }
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
    if (id) {
      void loadOrder(id, "initial");
      return;
    }

    void createDraftIfNeeded();
  }, [id]);

  const helpers = useOrderHelpers(order);

  if (loading || creatingDraft) {
    return (
      <div dir="rtl" className="adm-order-edit-page">
        <div className="adm-order-edit-page__inner">
          <div className="adm-order-edit-state">جارٍ تجهيز الطلب...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div dir="rtl" className="adm-order-edit-page">
        <div className="adm-order-edit-page__inner">
          <div className="adm-order-edit-state adm-order-edit-state--error">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div dir="rtl" className="adm-order-edit-page">
      <div className="adm-order-edit-page__inner">
        {refreshing ? (
          <div className="adm-order-edit-notice">جارٍ تحديث بيانات الطلب...</div>
        ) : null}

        <div className="adm-order-edit-topGrid">
          <OrderCustomerCard
            order={order}
            customer={helpers.customer}
            onUpdated={() => loadOrder(order.id, "refresh")}
          />

          <OrderShippingCard
            order={order}
            city={helpers.city}
            fullAddress={helpers.fullAddress}
            onUpdated={() => loadOrder(order.id, "refresh")}
          />

          <OrderPaymentCard
            order={order}
            onUpdated={() => loadOrder(order.id, "refresh")}
          />
        </div>

        <OrderItemsCard
          order={order}
          itemName={helpers.itemName}
          itemSku={helpers.itemSku}
          itemImage={helpers.itemImage}
          itemWeight={helpers.itemWeight}
          selectedOptionsText={helpers.selectedOptionsText}
          onUpdated={() => loadOrder(order.id, "refresh")}
        />

        <OrderSummaryCard
          order={order}
          totalWeight={helpers.totalWeight}
          onUpdated={() => loadOrder(order.id, "refresh")}
        />

        <OrderBottomActions orderId={order.id} />
      </div>
    </div>
  );
}