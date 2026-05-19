// FILE: apps/merchant/src/app/(app)/settings/payment/_components/payment-providers-section.tsx
"use client";

import Button from "@/components/ui/Button";
import Tooltip from "@/components/ui/Tooltip";
import Spinner from "@/components/ui/Spinner";
import StyledIcon from "@/components/ui/StyledIcon";

import type { ProviderCode, ProviderStatus } from "@/lib/payments/types";

type ProviderView = {
  code: ProviderCode;
  title: string;
  subtitle?: string;
  group: "electronic" | "bnpl" | "loyalty";
  enabled: boolean;
  status: ProviderStatus | string;
  config: Record<string, any>;
};

function clsx(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function groupUi(group: ProviderView["group"]) {
  if (group === "electronic") {
    return {
      title: "المدفوعات الإلكترونية",
      sub: "فعّل وسائل الدفع الإلكتروني وحدد إعدادات كل مزوّد.",
      icon: "Payment01",
    } as const;
  }

  if (group === "bnpl") {
    return {
      title: "اشترِ الآن وادفع لاحقًا",
      sub: "إدارة مزوّدي الدفع الآجل عند توفرهم.",
      icon: "Wallet01",
    } as const;
  }

  return {
    title: "برامج الولاء",
    sub: "إدارة مزوّدي الولاء والمكافآت المرتبطة بالدفع.",
    icon: "Award01",
  } as const;
}

function statusLabel(status: string) {
  if (status === "active") return "مفعّل";
  if (status === "needs_setup") return "يحتاج إعداد";
  if (status === "disabled_by_platform") return "غير متاح";
  return "غير مفعّل";
}

function statusClass(status: string) {
  if (status === "active") return "adm-payment-provider-status--active";
  if (status === "needs_setup") return "adm-payment-provider-status--setup";
  if (status === "disabled_by_platform") {
    return "adm-payment-provider-status--disabled-platform";
  }

  return "adm-payment-provider-status--inactive";
}

function providerIcon(code: ProviderCode) {
  if (code === "card") return "CreditCard";
  if (code === "apple_pay") return "Apple";
  if (code === "tabby") return "Wallet02";
  if (code === "tamara") return "Wallet03";
  if (code === "emkan") return "Wallet04";
  if (code === "mokafaa") return "Award01";

  return "Payment02";
}

function providerHint(provider: ProviderView) {
  if (provider.status === "disabled_by_platform") {
    return "هذا المزود غير متاح حاليًا من المنصة.";
  }

  if (provider.status === "needs_setup") {
    return "أكمل بيانات الإعداد حتى يظهر هذا الخيار للعميل.";
  }

  if (provider.enabled) {
    return "يظهر للعميل في صفحة الدفع إذا اكتملت إعداداته.";
  }

  return "فعّله فقط إذا كان جاهزًا للاستخدام في المتجر.";
}

export default function PaymentProvidersSection(props: {
  providers: ProviderView[];
  onToggle: (code: ProviderCode, enabled: boolean) => void;
  onOpenConfig: (code: ProviderCode) => void;
  busy?: Record<string, boolean>;
  hideBnpl?: boolean;
}) {
  const { providers, onToggle, onOpenConfig, busy, hideBnpl = true } = props;

  const groups: Array<ProviderView["group"]> = hideBnpl
    ? ["electronic", "loyalty"]
    : ["electronic", "bnpl", "loyalty"];

  return (
    <div className="adm-payment-providers">
      {groups.map((group) => {
        const list = providers.filter((provider) => provider.group === group);
        if (!list.length) return null;

        const ui = groupUi(group);
        const activeCount = list.filter((provider) => provider.enabled).length;
        const setupCount = list.filter(
          (provider) => provider.status === "needs_setup",
        ).length;

        return (
          <section key={group} className="adm-card adm-card--lg">
            <div className="adm-card__head adm-card__head--border">
              <div className="adm-card__titleWrap">
                <div className="adm-payment-section-titleRow">
                  <span className="adm-payment-section-icon">
                    <StyledIcon
                      variant="soft"
                      icon={ui.icon as any}
                      color="zinc"
                      rounded="rounded-2xl"
                    />
                  </span>

                  <div className="adm-payment-section-text">
                    <h2 className="adm-card__title">{ui.title}</h2>
                    <p className="adm-card__desc">{ui.sub}</p>
                  </div>
                </div>
              </div>

              <div className="adm-card__actions">
                <div className="adm-payment-section-stats">
                  <span>المفعّل: {activeCount} / {list.length}</span>
                  {setupCount ? <span>يحتاج إعداد: {setupCount}</span> : null}
                </div>
              </div>
            </div>

            <div className="adm-card__body">
              <div className="adm-payment-provider-list">
                {list.map((provider) => {
                  const canConfig = provider.code !== "mokafaa";
                  const showSetup =
                    provider.enabled ||
                    provider.status === "needs_setup" ||
                    provider.status === "active";

                  const isDisabled =
                    provider.status === "disabled_by_platform";

                  const toggleKey = `toggle:${provider.code}`;
                  const isBusy = !!busy?.[toggleKey];

                  return (
                    <article
                      key={provider.code}
                      className={clsx(
                        "adm-payment-provider",
                        provider.enabled && "adm-payment-provider--enabled",
                        isDisabled && "adm-payment-provider--locked",
                      )}
                    >
                      <div className="adm-payment-provider__main">
                        <div className="adm-payment-provider__icon">
                          <StyledIcon
                            variant={provider.enabled ? "soft" : "softOutline"}
                            icon={providerIcon(provider.code) as any}
                            color="zinc"
                            rounded="rounded-2xl"
                          />
                        </div>

                        <div className="adm-payment-provider__content">
                          <div className="adm-payment-provider__top">
                            <h3 className="adm-payment-provider__title">
                              {provider.title}
                            </h3>

                            <span
                              className={clsx(
                                "adm-payment-provider-status",
                                statusClass(
                                  String(provider.status || "inactive"),
                                ),
                              )}
                            >
                              {statusLabel(String(provider.status || "inactive"))}
                            </span>
                          </div>

                          {provider.subtitle ? (
                            <p className="adm-payment-provider__subtitle">
                              {provider.subtitle}
                            </p>
                          ) : null}

                          <p className="adm-payment-provider__hint">
                            {providerHint(provider)}
                          </p>
                        </div>
                      </div>

                      <div className="adm-payment-provider__actions">
                        {showSetup && canConfig ? (
                          <Tooltip text="إعدادات المزود">
                            <Button
                              aria-label="Config"
                              variant="outline"
                              color="zinc"
                              icon="Settings02"
                              onClick={() => onOpenConfig(provider.code)}
                              disabled={isDisabled || isBusy}
                            >
                              إعداد
                            </Button>
                          </Tooltip>
                        ) : null}

                        <Button
                          aria-label="Toggle"
                          variant={provider.enabled ? "outline" : "solid"}
                          color={provider.enabled ? "zinc" : "primary"}
                          icon={
                            isBusy
                              ? undefined
                              : provider.enabled
                                ? "ToggleOff"
                                : "ToggleOn"
                          }
                          onClick={() => onToggle(provider.code, !provider.enabled)}
                          disabled={isDisabled || isBusy}
                        >
                          {isBusy ? (
                            <span className="adm-payment-provider__busy">
                              <Spinner /> جاري...
                            </span>
                          ) : provider.enabled ? (
                            "إيقاف"
                          ) : (
                            "تفعيل"
                          )}
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}