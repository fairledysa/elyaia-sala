// FILE: apps/merchant/src/app/(app)/orders/[id]/_components/OrderCustomerNoteCard.tsx
"use client";

import { MessageSquareMore } from "lucide-react";
import type { OrderDetails } from "./OrderDetailsPageClient";
import { s } from "./OrderDetailsPageClient";

export default function OrderCustomerNoteCard({
  order,
}: {
  order: OrderDetails;
}) {
  const note = s(order.status_note);

  return (
    <section className="adm-order-details-card">
      <div className="adm-order-details-card__head">
        <div className="adm-order-details-card__title">
          <MessageSquareMore className="adm-order-details__iconLg adm-order-details-card__titleIcon" />
          ملاحظة العميل
        </div>
      </div>

      <div className="adm-order-details-noteContent">
        {note ? (
          <div className="adm-order-details-noteTextBox">{note}</div>
        ) : (
          <div className="adm-order-details-noteEmpty">
            لا توجد ملاحظات!
          </div>
        )}
      </div>
    </section>
  );
}