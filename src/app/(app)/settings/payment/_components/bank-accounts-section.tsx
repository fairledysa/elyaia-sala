// FILE: apps/merchant/src/app/(app)/settings/payment/_components/bank-accounts-section.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

import Card, {
  CardBody,
  CardHeader,
  CardHeaderChild,
  CardTitle,
  CardSubTitle,
} from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal, {
  ModalBody,
  ModalFooter,
  ModalFooterChild,
  ModalHeader,
} from "@/components/ui/Modal";
import Input from "@/components/form/Input";
import Label from "@/components/form/Label";
import Description from "@/components/form/Description";
import Tooltip from "@/components/ui/Tooltip";
import Alert from "@/components/ui/Alert";
import Checkbox from "@/components/form/Checkbox";
import Icon from "@/components/icon/Icon";
import Spinner from "@/components/ui/Spinner";

import type { StoreBankAccount } from "@/lib/payments/types";

function cleanIban(value: string) {
  return String(value || "")
    .toUpperCase()
    .replace(/\s+/g, "");
}

function looksLikeIban(value: string) {
  return cleanIban(value).length >= 10;
}

export default function BankAccountsSection(props: {
  bankAccounts?: StoreBankAccount[];
  onAdd: (payload: {
    bank_name: string;
    account_holder: string;
    iban: string;
    is_primary?: boolean;
  }) => Promise<void>;
  onUpdate: (id: string, patch: Partial<StoreBankAccount>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const { bankAccounts, onAdd, onUpdate, onDelete } = props;

  const safeAccounts = Array.isArray(bankAccounts) ? bankAccounts : [];

  const stats = useMemo(() => {
    const active = safeAccounts.filter((x) => x.status !== "disabled").length;
    const disabled = safeAccounts.filter((x) => x.status === "disabled").length;
    const primary = safeAccounts.find((x) => x.is_primary) || null;

    return {
      total: safeAccounts.length,
      active,
      disabled,
      primary,
    };
  }, [safeAccounts]);

  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState({
    bank_name: "",
    account_holder: "",
    iban: "",
    is_primary: true,
  });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [openDelete, setOpenDelete] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [primaryBusy, setPrimaryBusy] = useState<Record<string, boolean>>({});
  const [toggleBusy, setToggleBusy] = useState<Record<string, boolean>>({});

  function setPrimaryBusyKey(id: string, value: boolean) {
    setPrimaryBusy((prev) => ({ ...prev, [id]: value }));
  }

  function setToggleBusyKey(id: string, value: boolean) {
    setToggleBusy((prev) => ({ ...prev, [id]: value }));
  }

  useEffect(() => {
    if (!openDelete) {
      setDeleteId(null);
      setDeleteErr(null);
    }
  }, [openDelete]);

  const selectedToDelete = useMemo(() => {
    return safeAccounts.find((x) => x.id === deleteId) || null;
  }, [safeAccounts, deleteId]);

  const canSave =
    form.bank_name.trim().length >= 2 &&
    form.account_holder.trim().length >= 2 &&
    looksLikeIban(form.iban);

  function resetAdd() {
    setForm({
      bank_name: "",
      account_holder: "",
      iban: "",
      is_primary: true,
    });
    setErr(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardHeaderChild>
          <CardTitle
            iconProps={{
              icon: "Bank",
              size: "text-3xl",
              color: "zinc",
            }}
          >
            الحسابات البنكية
          </CardTitle>

          <CardSubTitle>
            أضف حسابات التحويل البنكي وحدد الحساب الأساسي الذي يظهر للعميل.
          </CardSubTitle>
        </CardHeaderChild>

        <CardHeaderChild>
          <Button
            aria-label="Add bank"
            icon="Add01"
            variant="solid"
            color="primary"
            onClick={() => {
              resetAdd();
              setOpenAdd(true);
            }}
          >
            حساب جديد
          </Button>
        </CardHeaderChild>
      </CardHeader>

      <CardBody className="space-y-4">
        <div className="rounded-2xl border border-[color:rgb(13_59_69_/_0.14)] bg-[color:var(--adm-mint-soft,#ecfaf5)] px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-black text-[color:var(--adm-primary,#0d3b45)]">
                التحويل البنكي يظهر للعميل كطريقة دفع عند وجود حساب فعّال.
              </div>
              <div className="mt-1 text-xs font-semibold leading-6 text-zinc-600">
                الحساب الأساسي هو المقترح أولًا في صفحة الدفع. تستطيع إضافة أكثر
                من حساب وتفعيل أو تعطيل أي حساب بدون حذفه.
              </div>
            </div>

            <Button
              variant="solid"
              color="primary"
              icon="Add01"
              onClick={() => {
                resetAdd();
                setOpenAdd(true);
              }}
            >
              إضافة حساب
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
            <div className="text-xs font-bold text-zinc-500">
              إجمالي الحسابات
            </div>
            <div className="mt-1 text-2xl font-black text-zinc-900">
              {stats.total}
            </div>
          </div>

          <div className="rounded-2xl border border-[color:rgb(13_59_69_/_0.16)] bg-[color:var(--adm-mint-soft,#ecfaf5)] px-4 py-3">
            <div className="text-xs font-bold text-[color:var(--adm-primary,#0d3b45)]">
              الحسابات الفعالة
            </div>
            <div className="mt-1 text-2xl font-black text-[color:var(--adm-primary,#0d3b45)]">
              {stats.active}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
            <div className="text-xs font-bold text-zinc-500">
              الحساب الأساسي
            </div>
            <div className="mt-1 truncate text-base font-black text-zinc-900">
              {stats.primary?.bank_name || "غير محدد"}
            </div>
          </div>
        </div>

        {!safeAccounts.length ? (
          <div className="rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
            <div className="mx-auto mb-3 inline-flex size-14 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-[color:var(--adm-primary,#0d3b45)]">
              <Icon icon="Bank" size="text-2xl" />
            </div>

            <div className="text-base font-black text-zinc-900">
              لا يوجد حساب بنكي حتى الآن
            </div>

            <div className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
              أضف حساب بنكي حتى يتمكن العملاء من اختيار التحويل البنكي أثناء
              الدفع.
            </div>

            <div className="mt-5">
              <Button
                variant="solid"
                color="primary"
                icon="Add01"
                onClick={() => {
                  resetAdd();
                  setOpenAdd(true);
                }}
              >
                إضافة أول حساب بنكي
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {safeAccounts.map((bank) => {
              const rowPrimaryBusy = !!primaryBusy[bank.id];
              const rowToggleBusy = !!toggleBusy[bank.id];
              const disabledAccount = bank.status === "disabled";

              return (
                <div
                  key={bank.id}
                  className={[
                    "rounded-3xl border bg-white p-4 shadow-sm transition",
                    bank.is_primary
                      ? "border-[color:rgb(13_59_69_/_0.24)]"
                      : "border-zinc-200",
                    disabledAccount ? "opacity-75" : "",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-zinc-200 bg-zinc-50 text-[color:var(--adm-primary,#0d3b45)]">
                        <Icon icon="Bank" />
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-base font-black text-zinc-900">
                          {bank.bank_name}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {bank.is_primary ? (
                            <span className="rounded-full border border-[color:rgb(13_59_69_/_0.18)] bg-[color:var(--adm-mint-soft,#ecfaf5)] px-2.5 py-1 text-xs font-black text-[color:var(--adm-primary,#0d3b45)]">
                              الحساب الأساسي
                            </span>
                          ) : null}

                          <span
                            className={[
                              "rounded-full border px-2.5 py-1 text-xs font-black",
                              disabledAccount
                                ? "border-zinc-200 bg-zinc-50 text-zinc-600"
                                : "border-[color:rgb(13_59_69_/_0.18)] bg-white text-[color:var(--adm-primary,#0d3b45)]",
                            ].join(" ")}
                          >
                            {disabledAccount ? "معطّل" : "فعّال"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                      {!bank.is_primary ? (
                        <Button
                          aria-label="Make primary"
                          variant="outline"
                          color="primary"
                          icon={
                            rowPrimaryBusy ? undefined : "CheckmarkCircle02"
                          }
                          disabled={rowPrimaryBusy || rowToggleBusy || deleting}
                          onClick={async () => {
                            setPrimaryBusyKey(bank.id, true);
                            try {
                              await onUpdate(bank.id, {
                                is_primary: true,
                              } as any);
                            } finally {
                              setPrimaryBusyKey(bank.id, false);
                            }
                          }}
                        >
                          {rowPrimaryBusy ? (
                            <span className="inline-flex items-center gap-2">
                              <Spinner /> ...
                            </span>
                          ) : (
                            "أساسي"
                          )}
                        </Button>
                      ) : null}

                      <Button
                        aria-label="Toggle status"
                        variant="outline"
                        color="zinc"
                        icon={
                          rowToggleBusy
                            ? undefined
                            : disabledAccount
                              ? "ToggleOn"
                              : "ToggleOff"
                        }
                        disabled={rowToggleBusy || rowPrimaryBusy || deleting}
                        onClick={async () => {
                          setToggleBusyKey(bank.id, true);
                          try {
                            await onUpdate(bank.id, {
                              status: disabledAccount ? "active" : "disabled",
                            } as any);
                          } finally {
                            setToggleBusyKey(bank.id, false);
                          }
                        }}
                      >
                        {rowToggleBusy ? (
                          <span className="inline-flex items-center gap-2">
                            <Spinner /> ...
                          </span>
                        ) : disabledAccount ? (
                          "تفعيل"
                        ) : (
                          "تعطيل"
                        )}
                      </Button>

                      <Button
                        aria-label="Delete bank"
                        color="red"
                        variant="soft"
                        icon="Delete02"
                        disabled={rowPrimaryBusy || rowToggleBusy || deleting}
                        onClick={() => {
                          setDeleteId(bank.id);
                          setOpenDelete(true);
                        }}
                      >
                        حذف
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3">
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                      <div className="text-xs font-bold text-zinc-500">
                        اسم صاحب الحساب
                      </div>
                      <div className="mt-1 truncate text-sm font-black text-zinc-900">
                        {bank.account_holder || "-"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                      <div className="text-xs font-bold text-zinc-500">
                        IBAN
                      </div>
                      <div
                        className="mt-1 truncate font-mono text-sm font-black tracking-wide text-zinc-900"
                        dir="ltr"
                      >
                        {bank.iban || "-"}
                      </div>
                    </div>
                  </div>

                  {bank.is_primary ? (
                    <div className="mt-3 rounded-2xl border border-[color:rgb(232_214_168_/_0.75)] bg-[color:var(--adm-gold-soft,#faf4e1)] px-4 py-3 text-sm font-bold leading-6 text-zinc-700">
                      هذا الحساب يظهر كخيار أساسي للعميل عند التحويل البنكي.
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardBody>

      <Modal isOpen={openAdd} setIsOpen={setOpenAdd} isCentered>
        <ModalHeader>إضافة حساب بنكي</ModalHeader>

        <ModalBody>
          <div className="space-y-5">
            {err ? <Alert icon="Alert02">{err}</Alert> : null}

            <div className="rounded-2xl border border-[color:rgb(13_59_69_/_0.14)] bg-[color:var(--adm-mint-soft,#ecfaf5)] p-4">
              <div className="text-sm font-black text-[color:var(--adm-primary,#0d3b45)]">
                أدخل بيانات الحساب كما هي في البنك
              </div>
              <div className="mt-1 text-sm leading-6 text-zinc-600">
                يفضل استخدام اسم صاحب الحساب الرسمي وكتابة IBAN بدون مسافات.
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center justify-between [&>*]:mb-0">
                  <Label htmlFor="bank_name" className="w-auto!">
                    اسم البنك
                  </Label>
                  <Description id="bank_name_help">
                    <Tooltip text="مثال: الراجحي، الأهلي، الإنماء" />
                  </Description>
                </div>

                <Input
                  id="bank_name"
                  name="bank_name"
                  value={form.bank_name}
                  onChange={(e: any) =>
                    setForm((s) => ({ ...s, bank_name: e.target.value }))
                  }
                  disabled={saving}
                  placeholder="مثال: الراجحي"
                  aria-describedby="bank_name_help"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between [&>*]:mb-0">
                  <Label htmlFor="account_holder" className="w-auto!">
                    اسم صاحب الحساب
                  </Label>
                  <Description id="account_holder_help">
                    <Tooltip text="اكتب الاسم الرسمي المرتبط بالحساب البنكي" />
                  </Description>
                </div>

                <Input
                  id="account_holder"
                  name="account_holder"
                  value={form.account_holder}
                  onChange={(e: any) =>
                    setForm((s) => ({
                      ...s,
                      account_holder: e.target.value,
                    }))
                  }
                  disabled={saving}
                  placeholder="اسم صاحب الحساب"
                  aria-describedby="account_holder_help"
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between [&>*]:mb-0">
                <Label htmlFor="iban" className="w-auto!">
                  IBAN
                </Label>
                <Description id="iban_help">
                  <Tooltip text="مثال: SA0000000000000000000000" />
                </Description>
              </div>

              <Input
                id="iban"
                name="iban"
                value={form.iban}
                onChange={(e: any) =>
                  setForm((s) => ({ ...s, iban: cleanIban(e.target.value) }))
                }
                disabled={saving}
                placeholder="SA00..."
                aria-describedby="iban_help"
              />

              <div
                className={[
                  "mt-2 text-xs font-bold",
                  looksLikeIban(form.iban) ? "text-zinc-500" : "text-red-600",
                ].join(" ")}
              >
                {form.iban
                  ? `تمت قراءة IBAN كالتالي: ${cleanIban(form.iban)}`
                  : "اكتب IBAN بدون مسافات."}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="min-w-0">
                <div className="font-black text-zinc-900">
                  تعيين كحساب أساسي
                </div>
                <div className="mt-1 text-sm leading-6 text-zinc-500">
                  إذا كان مفعّلًا، سيكون هذا الحساب هو المقترح أولًا للعملاء.
                </div>
              </div>

              <Checkbox
                variant="switch"
                checked={!!form.is_primary}
                onChange={(e: any) =>
                  setForm((s) => ({ ...s, is_primary: !!e.target.checked }))
                }
                disabled={saving}
              />
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <ModalFooterChild />

          <ModalFooterChild>
            <Button
              color="zinc"
              variant="outline"
              icon="Cancel01"
              disabled={saving}
              onClick={() => setOpenAdd(false)}
            >
              إلغاء
            </Button>

            <Button
              variant="solid"
              color="primary"
              icon={saving ? undefined : "FloppyDisk"}
              disabled={saving}
              onClick={async () => {
                setErr(null);

                if (!canSave) {
                  setErr(
                    "بيانات ناقصة: تأكد من اسم البنك، اسم صاحب الحساب، و IBAN لا يقل عن 10 أحرف.",
                  );
                  return;
                }

                setSaving(true);
                try {
                  await onAdd({
                    bank_name: form.bank_name.trim(),
                    account_holder: form.account_holder.trim(),
                    iban: cleanIban(form.iban),
                    is_primary: form.is_primary,
                  });
                  setOpenAdd(false);
                  resetAdd();
                } catch (e: any) {
                  setErr(String(e?.message || "فشل حفظ الحساب"));
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner /> حفظ...
                </span>
              ) : (
                "حفظ الحساب"
              )}
            </Button>
          </ModalFooterChild>
        </ModalFooter>
      </Modal>

      <Modal isOpen={openDelete} setIsOpen={setOpenDelete} isCentered>
        <ModalHeader>تأكيد حذف الحساب البنكي</ModalHeader>

        <ModalBody>
          <div className="space-y-3">
            {deleteErr ? <Alert icon="Alert02">{deleteErr}</Alert> : null}

            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <div className="text-sm font-black text-red-700">
                هل تريد حذف هذا الحساب البنكي؟
              </div>

              {selectedToDelete ? (
                <div className="mt-3 rounded-xl border border-red-100 bg-white px-3 py-2">
                  <div className="text-sm font-black text-zinc-900">
                    {selectedToDelete.bank_name}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {selectedToDelete.account_holder}
                  </div>
                  <div
                    className="mt-1 font-mono text-xs font-bold text-zinc-700"
                    dir="ltr"
                  >
                    {selectedToDelete.iban}
                  </div>
                </div>
              ) : null}

              <div className="mt-3 text-sm leading-6 text-red-700">
                لا يمكن التراجع عن الحذف بعد تنفيذه.
              </div>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <ModalFooterChild />

          <ModalFooterChild>
            <Button
              variant="outline"
              color="zinc"
              icon="Cancel01"
              disabled={deleting}
              onClick={() => setOpenDelete(false)}
            >
              إلغاء
            </Button>

            <Button
              color="red"
              variant="soft"
              icon={deleting ? undefined : "Delete02"}
              disabled={deleting}
              onClick={async () => {
                if (!deleteId) return;

                setDeleteErr(null);

                const isOnlyOne = safeAccounts.length === 1;
                const isPrimary = !!selectedToDelete?.is_primary;
                const isDisabled = selectedToDelete?.status === "disabled";

                if (isOnlyOne && isPrimary && !isDisabled) {
                  setDeleteErr(
                    "ما تقدر تحذف الحساب الأساسي الوحيد وهو فعّال. عطّله أو أضف حساب ثاني أولاً.",
                  );
                  return;
                }

                setDeleting(true);
                try {
                  if (isPrimary && safeAccounts.length > 1) {
                    const another = safeAccounts.find((x) => x.id !== deleteId);
                    if (another) {
                      await onUpdate(another.id, { is_primary: true } as any);
                    }
                  }

                  await onDelete(deleteId);
                  setOpenDelete(false);
                } catch (e: any) {
                  setDeleteErr(String(e?.message || "فشل الحذف"));
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner /> حذف...
                </span>
              ) : (
                "نعم، احذف"
              )}
            </Button>
          </ModalFooterChild>
        </ModalFooter>
      </Modal>
    </Card>
  );
}