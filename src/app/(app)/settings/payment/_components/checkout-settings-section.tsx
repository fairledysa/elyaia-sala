// FILE: apps/merchant/src/app/(app)/settings/payment/_components/checkout-settings-section.tsx
"use client";

import { useState } from "react";

import Checkbox from "@/components/form/Checkbox";
import Icon from "@/components/icon/Icon";

import type { StoreCheckoutSettings } from "@/lib/payments/types";

type SettingKey = "prefill_from_last_order" | "company_purchase_enabled";

function SettingCard({
  title,
  desc,
  impact,
  enabled,
  disabled,
  icon,
  recommended,
  onToggle,
}: {
  title: string;
  desc: string;
  impact: string;
  enabled: boolean;
  disabled?: boolean;
  icon: string;
  recommended?: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <article
      className={[
        "adm-payment-checkout-option",
        enabled ? "adm-payment-checkout-option--active" : "",
      ].join(" ")}
    >
      <div className="adm-payment-checkout-option__main">
        <div className="adm-payment-checkout-option__icon">
          <Icon icon={icon as any} size="text-xl" />
        </div>

        <div className="adm-payment-checkout-option__text">
          <div className="adm-payment-checkout-option__top">
            <h3>{title}</h3>

            <span
              className={[
                "adm-payment-checkout-option__badge",
                enabled ? "adm-payment-checkout-option__badge--active" : "",
              ].join(" ")}
            >
              {enabled ? "مفعّل" : "متوقف"}
            </span>

            {recommended ? (
              <span className="adm-payment-checkout-option__badge adm-payment-checkout-option__badge--gold">
                مقترح
              </span>
            ) : null}
          </div>

          <p>{desc}</p>
        </div>
      </div>

      <div className="adm-payment-checkout-option__switch">
        <Checkbox
          variant="switch"
          checked={enabled}
          disabled={disabled}
          onChange={(event: any) => onToggle(!!event?.target?.checked)}
        />
      </div>

      <div className="adm-payment-checkout-option__impact">
        <strong>الأثر على العميل:</strong> {impact}
      </div>
    </article>
  );
}

export default function CheckoutSettingsSection(props: {
  saving: boolean;
  checkout: StoreCheckoutSettings;
  onChange: (patch: Partial<StoreCheckoutSettings>) => Promise<any>;
}) {
  const { saving, checkout, onChange } = props;

  const [busyKey, setBusyKey] = useState<SettingKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const locked = saving || !!busyKey;

  async function updateSetting(
    key: SettingKey,
    patch: Partial<StoreCheckoutSettings>,
  ) {
    setError(null);
    setBusyKey(key);

    try {
      await onChange(patch);
    } catch {
      setError("تعذر حفظ إعدادات صفحة الدفع. حاول مرة أخرى.");
    } finally {
      setBusyKey(null);
    }
  }

  const prefillEnabled = !!checkout.prefill_from_last_order;
  const companyEnabled = !!checkout.company_purchase_enabled;

  return (
    <section className="adm-card adm-card--lg adm-payment-checkout">
      <div className="adm-card__head adm-card__head--border">
        <div className="adm-card__titleWrap">
          <div className="adm-payment-section-titleRow">
            <span className="adm-payment-section-icon">
              <Icon icon="Settings02" size="text-xl" />
            </span>

            <div className="adm-payment-section-text">
              <h2 className="adm-card__title">إعدادات صفحة الدفع</h2>
              <p className="adm-card__desc">
                إعدادات صغيرة لكنها تؤثر مباشرة على سرعة إتمام الطلب.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="adm-card__body">
        {error ? <div className="adm-payment-error">{error}</div> : null}

        <div className="adm-payment-checkout__hint">
          فعّل ما يقلل تعبئة العميل للبيانات، واترك حقول الشركة فقط إذا متجرك
          يستقبل طلبات شركات أو جهات.
        </div>

        <div className="adm-payment-checkout__grid">
          <SettingCard
            title="اعتماد بيانات العميل"
            desc="تعبئة بيانات العميل تلقائيًا بناءً على آخر عملية شراء."
            impact="يسرّع إتمام الطلب للعميل المتكرر ويقلل الأخطاء في الاسم والجوال والعنوان."
            icon="UserCheck01"
            recommended
            enabled={prefillEnabled}
            disabled={locked}
            onToggle={(next) =>
              void updateSetting("prefill_from_last_order", {
                prefill_from_last_order: next,
              })
            }
          />

          <SettingCard
            title="الشراء كـ شركة"
            desc="إظهار حقول الشركة مثل السجل التجاري والرقم الضريبي في صفحة الدفع."
            impact="مناسب للمتاجر التي تستقبل طلبات شركات. إذا جمهورك أفراد فقط، الأفضل تركه متوقفًا لتقليل الحقول."
            icon="Building05"
            enabled={companyEnabled}
            disabled={locked}
            onToggle={(next) =>
              void updateSetting("company_purchase_enabled", {
                company_purchase_enabled: next,
              })
            }
          />
        </div>
      </div>
    </section>
  );
}