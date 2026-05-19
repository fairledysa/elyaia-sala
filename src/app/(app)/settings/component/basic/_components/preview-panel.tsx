// FILE: apps/merchant/src/app/(app)/settings/component/basic/_components/preview-panel.tsx
"use client";

import Card, { CardBody } from "@/components/ui/Card";
import Icon from "@/components/icon/Icon";

import PreviewStoreInfo from "./preview-store-info";
import PreviewCustomerSupport from "./preview-customer-support";
import PreviewSocial from "./preview-social";
import PreviewApp from "./preview-app";

type Key = "store" | "support" | "social" | "app";

export default function PreviewPanel({ activeKey }: { activeKey: Key }) {
  const meta: Record<Key, { title: string; desc: string; icon: string }> = {
    store: {
      title: "بيانات المتجر",
      desc: "تظهر بيانات المتجر في رأس وتذييل صفحة المتجر وفي تبويب المتصفِّح",
      icon: "StoreManagement01",
    },
    support: {
      title: "قنوات خدمة العملاء",
      desc: "تظهر قنوات خدمة العملاء في تذييل صفحة المتجر",
      icon: "CustomerService",
    },
    social: {
      title: "حسابات التواصل الاجتماعي",
      desc: "تظهر حسابات التواصل الاجتماعي في تذييل صفحة المتجر",
      icon: "ShareLocation01",
    },
    app: {
      title: "تطبيق المتجر",
      desc: "تظهر روابط تطبيق المتجر في تذييل صفحة المتجر",
      icon: "SmartPhone01",
    },
  };

  const current = meta[activeKey] ?? meta.store;

  return (
    <Card className="adm-basic-preview-panel">
      <CardBody className="adm-basic-preview-panel__body">
        <div className="adm-basic-preview-panel__head">
          <div className="adm-basic-preview-panel__icon">
            <Icon icon={current.icon as any} size="text-2xl" />
          </div>

          <div className="adm-basic-preview-panel__text">
            <div className="adm-basic-preview-panel__title">
              {current.title}
            </div>

            <div className="adm-basic-preview-panel__desc">
              {current.desc}
            </div>
          </div>
        </div>

        <div className="adm-basic-preview-panel__preview">
          {activeKey === "support" ? (
            <PreviewCustomerSupport />
          ) : activeKey === "social" ? (
            <PreviewSocial />
          ) : activeKey === "app" ? (
            <PreviewApp />
          ) : (
            <PreviewStoreInfo />
          )}
        </div>
      </CardBody>
    </Card>
  );
}