//10) app/(app)/settings/options/_components/modals/ReceivingOrdersModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import OptionsModalShell from "../_components/OptionsModalShell";

type Value = {
  enabled: boolean;
  restrictCod: boolean;
  enableDailyLimit: boolean;
  dailyLimit: string;
  message: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  value: Value;
  onSave: (value: Value) => void;
};

type SaveState = "idle" | "saving" | "error";

type SettingsApiPutResponse = {
  ok: boolean;
  item?: {
    id?: string;
    slug?: string;
    type?: string;
    value?: unknown;
    updated_at?: string;
  };
  error?: string;
};

export default function ReceivingOrdersModal({
  open,
  onClose,
  value,
  onSave,
}: Props) {
  const [form, setForm] = useState<Value>(value);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setForm(value);
    setSaveState("idle");
    setErrorMessage("");
  }, [value, open]);

  const preview = useMemo(() => form.message, [form.message]);

  const handleSave = async () => {
    try {
      setSaveState("saving");
      setErrorMessage("");

      const res = await fetch("/api/settings/options", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key: "receiving_orders",
          value: form,
        }),
      });

      const json: SettingsApiPutResponse = await res.json();

      if (!res.ok || !json?.ok) {
        setSaveState("error");
        setErrorMessage(json?.error || "فشل حفظ الإعدادات");
        return;
      }

      onSave(form);
    } catch (error) {
      console.error("Failed to save receiving_orders", error);
      setSaveState("error");
      setErrorMessage("حدث خطأ أثناء حفظ الإعدادات");
    }
  };

  return (
    <OptionsModalShell
      open={open}
      onClose={onClose}
      title="استقبال الطلبات"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saveState === "saving"}
            className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-60"
          >
            إغلاق
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saveState === "saving"}
            className="rounded-2xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saveState === "saving" ? "جارٍ الحفظ..." : "حفظ"}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <RowToggle
          title="استقبال الطلبات"
          desc="قم بتفعيل هذا الخيار لتتمكن من استقبال الطلبات من العملاء"
          checked={form.enabled}
          onChange={(v) => setForm((p) => ({ ...p, enabled: v }))}
        />

        <RowToggle
          title="تقييد استقبال طلبات الدفع عند الاستلام لنفس العميل"
          desc="السماح بطلب واحد فقط يومياً باستخدام الدفع عند الاستلام لكل عميل"
          checked={form.restrictCod}
          onChange={(v) => setForm((p) => ({ ...p, restrictCod: v }))}
        />

        <RowToggle
          title="تفعيل الحد اليومي للطلبات"
          desc="هل ترغب في استلام عدد معين من الطلبات يومياً؟"
          checked={form.enableDailyLimit}
          onChange={(v) => setForm((p) => ({ ...p, enableDailyLimit: v }))}
        />

        {form.enableDailyLimit ? (
          <>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-800">
                الحد اليومي للطلبات
              </label>
              <input
                type="text"
                value={form.dailyLimit}
                onChange={(e) => setForm((p) => ({ ...p, dailyLimit: e.target.value }))}
                placeholder="الحد اليومي للطلبات"
                className="h-11 w-full rounded-2xl border border-slate-200 px-4 outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-800">
                نص الرسالة
              </label>
              <textarea
                rows={4}
                value={form.message}
                onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                className="min-h-[120px] w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
              />
              <p className="text-xs text-slate-500">
                المتغيرات المدعومة: {"{name}"} و {"{time}"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 text-xs font-bold text-slate-600">
                معاينة الرسالة
              </div>
              <div className="whitespace-pre-line text-sm text-slate-800">{preview}</div>
            </div>
          </>
        ) : null}

        {saveState === "error" && errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}
      </div>
    </OptionsModalShell>
  );
}

function RowToggle({
  title,
  desc,
  checked,
  onChange,
}: {
  title: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 p-4">
      <div>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        {desc ? (
          <div className="mt-1 text-xs leading-6 text-slate-500">{desc}</div>
        ) : null}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </div>
  );
}