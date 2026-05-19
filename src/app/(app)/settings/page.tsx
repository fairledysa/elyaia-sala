// FILE: apps/merchant/src/app/(app)/settings/page.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Icon from "@/components/icon/Icon";

import RatingSettingsModal, {
  DEFAULT_RATING_SETTINGS,
  type RatingSettingsValues,
} from "./_components/RatingSettingsModal";

import MaintenanceSettingsModal from "./_components/MaintenanceSettingsModal";

type SettingsAction = "rating-settings" | "maintenance-settings";

type Item = {
  key: string;
  title: string;
  desc: string;
  href?: string;
  iconName: string;
  action?: SettingsAction;
};

type Group = { key: string; title: string; items: Item[] };

const ALLOWED_ICONS = new Set<string>([
  "Settings01",
  "ShippingTruck01",
  "CreditCard",
  "Wallet01",
  "ToggleOn",
  "LanguageSquare",
  "Money01",
  "Award01",
  "ShoppingCart01",
  "Globe",
  "Shield01",
  "Compass",
  "Notification01",
  "DocumentValidation",
  "CustomField",
  "Flag01",
  "Location01",
  "Gift",
  "Award02",
  "Bell",
  "Ruler",
  "Package",
  "CloudDownload",
  "Puzzle",
  "Connect",
  "UserGroup",
  "Store02",
  "Megaphone01",
  "Seo",
  "Taxes",
  "Link02",
  "Webhook",
  "Trash02",
  "Warning",
  "CloudUpload",
  "Invoice01",
  "ShippingCenter",
  "Mail01",
  "Archive01",
  "History",
  "Recycle01",
  "Audit01",
]);

function safeIconName(name: string) {
  return ALLOWED_ICONS.has(name) ? name : "Settings01";
}

function IconWrap({ iconName }: { iconName: string }) {
  return (
    <span className="adm-settings-tile__icon">
      <Icon
        icon={safeIconName(iconName) as any}
        size="text-4xl"
        className={"adm-settings-tile__iconSvg" as any}
      />
    </span>
  );
}

function Tile({
  item,
  onRatingClick,
  onMaintenanceClick,
}: {
  item: Item;
  onRatingClick: () => void;
  onMaintenanceClick: () => void;
}) {
  const content = (
    <>
      <IconWrap iconName={item.iconName} />

      <span className="adm-settings-tile__content">
        <span className="adm-settings-tile__title">{item.title}</span>
        <span className="adm-settings-tile__desc">{item.desc}</span>

        <span className="adm-settings-tile__action">
          فتح
          <span className="adm-settings-tile__arrow">←</span>
        </span>
      </span>
    </>
  );

  if (item.action === "rating-settings") {
    return (
      <button
        type="button"
        className="adm-settings-tile adm-settings-tile--button"
        onClick={onRatingClick}
      >
        {content}
      </button>
    );
  }

  if (item.action === "maintenance-settings") {
    return (
      <button
        type="button"
        className="adm-settings-tile adm-settings-tile--button"
        onClick={onMaintenanceClick}
      >
        {content}
      </button>
    );
  }

  return (
    <Link href={item.href || "#"} className="adm-settings-tile">
      {content}
    </Link>
  );
}

