// FILE: apps/merchant/src/app/(app)/orders/[id]/edit/_components/OrderBottomActions.tsx
"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, X } from "lucide-react";
import type { OrderDetails } from "../OrderEditPageClient";

export default function OrderBottomActions({ order }: { order: OrderDetails }) {
  const router = useRouter();

  return (
    <div className="adm-page-actions">
      <div className="adm-page-actions__row">
        <button
          type="button"
          className="adm-btn adm-btn--lg adm-btn--pill adm-btn--danger adm-page-actions__btn"
        >
          حذف الطلب
          <X size={20} />
        </button>

        <button
          type="button"
          onClick={() => router.push(`/orders/${order.id}`)}
          className="adm-btn adm-btn--lg adm-btn--pill adm-btn--outline adm-page-actions__btn"
        >
          عودة
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}