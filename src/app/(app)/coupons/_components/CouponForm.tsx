// FILE: apps/merchant/src/app/(app)/coupons/_components/CouponForm.tsx
"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import type { CouponRow, CouponUpsertInput } from "./types";
import { normalizeCouponInput } from "./schema";

import Card, { CardBody } from "@/components/ui/Card";
import Checkbox from "@/components/form/Checkbox";

type SaveState = "idle" | "saving" | "deleting" | "error";

function toLocalDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

function CouponSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (e: any) => void;
}) {
  return (
    <span
      className={[
        "adm-coupons-switch",
        checked ? "adm-coupons-switch--active" : "",
        disabled ? "adm-coupons-switch--disabled" : "",
      ].join(" ")}
    >
      <Checkbox
        variant="switch"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
    </span>
  );
}

export type CouponFormHandle = {
  save: () => Promise<void>;
  del: () => Promise<void>;
};

const CouponForm = forwardRef<
  CouponFormHandle,
  {
    editing: CouponRow | null;
    onSaved: () => void;
    onDeleted: () => void;
    onUiChange?: (x: {
      disabled: boolean;
      saving: boolean;
      deleting: boolean;
      error: boolean;
    }) => void;
  }
>(function CouponForm(props, ref) {
  const { editing, onSaved, onDeleted, onUiChange } = props;

  const [state, setState] = useState<SaveState>("idle");

  const [form, setForm] = useState<any>({
    code: "",
    discount_type: "P",
    amount: "",
    maximum_amount: "",
    show_maximum_amount: false,
    start_at: "",
    end_at: "",
    free_shipping: false,
    exclude_sale_products: false,
    minimum_amount: "",
    usage_limit: "",
    usage_limit_per_user: "",
    is_apply_with_offer: true,
    marketing_active: false,
    marketing_name: "",
    marketing_type: "P",
    marketing_amount: "",
    marketing_info: "",
    marketing_hide_total_sales: false,
    marketing_maximum_amount: "",
    marketing_show_maximum_amount: false,
    status: "active",
  });

  useEffect(() => {
    if (!editing) return;

    setForm({
      code: editing.code ?? "",
      discount_type: editing.discount_type ?? "P",
      amount: editing.amount != null ? String(editing.amount) : "",
      maximum_amount:
        editing.maximum_amount != null ? String(editing.maximum_amount) : "",
      show_maximum_amount: !!editing.show_maximum_amount,
      start_at: toLocalDateInput(editing.start_at),
      end_at: toLocalDateInput(editing.end_at),
      free_shipping: !!editing.free_shipping,
      exclude_sale_products: !!editing.exclude_sale_products,
      minimum_amount:
        editing.minimum_amount != null ? String(editing.minimum_amount) : "",
      usage_limit:
        editing.usage_limit != null ? String(editing.usage_limit) : "",
      usage_limit_per_user:
        editing.usage_limit_per_user != null
          ? String(editing.usage_limit_per_user)
          : "",
      is_apply_with_offer: editing.is_apply_with_offer ?? true,
      marketing_active: !!editing.marketing_active,
      marketing_name: editing.marketing_name ?? "",
      marketing_type: editing.marketing_type ?? "P",
      marketing_amount:
        editing.marketing_amount != null
          ? String(editing.marketing_amount)
          : "",
      marketing_info: editing.marketing_info ?? "",
      marketing_hide_total_sales: !!editing.marketing_hide_total_sales,
      marketing_maximum_amount:
        editing.marketing_maximum_amount != null
          ? String(editing.marketing_maximum_amount)
          : "",
      marketing_show_maximum_amount: !!editing.marketing_show_maximum_amount,
      status: editing.status ?? "active",
    });
  }, [editing]);

  const isPercent = form.discount_type === "P";
  const showMaxBox = isPercent;

  const payload: CouponUpsertInput = useMemo(() => {
    const start_at = form.start_at
      ? new Date(form.start_at + "T00:00:00Z").toISOString()
      : null;
    const end_at = form.end_at
      ? new Date(form.end_at + "T23:59:59Z").toISOString()
      : null;

    return normalizeCouponInput({
      ...form,
      amount: form.amount === "" ? 0 : form.amount,
      start_at,
      end_at,
    });
  }, [form]);

  const disabled = state === "saving" || state === "deleting";

  const onUiChangeRef = useRef<typeof onUiChange>(onUiChange);

  useEffect(() => {
    onUiChangeRef.current = onUiChange;
  }, [onUiChange]);

  useEffect(() => {
    onUiChangeRef.current?.({
      disabled,
      saving: state === "saving",
      deleting: state === "deleting",
      error: state === "error",
    });
  }, [disabled, state]);

  async function save() {
    setState("saving");

    try {
      const url = editing ? `/api/coupons/${editing.id}` : "/api/coupons";
      const method = editing ? "PATCH" : "POST";

      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "SAVE_FAILED");

      setState("idle");
      onSaved();
    } catch {
      setState("error");
    }
  }

  async function del() {
    if (!editing) return;

    setState("deleting");

    try {
      const r = await fetch(`/api/coupons/${editing.id}`, { method: "DELETE" });
      const j = await r.json().catch(() => ({}));

      if (!r.ok) throw new Error(j?.error || "DELETE_FAILED");

      setState("idle");
      onDeleted();
    } catch {
      setState("error");
    }
  }

  useImperativeHandle(ref, () => ({ save, del }), [editing, payload]);

  return (
    <div className="space-y-4" dir="rtl">
      <Card className="overflow-hidden">
        <CardBody className="m-1 rounded-lg bg-zinc-500/10">
          <div className="text-sm font-semibold">بيانات الكوبون</div>
          <div className="mt-1 text-xs text-zinc-600">
            أدخل كود الكوبون ونوع الخصم وتواريخ الصلاحية.
          </div>
        </CardBody>

        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-8">
              <label className="mb-2 block text-sm font-medium">
                كود الكوبون (حروف/أرقام وبدون مسافات)
              </label>

              <input
                className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
                maxLength={20}
                value={form.code}
                onChange={(e) =>
                  setForm((p: any) => ({ ...p, code: e.target.value }))
                }
                placeholder="مثال: SAVE10"
                disabled={disabled}
              />
            </div>

            <div className="md:col-span-4">
              <label className="mb-2 block text-sm font-medium">الحالة</label>

              <select
                className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
                value={form.status}
                onChange={(e) =>
                  setForm((p: any) => ({ ...p, status: e.target.value }))
                }
                disabled={disabled}
              >
                <option value="active">فعال</option>
                <option value="inactive">غير فعال</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-6">
              <label className="mb-2 block text-sm font-medium">
                نوع الخصم للعميل
              </label>

              <select
                className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
                value={form.discount_type}
                onChange={(e) =>
                  setForm((p: any) => ({ ...p, discount_type: e.target.value }))
                }
                disabled={disabled}
              >
                <option value="P">نسبة من مجموع مشتريات العميل</option>
                <option value="F">مبلغ ثابت من مجموع مشتريات العميل</option>
              </select>
            </div>

            <div className="md:col-span-6">
              <label className="mb-2 block text-sm font-medium">
                {isPercent ? "نسبة الخصم" : "مبلغ الخصم"}
              </label>

              <div className="flex">
                <input
                  className="h-10 w-full rounded-r-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((p: any) => ({ ...p, amount: e.target.value }))
                  }
                  placeholder={isPercent ? "مثال: 10" : "مثال: 25"}
                  inputMode="decimal"
                  disabled={disabled}
                />

                <div className="flex h-10 items-center rounded-l-xl border border-r-0 border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-700">
                  {isPercent ? "%" : "ر.س"}
                </div>
              </div>
            </div>
          </div>

          {showMaxBox ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="md:col-span-6">
                <label className="mb-2 block text-sm font-medium">
                  المبلغ الأقصى للتخفيض
                </label>

                <div className="flex">
                  <input
                    className="h-10 w-full rounded-r-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
                    value={form.maximum_amount}
                    onChange={(e) =>
                      setForm((p: any) => ({
                        ...p,
                        maximum_amount: e.target.value,
                      }))
                    }
                    placeholder="مثال: 100"
                    inputMode="decimal"
                    disabled={disabled}
                  />

                  <div className="flex h-10 items-center rounded-l-xl border border-r-0 border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-700">
                    ر.س
                  </div>
                </div>
              </div>

              <div className="md:col-span-6">
                <div className="flex items-center justify-between rounded-xl border border-zinc-200 p-3">
                  <div>
                    <div className="text-sm font-medium">
                      إظهار المبلغ الأقصى للعملاء
                    </div>
                    <div className="mt-1 text-xs text-zinc-600">
                      يظهر نص بحد أقصى عند تجاوز الخصم للمبلغ المحدد.
                    </div>
                  </div>

                  <CouponSwitch
                    checked={!!form.show_maximum_amount}
                    disabled={disabled}
                    onChange={(e: any) =>
                      setForm((p: any) => ({
                        ...p,
                        show_maximum_amount: !!e?.target?.checked,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-6">
              <label className="mb-2 block text-sm font-medium">
                تاريخ بداية الكوبون
              </label>

              <input
                type="date"
                className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
                value={form.start_at}
                onChange={(e) =>
                  setForm((p: any) => ({ ...p, start_at: e.target.value }))
                }
                disabled={disabled}
              />
            </div>

            <div className="md:col-span-6">
              <label className="mb-2 block text-sm font-medium">
                تاريخ انتهاء الكوبون
              </label>

              <input
                type="date"
                className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
                value={form.end_at}
                onChange={(e) =>
                  setForm((p: any) => ({ ...p, end_at: e.target.value }))
                }
                disabled={disabled}
              />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="m-1 rounded-lg bg-zinc-500/10">
          <div className="text-sm font-semibold">خيارات إضافية</div>
        </CardBody>

        <CardBody className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-6">
              <div className="flex items-center justify-between rounded-xl border border-zinc-200 p-3">
                <div>
                  <div className="text-sm font-medium">مع شحن مجاني؟</div>
                </div>

                <CouponSwitch
                  checked={!!form.free_shipping}
                  disabled={disabled}
                  onChange={(e: any) =>
                    setForm((p: any) => ({
                      ...p,
                      free_shipping: !!e?.target?.checked,
                    }))
                  }
                />
              </div>
            </div>

            <div className="md:col-span-6">
              <div className="flex items-center justify-between rounded-xl border border-zinc-200 p-3">
                <div>
                  <div className="text-sm font-medium">
                    استثناء المنتجات المخفضة
                  </div>
                </div>

                <CouponSwitch
                  checked={!!form.exclude_sale_products}
                  disabled={disabled}
                  onChange={(e: any) =>
                    setForm((p: any) => ({
                      ...p,
                      exclude_sale_products: !!e?.target?.checked,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-4">
              <label className="mb-2 block text-sm font-medium">
                الحد الأدنى من المشتريات (بدون ضريبة)
              </label>

              <input
                className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
                value={form.minimum_amount}
                onChange={(e) =>
                  setForm((p: any) => ({
                    ...p,
                    minimum_amount: e.target.value,
                  }))
                }
                placeholder="مثال: 200"
                inputMode="decimal"
                disabled={disabled}
              />
            </div>

            <div className="md:col-span-4">
              <label className="mb-2 block text-sm font-medium">
                عدد مرات الاستخدام للجميع
              </label>

              <input
                className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
                value={form.usage_limit}
                onChange={(e) =>
                  setForm((p: any) => ({ ...p, usage_limit: e.target.value }))
                }
                placeholder="مثال: 100"
                inputMode="numeric"
                disabled={disabled}
              />
            </div>

            <div className="md:col-span-4">
              <label className="mb-2 block text-sm font-medium">
                عدد مرات الاستخدام للعميل
              </label>

              <input
                className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
                value={form.usage_limit_per_user}
                onChange={(e) =>
                  setForm((p: any) => ({
                    ...p,
                    usage_limit_per_user: e.target.value,
                  }))
                }
                placeholder="مثال: 1"
                inputMode="numeric"
                disabled={disabled}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-zinc-200 p-3">
            <div>
              <div className="text-sm font-medium">تطبيق الكوبون مع العرض</div>
              <div className="mt-1 text-xs text-zinc-600">
                إمكانية استثناء تطبيق العرض مع وجود كوبون.
              </div>
            </div>

            <CouponSwitch
              checked={!!form.is_apply_with_offer}
              disabled={disabled}
              onChange={(e: any) =>
                setForm((p: any) => ({
                  ...p,
                  is_apply_with_offer: !!e?.target?.checked,
                }))
              }
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="m-1 rounded-lg bg-zinc-500/10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">كوبون تسويقي</div>
              <div className="mt-1 text-xs text-zinc-600">
                أدخل بيانات المسوّق والعمولة، ويمكن مشاركة رابط الإحصائيات بعد
                الإنشاء.
              </div>
            </div>

            <CouponSwitch
              checked={!!form.marketing_active}
              disabled={disabled}
              onChange={(e: any) =>
                setForm((p: any) => ({
                  ...p,
                  marketing_active: !!e?.target?.checked,
                }))
              }
            />
          </div>
        </CardBody>

        {form.marketing_active ? (
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="md:col-span-6">
                <label className="mb-2 block text-sm font-medium">
                  اسم الشخص
                </label>

                <input
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
                  value={form.marketing_name}
                  onChange={(e) =>
                    setForm((p: any) => ({
                      ...p,
                      marketing_name: e.target.value,
                    }))
                  }
                  placeholder="اسم المسوّق"
                  disabled={disabled}
                />
              </div>

              <div className="md:col-span-6">
                <label className="mb-2 block text-sm font-medium">
                  نوع العمولة للمسوّق
                </label>

                <select
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
                  value={form.marketing_type}
                  onChange={(e) =>
                    setForm((p: any) => ({
                      ...p,
                      marketing_type: e.target.value,
                    }))
                  }
                  disabled={disabled}
                >
                  <option value="P">نسبة من إجمالي الطلب</option>
                  <option value="F">مبلغ ثابت عن كل الطلب</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="md:col-span-6">
                <label className="mb-2 block text-sm font-medium">
                  {form.marketing_type === "P"
                    ? "نسبة العمولة"
                    : "مبلغ العمولة"}
                </label>

                <div className="flex">
                  <input
                    className="h-10 w-full rounded-r-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
                    value={form.marketing_amount}
                    onChange={(e) =>
                      setForm((p: any) => ({
                        ...p,
                        marketing_amount: e.target.value,
                      }))
                    }
                    placeholder={
                      form.marketing_type === "P" ? "مثال: 5" : "مثال: 10"
                    }
                    inputMode="decimal"
                    disabled={disabled}
                  />

                  <div className="flex h-10 items-center rounded-l-xl border border-r-0 border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-700">
                    {form.marketing_type === "P" ? "%" : "ر.س"}
                  </div>
                </div>
              </div>

              <div className="md:col-span-6">
                <label className="mb-2 block text-sm font-medium">
                  المبلغ الأقصى للعمولة
                </label>

                <input
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
                  value={form.marketing_maximum_amount}
                  onChange={(e) =>
                    setForm((p: any) => ({
                      ...p,
                      marketing_maximum_amount: e.target.value,
                    }))
                  }
                  placeholder="مثال: 500"
                  inputMode="decimal"
                  disabled={disabled}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="md:col-span-12">
                <label className="mb-2 block text-sm font-medium">
                  معلومات إضافية
                </label>

                <textarea
                  className="min-h-[90px] w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400"
                  maxLength={255}
                  value={form.marketing_info}
                  onChange={(e) =>
                    setForm((p: any) => ({
                      ...p,
                      marketing_info: e.target.value,
                    }))
                  }
                  placeholder="ملاحظات..."
                  disabled={disabled}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="md:col-span-6">
                <div className="flex items-center justify-between rounded-xl border border-zinc-200 p-3">
                  <div>
                    <div className="text-sm font-medium">
                      إخفاء إجمالي المبيعات
                    </div>
                    <div className="mt-1 text-xs text-zinc-600">
                      إخفاء إجمالي المبيعات من صفحة إحصائيات المسوق.
                    </div>
                  </div>

                  <CouponSwitch
                    checked={!!form.marketing_hide_total_sales}
                    disabled={disabled}
                    onChange={(e: any) =>
                      setForm((p: any) => ({
                        ...p,
                        marketing_hide_total_sales: !!e?.target?.checked,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="md:col-span-6">
                <div className="flex items-center justify-between rounded-xl border border-zinc-200 p-3">
                  <div>
                    <div className="text-sm font-medium">
                      إظهار المبلغ الأقصى للمسوقين
                    </div>
                  </div>

                  <CouponSwitch
                    checked={!!form.marketing_show_maximum_amount}
                    disabled={disabled}
                    onChange={(e: any) =>
                      setForm((p: any) => ({
                        ...p,
                        marketing_show_maximum_amount: !!e?.target?.checked,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </CardBody>
        ) : null}
      </Card>
    </div>
  );
});

export default CouponForm;