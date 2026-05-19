// FILE: apps/merchant/src/app/(app)/layout.tsx
"use client";

import type { ReactNode } from "react";

import { AsideStatusProvider } from "@/hooks/useAsideStatus";
import AdminShell from "./_shell/AdminShell";
import "./_styles/admin.css";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AsideStatusProvider>
      <AdminShell>{children}</AdminShell>
    </AsideStatusProvider>
  );
}