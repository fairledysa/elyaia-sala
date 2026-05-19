// FILE: apps/merchant/src/app/(app)/settings/payment/_components/PaymentToast.tsx
"use client";

import { useEffect, useMemo } from "react";
import Icon from "@/components/icon/Icon";

export type PaymentToastType = "success" | "error" | "info";

export type PaymentToastState = {
  open: boolean;
  type: PaymentToastType;
  message: string;
};

function metaByType(type: PaymentToastType) {
  if (type === "success") {
    return {
      icon: "CheckmarkCircle02",
      label: "تم بنجاح",
      cardClass: "adm-toast__card--success",
    } as const;
  }

  if (type === "error") {
    return {
      icon: "Alert02",
      label: "حدث خطأ",
      cardClass: "adm-toast__card--error",
    } as const;
  }

  return {
    icon: "InformationCircle",
    label: "تنبيه",
    cardClass: "adm-toast__card--info",
  } as const;
}

export default function PaymentToast(props: {
  state: PaymentToastState;
  onClose: () => void;
  durationMs?: number;
}) {
  const { state, onClose, durationMs = 2200 } = props;

  const meta = useMemo(() => metaByType(state.type), [state.type]);

  useEffect(() => {
    if (!state.open) return;

    const timer = window.setTimeout(() => {
      onClose();
    }, durationMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [state.open, durationMs, onClose]);

  if (!state.open) return null;

  return (
    <div className="adm-toast" dir="rtl">
      <div className={`adm-toast__card ${meta.cardClass}`}>
        <div className="adm-toast__icon">
          <Icon icon={meta.icon as any} size="text-xl" />
        </div>

        <div className="adm-toast__content">
          <div className="adm-toast__title">{state.message}</div>
          <div className="adm-toast__message">{meta.label}</div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="adm-toast__close"
          aria-label="إغلاق"
          title="إغلاق"
        >
          ×
        </button>
      </div>
    </div>
  );
}