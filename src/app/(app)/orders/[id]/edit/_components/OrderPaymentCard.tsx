// FILE: apps/merchant/src/app/(app)/orders/[id]/edit/_components/OrderPaymentCard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  WalletCards,
  Circle,
  CheckCircle2,
  Landmark,
  CreditCard,
} from "lucide-react";
import type { OrderDetails } from "../OrderEditPageClient";
import {
  labelPaymentMethod,
  labelPaymentStatus,
  s,
} from "../OrderEditPageClient";
import Modal, {
  ModalBody,
  ModalFooter,
  ModalFooterChild,
  ModalHeader,
} from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

type PaymentBank = {
  id: string;
  bank_name?: string | null;
  account_holder?: string | null;
  iban?: string | null;
  is_primary?: boolean | null;
};

type PaymentOption = {
  id: string;
  code: string;
  title: string;
  subtitle?: string | null;
  badge?: string | null;
  details?: string[] | null;
  banks?: PaymentBank[] | null;
};

type PaymentResponse = {
  ok?: boolean;
  current_payment_method?: string | null;
  current_payment_status?: string | null;
  options?: PaymentOption[];
  error?: string;
};

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function isBankTransfer(code: string) {
  return s(code) === "bank_transfer";
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-right text-[13px] font-medium text-slate-700 outline-none transition focus:border-[#83e0d1]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function BankAccountsView({ banks }: { banks: PaymentBank[] }) {
  if (!Array.isArray(banks) || banks.length === 0) return null;

  return (
    <div className="space-y-3">
      {banks.map((bank, index) => {
        const bankName = s(bank?.bank_name) || `الحساب البنكي ${index + 1}`;
        const holder = s(bank?.account_holder);
        const iban = s(bank?.iban);

        return (
          <div
            key={bank.id || `${bankName}-${index}`}
            className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500">
                <Landmark className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1 text-right">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {bank?.is_primary ? (
                    <div className="inline-flex items-center rounded-full border border-[#83e0d1] bg-[#f0fffb] px-2.5 py-0.5 text-[11px] font-medium text-[#177e74]">
                      الحساب الأساسي
                    </div>
                  ) : null}

                  <div className="text-[16px] font-semibold text-slate-800">
                    {bankName}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-[14px] border border-slate-200 bg-white px-3 py-3 text-right">
                    <div className="text-[11px] text-slate-400">
                      اسم المستفيد
                    </div>
                    <div className="mt-1 text-[15px] font-semibold text-slate-700">
                      {holder || "-"}
                    </div>
                  </div>

                  <div className="rounded-[14px] border border-slate-200 bg-white px-3 py-3 text-right">
                    <div className="text-[11px] text-slate-400">الآيبان</div>
                    <div
                      dir="ltr"
                      className="mt-1 break-all text-left text-[14px] font-semibold text-slate-700"
                    >
                      {iban || "-"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PaymentOptionCard({
  option,
  checked,
  onSelect,
}: {
  option: PaymentOption;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={`block cursor-pointer rounded-[18px] border px-4 py-4 transition ${
        checked
          ? "border-[#83e0d1] bg-[#f0fffb]"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <button
            type="button"
            onClick={onSelect}
            className="mt-0.5 shrink-0"
            aria-label={option.title}
          >
            {checked ? (
              <CheckCircle2 className="h-6 w-6 text-[#0d3b45]" />
            ) : (
              <Circle className="h-6 w-6 text-slate-300" />
            )}
          </button>

          <div className="min-w-0 flex-1 text-right">
            <div className="flex flex-wrap items-center justify-end gap-2">
              {option.badge ? (
                <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
                  {option.badge}
                </div>
              ) : null}

              <div className="text-[16px] font-semibold leading-none text-slate-800">
                {option.title}
              </div>
            </div>

            {option.subtitle ? (
              <div className="mt-1 text-[13px] text-slate-500">
                {option.subtitle}
              </div>
            ) : null}

            {Array.isArray(option.details) && option.details.length > 0 ? (
              <div className="mt-2 space-y-1">
                {option.details.map((line, idx) => (
                  <div
                    key={`${option.code}-detail-${idx}`}
                    className="text-[13px] text-slate-600"
                  >
                    {line}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {checked ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#bfe6d8] bg-[#ecfaf5]">
            <Check className="h-4 w-4 text-[#0d3b45]" />
          </div>
        ) : (
          <div className="h-9 w-9 shrink-0" />
        )}
      </div>
    </label>
  );
}

export default function OrderPaymentCard({
  order,
  onUpdated,
}: {
  order: OrderDetails;
  onUpdated?: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [options, setOptions] = useState<PaymentOption[]>([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [paymentState, setPaymentState] = useState<"paid" | "unpaid">("paid");

  async function loadPaymentOptions() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/orders/${order.id}/payment`, {
        cache: "no-store",
        credentials: "include",
      });

      const data: PaymentResponse = await safeJson(res);

      if (!res.ok) {
        throw new Error(data?.error || "تعذر تحميل وسائل الدفع");
      }

      const rows = Array.isArray(data?.options) ? data.options : [];
      const currentMethod = s(data?.current_payment_method);
      const currentStatus = s(
        data?.current_payment_status || order.payment_status
      ).toLowerCase();

      setOptions(rows);
      setPaymentState(currentStatus === "paid" ? "paid" : "unpaid");

      if (currentStatus === "paid") {
        setSelectedCode(currentMethod || s(rows[0]?.code));
      } else {
        const bankTransfer = rows.find((row) => isBankTransfer(row.code));
        setSelectedCode(s(bankTransfer?.code) || "bank_transfer");
      }
    } catch (e: any) {
      setError(s(e?.message) || "تعذر تحميل وسائل الدفع");
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;

    loadPaymentOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const visibleOptions = useMemo(() => {
    if (paymentState === "unpaid") {
      return options.filter((option) => isBankTransfer(option.code));
    }

    return options;
  }, [options, paymentState]);

  useEffect(() => {
    if (paymentState === "unpaid") {
      const bankTransfer = visibleOptions.find((row) =>
        isBankTransfer(row.code)
      );
      setSelectedCode(s(bankTransfer?.code) || "bank_transfer");
      return;
    }

    if (!visibleOptions.some((row) => s(row.code) === s(selectedCode))) {
      setSelectedCode(s(visibleOptions[0]?.code));
    }
  }, [paymentState, visibleOptions, selectedCode]);

  const selectedOption = useMemo(() => {
    return visibleOptions.find((x) => s(x.code) === s(selectedCode)) || null;
  }, [visibleOptions, selectedCode]);

  async function handleSave() {
    try {
      if (!selectedCode) {
        setError("اختر وسيلة الدفع");
        return;
      }

      setSaving(true);
      setError("");

      const finalPaymentMethod =
        paymentState === "unpaid" ? "bank_transfer" : selectedCode;

      const finalPaymentStatus = paymentState === "paid" ? "paid" : "unpaid";

      const res = await fetch(`/api/orders/${order.id}/payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          payment_method: finalPaymentMethod,
          payment_status: finalPaymentStatus,
        }),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        throw new Error(data?.error || "فشل تحديث وسيلة الدفع");
      }

      setOpen(false);
      await onUpdated?.();
    } catch (e: any) {
      setError(s(e?.message) || "فشل تحديث وسيلة الدفع");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="adm-order-edit-card adm-order-edit-payment">
        <div className="adm-order-edit-card__head">
          <h3 className="adm-order-edit-card__title">الدفع</h3>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="adm-order-edit-btn adm-order-edit-btn--outline"
          >
            تعديل
          </button>
        </div>

        <div className="adm-order-edit-payment__body">
          <div className="adm-order-edit-payment__method">
            {labelPaymentMethod(order.payment_method)}
          </div>

          <div className="adm-order-edit-payment__icon">
            <Check className="h-5 w-5" />
          </div>
        </div>

        <div className="adm-order-edit-payment__status">
          {labelPaymentStatus(order.payment_status)}
        </div>
      </section>

      <Modal
        isOpen={open}
        setIsOpen={() => setOpen(false)}
        isStaticBackdrop
        isScrollable
      >
        <ModalHeader>تعديل بيانات الدفع</ModalHeader>

        <ModalBody>
          <div
            dir="rtl"
            className="mx-auto w-full max-w-[860px] space-y-4 px-1 md:px-2"
          >
            <div className="text-center text-[15px] font-medium text-slate-700">
              اختر طريقة الدفع المناسبة
            </div>

            <div className="rounded-[16px] border border-slate-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-end gap-2 text-[13px] font-medium text-slate-700">
                <span>هل تم الدفع؟</span>
                <CreditCard className="h-4 w-4 text-slate-400" />
              </div>

              <SelectField
                value={paymentState}
                onChange={(value) =>
                  setPaymentState(value === "paid" ? "paid" : "unpaid")
                }
                options={[
                  { value: "paid", label: "نعم تم الدفع" },
                  { value: "unpaid", label: "لا، بانتظار الدفع" },
                ]}
              />

              {paymentState === "unpaid" ? (
                <div className="mt-2 text-[12px] text-slate-500">
                  عند اختيار بانتظار الدفع سيتم اعتماد التحويل البنكي فقط وإخفاء
                  الدفع عند الاستلام.
                </div>
              ) : null}
            </div>

            {loading ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                جارٍ تحميل وسائل الدفع...
              </div>
            ) : visibleOptions.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                لا توجد وسائل دفع متاحة
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {visibleOptions.map((option) => {
                    const checked = s(option.code) === s(selectedCode);

                    return (
                      <PaymentOptionCard
                        key={option.id || option.code}
                        option={option}
                        checked={checked}
                        onSelect={() => setSelectedCode(option.code)}
                      />
                    );
                  })}
                </div>

                {selectedOption ? (
                  <div className="rounded-[18px] border border-slate-200 bg-white p-4 md:p-5">
                    <div className="text-right">
                      <div className="text-[15px] font-semibold text-slate-800">
                        وسيلة الدفع: {selectedOption.title}
                      </div>

                      {selectedOption.subtitle ? (
                        <div className="mt-1 text-[13px] text-slate-500">
                          {selectedOption.subtitle}
                        </div>
                      ) : null}
                    </div>

                    {isBankTransfer(selectedOption.code) ? (
                      <div className="mt-4">
                        <div className="mb-3 flex items-center justify-end gap-2 text-[13px] font-medium text-slate-700">
                          <span>الحسابات البنكية المتاحة للتحويل</span>
                          <WalletCards className="h-4 w-4" />
                        </div>

                        <BankAccountsView
                          banks={
                            Array.isArray(selectedOption.banks)
                              ? selectedOption.banks
                              : []
                          }
                        />
                      </div>
                    ) : Array.isArray(selectedOption.details) &&
                      selectedOption.details.length > 0 ? (
                      <div className="mt-3 rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-4">
                        <div className="space-y-1.5">
                          {selectedOption.details.map((line, idx) => (
                            <div
                              key={`selected-${selectedOption.code}-${idx}`}
                              className="text-[13px] text-slate-600"
                            >
                              {line}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}

            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}
          </div>
        </ModalBody>

        <ModalFooter className="gap-4">
          <ModalFooterChild className="w-full">
            <Button
              className="w-full"
              variant="outline"
              color="zinc"
              dimension="lg"
              onClick={() => setOpen(false)}
              isDisable={saving}
            >
              إغلاق
            </Button>
          </ModalFooterChild>

          <ModalFooterChild className="w-full">
            <Button
              className="w-full"
              variant="solid"
              color="primary"
              dimension="lg"
              onClick={handleSave}
              isLoading={saving}
              isDisable={loading || saving || !selectedCode}
            >
              حفظ
            </Button>
          </ModalFooterChild>
        </ModalFooter>
      </Modal>
    </>
  );
}