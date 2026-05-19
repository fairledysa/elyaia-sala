// FILE: apps/merchant/src/app/(app)/settings/payment/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import Skeleton from "@/components/ui/Skeleton";
import Spinner from "@/components/ui/Spinner";
import Icon from "@/components/icon/Icon";

import { usePayments } from "@/lib/payments/usePayments";
import type { ProviderCode } from "@/lib/payments/types";

import PaymentProvidersSection from "./_components/payment-providers-section";
import BankAccountsSection from "./_components/bank-accounts-section";
import CheckoutSettingsSection from "./_components/checkout-settings-section";
import ProviderConfigModal from "./_components/provider-config-modal";

import PaymentToast from "./_components/PaymentToast";
import { usePaymentToast } from "./_components/usePaymentToast";

import StoreVerificationBanner from "./_components/store-verification-banner";

type VerificationStatus = "incomplete" | "pending" | "verified";

function clsx(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

export default function PaymentPage() {
  const {
    loading,
    error,
    data,
    providersView,
    run,
    toggleProvider,
    refresh,
    busy,
  } = usePayments() as any;

  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [openProvider, setOpenProvider] = useState<ProviderCode | null>(null);

  const { toastState, show, close } = usePaymentToast();

  const notify = (type: "success" | "error" | "info", msg: string) =>
    show(msg, type);

 const verificationStatus = useMemo<VerificationStatus>(() => {
  // مؤقتًا إلى أن تربطه لاحقًا من API / DB
  return "incomplete";
}, []);

  const providers = useMemo(() => {
    return Array.isArray(providersView) ? providersView : [];
  }, [providersView]);

  const bankAccounts = useMemo(() => {
    return Array.isArray(data?.bank_accounts) ? data.bank_accounts : [];
  }, [data?.bank_accounts]);

  const checkout = useMemo(() => {
    return (
      data?.checkout || {
        prefill_from_last_order: true,
        company_purchase_enabled: false,
      }
    );
  }, [data?.checkout]);

  const paymentOverview = useMemo(() => {
    const electronicProviders = providers.filter(
      (provider: any) => provider.group === "electronic",
    );

    const visibleProviders = providers.filter(
      (provider: any) => provider.group !== "bnpl",
    );

    const enabledElectronic = electronicProviders.filter((provider: any) => {
      return provider.enabled && provider.status !== "disabled_by_platform";
    }).length;

    const needsSetup = visibleProviders.filter((provider: any) => {
      return provider.status === "needs_setup";
    }).length;

    const activeBanks = bankAccounts.filter((bank: any) => {
      return bank.status !== "disabled";
    }).length;

    const primaryBank = bankAccounts.find((bank: any) => bank.is_primary) || null;

    const verified = verificationStatus === "verified";
    const hasPaymentMethod = enabledElectronic > 0;
    const hasBank = activeBanks > 0 && !!primaryBank;
    const checkoutReady = !loading;

    const readyItems = [verified, hasPaymentMethod, hasBank, checkoutReady].filter(
      Boolean,
    ).length;

    return {
      electronicTotal: electronicProviders.length,
      enabledElectronic,
      needsSetup,
      activeBanks,
      totalBanks: bankAccounts.length,
      primaryBank,
      verified,
      hasPaymentMethod,
      hasBank,
      checkoutReady,
      readyItems,
      percent: Math.round((readyItems / 4) * 100),
    };
  }, [providers, bankAccounts, verificationStatus, loading]);

  const selected = useMemo(() => {
    if (!openProvider) return null;

    return (
      providers.find((provider: any) => provider.code === openProvider) || null
    );
  }, [openProvider, providers]);

  const openConfig = (code: ProviderCode) => {
    setOpenProvider(code);
    setIsProviderModalOpen(true);
  };

  useEffect(() => {
    if (!isProviderModalOpen) setOpenProvider(null);
  }, [isProviderModalOpen]);

  const refreshBusy = !!busy?.["refresh"];

  return (
    <div className="adm-page__inner adm-payment" dir="rtl">
      <PaymentToast state={toastState} onClose={close} />

      <section className="adm-payment-hero">
        <div className="adm-payment-hero__main">
          <div className="adm-payment-hero__icon">
            <Icon icon="Payment01" size="text-2xl" />
          </div>

          <div className="adm-payment-hero__text">
            <div className="adm-payment-hero__eyebrow">إعدادات المتجر</div>
            <h1 className="adm-payment-hero__title">طرق الدفع</h1>
            <p className="adm-payment-hero__desc">
              فعّل وسائل الدفع، اضبط الحسابات البنكية، وتحكم بتجربة العميل في
              صفحة إتمام الطلب من مكان واحد.
            </p>
          </div>
        </div>

        <div className="adm-payment-hero__side">
          <div className="adm-payment-score">
            <div className="adm-payment-score__top">
              <span>جاهزية الدفع</span>
              <strong>{paymentOverview.percent}%</strong>
            </div>
            <div className="adm-payment-score__track">
              <span style={{ width: `${paymentOverview.percent}%` }} />
            </div>
            <div className="adm-payment-score__hint">
              {paymentOverview.readyItems} من 4 خطوات مكتملة
            </div>
          </div>

          <Button
            aria-label="Refresh"
            variant="outline"
            color="zinc"
            icon={refreshBusy ? undefined : "Reload"}
            onClick={async () => {
              try {
                await refresh();
                notify("success", "تم التحديث");
              } catch {
                notify("error", "فشل التحديث");
              }
            }}
            disabled={refreshBusy}
          >
            {refreshBusy ? (
              <span className="inline-flex items-center gap-2">
                <Spinner />
                تحديث
              </span>
            ) : (
              "تحديث"
            )}
          </Button>
        </div>
      </section>

      <section className="adm-payment-steps">
        <div
          className={clsx(
            "adm-payment-step",
            paymentOverview.verified
              ? "adm-payment-step--done"
              : "adm-payment-step--required",
          )}
        >
          <div className="adm-payment-step__icon">
            <Icon icon="Shield01" size="text-xl" />
          </div>
          <div>
            <div className="adm-payment-step__title">توثيق المتجر</div>
            <div className="adm-payment-step__desc">
              {paymentOverview.verified ? "مكتمل" : "مطلوب لتفعيل الدفع"}
            </div>
          </div>
        </div>

        <div
          className={clsx(
            "adm-payment-step",
            paymentOverview.hasPaymentMethod
              ? "adm-payment-step--done"
              : "adm-payment-step--idle",
          )}
        >
          <div className="adm-payment-step__icon">
            <Icon icon="CreditCard" size="text-xl" />
          </div>
          <div>
            <div className="adm-payment-step__title">وسائل الدفع</div>
            <div className="adm-payment-step__desc">
              {paymentOverview.enabledElectronic} /{" "}
              {paymentOverview.electronicTotal || 0} مفعّلة
            </div>
          </div>
        </div>

        <div
          className={clsx(
            "adm-payment-step",
            paymentOverview.hasBank
              ? "adm-payment-step--done"
              : "adm-payment-step--idle",
          )}
        >
          <div className="adm-payment-step__icon">
            <Icon icon="Bank" size="text-xl" />
          </div>
          <div>
            <div className="adm-payment-step__title">الحساب البنكي</div>
            <div className="adm-payment-step__desc">
              {paymentOverview.primaryBank?.bank_name || "غير محدد"}
            </div>
          </div>
        </div>

        <div
          className={clsx(
            "adm-payment-step",
            paymentOverview.checkoutReady
              ? "adm-payment-step--done"
              : "adm-payment-step--idle",
          )}
        >
          <div className="adm-payment-step__icon">
            <Icon icon="Settings02" size="text-xl" />
          </div>
          <div>
            <div className="adm-payment-step__title">صفحة الدفع</div>
            <div className="adm-payment-step__desc">
              {paymentOverview.checkoutReady ? "مهيأة" : "جاري التحميل"}
            </div>
          </div>
        </div>
      </section>

      <StoreVerificationBanner
        status={verificationStatus}
        onGoVerify={() => {
          window.location.href = "/settings/verification";
        }}
      />

      {loading ? (
        <section className="adm-card adm-card--lg">
          <div className="adm-card__body">
            <div className="adm-payment__skeleton">
              <Skeleton className="mb-2 w-1/3" />
              <Skeleton className="w-2/3" />
              <Skeleton className="w-2/3" />
              <Skeleton className="w-2/3" />
            </div>
          </div>
        </section>
      ) : error ? (
        <section className="adm-card adm-card--lg">
          <div className="adm-card__body">
            <Alert icon="Alert01">{String(error)}</Alert>
          </div>
        </section>
      ) : (
        <div className="adm-payment__sections">
          <PaymentProvidersSection
            providers={providers}
            busy={busy}
            hideBnpl={true}
            onToggle={async (code: ProviderCode, enabled: boolean) => {
              const ok = await toggleProvider(code, enabled);

              ok
                ? notify("success", enabled ? "تم التفعيل" : "تم الإيقاف")
                : notify("error", "فشل التحديث");
            }}
            onOpenConfig={(code: ProviderCode) => openConfig(code)}
          />

          <BankAccountsSection
            bankAccounts={bankAccounts}
            onAdd={async (payload) => {
              const ok = await run(
                { op: "bank_add", ...payload },
                { busyKey: "bank:add" },
              );

              if (!ok) throw new Error(error || "فشل حفظ الحساب البنكي");

              notify("success", "تم حفظ الحساب");
            }}
            onUpdate={async (id, patch) => {
              const ok = await run(
                { op: "bank_update", id, patch },
                { busyKey: `bank:update:${id}` },
              );

              if (!ok) throw new Error(error || "فشل تحديث الحساب البنكي");

              notify("success", "تم التحديث");
            }}
            onDelete={async (id) => {
              const ok = await run(
                { op: "bank_delete", id },
                { busyKey: `bank:delete:${id}` },
              );

              if (!ok) throw new Error(error || "فشل حذف الحساب البنكي");

              notify("success", "تم الحذف");
            }}
          />

          <CheckoutSettingsSection
            saving={false}
            checkout={checkout}
            onChange={async (patch: any) => {
              const ok = await run(
                { op: "checkout_update", patch },
                { busyKey: "checkout:update" },
              );

              ok
                ? notify("success", "تم حفظ الإعدادات")
                : notify("error", "فشل الحفظ");
            }}
          />

          <ProviderConfigModal
            isOpen={isProviderModalOpen}
            setIsOpen={setIsProviderModalOpen}
            provider={selected}
            busy={!!busy?.["provider:save"]}
            onSave={async ({ provider_code, config, status }: any) => {
              const ok = await run(
                {
                  op: "update_provider_config",
                  provider_code,
                  config,
                  status,
                },
                { busyKey: "provider:save" },
              );

              if (ok) {
                notify("success", "تم حفظ إعدادات المزود");
                setIsProviderModalOpen(false);
              } else {
                notify("error", "فشل حفظ الإعدادات");
              }
            }}
            onToggle={async (
              provider_code: ProviderCode,
              enabled: boolean,
            ) => {
              const ok = await toggleProvider(provider_code, enabled);

              ok
                ? notify("success", enabled ? "تم التفعيل" : "تم الإيقاف")
                : notify("error", "فشل التحديث");
            }}
          />
        </div>
      )}
    </div>
  );
}