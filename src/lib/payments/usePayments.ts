// FILE: apps/merchant/src/lib/payments/usePayments.ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  PaymentsGetResponse,
  PaymentsUpdateOp,
  ProviderCode,
  ProviderStatus,
  StorePaymentMethod,
  StoreBankAccount,
  StoreCheckoutSettings,
} from "./types";
import { paymentsGet, paymentsUpdate } from "./api";
import { PROVIDERS } from "./types";

type BusyMap = Record<string, boolean>;

export function usePayments() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PaymentsGetResponse | null>(null);

  // ✅ busy per action (زر واحد يتعطل بدل الصفحة كلها)
  const [busy, setBusy] = useState<BusyMap>({});
  const setBusyKey = (k: string, v: boolean) =>
    setBusy((s) => ({ ...s, [k]: v }));

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const d = await paymentsGet();
      setData(d);
    } catch (e: any) {
      setError(String(e?.message || e));
      setData(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh(false);
  }, [refresh]);

  const methodsByCode = useMemo(() => {
    const map = new Map<string, StorePaymentMethod>();
    for (const m of data?.payment_methods || []) map.set(m.provider_code, m);
    return map;
  }, [data]);

  const providersView = useMemo(() => {
    return PROVIDERS.map((p) => {
      const m = methodsByCode.get(p.code);
      return {
        ...p,
        enabled: !!m?.enabled,
        status: (m?.status as ProviderStatus) || "inactive",
        config: m?.config || {},
        updated_at: m?.updated_at || null,
      };
    });
  }, [methodsByCode]);

  // ✅ تعديل محلي مضبوط الأنواع
  const patchLocal = useCallback(
    (fn: (prev: PaymentsGetResponse) => PaymentsGetResponse) => {
      setData((prev) => (prev ? fn(prev) : prev));
    },
    []
  );

  const run = useCallback(
    async (
      op: PaymentsUpdateOp,
      opts?: {
        busyKey?: string;
        silentRefresh?: boolean; // default true
        optimistic?: () => void;
        rollback?: () => void;
      }
    ) => {
      const busyKey = opts?.busyKey;
      if (busyKey) setBusyKey(busyKey, true);

      setError(null);

      const silentRefresh = opts?.silentRefresh ?? true;

      try {
        opts?.optimistic?.();

        const r = await paymentsUpdate(op);
        if (!r.ok) throw new Error(r.error);

        if (silentRefresh) {
          await refresh(true); // بدون وميض
        } else {
          await refresh(false);
        }

        return true;
      } catch (e: any) {
        opts?.rollback?.();
        setError(String(e?.message || e));
        return false;
      } finally {
        if (busyKey) setBusyKey(busyKey, false);
      }
    },
    [refresh]
  );

  const toggleProvider = useCallback(
    async (provider_code: ProviderCode, enabled: boolean) => {
      const key = `toggle:${provider_code}`;

      // snapshot للرجوع
      const before = data;

      const nextStatus: ProviderStatus = enabled ? "needs_setup" : "inactive";

      return run(
        { op: "toggle_provider", provider_code, enabled },
        {
          busyKey: key,
          silentRefresh: true,
          optimistic: () => {
            patchLocal((prev) => {
              const nextMethods: StorePaymentMethod[] =
                prev.payment_methods.map((m) => {
                  if (m.provider_code !== provider_code) return m;
                  // ✅ لا نغير شكل العنصر، فقط نعدل حقولين
                  return { ...m, enabled, status: nextStatus };
                });

              return { ...prev, payment_methods: nextMethods };
            });
          },
          rollback: () => {
            if (before) setData(before);
          },
        }
      );
    },
    [data, patchLocal, run]
  );

  return {
    loading,
    error,
    data,
    busy,
    providersView,
    refresh: () => refresh(false),
    run,
    toggleProvider,
  };
}
