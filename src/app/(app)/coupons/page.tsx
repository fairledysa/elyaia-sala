// FILE: apps/merchant/src/app/(app)/coupons/page.tsx

import CouponsClient from "./_components/CouponsClient";

export const dynamic = "force-dynamic";

export default function CouponsPage() {
  return (
    <div className="adm-page__inner adm-coupons-page" dir="rtl">
      <section className="adm-hero">
        <div className="adm-hero__main">
          <div className="adm-hero__icon">٪</div>

          <div className="adm-hero__text">
            <h1 className="adm-hero__title">الكوبونات</h1>
            <p className="adm-hero__desc">
              إنشاء وإدارة كوبونات التخفيض مثل سلة، مع الإضافة والتعديل داخل نافذة.
            </p>
          </div>
        </div>
      </section>

      <CouponsClient />
    </div>
  );
}