export default function SettingsPage() {
  const [q, setQ] = useState("");
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [ratingSettings, setRatingSettings] = useState<RatingSettingsValues>(
    DEFAULT_RATING_SETTINGS,
  );

  const groups: Group[] = useMemo(
    () => [
      {
        key: "store",
        title: "إعدادات المتجر",
        items: [
          {
            key: "basic",
            title: "الإعدادات الأساسية",
            desc: "الرابط، الشعار، الاسم، المقر",
            href: "/settings/component/basic",
            iconName: "Settings01",
          },
          {
            key: "shipping",
            title: "خيارات الشحن والتوصيل",
            desc: "شركة منصة / موصل خاص / استلام من الفرع",
            href: "/settings/shipping",
            iconName: "ShippingTruck01",
          },
          {
            key: "payment",
            title: "طرق الدفع",
            desc: "تفعيل المدفوعات الإلكترونية",
            href: "/settings/payment",
            iconName: "CreditCard",
          },
          {
            key: "wallet",
            title: "المحفظة والفواتير",
            desc: "رصيد المحفظة, الفواتير, اشتراكاتي",
            href: "/settings/wallet",
            iconName: "Wallet01",
          },
          {
            key: "options",
            title: "خيارات المتجر",
            desc: "خيارات التحكم بالمتجر",
            href: "/settings/options",
            iconName: "ToggleOn",
          },
          {
            key: "languages",
            title: "اللغات",
            desc: "تفعيل تعدد اللغات في المتجر",
            href: "/settings/language",
            iconName: "LanguageSquare",
          },
          {
            key: "currency",
            title: "العملات",
            desc: "العملات المتاحة في المتجر",
            href: "/settings/currencies",
            iconName: "Money01",
          },
          {
            key: "rating",
            title: "إعدادات التقييم",
            desc: "تحديد إعدادات التقييم الخاصة بمتجرك",
            iconName: "Award01",
            action: "rating-settings",
          },
          {
            key: "order-options",
            title: "خيارات الطلب",
            desc: "إضافة حقول مُخصصة في سلة المشتريات",
            href: "/settings/order-options",
            iconName: "ShoppingCart01",
          },
          {
            key: "domain",
            title: "إعدادات الدومين",
            desc: "التحكم في إعدادات دومين المتجر",
            href: "/settings/domains",
            iconName: "Globe",
          },
          {
            key: "maintenance",
            title: "وضع الصيانة",
            desc: "إغلاق المتجر بشكل مؤقت",
            iconName: "Shield01",
            action: "maintenance-settings",
          },
          {
            key: "shipping-rules",
            title: "قيود شركات الشحن",
            desc: "إضافة قيود محددة لشركات الشحن",
            href: "/settings/shipping-rules",
            iconName: "Compass",
          },
          {
            key: "notifications",
            title: "الإشعارات",
            desc: "إعداد الإشعارات الخاصة بك",
            href: "/settings/notifications",
            iconName: "Notification01",
          },
          {
            key: "invoices",
            title: "اعدادت فواتير المتجر",
            desc: "التحكم بالفواتير الصادرة مع الطلبات",
            href: "/settings/invoices",
            iconName: "DocumentValidation",
          },
          {
            key: "custom-fields",
            title: "الحقول المخصصة",
            desc: "إضافة حقول مخصصة للمنتجات والطلبات",
            href: "/settings/custom-fields",
            iconName: "CustomField",
          },
       
        ],
      },
      {
        key: "products",
        title: "إعدادات المنتجات",
        items: [
          {
            key: "gift-system",
            title: "نظام الإهداء",
            desc: "إتاحة آلية الإهداء إلى عملائك",
            href: "/settings/products/gifts",
            iconName: "Gift",
          },
          {
            key: "brands",
            title: "الماركات التجارية",
            desc: "عرض الماركات التجارية والتحكم بها",
            href: "/settings/brands",
            iconName: "Award02",
          },
          {
            key: "notify-availability",
            title: "اعلمني عند التوفر",
            desc: "إرسال تنبيه إلى العميل في حال توفر المنتج",
            href: "/settings/products/back-in-stock",
            iconName: "Bell",
          },
          {
            key: "size-guides",
            title: "جدول المقاسات",
            desc: "تحديد جدول المقاسات للمنتجات والتصنيفات",
            href: "/settings/size-guides",
            iconName: "Ruler",
          },
          {
            key: "inventory",
            title: "إعدادات المخزون",
            desc: "تحديد الإعدادات الخاصة بالمنتجات وكمياتها وطريقة عرضها",
            href: "/settings/products/inventory",
            iconName: "Package",
          },
          {
            key: "export-templates",
            title: "قوالب التصدير",
            desc: "إضافة قوالب تصدير مخصصة",
            href: "/settings/products/export",
            iconName: "CloudDownload",
          },
        ],
      },
      {
        key: "advanced",
        title: "الإعدادات المتقدمة",
        items: [
          {
            key: "apps",
            title: "التطبيقات",
            desc: "تطبيقات متجر مدرار",
            href: "/settings/apps",
            iconName: "Puzzle",
          },
          {
            key: "integrations",
            title: "ربط الخدمات",
            desc: "الإحصائيات، الإعلانات، الشات",
            href: "/settings/integrations",
            iconName: "Connect",
          },
          {
            key: "staff",
            title: "موظفي المتجر",
            desc: "التحكم في صلاحيات موظفي المتجر",
            href: "/settings/staff",
            iconName: "UserGroup",
          },
          {
            key: "branches",
            title: "الفروع والمستودعات",
            desc: "استلام الطلبات من الفروع والمستودعات",
            href: "/settings/branches",
            iconName: "Store02",
          },
          {
            key: "ads",
            title: "الإعلانات",
            desc: "عرض إعلانات للعملاء في المتجر",
            href: "/settings/ads",
            iconName: "Megaphone01",
          },
          {
            key: "seo",
            title: "SEO",
            desc: "تحسين الظهور على محركات البحث",
            href: "/settings/seo",
            iconName: "Seo",
          },
          {
            key: "vat",
            title: "ضريبة القيمة المضافة",
            desc: "إعداد الضريبة",
            href: "/settings/taxes",
            iconName: "Taxes",
          },
          {
            key: "links",
            title: "روابط مخصصة",
            desc: "روابط مخصصة ضمن نطاق متجرك",
            href: "/settings/links",
            iconName: "Link02",
          },
          {
            key: "webhooks",
            title: "Webhooks",
            desc: "إرسال الإخطارات و التنبيهات لخدمات أخرى",
            href: "/settings/webhooks",
            iconName: "Webhook",
          },
          {
            key: "cache",
            title: "ذاكرة التخزين المؤقت (الكاش)",
            desc: "مسح ذاكرة التخزين المؤقت (الكاش)",
            href: "/settings/cache",
            iconName: "Trash02",
          },
          {
            key: "account",
            title: "التحكم بالحساب",
            desc: "إيقاف الاشتراك، حذف المتجر",
            href: "/settings/account",
            iconName: "Warning",
          },
          {
            key: "import",
            title: "استيراد البيانات",
            desc: "استيراد البيانات من مختلف المنصات",
            href: "/settings/import",
            iconName: "CloudUpload",
          },
        ],
      },
      {
        key: "archive",
        title: "الأرشيف",
        items: [
          {
            key: "payments",
            title: "عمليات الدفع الإلكتروني",
            desc: "البحث في عمليات الدفع الإلكتروني",
            href: "/settings/archive/payments",
            iconName: "Invoice01",
          },
          {
            key: "shipments",
            title: "أرشيف بوليصات سلة",
            desc: "جميع بيانات بوليصات سلة",
            href: "/settings/archive/shipments",
            iconName: "ShippingCenter",
          },
          {
            key: "sms",
            title: "أرشيف الرسائل النصية",
            desc: "الرسائل الصادرة من المتجر",
            href: "/settings/archive/messages",
            iconName: "Mail01",
          },
          {
            key: "export-log",
            title: "سجل التصدير",
            desc: "سجل الملفات التي تم تصديرها",
            href: "/settings/archive/export-log",
            iconName: "Archive01",
          },
          {
            key: "changes",
            title: "سجل تحديثات العمليات",
            desc: "جميع تحديثات العمليات",
            href: "/settings/archive/changes",
            iconName: "History",
          },
          {
            key: "restore",
            title: "استعادة البيانات",
            desc: "استعادة الطلبات والمنتجات المحذوفة",
            href: "/settings/archive/recover",
            iconName: "Recycle01",
          },
          {
            key: "ops",
            title: "سجل العمليات",
            desc: "سجل العمليات",
            href: "/settings/archive/ops",
            iconName: "Audit01",
          },
        ],
      },
    ],
    [],
  );

  const filteredGroups = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return groups;

    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          `${item.title} ${item.desc}`.toLowerCase().includes(qq),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, q]);

  return (
    <>
      <div className="adm-page__inner adm-settings" dir="rtl">
        <section className="adm-hero">
          <div className="adm-hero__main">
            <div className="adm-hero__icon">
              <Icon
                icon="Settings01"
                size="text-4xl"
                className={"adm-settings-heroIcon" as any}
              />
            </div>

            <div className="adm-hero__text">
              <h1 className="adm-hero__title">إعدادات المتجر</h1>
              <p className="adm-hero__desc">
                جميع إعدادات المتجر والمنتجات والتطبيقات والأرشيف في مكان واحد.
              </p>
            </div>
          </div>

          <div className="adm-hero__actions">
            <div className="adm-settings-search">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث داخل الإعدادات"
                className="adm-settings-search__input"
              />
            </div>
          </div>
        </section>

        {filteredGroups.length === 0 ? (
          <section className="adm-card adm-card--lg">
            <div className="adm-card__body">
              <div className="adm-empty">لا توجد إعدادات مطابقة للبحث.</div>
            </div>
          </section>
        ) : (
          <div className="adm-settings-groups">
            {filteredGroups.map((group) => (
              <section
                key={group.key}
                className="adm-card adm-card--lg adm-settings-group"
              >
                <div className="adm-card__head adm-card__head--border">
                  <div className="adm-card__titleWrap">
                    <h2 className="adm-card__title">{group.title}</h2>
                    <p className="adm-card__desc">
                      {group.items.length} إعدادات متاحة في هذا القسم
                    </p>
                  </div>
                </div>

                <div className="adm-card__body">
                  <div className="adm-settings-grid">
                    {group.items.map((item) => (
                      <Tile
                        key={item.key}
                        item={item}
                        onRatingClick={() => setRatingModalOpen(true)}
                        onMaintenanceClick={() => setMaintenanceModalOpen(true)}
                      />
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <RatingSettingsModal
        open={ratingModalOpen}
        settings={ratingSettings}
        onClose={() => setRatingModalOpen(false)}
        onSave={(next) => {
          setRatingSettings(next);
          setRatingModalOpen(false);
        }}
      />

      <MaintenanceSettingsModal
        open={maintenanceModalOpen}
        onClose={() => setMaintenanceModalOpen(false)}
      />
    </>
  );
}