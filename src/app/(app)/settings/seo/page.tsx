// FILE: apps/merchant/src/app/(app)/settings/seo/page.tsx
"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import {
  Search,
  Zap,
  FileText,
  Route,
  ChevronLeft,
  Settings,
} from "lucide-react";

type SeoItem = {
  title: string;
  desc: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

const items: SeoItem[] = [
  {
    title: "تحسينات الصفحة الرئيسية",
    desc: "تحكّم بتفاصيل ظهور الصفحة الرئيسية لمتجرك الإلكتروني في نتائج البحث.",
    href: "/settings/seo/meta_data",
    icon: Search,
  },
  {
    title: "تحسين محركات البحث السريع",
    desc: "أضف تحسينات تطبق تلقائيًا على صفحات المنتجات والتصنيفات والماركات التجارية.",
    href: "/addons/bulk-seo",
    icon: Zap,
  },
  {
    title: "ملف Robots.txt",
    desc: "حرّر Robots.txt لتقييد وصول محركات البحث لصفحات معينة في متجرك.",
    href: "/settings/seo/robots_file",
    icon: FileText,
  },
  {
    title: "خارطة أرشفة الموقع Sitemap",
    desc: "حسّن فهرسة صفحات متجرك بمشاركة Sitemap مع محركات البحث.",
    href: "/settings/seo/site_map",
    icon: Route,
  },
];

function SeoCard({ item }: { item: SeoItem }) {
  const Icon = item.icon;

  return (
    <Link href={item.href} className="adm-seo-card">
      <div className="adm-seo-card__icon">
        <Icon className="adm-seo-card__iconSvg" />
      </div>

      <div className="adm-seo-card__content">
        <div className="adm-seo-card__head">
          <h3 className="adm-seo-card__title">{item.title}</h3>

          <span className="adm-seo-card__arrow">
            <ChevronLeft className="adm-seo-card__arrowIcon" />
          </span>
        </div>

        <p className="adm-seo-card__desc">{item.desc}</p>

        <div className="adm-seo-card__meta">
          <span className="adm-seo-card__tag">فتح الإعداد</span>
          <span className="adm-seo-card__dot">•</span>
          <span className="adm-seo-card__href" dir="ltr">
            {item.href}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function SeoSettingsPage() {
  return (
    <div className="adm-page__inner adm-seo" dir="rtl">
      <section className="adm-hero">
        <div className="adm-hero__main">
          <div className="adm-hero__icon">
            <Settings className="adm-seo-heroIcon" />
          </div>

          <div className="adm-hero__text">
            <h1 className="adm-hero__title">تحسين محركات البحث</h1>
            <p className="adm-hero__desc">
              إعدادات تساعد متجرك يظهر بشكل أفضل في نتائج البحث، من الصفحة
              الرئيسية إلى ملفات الأرشفة والفهرسة.
            </p>
          </div>
        </div>

        <div className="adm-hero__actions">
          <Link href="/settings" className="adm-btn adm-btn--secondary adm-seo-back">
            <ChevronLeft className="adm-seo-back__icon" />
            <span>الإعدادات</span>
          </Link>
        </div>
      </section>

      <section className="adm-card adm-card--lg adm-seo-panel">
        <div className="adm-card__head adm-card__head--border">
          <div className="adm-card__titleWrap">
            <h2 className="adm-card__title">إعدادات عامة</h2>
            <p className="adm-card__desc">
              اختر القسم الذي تريد تعديله من إعدادات SEO.
            </p>
          </div>
        </div>

        <div className="adm-card__body">
          <div className="adm-seo-grid">
            {items.map((item) => (
              <SeoCard key={item.href} item={item} />
            ))}
          </div>

          <div className="adm-seo-tip">
            <div className="adm-seo-tip__icon">
              <Search className="adm-seo-tip__iconSvg" />
            </div>

            <div className="adm-seo-tip__content">
              <div className="adm-seo-tip__title">ملاحظة سريعة</div>
              <p className="adm-seo-tip__text">
                أفضل نتائج SEO تبدأ بعنوان واضح، ووصف فريد، وروابط منظمة
                للمنتجات والأقسام.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}