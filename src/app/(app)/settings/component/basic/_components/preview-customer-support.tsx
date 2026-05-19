// FILE: apps/merchant/src/app/(app)/settings/component/basic/_components/preview-customer-support.tsx

import Icon from "@/components/icon/Icon";

export default function PreviewCustomerSupport() {
  return (
    <div className="adm-basic-preview-support">
      <div className="adm-basic-preview-support__bar" />

      <div className="adm-basic-preview-support__panel">
        <div className="adm-basic-preview-support__icons">
          <span className="adm-basic-preview-support__icon">
            <Icon icon="Call" size="text-xl" />
          </span>

          <span className="adm-basic-preview-support__icon">
            <Icon icon="Whatsapp" size="text-xl" />
          </span>

          <span className="adm-basic-preview-support__icon">
            <Icon icon="Mail01" size="text-xl" />
          </span>

          <span className="adm-basic-preview-support__icon">
            <Icon icon="Telegram" size="text-xl" />
          </span>
        </div>

        <div className="adm-basic-preview-support__line" />
      </div>
    </div>
  );
}