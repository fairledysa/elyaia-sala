//11) app/(app)/settings/options/_components/modals/ReceivingOrdersTimesModal.tsx
"use client";

import { useEffect, useState } from "react";
import OptionsModalShell from "../_components/OptionsModalShell";

type DayKey =
  | "saturday"
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday";

type Value = Record<DayKey, { enabled: boolean; from: string; to: string }>;

type Props = {
  open: boolean;
  onClose: () => void;
  value: Value;
  dayLabels: Record<DayKey, string>;
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

export default function ReceivingOrdersTimesModal({
  open,
  onClose,
  value,
  dayLabels,
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

  const setDay = (day: DayKey, patch: Partial<Value[DayKey]>) => {
    setForm((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        ...patch,
      },
    }));
  };

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
          key: "receiving_orders_times",
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
      console.error("Failed to save receiving_orders_times", error);
      setSaveState("error");
      setErrorMessage("حدث خطأ أثناء حفظ الإعدادات");
    }
  };

  return (
    <OptionsModalShell
      open={open}
      onClose={onClose}
      title="أوقات استقبال الطلبات"
      width="xl"
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
        {(Object.keys(form) as DayKey[]).map((day) => (
          <div key={day} className="rounded-2xl border border-slate-200 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="font-semibold text-slate-900">{dayLabels[day]}</div>
              <input
                type="checkbox"
                checked={form[day].enabled}
                onChange={(e) => setDay(day, { enabled: e.target.checked })}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="time"
                value={form[day].from}
                disabled={!form[day].enabled}
                onChange={(e) => setDay(day, { from: e.target.value })}
                className="h-11 w-full rounded-2xl border border-slate-200 px-4 outline-none disabled:bg-slate-100"
              />
              <input
                type="time"
                value={form[day].to}
                disabled={!form[day].enabled}
                onChange={(e) => setDay(day, { to: e.target.value })}
                className="h-11 w-full rounded-2xl border border-slate-200 px-4 outline-none disabled:bg-slate-100"
              />
            </div>
          </div>
        ))}

        {saveState === "error" && errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}
      </div>
    </OptionsModalShell>
  );
}