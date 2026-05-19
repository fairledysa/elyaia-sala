// FILE: apps/merchant/src/app/(app)/settings/shipping/checkout-sandbox/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

function clsx(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

type City = {
  id: string;
  name_ar?: string;
  name_en?: string;
};

type BasePricing = {
  currency: string;
  shipping_fee_customer: number;
  cod_available: boolean;
  cod_fee_customer: number;
  cod_fee_merchant: number;
  merchant_shipping_cost: number;
};

type ShippingOptionBase = {
  id: string;
  type: "platform" | "courier" | "pickup";
  display_name: string;
  service?: { eta_text?: string | null; notes?: string | null };
  pricing: BasePricing;
  disabled_reason?: string | null;
};

type PickupOption = ShippingOptionBase & {
  type: "pickup";
  pickup_points: Array<{
    id: string;
    city_id: string;
    title: string;
    address: string;
    map_url: string;
    lat?: number | null;
    lng?: number | null;
    phone?: string | null;
    notes?: string | null;
    status?: string | null;
  }>;
};

type ShippingOption = PickupOption | (ShippingOptionBase & { type: "platform" | "courier" });

type ApiResponse = {
  currency: string;
  address: { city_id: string };
  cod: boolean;
  options: ShippingOption[];
};

const DEFAULT_CITY_ID = "3396af14-eb8f-4207-a472-fd1861446636"; // عدن عندك

function money(amount: number, currency: string) {
  const v = Number.isFinite(amount) ? amount : 0;
  return `${v.toFixed(0)} ${currency}`;
}

function cityLabel(c: City) {
  const ar = (c.name_ar || "").trim();
  const en = (c.name_en || "").trim();
  if (ar && en) return `${ar} — ${en}`;
  return ar || en || c.id;
}

export default function ShippingCheckoutSandboxPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesErr, setCitiesErr] = useState<string | null>(null);

  const [cityId, setCityId] = useState(DEFAULT_CITY_ID);
  const [cod, setCod] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [selectedPickupPointId, setSelectedPickupPointId] = useState<string | null>(null);

  // 1) Load cities once
  useEffect(() => {
    (async () => {
      setCitiesLoading(true);
      setCitiesErr(null);
      try {
        const r = await fetch("/api/ref/locations/cities", { method: "GET" });
        const j = await r.json();

        if (!r.ok) throw new Error(j?.error || "Failed to load cities");

        // مرن: نقبل {items:[...]} أو [...]
        const arr: any[] = Array.isArray(j) ? j : Array.isArray(j?.items) ? j.items : [];

        const normalized: City[] = arr
          .map((x) => ({
            id: String(x.id ?? x.city_id ?? ""),
            name_ar: x.name_ar ?? x.nameAr ?? x.ar ?? x.name ?? undefined,
            name_en: x.name_en ?? x.nameEn ?? x.en ?? undefined,
          }))
          .filter((x) => x.id);

        setCities(normalized);

        // لو default city مو موجود، خذ أول مدينة
        if (normalized.length && !normalized.some((c) => c.id === cityId)) {
          setCityId(normalized[0].id);
        }
      } catch (e: any) {
        setCitiesErr(e?.message || "Unknown error");
      } finally {
        setCitiesLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadShipping() {
    setLoading(true);
    setErr(null);

    try {
      const qs = new URLSearchParams();
      qs.set("city_id", cityId);
      qs.set("cod", cod ? "1" : "0");

      const r = await fetch(`/api/checkout/shipping-options?${qs.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const j = (await r.json()) as any;
      if (!r.ok) throw new Error(j?.error || "Failed to load shipping options");

      const payload = j as ApiResponse;
      setData(payload);

      const first = payload.options.find((o) => !o.disabled_reason) || payload.options[0] || null;
      setSelectedOptionId(first?.id || null);
      setSelectedPickupPointId(null);
    } catch (e: any) {
      setErr(e?.message || "Unknown error");
      setData(null);
      setSelectedOptionId(null);
      setSelectedPickupPointId(null);
    } finally {
      setLoading(false);
    }
  }

  // 2) Auto reload when city/cod change
  useEffect(() => {
    loadShipping();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityId, cod]);

  const selectedOption = useMemo(() => {
    if (!data || !selectedOptionId) return null;
    return data.options.find((o) => o.id === selectedOptionId) || null;
  }, [data, selectedOptionId]);

  const pickupPoints = useMemo(() => {
    if (!selectedOption || selectedOption.type !== "pickup") return [];
    return selectedOption.pickup_points || [];
  }, [selectedOption]);

  const summary = useMemo(() => {
    if (!data || !selectedOption) return null;

    const currency = selectedOption.pricing.currency || data.currency || "YER";
    const shipping = Number(selectedOption.pricing.shipping_fee_customer || 0);
    const codFeeCustomer = Number(selectedOption.pricing.cod_fee_customer || 0);
    const totalCustomer = shipping + codFeeCustomer;

    const merchantCost = Number(selectedOption.pricing.merchant_shipping_cost || 0);
    const codFeeMerchant = Number(selectedOption.pricing.cod_fee_merchant || 0);
    const totalMerchant = merchantCost + codFeeMerchant;

    const pickupSelected =
      selectedOption.type !== "pickup" ? true : pickupPoints.length === 0 ? true : !!selectedPickupPointId;

    return { currency, shipping, codFeeCustomer, totalCustomer, merchantCost, codFeeMerchant, totalMerchant, pickupSelected };
  }, [data, selectedOption, selectedPickupPointId, pickupPoints.length]);

  const selectedCity = useMemo(() => cities.find((c) => c.id === cityId) || null, [cities, cityId]);

  return (
    <div dir="rtl" className="min-h-screen bg-white p-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs text-zinc-500">
              <span>الإعدادات</span>
              <span className="mx-2">/</span>
              <span>الشحن</span>
              <span className="mx-2">/</span>
              <span className="text-zinc-900">اختبار الشحن</span>
            </div>
            <h1 className="mt-2 text-2xl font-black text-zinc-900">اختبار الشحن (Sandbox)</h1>
            <p className="mt-1 text-sm text-zinc-500">تجربة عرض خيارات الشحن كما سيراه الـ Checkout.</p>
          </div>

          <button
            onClick={loadShipping}
            className={clsx(
              "h-11 rounded-2xl border px-4 text-sm font-black",
              "border-zinc-200 bg-white text-zinc-900",
              "hover:border-[color:var(--color-primary-500)]"
            )}
          >
            تحديث
          </button>
        </div>

        {/* Controls */}
        <div className="rounded-3xl border border-zinc-200 bg-white p-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-xs font-bold text-zinc-600">مدينة العميل</label>

              {citiesLoading ? (
                <div className="h-11 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm leading-[44px] text-zinc-700">
                  جاري تحميل المدن...
                </div>
              ) : citiesErr ? (
                <div className="h-11 rounded-2xl border border-red-200 bg-red-50 px-4 text-sm leading-[44px] text-red-700">
                  {citiesErr}
                </div>
              ) : (
                <select
                  value={cityId}
                  onChange={(e) => setCityId(e.target.value)}
                  className={clsx(
                    "h-11 w-full rounded-2xl border bg-white px-4 text-sm outline-none",
                    "border-zinc-200 focus:border-[color:var(--color-primary-400)] focus:ring-4 focus:ring-[color:var(--color-primary-200)]"
                  )}
                >
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {cityLabel(c)}
                    </option>
                  ))}
                </select>
              )}

              <div className="mt-1 text-[11px] text-zinc-500">
                city_id: <span className="font-mono">{cityId}</span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-zinc-600">الدفع عند الاستلام (COD)</label>
              <button
                onClick={() => setCod((v) => !v)}
                className={clsx(
                  "h-11 w-full rounded-2xl border px-4 text-sm font-black transition-colors",
                  cod
                    ? "border-[color:var(--color-primary-500)] bg-[color:var(--color-primary-500)] text-black"
                    : "border-zinc-200 bg-white text-zinc-900"
                )}
              >
                {cod ? "مفعل" : "غير مفعل"}
              </button>
              <div className="mt-1 text-[11px] text-zinc-500">يفعل/يلغي رسوم COD داخل الخيارات.</div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-zinc-600">الحالة</label>
              <div className="h-11 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm leading-[44px] text-zinc-700">
                {loading ? "جاري التحميل..." : err ? `خطأ: ${err}` : data ? `تم تحميل ${data.options.length} خيار` : "—"}
              </div>
              <div className="mt-1 text-[11px] text-zinc-500">
                العملة: <span className="font-bold text-zinc-900">{data?.currency || "—"}</span>
                {selectedCity?.name_ar ? <span className="mx-2">•</span> : null}
                {selectedCity?.name_ar ? <span>{selectedCity.name_ar}</span> : null}
              </div>
            </div>
          </div>
        </div>

        {/* Layout */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Options */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-4">
            <div className="mb-3 text-sm font-black text-zinc-900">خيارات الشحن</div>

            <div className="space-y-3">
              {data?.options?.map((o) => {
                const disabled = !!o.disabled_reason;
                const selected = o.id === selectedOptionId;
                const price = o.pricing.shipping_fee_customer + (o.pricing.cod_fee_customer || 0);

                return (
                  <button
                    key={o.id}
                    disabled={disabled}
                    onClick={() => setSelectedOptionId(o.id)}
                    className={clsx(
                      "w-full rounded-3xl border p-4 text-right transition-colors",
                      disabled
                        ? "cursor-not-allowed border-zinc-200 bg-zinc-50 opacity-70"
                        : "border-zinc-200 bg-white hover:border-[color:var(--color-primary-500)]",
                      selected ? "border-[color:var(--color-primary-500)]" : ""
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[15px] font-black text-zinc-900">
                          {o.display_name} <span className="text-xs font-bold text-zinc-500">({o.type})</span>
                        </div>

                        {o.service?.eta_text ? <div className="mt-1 text-xs text-zinc-500">المدة: {o.service.eta_text}</div> : null}
                        {disabled ? <div className="mt-2 text-xs font-bold text-red-600">{o.disabled_reason}</div> : null}
                      </div>

                      <div className="shrink-0 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm font-black text-zinc-900">
                        {money(price, o.pricing.currency)}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-600">
                      <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-2">
                        الشحن: <span className="font-black text-zinc-900">{money(o.pricing.shipping_fee_customer, o.pricing.currency)}</span>
                      </div>
                      <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-2">
                        COD: <span className="font-black text-zinc-900">{money(o.pricing.cod_fee_customer || 0, o.pricing.currency)}</span>
                      </div>
                    </div>

                    {o.type === "platform" ? (
                      <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                        تكلفة على التاجر:{" "}
                        <span className="font-black text-zinc-900">
                          {money((o.pricing.merchant_shipping_cost || 0) + (o.pricing.cod_fee_merchant || 0), o.pricing.currency)}
                        </span>
                      </div>
                    ) : null}
                  </button>
                );
              })}

              {!data?.options?.length && !loading ? (
                <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                  لا توجد خيارات. تأكد من بيانات الشحن.
                </div>
              ) : null}
            </div>
          </div>

          {/* Details + Summary */}
          <div className="space-y-4">
            <div className="rounded-3xl border border-zinc-200 bg-white p-4">
              <div className="text-sm font-black text-zinc-900">تفاصيل الخيار المختار</div>

              {!selectedOption ? (
                <div className="mt-3 rounded-3xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">اختر خيارًا.</div>
              ) : selectedOption.type === "pickup" ? (
                <div className="mt-3 space-y-3">
                  <div className="text-xs font-bold text-zinc-600">اختر فرع الاستلام</div>

                  {pickupPoints.length === 0 ? (
                    <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                      لا توجد فروع لهذه المدينة.
                    </div>
                  ) : (
                    <select
                      value={selectedPickupPointId || ""}
                      onChange={(e) => setSelectedPickupPointId(e.target.value || null)}
                      className={clsx(
                        "h-11 w-full rounded-2xl border bg-white px-4 text-sm outline-none",
                        "border-zinc-200 focus:border-[color:var(--color-primary-400)] focus:ring-4 focus:ring-[color:var(--color-primary-200)]"
                      )}
                    >
                      <option value="">اختر الفرع…</option>
                      {pickupPoints.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title} — {p.address}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <div className="mt-3 rounded-3xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
                  <div>
                    النوع: <span className="font-black text-zinc-900">{selectedOption.type}</span>
                  </div>
                  <div className="mt-1">
                    COD متاح؟{" "}
                    <span className={clsx("font-black", selectedOption.pricing.cod_available ? "text-emerald-700" : "text-red-600")}>
                      {selectedOption.pricing.cod_available ? "نعم" : "لا"}
                    </span>
                  </div>
                  {selectedOption.service?.eta_text ? (
                    <div className="mt-1">
                      المدة: <span className="font-black text-zinc-900">{selectedOption.service.eta_text}</span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-white p-4">
              <div className="text-sm font-black text-zinc-900">ملخص</div>

              {!summary ? (
                <div className="mt-3 rounded-3xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">—</div>
              ) : (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-3xl border border-zinc-200 bg-white p-4">
                      <div className="text-xs font-bold text-zinc-500">سعر الشحن</div>
                      <div className="mt-1 text-lg font-black text-zinc-900">{money(summary.shipping, summary.currency)}</div>
                    </div>

                    <div className="rounded-3xl border border-zinc-200 bg-white p-4">
                      <div className="text-xs font-bold text-zinc-500">رسوم COD على العميل</div>
                      <div className="mt-1 text-lg font-black text-zinc-900">{money(summary.codFeeCustomer, summary.currency)}</div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
                    <div className="text-xs font-bold text-zinc-500">الإجمالي على العميل</div>
                    <div className="mt-1 text-xl font-black text-zinc-900">{money(summary.totalCustomer, summary.currency)}</div>
                  </div>

                  {selectedOption?.type === "platform" ? (
                    <div className="rounded-3xl border border-zinc-200 bg-white p-4">
                      <div className="text-xs font-bold text-zinc-500">تكلفة على التاجر</div>
                      <div className="mt-1 text-lg font-black text-zinc-900">{money(summary.totalMerchant, summary.currency)}</div>
                    </div>
                  ) : null}

                  {selectedOption?.type === "pickup" && pickupPoints.length > 0 && !selectedPickupPointId ? (
                    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
                      اختر فرع الاستلام لإكمال الاختبار.
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
          هذه الصفحة تجريبية داخل لوحة التاجر. ما تظهر للعميل.
        </div>
      </div>
    </div>
  );
}
