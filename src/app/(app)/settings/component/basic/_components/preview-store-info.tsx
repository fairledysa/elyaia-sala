// FILE: apps/merchant/src/app/(app)/settings/component/basic/_components/preview-store-info.tsx

import Icon from "@/components/icon/Icon";

export default function PreviewStoreInfo() {
  return (
    <div className="adm-basic-preview-store">
      <div className="adm-basic-preview-store__browser">
        <div className="adm-basic-preview-store__dots">
          <span />
          <span />
          <span />
        </div>

        <div className="adm-basic-preview-store__search">
          <span className="adm-basic-preview-store__searchLine" />
          <Icon icon="Search01" size="text-lg" />
        </div>
      </div>

      <div className="adm-basic-preview-store__section">
        <div className="adm-basic-preview-store__header">
          <span className="adm-basic-preview-store__logo" />
          <span className="adm-basic-preview-store__titleLine" />
        </div>

        <div className="adm-basic-preview-store__heroBlock" />
      </div>

      <div className="adm-basic-preview-store__section">
        <div className="adm-basic-preview-store__footerLine" />

        <div className="adm-basic-preview-store__footerIcons">
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}