//18) app/(app)/settings/options/_components/modals/CustomizePackingListModal.tsx
"use client";

import { useEffect, useState } from "react";
import OptionsModalShell from "../_components/OptionsModalShell";

type Value = {
  showShippingDuration: boolean;
  showProductId: boolean;
  showCategory: boolean;
  hidePrices: boolean;
  showProductQuantity: boolean;
  showBrand: boolean;
  hideProductPicture: boolean;
  useSaTimeZone: boolean;
  showOrderOptions: boolean;
  showPayments: boolean;
  showShipping: boolean;
  showProductOptions: boolean;
  showOrderNote: boolean;
  showSku: boolean;
  showTotalItemCount: boolean;
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

const rows: { key: keyof Value; title: string; desc: string }[] = [
  { key: "showShippingDuration", title: "إظهار مدة الشحن", desc: "إذا تم تفعيل هذا الخيار سيظهر في الفاتورة" },
  { key: "showProductId", title: "إظهار رقم المنتج", desc: "إذا تم تفعيل هذا الخيار سيظهر في الفاتورة" },
  { key: "showCategory", title: "إظهار التصنيف", desc: "إذا تم تفعيل هذا الخيار سيظهر في الفاتورة" },
  { key: "hidePrices", title: "إخفاء الأسعار", desc: "إذا تم تفعيل هذا الخيار ستختفي الأسعار من الفاتورة" },
  { key: "showProductQuantity", title: "إظهار مجموع كمية المنتجات المطلوبة", desc: "إذا تم تفعيل هذا الخيار سيظهر في الفاتورة" },
  { key: "showBrand", title: "إظهار الماركة التجارية", desc: "إذا تم تفعيل هذا الخيار سيظهر في الفاتورة" },
  { key: "hideProductPicture", title: "إخفاء صور المنتجات", desc: "إذا تم تفعيل هذا الخيار سيتم إخفاء صور المنتجات" },
  { key: "useSaTimeZone", title: "إستخدام المنطقة الزمنية للسعودية", desc: "سيتم إستخدام توقيت الرياض/السعودية" },
  { key: "showOrderOptions", title: "إظهار خيارات الطلب", desc: "ستظهر خيارات الطلب في قائمة تجهيز الطلبات" },
  { key: "showPayments", title: "إظهار معلومات الدفع", desc: "ستظهر معلومات الدفع في قائمة تجهيز الطلبات" },
  { key: "showShipping", title: "إظهار معلومات الشحن", desc: "ستظهر معلومات الشحن في قائمة تجهيز الطلبات" },
  { key: "showProductOptions", title: "إظهار خيارات المنتج", desc: "ستظهر خيارات المنتج في قائمة تجهيز الطلبات" },
  { key: "showOrderNote", title: "إظهار ملاحظات الطلب", desc: "ستظهر ملاحظات الطلب في قائمة تجهيز الطلبات" },
  { key: "showSku", title: "إظهار SKU", desc: "ستظهر SKU في قائمة تجهيز الطلبات" },
  { key: "showTotalItemCount", title: "إظهار إجمالي الكميات", desc: "ستظهر إجمالي الكميات في قائمة تجهيز الطلبات" },
];

export default function CustomizePackingListModal({
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
          key: "customize_packing_list",
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
      console.error("Failed to save customize_packing_list", error);
      setSaveState("error");
      setErrorMessage("حدث خطأ أثناء حفظ الإعدادات");
    }
  };

  return (
    <OptionsModalShell
      open={open}
      onClose={onClose}
      title="تخصيص قائمة تجهيز الطلب"
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
      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 p-4"
          >
            <div>
              <div className="text-sm font-semibold text-slate-900">{row.title}</div>
              <div className="mt-1 text-xs leading-6 text-slate-500">{row.desc}</div>
            </div>
            <input
              type="checkbox"
              checked={form[row.key]}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  [row.key]: e.target.checked,
                }))
              }
            />
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