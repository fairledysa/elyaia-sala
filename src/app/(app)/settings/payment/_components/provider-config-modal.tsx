// FILE: apps/merchant/src/app/(app)/settings/payment/_components/provider-config-modal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

import Modal, {
  ModalBody,
  ModalFooter,
  ModalFooterChild,
  ModalHeader,
} from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import Tooltip from "@/components/ui/Tooltip";
import Spinner from "@/components/ui/Spinner";

import Input from "@/components/form/Input";
import Label from "@/components/form/Label";
import Description from "@/components/form/Description";

import type { ProviderCode, ProviderStatus } from "@/lib/payments/types";

type ProviderView = {
  code: ProviderCode;
  title: string;
  subtitle?: string;
  group: "electronic" | "bnpl" | "loyalty";
  enabled: boolean;
  status: string;
  config: Record<string, any>;
};

type RequiredField = {
  k: string;
  label: string;
  placeholder?: string;
  type?: "text" | "password";
};

function requiredKeys(code: ProviderCode): RequiredField[] {
  if (code === "tabby") {
    return [
      {
        k: "public_key",
        label: "Public Key",
        placeholder: "أدخل Public Key",
        type: "text",
      },
      {
        k: "secret_key",
        label: "Secret Key",
        placeholder: "أدخل Secret Key",
        type: "password",
      },
    ];
  }

  if (code === "tamara") {
    return [
      {
        k: "api_key",
        label: "API Key",
        placeholder: "أدخل API Key",
        type: "password",
      },
    ];
  }

  if (code === "card") {
    return [
      {
        k: "gateway_name",
        label: "اسم البوابة",
        placeholder: "مثال: Moyasar / HyperPay",
        type: "text",
      },
      {
        k: "merchant_id",
        label: "Merchant ID",
        placeholder: "أدخل Merchant ID",
        type: "text",
      },
    ];
  }

  if (code === "apple_pay") {
    return [
      {
        k: "merchant_identifier",
        label: "Merchant Identifier",
        placeholder: "merchant.com.example",
        type: "text",
      },
    ];
  }

  if (code === "emkan") {
    return [
      {
        k: "merchant_code",
        label: "Merchant Code",
        placeholder: "أدخل Merchant Code",
        type: "text",
      },
    ];
  }

  return [];
}

function isConfigValid(code: ProviderCode, config: Record<string, any>) {
  const keys = requiredKeys(code);
  if (!keys.length) return true;

  return keys.every((field) => {
    return String(config?.[field.k] || "").trim().length >= 2;
  });
}

function missingFields(code: ProviderCode, config: Record<string, any>) {
  return requiredKeys(code).filter((field) => {
    return String(config?.[field.k] || "").trim().length < 2;
  });
}

function statusText(status: string, valid: boolean) {
  if (!valid) return "يحتاج إعداد";
  if (status === "active") return "جاهز";
  if (status === "needs_setup") return "يحتاج إعداد";
  if (status === "disabled_by_platform") return "غير متاح";
  return "غير مفعّل";
}

