// FILE: apps/merchant/src/app/(app)/settings/payment/_components/store-verification-banner.tsx
"use client";

export default function StoreVerificationBanner(props: {
  status: "incomplete" | "pending" | "verified";
  onGoVerify: () => void;
}) {
  if (props.status === "verified") return null;

  const isPending = props.status === "pending";

  return (
    <section
      className={[
        "adm-payment-verify",
        isPending
          ? "adm-payment-verify--pending"
          : "adm-payment-verify--incomplete",
      ].join(" ")}
      dir="rtl"
    >
      <div className="adm-payment-verify__main">
        <div className="adm-payment-verify__icon" aria-hidden="true">
          {isPending ? "⏳" : "🛡️"}
        </div>

        <div className="adm-payment-verify__content">
          <div className="adm-payment-verify__top">
            <h2 className="adm-payment-verify__title">
              {isPending
                ? "توثيق المتجر قيد المراجعة"
                : "توثيق المتجر غير مكتمل"}
            </h2>

            <span
              className={[
                "adm-payment-verify__status",
                isPending
                  ? "adm-payment-verify__status--pending"
                  : "adm-payment-verify__status--incomplete",
              ].join(" ")}
            >
              {isPending ? "قيد المراجعة" : "مطلوب للإكمال"}
            </span>
          </div>

          <p className="adm-payment-verify__desc">
            {isPending
              ? "طلب التوثيق تحت المراجعة. قد تكون بعض ميزات الدفع محدودة مؤقتًا حتى يتم اعتماد الطلب."
              : "أكمل بيانات التوثيق حتى تتمكن من تفعيل المدفوعات الإلكترونية واستقبال المدفوعات بثقة."}
          </p>

          <div className="adm-payment-verify__requirements">
            <span>رقم الهوية</span>
            <span>تاريخ الميلاد</span>
            <span>صورة الهوية</span>
            <span className="adm-payment-verify__optional">
              السجل التجاري اختياري
            </span>
          </div>
        </div>
      </div>

      <div className="adm-payment-verify__side">
        <div className="adm-payment-verify__note">
          {isPending
            ? "لا تحتاج لإرسال الطلب مرة أخرى، فقط تابع حالة المراجعة."
            : "بدون التوثيق قد لا تظهر طرق الدفع الإلكترونية للعملاء."}
        </div>

        <button
          type="button"
          onClick={props.onGoVerify}
          className="adm-btn adm-btn--primary adm-payment-verify__btn"
        >
          {isPending ? "عرض طلب التوثيق" : "إكمال التوثيق"}
        </button>
      </div>
    </section>
  );
}