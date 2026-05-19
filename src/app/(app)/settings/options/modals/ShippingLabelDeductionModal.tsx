//19) app/(app)/settings/options/_components/modals/ShippingLabelDeductionModal.tsx
"use client";

import { useEffect, useState } from "react";
import OptionsModalShell from "../_components/OptionsModalShell";

type Value = {
  type: "wallet_and_epayment" | "wallet";
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

export default function ShippingLabelDeductionModal({
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
          key: "shipping_label_deduction",
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
      console.error("Failed to save shipping_label_deduction", error);
      setSaveState("error");
      setErrorMessage("حدث خطأ أثناء حفظ الإعدادات");
    }
  };

  return (
    <OptionsModalShell
      open={open}
      onClose={onClose}
      title="طريقة خصم رسوم بوليصات الشحن"
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
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
          <p className="font-semibold text-slate-900">ماهي بوليصات الشحن ؟</p>
          <p className="mt-2">
            هي وثيقة تصدرها شركة الشحن لنقل طلبات التاجر إلى العملاء مقابل رسوم.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-800">
            طريقة خصم رسوم بوليصات الشحن
          </label>
          <select
            value={form.type}
            onChange={(e) =>
              setForm({ type: e.target.value as Value["type"] })
            }
            className="h-11 w-full rounded-2xl border border-slate-200 px-4 outline-none"
          >
            <option value="wallet_and_epayment">
              المحفظة ( رصيد المتجر والمدفوعات الإلكترونية )
            </option>
            <option value="wallet">رصيد المتجر</option>
          </select>
        </div>

        {saveState === "error" && errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}
      </div>
    </OptionsModalShell>
  );
}