// FILE: apps/merchant/src/app/(app)/_shell/AdminSidebar.tsx
"use client";

import Link from "next/link";
import Icon from "@/components/icon/Icon";
import pages from "@/Routes/pages";
import type { TIcons } from "@/types/icons.type";

type SidebarItem = {
  title: string;
  href: string;
  icon: TIcons;
  badge?: string;
};

type SidebarGroup = {
  title: string;
  items: SidebarItem[];
};

type Props = {
  pathname: string;
  mobileOpen: boolean;
  ordersBadgeCount?: number;
  onClose: () => void;
};

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function formatBadge(count: number | undefined) {
  const n = Number(count ?? 0);
  if (!Number.isFinite(n) || n <= 0) return "";
  return n > 99 ? "99+" : String(Math.floor(n));
}

export default function AdminSidebar({
  pathname,
  mobileOpen,
  ordersBadgeCount = 0,
  onClose,
}: Props) {
  const ordersBadge = formatBadge(ordersBadgeCount);

  const navGroups: SidebarGroup[] = [
    {
      title: "الرئيسية",
      items: [
        {
          title: "لوحة التحكم",
          href: "/",
          icon: "Home09" as TIcons,
        },
      ],
    },
    {
      title: "إدارة المتجر",
      items: [
        {
          title: "الطلبات",
          href: (pages as any).apps.sales.to,
          icon: (pages as any).apps.sales.icon,
          badge: ordersBadge || undefined,
        },
        {
          title: "المنتجات",
          href: (pages as any).apps.products.to,
          icon: (pages as any).apps.products.icon,
        },
        {
          title: "العملاء",
          href: (pages as any).apps.customer.to,
          icon: (pages as any).apps.customer.icon,
        },
        {
          title: "الصفحات التعريفية",
          href: (pages as any).apps.projects.to,
          icon: (pages as any).apps.projects.icon,
        },
      ],
    },
    {
      title: "القنوات والتصميم",
      items: [
        {
          title: "تصميم المتجر",
          href: (pages as any).apps.invoices.to,
          icon: (pages as any).apps.invoices.icon,
        },
        {
          title: "التقييمات والأسئلة",
          href: (pages as any).apps.mail.to,
          icon: (pages as any).apps.mail.icon,
        },
        {
          title: "التسويق",
          href: (pages as any).documentation.exampleMain.to,
          icon: (pages as any).documentation.exampleMain.icon,
        },
      ],
    },
    {
      title: "النظام",
      items: [
        {
          title: "الإعدادات",
          href: (pages as any).examples.exampleMain.to,
          icon: "Settings02" as TIcons,
        },
      ],
    },
  ];

  return (
    <aside
      className={["adm-sidebar", mobileOpen ? "adm-sidebar--open" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="adm-sidebar__brand">
        <Link href="/" className="adm-sidebar__brandLink" onClick={onClose}>
          <span className="adm-sidebar__logoMark">
            <Icon icon="Store04" size="text-xl" />
          </span>

          <span className="adm-sidebar__brandText">
            <strong>منصة الإدارة</strong>
            <small>Merchant Console</small>
          </span>
        </Link>
      </div>

      <div className="adm-sidebar__nav">
        {navGroups.map((group) => (
          <section className="adm-sidebar__group" key={group.title}>
            <div className="adm-sidebar__groupTitle">{group.title}</div>

            <div className="adm-sidebar__menu">
              {group.items.map((item) => {
                const active = isActiveRoute(pathname, item.href);

                return (
                  <Link
                    key={`${item.href}-${item.title}`}
                    href={item.href}
                    onClick={onClose}
                    className={[
                      "adm-sidebar__item",
                      active ? "is-active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span className="adm-sidebar__itemIcon">
                      <Icon icon={item.icon} size="text-xl" />
                    </span>

                    <span className="adm-sidebar__itemText">{item.title}</span>

                    {item.badge ? (
                      <span className="adm-sidebar__badge">{item.badge}</span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="adm-sidebar__footer">
        <div className="adm-sidebar__progressCard">
          <div className="adm-sidebar__progressTop">
            <span>اكتمال الإعداد</span>
            <strong>75%</strong>
          </div>

          <div className="adm-sidebar__progressTrack">
            <span style={{ width: "75%" }} />
          </div>

          <p>أكمل إعداد المتجر لتجربة أفضل.</p>
        </div>
      </div>
    </aside>
  );
}