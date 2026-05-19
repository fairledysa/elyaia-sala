//20) app/(app)/settings/options/_components/modals/CustomerAddressMethodModal.tsx
"use client";

import { useEffect, useState } from "react";
import OptionsModalShell from "../_components/OptionsModalShell";

type Value = {
  criteria: "location" | "location_and_national_address";
  provider: "default";
  addressDescriptionRequired: boolean;
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

export default function CustomerAddressMethodModal({
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
        addressDescriptionRequired:
          form.criteria === "location_and_national_address"
            ? form.addressDescriptionRequired
            : false,
      };

      const res = await fetch("/api/settings/options", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key: "customer_address_method",
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
      console.error("Failed to save customer_address_method", error);
      setSaveState("error");
      setErrorMessage("حدث خطأ أثناء حفظ الإعدادات");
    }
  };

  const showAddressDescription =
    form.criteria === "location_and_national_address";

  return (
    <OptionsModalShell
      open={open}
      onClose={onClose}
      title="طريقة تحديد عنوان العميل"
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
          <ul className="list-disc space-y-2 pr-5">
            <li>الموقع الجغرافي: مناسب للمطاعم والتوصيل الفوري</li>
            <li>نموذج العنوان والموقع الجغرافي: مناسب للمتاجر التي توفر الشحن والتوصيل</li>
          </ul>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-800">
            طريقة العنوان
          </label>
          <select
            value={form.criteria}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                criteria: e.target.value as Value["criteria"],
              }))
            }
            className="h-11 w-full rounded-2xl border border-slate-200 px-4 outline-none"
          >
            <option value="location">الموقع الجغرافي</option>
            <option value="location_and_national_address">
              نموذج العنوان والموقع الجغرافي
            </option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-800">
            خدمة الموقع الجغرافي
          </label>
          <select
            value={form.provider}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                provider: e.target.value as Value["provider"],
              }))
            }
            className="h-11 w-full rounded-2xl border border-slate-200 px-4 outline-none"
          >
            <option value="default">Salla Map</option>
          </select>
        </div>

        {showAddressDescription ? (
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                حقل وصف البيت
              </div>
              <div className="mt-1 text-xs leading-6 text-slate-500">
                هل يكون وصف البيت مطلوباً؟
              </div>
            </div>
            <input
              type="checkbox"
              checked={form.addressDescriptionRequired}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  addressDescriptionRequired: e.target.checked,
                }))
              }
            />
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