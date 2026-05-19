// FILE: apps/merchant/src/app/(app)/settings/component/basic/_components/preview-social.tsx

import Icon from "@/components/icon/Icon";

export default function PreviewSocial() {
  return (
    <div className="adm-basic-preview-social">
      <div className="adm-basic-preview-social__bar" />

      <div className="adm-basic-preview-social__panel">
        <div className="adm-basic-preview-social__icons">
          <span className="adm-basic-preview-social__icon">
            <Icon icon="Instagram" size="text-xl" />
          </span>

          <span className="adm-basic-preview-social__icon">
            <Icon icon="Tiktok" size="text-xl" />
          </span>

          <span className="adm-basic-preview-social__icon">
            <Icon icon="Youtube" size="text-xl" />
          </span>

          <span className="adm-basic-preview-social__icon">
            <Icon icon="Twitter" size="text-xl" />
          </span>
        </div>
      </div>
    </div>
  );
}