export default function ProviderConfigModal(props: {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  provider: ProviderView | null;
  busy?: boolean;
  onSave: (payload: {
    provider_code: ProviderCode;
    config: Record<string, any>;
    status: ProviderStatus;
  }) => Promise<void>;
  onToggle: (provider_code: ProviderCode, enabled: boolean) => Promise<void>;
}) {
  const { isOpen, setIsOpen, provider, onSave, onToggle, busy = false } = props;

  const [local, setLocal] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!isOpen || !provider) return;
    setLocal(provider.config || {});
  }, [isOpen, provider]);

  const fields = useMemo(() => {
    return provider ? requiredKeys(provider.code) : [];
  }, [provider]);

  const valid = useMemo(() => {
    return provider ? isConfigValid(provider.code, local) : false;
  }, [provider, local]);

  const missing = useMemo(() => {
    return provider ? missingFields(provider.code, local) : [];
  }, [provider, local]);

  if (!provider) return null;

  const nextStatus = (valid ? "active" : "needs_setup") as ProviderStatus;
  const locked = busy || provider.status === "disabled_by_platform";

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen} isCentered>
      <ModalHeader>{provider.title}</ModalHeader>

      <ModalBody>
        <div className="adm-payment-config" dir="rtl">
          <div className="adm-payment-config__summary">
            <div className="adm-payment-config__summaryMain">
              <div className="adm-payment-config__eyebrow">إعداد مزوّد الدفع</div>

              <h3 className="adm-payment-config__title">{provider.title}</h3>

              {provider.subtitle ? (
                <p className="adm-payment-config__desc">{provider.subtitle}</p>
              ) : (
                <p className="adm-payment-config__desc">
                  أدخل بيانات الربط المطلوبة ثم احفظ الإعدادات.
                </p>
              )}
            </div>

            <div
              className={[
                "adm-payment-config__status",
                valid
                  ? "adm-payment-config__status--ready"
                  : "adm-payment-config__status--setup",
              ].join(" ")}
            >
              {statusText(provider.status, valid)}
            </div>
          </div>

          {!valid ? (
            <Alert icon="Alert02">
              توجد بيانات ناقصة. عند الحفظ ستصبح الحالة “يحتاج إعداد” حتى تكتمل
              بيانات الربط.
            </Alert>
          ) : null}

          {provider.status === "disabled_by_platform" ? (
            <Alert icon="Alert02">
              هذا المزوّد غير متاح حاليًا من المنصة ولا يمكن تفعيله.
            </Alert>
          ) : null}

          {fields.length ? (
            <div className="adm-payment-config__fields">
              {fields.map((field) => {
                const empty = String(local?.[field.k] || "").trim().length < 2;

                return (
                  <div
                    key={field.k}
                    className={[
                      "adm-payment-config-field",
                      empty ? "adm-payment-config-field--missing" : "",
                    ].join(" ")}
                  >
                    <div className="adm-payment-config-field__head">
                      <Label
                        htmlFor={`provider-${field.k}`}
                        className="adm-payment-config-field__label"
                      >
                        {field.label}
                      </Label>

                      <Description id={`provider-${field.k}-help`}>
                        <Tooltip text={empty ? "مطلوب" : "مكتمل"} />
                      </Description>
                    </div>

                    <Input
                      id={`provider-${field.k}`}
                      name={field.k}
                      type={field.type || "text"}
                      placeholder={field.placeholder || field.label}
                      aria-describedby={`provider-${field.k}-help`}
                      className="adm-payment-config-field__input"
                      value={String(local?.[field.k] ?? "")}
                      disabled={locked}
                      onChange={(event: any) => {
                        setLocal((current) => ({
                          ...current,
                          [field.k]: event?.target?.value,
                        }));
                      }}
                    />

                    {empty ? (
                      <div className="adm-payment-config-field__hint">
                        هذا الحقل مطلوب لإكمال التفعيل.
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="adm-payment-config__empty">
              لا توجد إعدادات مطلوبة حاليًا لهذا المزوّد.
            </div>
          )}

          {missing.length ? (
            <div className="adm-payment-config__missing">
              <div className="adm-payment-config__missingTitle">
                الحقول الناقصة:
              </div>
              <div className="adm-payment-config__missingList">
                {missing.map((field) => (
                  <span key={field.k}>{field.label}</span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </ModalBody>

      <ModalFooter>
        <ModalFooterChild>
          <Button
            aria-label="Cancel"
            variant="outline"
            color="zinc"
            icon="Cancel01"
            disabled={busy}
            onClick={() => setIsOpen(false)}
          >
            إلغاء
          </Button>
        </ModalFooterChild>

        <ModalFooterChild>
          <Button
            aria-label="Toggle"
            variant={provider.enabled ? "outline" : "solid"}
            color={provider.enabled ? "zinc" : "primary"}
            icon={busy ? undefined : provider.enabled ? "ToggleOff" : "ToggleOn"}
            disabled={locked}
            onClick={() => onToggle(provider.code, !provider.enabled)}
          >
            {busy ? (
              <span className="adm-payment-config__busy">
                <Spinner /> جاري...
              </span>
            ) : provider.enabled ? (
              "إيقاف"
            ) : (
              "تفعيل"
            )}
          </Button>

          <Button
            aria-label="Save"
            variant="solid"
            color="primary"
            icon={busy ? undefined : "FloppyDisk"}
            disabled={locked}
            onClick={() =>
              onSave({
                provider_code: provider.code,
                config: local,
                status: nextStatus,
              })
            }
          >
            {busy ? (
              <span className="adm-payment-config__busy">
                <Spinner /> حفظ...
              </span>
            ) : (
              "حفظ الإعدادات"
            )}
          </Button>
        </ModalFooterChild>
      </ModalFooter>
    </Modal>
  );
}