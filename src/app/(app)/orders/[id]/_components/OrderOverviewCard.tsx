// FILE: apps/merchant/src/app/(app)/orders/[id]/_components/OrderOverviewCard.tsx
"use client";

import type { CSSProperties } from "react";
import {
  CalendarDays,
  Smartphone,
  Tag,
  UserPlus2,
  RefreshCcw,
  ChevronDown,
} from "lucide-react";
import Icon from "@/boltify/components/icon/Icon";
import type { OrderDetails } from "./OrderDetailsPageClient";

type StatusStyle = CSSProperties & {
  "--adm-order-status-color"?: string;
};

function s(v: unknown) {
  return String(v ?? "").trim();
}

function dt(value: unknown) {
  const x = s(value);
  if (!x) return "-";
  const d = new Date(x);
  if (Number.isNaN(d.getTime())) return x;
  return new Intl.DateTimeFormat("ar-SA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function getCurrentStatusMeta(order: OrderDetails, currentStatusLabel: string) {
  if (order.current_store_status) {
    return {
      label: s(order.current_store_status.name) || currentStatusLabel,
      icon: s(order.current_store_status.icon),
      color: s(order.current_store_status.color),
    };
  }

  if (order.current_base_status) {
    return {
      label: s(order.current_base_status.name_ar) || currentStatusLabel,
      icon: s(order.current_base_status.icon),
      color: s(order.current_base_status.color),
    };
  }

  return {
    label: currentStatusLabel,
    icon: "",
    color: "",
  };
}

function statusStyle(color?: string | null): StatusStyle {
  return {
    "--adm-order-status-color": s(color) || "var(--adm-primary, #0d3b45)",
  };
}

export default function OrderOverviewCard({
  order,
  currentStatusLabel,
  onOpenChangeStatus,
}: {
  order: OrderDetails;
  currentStatusLabel: string;
  onOpenChangeStatus: () => void;
}) {
  const status = getCurrentStatusMeta(order, currentStatusLabel);

  return (
    <section className="adm-order-details-card adm-order-details-overview">
      <div className="adm-order-details-overview__body">
        <div className="adm-order-details-overview__top">
          <div className="adm-order-details-overview__employee">
            <UserPlus2 className="adm-order-details__iconLg adm-order-details-card__titleIcon" />
            موظف الطلب
          </div>

          <button
            type="button"
            className="adm-order-details-btn adm-order-details-btn--mint"
          >
            <RefreshCcw className="adm-order-details__icon" />
            تكرار الطلب
          </button>
        </div>

        <div className="adm-order-details-overview__metaGrid">
          <div className="adm-order-details-infoBlock">
            <div className="adm-order-details-infoBlock__label"># رقم الطلب</div>
            <div className="adm-order-details-infoBlock__value">
              <Smartphone className="adm-order-details__icon" />
              <span dir="ltr">{order.order_number || "-"}</span>
            </div>
          </div>

          <div className="adm-order-details-infoBlock adm-order-details-infoBlock--center">
            <div className="adm-order-details-infoBlock__label">
              <CalendarDays className="adm-order-details__icon" />
              تاريخ الطلب
            </div>
            <div className="adm-order-details-infoBlock__value">
              {dt(order.created_at)}
            </div>
          </div>

          <div className="adm-order-details-infoBlock adm-order-details-infoBlock--left">
            <div className="adm-order-details-infoBlock__label">حالة الطلب</div>

            <button
              type="button"
              onClick={onOpenChangeStatus}
              className="adm-order-details-statusBtn"
              style={statusStyle(status.color)}
            >
              <ChevronDown className="adm-order-details__icon" />

              {status.icon ? (
                <Icon icon={status.icon as any} className="adm-order-details__icon" />
              ) : null}

              <span>{status.label}</span>
              <span className="adm-order-details-statusDot" />
            </button>
          </div>
        </div>

        <div className="adm-order-details-tags">
          <div className="adm-order-details-tags__label">الوسوم:</div>

          <button
            type="button"
            className="adm-order-details-btn adm-order-details-btn--mint adm-order-details-btn--round"
          >
            <span>+</span>
            إضافة وسم
          </button>

          <Tag className="adm-order-details__icon adm-order-details-card__titleIcon" />
        </div>
      </div>
    </section>
  );
}