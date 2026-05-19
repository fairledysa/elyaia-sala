// FILE: apps/merchant/src/app/(app)/settings/component/basic/_components/section-shell.tsx

import type { ReactNode } from "react";
import { CardBody } from "@/components/ui/Card";
import Icon from "@/components/icon/Icon";

export default function SectionShell({
  id,
  sectionKey,
  title,
  description,
  icon,
  children,
}: {
  id: string;
  sectionKey: "store" | "support" | "social" | "app";
  title: string;
  description: string;
  icon: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      data-settings-section
      data-section-key={sectionKey}
      className="adm-basic-section"
    >
      <CardBody className="adm-basic-section__body">
        <div className="adm-basic-section__head">
          <div className="adm-basic-section__titleRow">
            <div className="adm-basic-section__icon">
              <Icon icon={icon as any} size="text-2xl" />
            </div>

            <div className="adm-basic-section__text">
              <h3 className="adm-basic-section__title">{title}</h3>
              <p className="adm-basic-section__desc">{description}</p>
            </div>
          </div>
        </div>

        <div className="adm-basic-section__content">{children}</div>
      </CardBody>
    </section>
  );
}