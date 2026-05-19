// FILE: apps/merchant/src/app/(app)/marketing/marketing_tools/page.tsx

import type { ComponentType } from "react";
import Link from "next/link";
import {
  Settings,
  TicketPercent,
  BadgePercent,
  Building2,
  ShoppingBag,
  WalletCards,
  UserCheck,
  Megaphone,
  HandCoins,
  Activity,
  BookOpenText,
  Search,
  HeartHandshake,
  Gift,
  CreditCard,
  CalendarDays,
  ArrowUpRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

type ToolItem = {
  title: string;
  desc: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  badge?: string;
};

type ToolSection = {
  heading: string;
  items: ToolItem[];
};

const sections: ToolSection[] = [
  {
    heading: "الخصومات",
    items: [
      {
        title: "كوبونات التخفيض",
        desc: "إنشاء كوبون أو مجموعة كوبونات",
        href: "/coupons",
        icon: TicketPercent,
        badge: "جديد",
      },
      {
        title: "العروض الخاصة",
        desc: "تفعيل وإدارة العروض ومتابعة إحصائياتها",
        href: "/specialoffer",
        icon: BadgePercent,
        badge: "جديد",
      },
      {
        title: "عرض البنك",
        desc: "إنشاء عروض وخصومات عند الدفع ببطاقة بنك محدد",
        href: "/bank-offers",
        icon: Building2,
        badge: "جديد",
      },
      {
        title: "عروض السلة",
        desc: "تطبيق عروض في السلة بشروط محددة",
        href: "/conditional-offers",
        icon: ShoppingBag,
        badge: "جديد",
      },
      {
        title: "عروض الكاش باك",
        desc: "إنشاء عروض كاش باك للعملاء",
        href: "/cashback-offers",
        icon: WalletCards,
        badge: "جديد",
      },
    ],
  },
  {
    heading: "الحملات",
    items: [
      {
        title: "السلات المتروكة",
        desc: "إرسال تذكير للعملاء لإتمام الشراء",
        href: "/marketing/abandoned_carts",
        icon: UserCheck,
        badge: "جديد",
      },
      {
        title: "إعلانات سويبلي",
        desc: "إنشاء وإدارة حملات إعلانية في عدة منصات",
        href: "/addons/sweply",
        icon: Megaphone,
        badge: "جديد",
      },
      {
        title: "الحملات التسويقية",
        desc: "التسويق عبر الرسائل النصية والإشعارات",
        href: "/campaign",
        icon: Megaphone,
        badge: "جديد",
      },
      {
        title: "التسويق بالعمولة",
        desc: "إنشاء رابط أو كوبون تسويقي",
        href: "/marketing/affiliate?legacy=0",
        icon: HandCoins,
        badge: "جديد",
      },
      {
        title: "مدير الأحداث",
        desc: "أدوات ربط البيكسل والكتالوج بمتجرك",
        href: "/marketing/pixel",
        icon: Activity,
        badge: "جديد",
      },
    ],
  },
  {
    heading: "التسويق بالمحتوى",
    items: [
      {
        title: "الإعلانات",
        desc: "عرض شريط إعلاني في صفحات المتجر",
        href: "/advertisements",
        icon: Megaphone,
        badge: "جديد",
      },
      {
        title: "المدونة",
        desc: "نشر مقالات عن منتجاتك وخدماتك",
        href: "/blog/articles",
        icon: BookOpenText,
        badge: "جديد",
      },
      {
        title: "تحسين محركات البحث",
        desc: "زيادة ظهور متجرك وزياراته",
        href: "/settings/seo",
        icon: Search,
      },
    ],
  },
  {
    heading: "الأدوات المتقدمة",
    items: [
      {
        title: "ولاء العملاء",
        desc: "اكسب العملاء عبر نقاط ولاء ومكافآت",
        href: "/loyalty-system",
        icon: HeartHandshake,
        badge: "جديد",
      },
      {
        title: "نظام الإهداء",
        desc: "قدّم لعملائك خيار إرسال مشترياتهم كهدية",
        href: "/settings/component/gift-system",
        icon: Gift,
      },
      {
        title: "الطلب المباشر",
        desc: "اختصار خطوات إتمام الطلب على العميل",
        href: "/settings/component/quick_checkout",
        icon: CreditCard,
      },
      {
        title: "الجدول الزمني للتسويق",
        desc: "معاينة العروض المجدولة",
        href: "/marketing/calender",
        icon: CalendarDays,
        badge: "جديد",
      },
    ],
  },
];

function ToolBadge({ text }: { text: string }) {
  return <span className="adm-marketing-badge">{text}</span>;
}

function ToolCard({ item }: { item: ToolItem }) {
  const Icon = item.icon;

  return (
    <Link href={item.href} className="adm-marketing-tool">
      {item.badge ? <ToolBadge text={item.badge} /> : null}

      <div className="adm-marketing-tool__icon">
        <Icon className="adm-marketing-tool__iconSvg" />
      </div>

      <div className="adm-marketing-tool__content">
        <div className="adm-marketing-tool__top">
          <h3 className="adm-marketing-tool__title">{item.title}</h3>
          <ArrowUpRight className="adm-marketing-tool__arrow" />
        </div>

        <p className="adm-marketing-tool__desc">{item.desc}</p>
      </div>
    </Link>
  );
}

export default function MarketingToolsPage() {
  return (
    <div className="adm-page__inner adm-marketing" dir="rtl">
      <section className="adm-hero">
        <div className="adm-hero__main">
          <div className="adm-hero__icon">
            <Megaphone className="adm-marketing-heroIcon" />
          </div>

          <div className="adm-hero__text">
            <h1 className="adm-hero__title">التسويق</h1>
            <p className="adm-hero__desc">
              أدوات الخصومات والحملات والتسويق بالمحتوى لإدارة نمو المتجر من مكان واحد.
            </p>
          </div>
        </div>

        <div className="adm-hero__actions">
          <Link
            href="/marketing/marketing_settings"
            className="adm-btn adm-btn--secondary adm-marketing-settings"
          >
            <Settings className="adm-marketing-settings__icon" />
            <span>إعدادات التسويق</span>
          </Link>
        </div>
      </section>

      <div className="adm-marketing-sections">
        {sections.map((section) => (
          <section key={section.heading} className="adm-card adm-card--lg adm-marketing-section">
            <div className="adm-card__head adm-card__head--border">
              <div className="adm-card__titleWrap">
                <h2 className="adm-card__title">{section.heading}</h2>
                <p className="adm-card__desc">
                  {section.items.length} أدوات متاحة في هذا القسم
                </p>
              </div>
            </div>

            <div className="adm-card__body">
              <div className="adm-marketing-grid">
                {section.items.map((item) => (
                  <ToolCard key={item.title} item={item} />
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}