//8) app/(app)/settings/options/_components/modals/ProductPurchaseCountModal.tsx
"use client";

import { useState, useEffect } from "react";
import OptionsModalShell from "../_components/OptionsModalShell";

type Value = {
  enabled: boolean;
  selectedCategoriesOnly: boolean;
  categoryIds: string[];
};

type CategoryOption = {
  id: string;
  name: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  value: Value;
  categories: CategoryOption[];
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

export default function ProductPurchaseCountModal({
  open,
  onClose,
  value,
  categories,
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

      const payload: Value = {
        ...form,
        categoryIds: form.selectedCategoriesOnly ? form.categoryIds.slice(0, 5) : [],
      };

      const res = await fetch("/api/settings/options", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key: "product_purchase_count",
          value: payload,
        }),
      });

      const json: SettingsApiPutResponse = await res.json();

      if (!res.ok || !json?.ok) {
        setSaveState("error");
        setErrorMessage(json?.error || "فشل حفظ الإعدادات");
        return;
      }

      onSave(payload);
    } catch (error) {
      console.error("Failed to save product_purchase_count", error);
      setSaveState("error");
      setErrorMessage("حدث خطأ أثناء حفظ الإعدادات");
    }
  };

  return (
    <OptionsModalShell
      open={open}
      onClose={onClose}
      title="تخصيص ظهور مرات الشراء للمنتجات"
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
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
          <div className="text-sm font-semibold text-slate-900">
            إظهار عدد مرات الشراء لكل المنتجات
          </div>
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))}
          />
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
          <div className="text-sm font-semibold text-slate-900">
            إظهار مرات الشراء لتصنيفات معينة
          </div>
          <input
            type="checkbox"
            checked={form.selectedCategoriesOnly}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                selectedCategoriesOnly: e.target.checked,
                categoryIds: e.target.checked ? p.categoryIds : [],
              }))
            }
          />
        </div>

        {form.selectedCategoriesOnly ? (
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-800">
              اختر التصنيفات (الحد الأقصى 5)
            </label>

            <select
              multiple
              value={form.categoryIds}
              onChange={(e) => {
                const next = Array.from(e.target.selectedOptions)
                  .map((x) => x.value)
                  .slice(0, 5);

                setForm((p) => ({ ...p, categoryIds: next }));
              }}
              className="min-h-[220px] w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
            >
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <p className="text-xs leading-6 text-slate-500">
              التصنيفات المختارة هي التي سيظهر عدد مرات الشراء لها.
            </p>
          </div>
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