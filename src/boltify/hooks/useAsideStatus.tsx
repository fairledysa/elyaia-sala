"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

const KEY = "bolt_aside_open";

type AsideStatusCtx = {
  asideStatus: boolean;
  setAsideStatus: React.Dispatch<React.SetStateAction<boolean>>;
};

const AsideStatusContext = createContext<AsideStatusCtx | null>(null);

export function AsideStatusProvider({ children }: { children: React.ReactNode }) {
  // افتراضي مفتوح
  const [asideStatus, setAsideStatus] = useState<boolean>(true);

  // اقرأ المخزن بعد mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "0") setAsideStatus(false);
      else if (saved === "1") setAsideStatus(true);
      else setAsideStatus(true);
    } catch {
      setAsideStatus(true);
    }
  }, []);

  // لا تكتب إلا بعد تفاعل المستخدم
  const hasUserInteracted = useRef(false);
  useEffect(() => {
    if (!hasUserInteracted.current) return;
    try {
      localStorage.setItem(KEY, asideStatus ? "1" : "0");
    } catch {}
  }, [asideStatus]);

  const setAsideStatusSafe: React.Dispatch<React.SetStateAction<boolean>> = (next) => {
    hasUserInteracted.current = true;
    setAsideStatus(next);
  };

  const value = useMemo(
    () => ({ asideStatus, setAsideStatus: setAsideStatusSafe }),
    [asideStatus]
  );

  return <AsideStatusContext.Provider value={value}>{children}</AsideStatusContext.Provider>;
}

export default function useAsideStatus() {
  const ctx = useContext(AsideStatusContext);
  if (!ctx) throw new Error("useAsideStatus must be used within <AsideStatusProvider />");
  return ctx;
}
