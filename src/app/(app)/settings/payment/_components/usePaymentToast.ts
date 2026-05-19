// FILE: apps/merchant/src/app/(app)/settings/payment/_components/usePaymentToast.ts
"use client";

import { useCallback, useState } from "react";
import type { PaymentToastState, PaymentToastType } from "./PaymentToast";

export function usePaymentToast() {
  const [toastState, setToastState] = useState<PaymentToastState>({
    open: false,
    type: "success",
    message: "",
  });

  const show = useCallback(
    (message: string, type: PaymentToastType = "success") => {
      setToastState({ open: true, type, message });
    },
    []
  );

  const close = useCallback(() => {
    setToastState((s) => ({ ...s, open: false }));
  }, []);

  return { toastState, show, close };
}
