//13) app/(app)/settings/options/_components/modals/CancelOrderModal.tsx
"use client";

import { useEffect, useState } from "react";
import OptionsModalShell from "../_components/OptionsModalShell";

type Value = {
  enabled: boolean;
  hoursLimit: number;
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

export default function CancelOrderModal({ open, onClose, value, onSave }: Props) {
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
          key: "cancel_order",
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
      console.error("Failed to save cancel_order", error);
      setSaveState("error");
      setErrorMessage("حدث خطأ أثناء حفظ الإعدادات");
    }
  };

  return (
    <OptionsModalShell
      open={open}
      onClose={onClose}
      title="السماح للعميل بإلغاء الطلب قبل البدء بتنفيذه"
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
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 p-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              السماح للعميل بإلغاء الطلب قبل البدء بتنفيذه
            </div>
            <div className="mt-1 text-xs leading-6 text-slate-500">
              قم بتفعيل هذا الخيار للسماح للعميل بإلغاء الطلب خلال المدة المحددة.
            </div>
          </div>
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-800">
            عدد الساعات المتاح خلالها إلغاء الطلب
          </label>
          <input
            type="number"
            min={1}
            max={100}
            value={form.hoursLimit}
            onChange={(e) =>
              setForm((p) => ({ ...p, hoursLimit: Number(e.target.value || 1) }))
            }
            className="h-11 w-full rounded-2xl border border-slate-200 px-4 outline-none"
          />
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