// FILE: apps/merchant/src/app/(app)/orders/[id]/_components/OrderBottomActions.tsx
"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Pencil, RefreshCcw, X } from "lucide-react";
import type { OrderDetails } from "./OrderDetailsPageClient";

export default function OrderBottomActions({ order }: { order: OrderDetails }) {
  const router = useRouter();

  return (
    <div className="adm-page-actions">
      <div className="adm-page-actions__nav">
        <button
          type="button"
          className="adm-btn adm-btn--md adm-btn--pill adm-btn--outline"
        >
          الطلب السابق
          <ArrowRight size={18} />
        </button>

        <button
          type="button"
          className="adm-btn adm-btn--md adm-btn--pill adm-btn--outline"
        >
          الطلب التالي
          <ArrowLeft size={18} />
        </button>
      </div>

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
          className="adm-btn adm-btn--lg adm-btn--pill adm-btn--outline adm-page-actions__btn"
        >
          تكرار الطلب
          <RefreshCcw size={20} />
        </button>

        <button
          type="button"
          onClick={() => router.push(`/orders/${order.id}/edit`)}
          className="adm-btn adm-btn--lg adm-btn--pill adm-btn--primary adm-page-actions__btn"
        >
          تعديل الطلب
          <Pencil size={20} />
        </button>
      </div>
    </div>
  );
}