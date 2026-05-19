// FILE: apps/merchant/src/app/(app)/orders/new/_components/OrderBottomActions.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  X,
} from "lucide-react";

function s(x: any) {
  return String(x ?? "").trim();
}

type NoticeState = {
  type: "success" | "error";
  message: string;
} | null;

export default function OrderBottomActions({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);

  useEffect(() => {
    if (!notice) return;

    if (notice.type === "error") {
      const t = window.setTimeout(() => {
        setNotice(null);
      }, 4500);

      return () => window.clearTimeout(t);
    }
  }, [notice]);

  async function handleCreateOrder() {
    try {
      if (saving) return;

      setSaving(true);
      setNotice(null);

      const res = await fetch(`/api/orders/${orderId}/finalize`, {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(s(data?.error) || "فشل إنشاء الطلب");
      }

      setNotice({
        type: "success",
        message: "تم إنشاء الطلب بنجاح",
      });

      window.setTimeout(() => {
        router.replace(`/orders/${orderId}`);
        router.refresh();
      }, 900);
    } catch (e: any) {
      setNotice({
        type: "error",
        message: s(e?.message) || "فشل إنشاء الطلب",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="adm-page-actions">
      {notice ? (
        <div className="adm-toast">
          <div
            className={[
              "adm-toast__card",
              notice.type === "success"
                ? "adm-toast__card--success"
                : "adm-toast__card--error",
            ].join(" ")}
          >
            <div className="adm-toast__icon">
              {notice.type === "success" ? (
                <CheckCircle2 size={20} />
              ) : (
                <CircleAlert size={20} />
              )}
            </div>

            <div className="adm-toast__content">
              <div className="adm-toast__title">
                {notice.type === "success" ? "تم بنجاح" : "تنبيه"}
              </div>

              <div className="adm-toast__message">{notice.message}</div>
            </div>

            <button
              type="button"
              onClick={() => setNotice(null)}
              className="adm-toast__close"
              aria-label="إغلاق التنبيه"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : null}

      <div className="adm-page-actions__row">
        <button
          type="button"
          onClick={() => router.push("/orders")}
          disabled={saving}
          className="adm-btn adm-btn--lg adm-btn--pill adm-btn--outline adm-page-actions__btn"
        >
          إلغاء
          <ArrowRight size={20} />
        </button>

        <button
          type="button"
          onClick={handleCreateOrder}
          disabled={saving}
          className="adm-btn adm-btn--lg adm-btn--pill adm-btn--mint adm-page-actions__btn adm-page-actions__btn--wide"
        >
          {saving ? (
            <>
              <LoaderCircle size={20} className="adm-spin" />
              <span>جارٍ إنشاء الطلب...</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={20} />
              <span>إنشاء الطلب</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}