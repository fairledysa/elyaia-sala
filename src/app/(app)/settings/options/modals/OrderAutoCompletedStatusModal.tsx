//14) app/(app)/settings/options/_components/modals/OrderAutoCompletedStatusModal.tsx
"use client";

import { useEffect, useState } from "react";
import OptionsModalShell from "../_components/OptionsModalShell";

type ProductTypeValue =
  | "product"
  | "service"
  | "group_products"
  | "financial_support"
  | "codes"
  | "digital"
  | "food"
  | "donating"
  | "booking";

type Value = {
  epaymentEnabled: boolean;
  epaymentExcluded: ProductTypeValue[];
  codEnabled: boolean;
  codExcluded: ProductTypeValue[];
  instalmentsEnabled: boolean;
  instalmentsExcluded: ProductTypeValue[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  value: Value;
  productTypes: { value: ProductTypeValue; label: string }[];
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

export default function OrderAutoCompletedStatusModal({
  open,
  onClose,
  value,
  productTypes,
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
          key: "order_auto_completed_status",
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
      console.error("Failed to save order_auto_completed_status", error);
      setSaveState("error");
      setErrorMessage("حدث خطأ أثناء حفظ الإعدادات");
    }
  };

  return (
    <OptionsModalShell
      open={open}
      onClose={onClose}
      title="تعيين حالة (تم التنفيذ) عند الطلب"
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
      <div className="space-y-4">
        <Block
          title="تعيين حالة (تم التنفيذ) عند الطلب بالدفع الإلكتروني"
          enabled={form.epaymentEnabled}
          values={form.epaymentExcluded}
          productTypes={productTypes}
          onToggle={(v) => setForm((p) => ({ ...p, epaymentEnabled: v }))}
          onValuesChange={(vals) => setForm((p) => ({ ...p, epaymentExcluded: vals }))}
        />

        <Block
          title="تعيين حالة (تم التنفيذ) عند الطلب بالدفع عند الاستلام"
          enabled={form.codEnabled}
          values={form.codExcluded}
          productTypes={productTypes}
          onToggle={(v) => setForm((p) => ({ ...p, codEnabled: v }))}
          onValuesChange={(vals) => setForm((p) => ({ ...p, codExcluded: vals }))}
        />

        <Block
          title="تعيين حالة (تم التنفيذ) عند الطلب باشتري الآن وادفع لاحقاً / دفع أقساط"
          enabled={form.instalmentsEnabled}
          values={form.instalmentsExcluded}
          productTypes={productTypes}
          onToggle={(v) => setForm((p) => ({ ...p, instalmentsEnabled: v }))}
          onValuesChange={(vals) => setForm((p) => ({ ...p, instalmentsExcluded: vals }))}
        />

        {saveState === "error" && errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}
      </div>
    </OptionsModalShell>
  );
}

function Block({
  title,
  enabled,
  values,
  productTypes,
  onToggle,
  onValuesChange,
}: {
  title: string;
  enabled: boolean;
  values: ProductTypeValue[];
  productTypes: { value: ProductTypeValue; label: string }[];
  onToggle: (v: boolean) => void;
  onValuesChange: (vals: ProductTypeValue[]) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
        />
      </div>

      {enabled ? (
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-800">
            المنتج المستثنى
          </label>
          <select
            multiple
            value={values}
            onChange={(e) => {
              const next = Array.from(e.target.selectedOptions).map(
                (x) => x.value as ProductTypeValue
              );
              onValuesChange(next);
            }}
            className="min-h-[180px] w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
          >
            {productTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">
            سيتم تطبيق التغيير على جميع أنواع المنتجات ما عدا المحدد أعلاه.
          </p>
        </div>
      ) : null}
    </div>
  );
}