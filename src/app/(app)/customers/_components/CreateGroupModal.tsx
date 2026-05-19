//app/(app)/customers/_components/CreateGroupModal.tsx
"use client";

import { useMemo, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

type ConditionType =
  | "total_sales"
  | "total_orders"
  | "store_rating"
  | "doesnt_have_orders"
  | "doesnt_have_email"
  | "have_cancelled_orders"
  | "gender"
  | "birthday"
  | "joining_date"
  | "last_login"
  | "latest_purchase";

type Operator = ">" | "<" | "=" | "between";

type ConditionRow = {
  key: string;
  id: ConditionType;
  label: string;
  type: "number" | "boolean" | "select" | "date" | "range_days";
  operator?: Operator;
  value?: string;
  min_value?: string;
  max_value?: string;
};

const CONDITIONS: Array<{
  id: ConditionType;
  label: string;
  type: ConditionRow["type"];
}> = [
  { id: "total_sales", type: "number", label: "إجمالي المشتريات" },
  { id: "total_orders", type: "number", label: "عدد الطلبات" },
  { id: "store_rating", type: "number", label: "تقييم المنتجات" },
  { id: "doesnt_have_orders", type: "boolean", label: "ليس لديهم طلبات" },
  { id: "doesnt_have_email", type: "boolean", label: "ليس لديهم بريد إلكتروني" },
  { id: "have_cancelled_orders", type: "number", label: "لديهم طلبات ملغاة" },
  { id: "gender", type: "select", label: "الجنس" },
  { id: "birthday", type: "date", label: "تاريخ الميلاد" },
  { id: "joining_date", type: "date", label: "تاريخ التسجيل" },
  { id: "last_login", type: "range_days", label: "آخر تسجيل دخول" },
  { id: "latest_purchase", type: "range_days", label: "آخر طلب" },
];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function CreateGroupModal({ open, onClose }: Props) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("👥");
  const [rows, setRows] = useState<ConditionRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canSave = useMemo(() => {
    return name.trim().length > 0 && !saving;
  }, [name, saving]);

  if (!open) return null;

  function addCondition(id: string) {
    const found = CONDITIONS.find((x) => x.id === id);
    if (!found) return;

    setRows((prev) => [
      ...prev,
      {
        key: uid(),
        id: found.id,
        label: found.label,
        type: found.type,
        operator: found.type === "number" ? ">" : undefined,
        value: "",
        min_value: "",
        max_value: "",
      },
    ]);
  }

  function updateRow(key: string, patch: Partial<ConditionRow>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((row) => row.key !== key));
  }

  async function handleSave() {
    setError("");

    if (!name.trim()) {
      setError("اسم المجموعة مطلوب");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: name.trim(),
        icon,
        conditions: rows.map((r) => ({
          id: r.id,
          label: r.label,
          type: r.type,
          operator: r.operator ?? null,
          value: r.value ?? null,
          min_value: r.min_value ?? null,
          max_value: r.max_value ?? null,
        })),
      };

      const res = await fetch("/api/customer-groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || "فشل الحفظ");
        return;
      }

      setName("");
      setIcon("👥");
      setRows([]);
      onClose();
    } catch {
      setError("فشل الحفظ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-emerald-100 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-slate-700"
          >
            ×
          </button>
          <h2 className="text-2xl font-bold text-slate-900">إنشاء مجموعة جديدة</h2>
        </div>

        <div className="space-y-6 p-6">
          <section className="rounded-2xl border border-slate-200 p-4">
            <h3 className="mb-4 text-3xl font-bold text-slate-900">معلومات المجموعة</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-[180px_1fr]">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  أيقونة المجموعة
                </label>
                <select
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center"
                >
                  <option value="👥">👥</option>
                  <option value="⭐">⭐</option>
                  <option value="💎">💎</option>
                  <option value="🛍️">🛍️</option>
                  <option value="📦">📦</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  اسم المجموعة
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="اسم المجموعة"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 p-4">
            <div className="mb-4 flex items-center justify-between">
              <select
                defaultValue=""
                onChange={(e) => {
                  addCondition(e.target.value);
                  e.currentTarget.value = "";
                }}
                className="rounded-xl border border-slate-300 px-4 py-2"
              >
                <option value="" disabled>
                  إضافة شرط جديد
                </option>
                {CONDITIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>

              <h3 className="text-3xl font-bold text-slate-900">شروط المجموعة</h3>
            </div>

            <div className="space-y-3">
              {rows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
                  لا توجد شروط
                </div>
              ) : null}

              {rows.map((row) => (
                <div
                  key={row.key}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3"
                >
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    className="text-base font-semibold text-red-500"
                  >
                    حذف
                  </button>

                  {row.type === "number" && (
                    <>
                      <input
                        value={row.value ?? ""}
                        onChange={(e) => updateRow(row.key, { value: e.target.value })}
                        className="w-28 rounded-lg border border-slate-300 px-3 py-2"
                        placeholder="القيمة"
                      />

                      <select
                        value={row.operator ?? ">"}
                        onChange={(e) =>
                          updateRow(row.key, { operator: e.target.value as Operator })
                        }
                        className="w-20 rounded-lg border border-slate-300 px-3 py-2"
                      >
                        <option value=">">{">"}</option>
                        <option value="<">{"<"}</option>
                        <option value="=">{"="}</option>
                        <option value="between">بين</option>
                      </select>
                    </>
                  )}

                  {row.type === "boolean" && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-slate-500">
                      بدون قيمة
                    </div>
                  )}

                  {row.type === "select" && (
                    <select
                      value={row.value ?? ""}
                      onChange={(e) => updateRow(row.key, { value: e.target.value })}
                      className="w-40 rounded-lg border border-slate-300 px-3 py-2"
                    >
                      <option value="">الجنس</option>
                      <option value="male">ذكر</option>
                      <option value="female">أنثى</option>
                    </select>
                  )}

                  {row.type === "date" && (
                    <>
                      <input
                        type="date"
                        value={row.min_value ?? ""}
                        onChange={(e) => updateRow(row.key, { min_value: e.target.value })}
                        className="rounded-lg border border-slate-300 px-3 py-2"
                      />
                      <input
                        type="date"
                        value={row.max_value ?? ""}
                        onChange={(e) => updateRow(row.key, { max_value: e.target.value })}
                        className="rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </>
                  )}

                  {row.type === "range_days" && (
                    <>
                      <input
                        value={row.min_value ?? ""}
                        onChange={(e) => updateRow(row.key, { min_value: e.target.value })}
                        className="w-28 rounded-lg border border-slate-300 px-3 py-2"
                        placeholder="من يوم"
                      />
                      <input
                        value={row.max_value ?? ""}
                        onChange={(e) => updateRow(row.key, { max_value: e.target.value })}
                        className="w-28 rounded-lg border border-slate-300 px-3 py-2"
                        placeholder="إلى يوم"
                      />
                    </>
                  )}

                  <div className="min-w-[180px] rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-right font-medium text-slate-700">
                    {row.label}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {error ? (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 p-6">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-xl bg-emerald-500 px-8 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "جارٍ الحفظ..." : "حفظ"}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-6 py-3 font-semibold text-slate-700"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}