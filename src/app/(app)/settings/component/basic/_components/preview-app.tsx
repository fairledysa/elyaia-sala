// FILE: apps/merchant/src/app/(app)/settings/component/basic/_components/preview-app.tsx

import Icon from "@/components/icon/Icon";

export default function PreviewApp() {
  return (
    <div className="adm-basic-preview-app">
      <div className="adm-basic-preview-app__bar" />

      <div className="adm-basic-preview-app__panel">
        <div className="adm-basic-preview-app__cards">
          <div className="adm-basic-preview-app__card">
            <div className="adm-basic-preview-app__icon">
              <Icon icon="Apple" size="text-2xl" />
            </div>

            <div className="adm-basic-preview-app__title">iOS</div>
            <div className="adm-basic-preview-app__desc">تحميل التطبيق</div>
          </div>

          <div className="adm-basic-preview-app__card">
            <div className="adm-basic-preview-app__icon">
              <Icon icon="Android" size="text-2xl" />
            </div>

            <div className="adm-basic-preview-app__title">Android</div>
            <div className="adm-basic-preview-app__desc">تنزيل التطبيق</div>
          </div>
        </div>

        <div className="adm-basic-preview-app__hint">
          <span className="adm-basic-preview-app__dot" />
          <span>تظهر روابط التطبيق في تذييل صفحة المتجر</span>
        </div>
      </div>
    </div>
  );
}