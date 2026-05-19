// FILE: apps/merchant/src/app/(app)/orders/[id]/_components/OrderCustomerCard.tsx
"use client";

import {
  ClipboardCopy,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  UserCircle2,
  ChevronDown,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CustomerMini, OrderDetails } from "./OrderDetailsPageClient";
import { s } from "./OrderDetailsPageClient";

function ActionCircle({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="adm-order-details-circleBtn"
    >
      {children}
    </button>
  );
}

export default function OrderCustomerCard({
  order,
  customer,
}: {
  order: OrderDetails;
  customer: CustomerMini | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const name = s(customer?.full_name) || "العميل";
  const phone = s(customer?.phone_e164) || "-";
  const email = s(customer?.email);

  function goToCustomer() {
    if (!order?.customer_id) return;
    router.push(`/customers/${order.customer_id}`);
  }

  return (
    <section className="adm-order-details-miniCard">
      <div className="adm-order-details-miniCard__head">
        <h3 className="adm-order-details-miniCard__title">العميل</h3>

        <div className="adm-order-details-dropdownWrap">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="adm-order-details-btn adm-order-details-btn--light"
          >
            <UserCircle2 className="adm-order-details__icon" />
            خيارات العميل
            <ChevronDown className="adm-order-details__icon" />
          </button>

          {open ? (
            <div className="adm-order-details-dropdown">
              <button type="button" onClick={goToCustomer}>
                طلبات العميل
              </button>
              <button type="button">حظر العميل</button>
              <button type="button">أرشيف الرسائل</button>
              <button type="button">إرسال طلب تقييم</button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="adm-order-details-miniCard__content adm-order-details-customer__body">
        <div className="adm-order-details-customer__avatar">
          <UserCircle2 className="adm-order-details__iconLg" />
        </div>

        <div className="adm-order-details-customer__info">
          <button
            type="button"
            onClick={goToCustomer}
            className="adm-order-details-customer__name"
          >
            {name}
          </button>

          <div dir="ltr" className="adm-order-details-customer__phone">
            {phone}
          </div>

          <div className="adm-order-details-customer__actions">
            <ActionCircle
              label="اتصال"
              onClick={() => {
                if (!phone || phone === "-") return;
                window.location.href = `tel:${phone}`;
              }}
            >
              <Phone className="adm-order-details__icon" />
            </ActionCircle>

            <ActionCircle
              label="بريد"
              onClick={() => {
                if (!email) return;
                window.location.href = `mailto:${email}`;
              }}
            >
              <Mail className="adm-order-details__icon" />
            </ActionCircle>

            <ActionCircle
              label="رسائل"
              onClick={() => {
                if (!phone || phone === "-") return;
                window.location.href = `sms:${phone}`;
              }}
            >
              <MessageSquare className="adm-order-details__icon" />
            </ActionCircle>

            <ActionCircle
              label="واتساب"
              onClick={() => {
                if (!phone || phone === "-") return;
                const clean = phone.replace("+", "");
                window.open(`https://wa.me/${clean}`, "_blank");
              }}
            >
              <MessageCircle className="adm-order-details__icon" />
            </ActionCircle>

            <ActionCircle
              label="نسخ"
              onClick={() => {
                if (!phone || phone === "-") return;
                navigator.clipboard.writeText(phone);
              }}
            >
              <ClipboardCopy className="adm-order-details__icon" />
            </ActionCircle>
          </div>
        </div>
      </div>
    </section>
  );
}