//16) app/(app)/settings/options/_components/modals/AgreementBeforeSubmitModal.tsx
"use client";

import { useEffect, useState } from "react";
import OptionsModalShell from "../_components/OptionsModalShell";

type Value = {
  visibility: "in_all" | "in_cod" | "hide";
  text: string;
  autoAccept: boolean;
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

export default function AgreementBeforeSubmitModal({
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

      const payload: Value = {
        ...form,
        text: form.visibility === "hide" ? "" : form.text,
        autoAccept: form.visibility === "hide" ? false : form.autoAccept,
      };

      const res = await fetch("/api/settings/options", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key: "agreement_before_submit",
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
      console.error("Failed to save agreement_before_submit", error);
      setSaveState("error");
      setErrorMessage("حدث خطأ أثناء حفظ الإعدادات");
    }
  };

  return (
    <OptionsModalShell
      open={open}
      onClose={onClose}
      title="الإقرار قبل ارسال الطلب"
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
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-800">
            وقت ظهور الإقرار
          </label>
          <select
            value={form.visibility}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                visibility: e.target.value as Value["visibility"],
              }))
            }
            className="h-11 w-full rounded-2xl border border-slate-200 px-4 outline-none"
          >
            <option value="in_all">يظهر دائماً</option>
            <option value="in_cod">يظهر عند اختيار الدفع عند الاستلام</option>
            <option value="hide">اخفاء الإقرار</option>
          </select>
        </div>

        {form.visibility !== "hide" ? (
          <>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-800">
                نص الإقرار
              </label>
              <textarea
                rows={5}
                value={form.text}
                onChange={(e) => setForm((p) => ({ ...p, text: e.target.value }))}
                className="min-h-[140px] w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
              />
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  الموافقة التلقائية للإقرار
                </div>
                <div className="mt-1 text-xs leading-6 text-slate-500">
                  تفعيل الموافقة التلقائية يقلل من خطوات إكمال الطلب.
                </div>
              </div>
              <input
                type="checkbox"
                checked={form.autoAccept}
                onChange={(e) =>
                  setForm((p) => ({ ...p, autoAccept: e.target.checked }))
                }
              />
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