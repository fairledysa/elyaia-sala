// FILE: apps/merchant/src/app/(app)/orders/[id]/_components/OrderShippingCard.tsx
"use client";

import { Truck } from "lucide-react";
import type { OrderDetails } from "./OrderDetailsPageClient";
import { s } from "./OrderDetailsPageClient";

export default function OrderShippingCard({
  order,
  city,
  fullAddress,
}: {
  order: OrderDetails;
  city: string;
  fullAddress: string;
}) {
  const shippingSnapshot = (order as any)?.shipping_snapshot ?? null;
  const carrier = order?.shipping_carrier ?? null;

  const companyName =
    s(shippingSnapshot?.store_shipping_carrier_name) ||
    s(shippingSnapshot?.carrier_name) ||
    s(carrier?.name) ||
    "-";

  const duration = s(shippingSnapshot?.eta_text)
    ? `( الشحن ${s(shippingSnapshot?.eta_text)} )`
    : "";

  return (
    <section className="adm-order-details-miniCard">
      <div className="adm-order-details-miniCard__head">
        <h3 className="adm-order-details-miniCard__title">الشحن</h3>

        <button
          type="button"
          className="adm-order-details-btn adm-order-details-btn--light"
        >
          إصدار البوليصة
          <Truck className="adm-order-details__icon" />
        </button>
      </div>

      <div className="adm-order-details-miniCard__content">
        <div className="adm-order-details-shipping__row">
          <div className="adm-order-details-shipping__logo">
            {companyName !== "-" ? companyName.slice(0, 2) : "-"}
          </div>

          <div>
            <div className="adm-order-details-shipping__city">{city || "-"}</div>
            <div className="adm-order-details-shipping__company">
              {companyName}
            </div>
          </div>
        </div>

        {fullAddress ? (
          <div className="adm-order-details-shipping__address">
            {fullAddress}
          </div>
        ) : null}

        {duration ? (
          <div className="adm-order-details-shipping__duration">{duration}</div>
        ) : null}
      </div>
    </section>
  );
}