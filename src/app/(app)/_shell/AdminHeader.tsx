// FILE: apps/merchant/src/app/(app)/_shell/AdminHeader.tsx

"use client";

import Link from "next/link";
import Icon from "@/components/icon/Icon";

type BreadcrumbItem = {
  label: string;
  href: string;
};

type Props = {
  breadcrumbs: BreadcrumbItem[];
  notificationsCount?: number;
  onMenuClick: () => void;
};

function formatBadge(count: number | undefined) {
  const n = Number(count ?? 0);
  if (!Number.isFinite(n) || n <= 0) return "";
  return n > 99 ? "99+" : String(Math.floor(n));
}

export default function AdminHeader({
  breadcrumbs,
  notificationsCount = 0,
  onMenuClick,
}: Props) {
  const last = breadcrumbs[breadcrumbs.length - 1];
  const badge = formatBadge(notificationsCount);

  return (
    <header className="adm-header">
      <div className="adm-header__right">
        <button
          type="button"
          className="adm-header__menuBtn"
          aria-label="فتح القائمة"
          onClick={onMenuClick}
        >
          <Icon icon="Menu01" size="text-xl" />
        </button>

        <nav className="adm-breadcrumb" aria-label="Breadcrumb">
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;

            return (
              <span
                className="adm-breadcrumb__item"
                key={`${item.href}-${index}`}
              >
                {index > 0 ? (
                  <span className="adm-breadcrumb__sep">/</span>
                ) : null}

                {isLast ? (
                  <span className="adm-breadcrumb__current">
                    {item.label}
                  </span>
                ) : (
                  <Link href={item.href}>{item.label}</Link>
                )}
              </span>
            );
          })}
        </nav>
      </div>

      <div className="adm-header__center">
        <div className="adm-header__search">
          <Icon icon="Search01" size="text-lg" />
          <input
            type="search"
            placeholder="ابحث عن طلب، منتج، عميل..."
            aria-label="بحث"
          />
        </div>
      </div>

      <div className="adm-header__left">
        <Link
          href="/orders"
          className="adm-header__iconBtn"
          aria-label="إشعارات الطلبات"
          title={badge ? `${badge} طلب جديد` : "لا توجد طلبات جديدة"}
        >
          <Icon icon="Notification03" size="text-xl" />
          {badge ? <span className="adm-header__dot">{badge}</span> : null}
        </Link>

        <button type="button" className="adm-header__iconBtn" aria-label="الوضع">
          <Icon icon="Sun03" size="text-xl" />
        </button>

        <div className="adm-header__user">
          <div className="adm-header__avatar">م</div>
          <div className="adm-header__userText">
            <strong>متجري</strong>
            <small>{last?.label || "لوحة التحكم"}</small>
          </div>
        </div>
      </div>
    </header>
  );
}