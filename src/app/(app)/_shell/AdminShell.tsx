// FILE: apps/merchant/src/app/(app)/_shell/AdminShell.tsx

"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import pages from "@/Routes/pages";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";

type AnyPage = {
  id?: string;
  to?: string;
  text?: string;
  icon?: string;
  subPages?: Record<string, AnyPage>;
  parent?: AnyPage;
};

type StatusSummaryCard = {
  key?: string;
  label?: string;
  count?: number;
  base_status_key?: string;
  type?: "base" | "store";
};

function flattenPages(obj: any, parent?: AnyPage): AnyPage[] {
  return Object.values(obj || {}).flatMap((page: any) => {
    const { subPages, ...rest } = page || {};
    const item: AnyPage = { ...rest, parent };
    return [item, ...flattenPages(subPages, item)];
  });
}

function buildBreadcrumbList(current: AnyPage | undefined) {
  const chain: AnyPage[] = [];
  let node = current;

  while (node) {
    chain.unshift(node);
    node = node.parent;
  }

  return chain
    .filter((item) => item.text && item.to)
    .map((item) => ({
      label: String(item.text),
      href: String(item.to),
    }));
}

function normalizeCount(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function isOrdersRoute(pathname: string | null) {
  if (!pathname) return false;
  return pathname === "/orders" || pathname.startsWith("/orders/");
}

function extractOrdersSidebarCount(cards: StatusSummaryCard[]) {
  if (!Array.isArray(cards)) return 0;

  const reviewCard = cards.find((card) => {
    const label = String(card?.label ?? "");
    const key = String(card?.base_status_key ?? card?.key ?? "").toLowerCase();

    return (
      label.includes("بانتظار المراجعة") ||
      label.includes("المراجعة") ||
      key.includes("review")
    );
  });

  if (reviewCard) return normalizeCount(reviewCard.count);

  const pendingCard = cards.find((card) => {
    const label = String(card?.label ?? "");
    const key = String(card?.base_status_key ?? card?.key ?? "").toLowerCase();

    return label.includes("انتظار") || key.includes("pending");
  });

  return normalizeCount(pendingCard?.count);
}

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const [ordersBellCount, setOrdersBellCount] = useState(0);
  const [ordersSidebarCount, setOrdersSidebarCount] = useState(0);

  const onOrdersPage = useMemo(() => isOrdersRoute(pathname), [pathname]);

  const breadcrumbList = useMemo(() => {
    const all = [
      { id: "home", to: "/", text: "لوحة التحكم", icon: "Home09" },
      ...flattenPages((pages as any).apps),
      ...flattenPages((pages as any).documentation),
      ...flattenPages((pages as any).examples),
      ...flattenPages((pages as any).pagesExamples),
    ];

    const current =
      all.find((item) => item?.to === pathname) ||
      all
        .filter((item) => {
          if (!item?.to || item.to === "/") return false;
          return pathname?.startsWith(item.to);
        })
        .sort(
          (a, b) => String(b.to || "").length - String(a.to || "").length,
        )[0];

    return buildBreadcrumbList(current || all[0]);
  }, [pathname]);

  const refreshOrdersBell = useCallback(async () => {
    if (onOrdersPage) {
      setOrdersBellCount(0);
      return;
    }

    try {
      const res = await fetch("/api/orders/notifications", {
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setOrdersBellCount(0);
        return;
      }

      setOrdersBellCount(normalizeCount(json?.count));
    } catch {
      setOrdersBellCount(0);
    }
  }, [onOrdersPage]);

  const refreshOrdersSidebarBadge = useCallback(async () => {
    try {
      const res = await fetch("/api/orders/status-summary", {
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setOrdersSidebarCount(0);
        return;
      }

      setOrdersSidebarCount(extractOrdersSidebarCount(json?.cards ?? []));
    } catch {
      setOrdersSidebarCount(0);
    }
  }, []);

  const markOrdersSeen = useCallback(async () => {
    setOrdersBellCount(0);

    try {
      await fetch("/api/orders/notifications/seen", {
        method: "POST",
        cache: "no-store",
      });
    } catch {
      // لا نكسر الواجهة لو فشل تحديث المشاهدة
    }
  }, []);

  useEffect(() => {
    void refreshOrdersSidebarBadge();

    if (onOrdersPage) {
      void markOrdersSeen();
      return;
    }

    void refreshOrdersBell();
  }, [
    onOrdersPage,
    markOrdersSeen,
    refreshOrdersBell,
    refreshOrdersSidebarBadge,
  ]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshOrdersSidebarBadge();
      void refreshOrdersBell();
    }, 30000);

    const handleFocus = () => {
      void refreshOrdersSidebarBadge();
      void refreshOrdersBell();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshOrdersSidebarBadge();
        void refreshOrdersBell();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshOrdersBell, refreshOrdersSidebarBadge]);

  return (
    <div className="adm-shell" dir="rtl">
      <AdminSidebar
        pathname={pathname || "/"}
        mobileOpen={mobileOpen}
        ordersBadgeCount={ordersSidebarCount}
        onClose={() => setMobileOpen(false)}
      />

      {mobileOpen ? (
        <button
          type="button"
          aria-label="إغلاق القائمة"
          className="adm-shell__overlay"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div className="adm-shell__inset">
        <AdminHeader
          breadcrumbs={breadcrumbList}
          notificationsCount={ordersBellCount}
          onMenuClick={() => setMobileOpen(true)}
        />

        <main className="adm-shell__content">{children}</main>
      </div>
    </div>
  );
}