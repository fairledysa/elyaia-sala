// FILE: apps/merchant/src/app/(app)/orders/[id]/_components/OrderPaymentCard.tsx
"use client";

import { Check } from "lucide-react";
import type { OrderDetails } from "./OrderDetailsPageClient";
import {
  labelPaymentMethod,
  labelPaymentStatus,
} from "./OrderDetailsPageClient";

export default function OrderPaymentCard({ order }: { order: OrderDetails }) {
  return (
    <section className="adm-order-details-miniCard">
      <div className="adm-order-details-miniCard__head">
        <h3 className="adm-order-details-miniCard__title">الدفع</h3>

        <button
          type="button"
          className="adm-order-details-btn adm-order-details-btn--light"
        >
          إصدار الفاتورة
        </button>
      </div>

      <div className="adm-order-details-miniCard__content">
        <div className="adm-order-details-customer__body">
          <div className="adm-order-details-payment__method">
            {labelPaymentMethod(order.payment_method)}
          </div>

          <div className="adm-order-details-checkIcon">
            <Check className="adm-order-details__iconLg" />
          </div>
        </div>

        <div className="adm-order-details-payment__status">
          {labelPaymentStatus(order.payment_status)}
        </div>
      </div>
    </section>
  );
}