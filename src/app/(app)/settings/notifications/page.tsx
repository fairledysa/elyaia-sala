// FILE: apps/merchant/src/app/(app)/settings/notifications/page.tsx
"use client";

type NotificationRow = {
  key: string;
  title: string;
  app: boolean;
  email: boolean;
};

const NOTIFICATION_ROWS: NotificationRow[] = [
  { key: "new-orders", title: "طلبات جديدة", app: true, email: false },
  { key: "cart-product", title: "إضافة منتج للسلة", app: true, email: false },
  { key: "store-rating", title: "تقييم المتجر", app: false, email: true },
  { key: "product-rating", title: "تقييم المنتجات", app: false, email: true },
  { key: "shipping-rating", title: "تقييم شركة الشحن", app: true, email: true },
  { key: "customer-question", title: "إرسال سؤال من عميل", app: true, email: true },
  { key: "staff-accounts", title: "تفعيل حسابات موظفي المتجر", app: true, email: true },
  { key: "online-payments", title: "المدفوعات الإلكترونية", app: true, email: true },
  { key: "low-stock", title: "تنبيه قرب إنتهاء كمية منتج", app: true, email: true },
  { key: "out-stock", title: "تنبيه عند نفاذ كمية المنتجات", app: true, email: true },
  { key: "cod-payments", title: "مدفوعات الدفع عند الاستلام", app: true, email: true },
];

export default function NotificationsSettingsPage() {
  return (
    <div className="adm-page__inner adm-notifications" dir="rtl">
      <section className="adm-hero">
        <div className="adm-hero__main">
          <div className="adm-hero__icon adm-notifications-heroIcon">🔔</div>

          <div className="adm-hero__text">
            <h1 className="adm-hero__title">الإشعارات</h1>
            <p className="adm-hero__desc">
              تحكم بطريقة وصول إشعارات المتجر. هذه الصفحة شكلية حاليًا وسيتم
              ربطها لاحقًا.
            </p>
          </div>
        </div>
      </section>

      <section className="adm-card adm-card--lg adm-notifications-card">
        <div className="adm-card__head adm-card__head--border">
          <div className="adm-card__titleWrap">
            <h2 className="adm-card__title">الإشعارات</h2>
            <p className="adm-card__desc">
              تفعيل أو تعطيل إشعارات التطبيق والبريد الإلكتروني لكل نوع.
            </p>
          </div>
        </div>

        <div className="adm-card__body adm-notifications-cardBody">
          <div className="adm-notifications-table">
            <div className="adm-notifications-table__head">
              <div>نوع الإشعار</div>
              <div>إشعارات التطبيق</div>
              <div>البريد الإلكتروني</div>
            </div>

            <div className="adm-notifications-table__body">
              {NOTIFICATION_ROWS.map((row) => (
                <div key={row.key} className="adm-notifications-row">
                  <div className="adm-notifications-row__title">
                    {row.title}
                  </div>

                  <div className="adm-notifications-row__cell">
                    <SwitchVisual active={row.app} />
                  </div>

                  <div className="adm-notifications-row__cell">
                    <SwitchVisual active={row.email} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="adm-notifications-note">
            الربط البرمجي والحفظ لاحقًا. حاليًا هذه الصفحة للواجهة فقط.
          </div>
        </div>
      </section>
    </div>
  );
}

function SwitchVisual({ active }: { active: boolean }) {
  return (
    <button
      type="button"
      className={["adm-notifications-switch", active ? "is-active" : ""].join(
        " ",
      )}
      aria-pressed={active}
      aria-label={active ? "مفعل" : "غير مفعل"}
    >
      <span />
    </button>
  );
}