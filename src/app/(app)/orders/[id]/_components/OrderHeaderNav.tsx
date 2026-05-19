// FILE: apps/merchant/src/app/(app)/orders/[id]/_components/OrderHeaderNav.tsx
"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function OrderHeaderNav({ orderId }: { orderId: string }) {
  const router = useRouter();

  const [prevId, setPrevId] = useState<string | null>(null);
  const [nextId, setNextId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const res = await fetch(`/api/orders/next-prev?id=${orderId}`, {
          cache: "no-store",
        });

        const data = await res.json();

        setPrevId(data.prevId || null);
        setNextId(data.nextId || null);
      } catch {
        setPrevId(null);
        setNextId(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [orderId]);

  function goTo(id: string | null) {
    if (!id) return;
    router.push(`/orders/${id}`);
  }

  return (
    <div className="adm-order-details-nav">
      <button
        type="button"
        disabled={!prevId || loading}
        onClick={() => goTo(prevId)}
        className="adm-order-details-btn adm-order-details-btn--light adm-order-details-btn--round"
      >
        <ArrowRight className="adm-order-details__icon" />
        الطلب السابق
      </button>

      <div className="adm-order-details-nav__center">
        {loading ? "جارٍ التحميل..." : `الطلب / ${orderId}`}
      </div>

      <button
        type="button"
        disabled={!nextId || loading}
        onClick={() => goTo(nextId)}
        className="adm-order-details-btn adm-order-details-btn--light adm-order-details-btn--round"
      >
        الطلب التالي
        <ArrowLeft className="adm-order-details__icon" />
      </button>
    </div>
  );
}