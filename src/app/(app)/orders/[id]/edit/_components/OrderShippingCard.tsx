// FILE: apps/merchant/src/app/(app)/orders/[id]/edit/_components/OrderShippingCard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Truck, ChevronDown } from "lucide-react";
import Modal, {
  ModalBody,
  ModalFooter,
  ModalFooterChild,
  ModalHeader,
} from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import type { OrderDetails } from "../OrderEditPageClient";
import { s } from "../OrderEditPageClient";

type RefCity = {
  id: string;
  name_ar?: string | null;
  name_en?: string | null;
};

type RefDistrict = {
  id: string;
  city_id?: string | null;
  name_ar?: string | null;
  name_en?: string | null;
};

type ShippingOption = {
  id: string;
  store_shipping_carrier_id?: string | null;
  shipping_carrier_id?: string | null;
  carrier_name?: string | null;
  carrier_type?: string | null;
  eta_text?: string | null;
  customer_price?: number | null;
  cod_enabled?: boolean | null;
  cod_fee_customer?: number | null;
  currency?: string | null;
};

type ShippingFormResponse = {
  ok?: boolean;
  form?: {
    requires_shipping?: boolean;
    requires_shipping_by_items?: boolean;
    free_shipping?: boolean;
    shipping_rate_id?: string | null;
    shipping_amount?: number | null;

    city_id?: string | null;
    district_id?: string | null;
    address_line1?: string | null;
    address_line2?: string | null;
    postal_code?: string | null;
  };
  cities?: RefCity[];
  districts?: RefDistrict[];
  shipping_options?: ShippingOption[];
  error?: string;
};

function money(amount: number, currency = "SAR") {
  const value = Number(amount ?? 0);
  const safe = Number.isFinite(value) ? value : 0;

  return `${currency} ${new Intl.NumberFormat("en-SA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(safe)}`;
}

function textCity(x: RefCity) {
  return s(x?.name_ar) || s(x?.name_en) || "مدينة";
}

function textDistrict(x: RefDistrict) {
  return s(x?.name_ar) || s(x?.name_en) || "حي";
}

function buildShownCity(order: OrderDetails, fallbackCity: string) {
  const shippingAddress =
    order?.shipping_address && typeof order.shipping_address === "object"
      ? (order.shipping_address as any)
      : null;

  return (
    s(shippingAddress?.city_name) ||
    s(order?.customer_address?.ref_cities?.name_ar) ||
    s(order?.customer_address?.ref_cities?.name_en) ||
    fallbackCity ||
    "-"
  );
}

function buildShownAddress(order: OrderDetails, fallbackAddress: string) {
  const shippingAddress =
    order?.shipping_address && typeof order.shipping_address === "object"
      ? (order.shipping_address as any)
      : null;

  return (
    s(shippingAddress?.text) ||
    [
      s(shippingAddress?.address_line1),
      s(shippingAddress?.address_line2),
      s(shippingAddress?.district_name),
      s(shippingAddress?.city_name),
      s(shippingAddress?.postal_code)
        ? `الرمز البريدي ${s(shippingAddress?.postal_code)}`
        : "",
    ]
      .filter(Boolean)
      .join("، ") ||
    fallbackAddress
  );
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export default function OrderShippingCard({
  order,
  city,
  fullAddress,
  onUpdated,
}: {
  order: OrderDetails;
  city: string;
  fullAddress: string;
  onUpdated?: () => Promise<void> | void;
}) {
  const shippingSnapshot = (order as any)?.shipping_snapshot ?? null;
  const carrier = order?.shipping_carrier ?? null;

  const shippingAddress =
    order?.shipping_address && typeof order.shipping_address === "object"
      ? (order.shipping_address as any)
      : null;

  const shownCity = buildShownCity(order, city);
  const shownAddress = buildShownAddress(order, fullAddress);

  const requiresShippingNow =
    shippingSnapshot?.requires_shipping === false
      ? false
      : Boolean(order?.shipping_id || shippingAddress || order?.address_id);

  const companyName =
    !requiresShippingNow
      ? "بدون شحن"
      : s(shippingSnapshot?.store_shipping_carrier_name) ||
        s(shippingSnapshot?.carrier_name) ||
        s(carrier?.name) ||
        "-";

  const duration =
    requiresShippingNow && s(shippingSnapshot?.eta_text)
      ? `( الشحن ${s(shippingSnapshot?.eta_text)} )`
      : "";

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [cities, setCities] = useState<RefCity[]>([]);
  const [districts, setDistricts] = useState<RefDistrict[]>([]);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);

  const [requiresShipping, setRequiresShipping] = useState(true);
  const [requiresShippingByItems, setRequiresShippingByItems] = useState(false);
  const [freeShipping, setFreeShipping] = useState(false);
  const [shippingRateId, setShippingRateId] = useState("");

  const [cityId, setCityId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [postalCode, setPostalCode] = useState("");

  async function loadForm(nextCityId?: string) {
    try {
      setLoading(true);
      setError("");

      const qs = nextCityId ? `?city_id=${encodeURIComponent(nextCityId)}` : "";

      const res = await fetch(`/api/orders/${order.id}/shipping${qs}`, {
        cache: "no-store",
        credentials: "include",
      });

      const data: ShippingFormResponse = await safeJson(res);

      if (!res.ok) {
        throw new Error(data?.error || "تعذر تحميل بيانات الشحن");
      }

      const form = data?.form ?? {};

      setCities(Array.isArray(data?.cities) ? data.cities : []);
      setDistricts(Array.isArray(data?.districts) ? data.districts : []);
      setShippingOptions(
        Array.isArray(data?.shipping_options) ? data.shipping_options : []
      );

      setRequiresShipping(Boolean(form?.requires_shipping));
      setRequiresShippingByItems(Boolean(form?.requires_shipping_by_items));
      setFreeShipping(Boolean(form?.free_shipping));
      setShippingRateId(s(form?.shipping_rate_id));

      setCityId(s(form?.city_id || nextCityId));
      setDistrictId(s(form?.district_id));
      setAddressLine1(s(form?.address_line1));
      setAddressLine2(s(form?.address_line2));
      setPostalCode(s(form?.postal_code));
    } catch (e: any) {
      setError(s(e?.message) || "تعذر تحميل بيانات الشحن");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;

    void loadForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleCityChange(value: string) {
    setCityId(value);
    setDistrictId("");
    setShippingRateId("");
    setShippingOptions([]);

    await loadForm(value);
  }

  useEffect(() => {
    if (!requiresShipping) {
      setShippingRateId("");
      setDistrictId("");
    }
  }, [requiresShipping]);

  const currentRate = useMemo(() => {
    return shippingOptions.find((x) => s(x.id) === s(shippingRateId)) || null;
  }, [shippingOptions, shippingRateId]);

  async function handleSave() {
    try {
      setSaving(true);
      setError("");

      if (requiresShipping) {
        if (!cityId) {
          setError("اختر المدينة");
          return;
        }

        if (!addressLine1) {
          setError("العنوان مطلوب");
          return;
        }

        if (!shippingRateId) {
          setError("اختر شركة الشحن");
          return;
        }
      }

      const res = await fetch(`/api/orders/${order.id}/shipping`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          requires_shipping: requiresShipping,
          free_shipping: requiresShipping ? freeShipping : false,
          shipping_rate_id: requiresShipping ? shippingRateId || null : null,
          city_id: requiresShipping ? cityId || null : null,
          district_id: requiresShipping ? districtId || null : null,
          address_line1: requiresShipping ? addressLine1 : null,
          address_line2: requiresShipping ? addressLine2 || null : null,
          postal_code: requiresShipping ? postalCode || null : null,
        }),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        throw new Error(data?.error || "فشل تحديث الشحن");
      }

      setOpen(false);
      await onUpdated?.();
    } catch (e: any) {
      setError(s(e?.message) || "فشل تحديث الشحن");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="adm-order-edit-card adm-order-edit-shipping">
        <div className="adm-order-edit-card__head">
          <h3 className="adm-order-edit-card__title">الشحن</h3>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="adm-order-edit-btn adm-order-edit-btn--outline"
          >
            تعديل
            <Truck className="h-4 w-4" />
          </button>
        </div>

        <div className="adm-order-edit-shipping__body">
          <div className="adm-order-edit-shipping__main">
            <div className="adm-order-edit-shipping__mark">
              {requiresShippingNow && companyName !== "-"
                ? companyName.slice(0, 2)
                : "--"}
            </div>

            <div className="adm-order-edit-shipping__info">
              <div className="adm-order-edit-shipping__city">
                {requiresShippingNow ? shownCity || "-" : "بدون شحن"}
              </div>

              <div className="adm-order-edit-shipping__company">
                {requiresShippingNow ? companyName : "لا يتطلب شحن / توصيل"}
              </div>
            </div>
          </div>

          {requiresShippingNow && shownAddress ? (
            <div className="adm-order-edit-shipping__address">
              {shownAddress}
            </div>
          ) : null}

          {requiresShippingNow && duration ? (
            <div className="adm-order-edit-shipping__duration">{duration}</div>
          ) : null}
        </div>
      </section>

      <Modal
        isOpen={open}
        setIsOpen={() => setOpen(false)}
        isStaticBackdrop
        isScrollable
      >
        <ModalHeader>تعديل بيانات الشحن</ModalHeader>

        <ModalBody>
          <div dir="rtl" className="space-y-4">
            {loading ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                جارٍ تحميل بيانات الشحن...
              </div>
            ) : (
              <>
                <div>
                  <div className="mb-2 text-sm font-medium text-slate-700">
                    يتطلب شحن / توصيل؟
                  </div>

                  <div className="relative">
                    <select
                      value={requiresShipping ? "yes" : "no"}
                      onChange={(e) =>
                        setRequiresShipping(e.target.value === "yes")
                      }
                      className="h-12 w-full appearance-none rounded-md border border-slate-200 bg-white px-4 text-right text-sm outline-none"
                    >
                      <option value="yes">نعم يتطلب شحن / توصيل</option>
                      <option value="no">لا يتطلب شحن / توصيل</option>
                    </select>

                    <ChevronDown className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>

                  {requiresShippingByItems ? (
                    <div className="mt-2 text-xs text-slate-400">
                      هذا الطلب يحتوي منتجات تتطلب شحن في المتجر.
                    </div>
                  ) : null}
                </div>

                {requiresShipping ? (
                  <>
                    <div>
                      <div className="mb-2 text-sm font-medium text-slate-700">
                        نعم، الشحن مجاني؟
                      </div>

                      <div className="relative">
                        <select
                          value={freeShipping ? "yes" : "no"}
                          onChange={(e) =>
                            setFreeShipping(e.target.value === "yes")
                          }
                          className="h-12 w-full appearance-none rounded-md border border-slate-200 bg-white px-4 text-right text-sm outline-none"
                        >
                          <option value="yes">نعم، الشحن مجاني</option>
                          <option value="no">لا، الشحن مدفوع</option>
                        </select>

                        <ChevronDown className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>

                    <div className="pt-1 text-center text-[18px] font-medium text-slate-700">
                      عنوان الشحن
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="relative">
                        <select
                          value={cityId}
                          onChange={(e) => void handleCityChange(e.target.value)}
                          className="h-12 w-full appearance-none rounded-md border border-slate-200 bg-white px-4 text-right text-sm outline-none"
                        >
                          <option value="">اختر المدينة</option>
                          {cities.map((item) => (
                            <option key={item.id} value={item.id}>
                              {textCity(item)}
                            </option>
                          ))}
                        </select>

                        <ChevronDown className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>

                      <div className="relative">
                        <select
                          value={districtId}
                          onChange={(e) => setDistrictId(e.target.value)}
                          className="h-12 w-full appearance-none rounded-md border border-slate-200 bg-white px-4 text-right text-sm outline-none"
                          disabled={!cityId}
                        >
                          <option value="">اختر الحي</option>
                          {districts.map((item) => (
                            <option key={item.id} value={item.id}>
                              {textDistrict(item)}
                            </option>
                          ))}
                        </select>

                        <ChevronDown className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>

                    <input
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      placeholder="العنوان"
                      className="h-12 w-full rounded-md border border-slate-200 bg-white px-4 text-right text-sm outline-none"
                    />

                    <input
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                      placeholder="الشارع / تفاصيل إضافية"
                      className="h-12 w-full rounded-md border border-slate-200 bg-white px-4 text-right text-sm outline-none"
                    />

                    <input
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="الرمز البريدي (اختياري)"
                      className="h-12 w-full rounded-md border border-slate-200 bg-white px-4 text-right text-sm outline-none"
                      dir="ltr"
                    />

                    {cityId ? (
                      <>
                        <div className="pt-2 text-center text-[18px] font-medium text-slate-700">
                          خيارات الشحن
                        </div>

                        <div className="space-y-3">
                          {shippingOptions.length === 0 ? (
                            <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                              لا توجد شركات شحن متاحة لهذه المدينة
                            </div>
                          ) : (
                            shippingOptions.map((item) => {
                              const checked = s(item.id) === s(shippingRateId);

                              return (
                                <label
                                  key={item.id}
                                  className={`flex cursor-pointer items-center justify-between gap-4 rounded-md border px-4 py-3 ${
                                    checked
                                      ? "border-[#83e0d1] bg-[#f0fffb]"
                                      : "border-slate-200 bg-white"
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="radio"
                                      name="shipping_rate_id"
                                      checked={checked}
                                      onChange={() => setShippingRateId(item.id)}
                                    />

                                    <div className="text-right">
                                      <div className="text-sm font-medium text-slate-700">
                                        {s(item.carrier_name) || "شركة شحن"}
                                      </div>

                                      <div className="mt-1 text-xs text-slate-400">
                                        {s(item.eta_text) || "—"}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="text-left">
                                    {checked && freeShipping ? (
                                      <span className="inline-flex rounded-full bg-[#9dc45a] px-3 py-1 text-xs font-medium text-white">
                                        مجاني
                                      </span>
                                    ) : (
                                      <div className="text-sm font-medium text-slate-700">
                                        {money(
                                          Number(item.customer_price ?? 0),
                                          s(item.currency) || "SAR"
                                        )}
                                      </div>
                                    )}

                                    {!checked &&
                                    Number(item.customer_price ?? 0) <= 0 ? (
                                      <span className="mt-1 inline-flex rounded-full bg-[#9dc45a] px-3 py-1 text-xs font-medium text-white">
                                        مجاني
                                      </span>
                                    ) : null}
                                  </div>
                                </label>
                              );
                            })
                          )}
                        </div>

                        {currentRate ? (
                          <div className="rounded-md border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
                            <div>
                              شركة الشحن: {s(currentRate.carrier_name) || "-"}
                            </div>
                            <div className="mt-1">
                              مدة الشحن: {s(currentRate.eta_text) || "-"}
                            </div>
                            <div className="mt-1">
                              التكلفة:{" "}
                              {freeShipping
                                ? "مجاني"
                                : money(
                                    Number(currentRate.customer_price ?? 0),
                                    s(currentRate.currency) || "SAR"
                                  )}
                            </div>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </>
                ) : null}

                {error ? (
                  <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </ModalBody>

        <ModalFooter className="gap-4">
          <ModalFooterChild className="w-full">
            <Button
              className="w-full"
              variant="outline"
              color="zinc"
              dimension="lg"
              onClick={() => setOpen(false)}
              isDisable={saving}
            >
              إغلاق
            </Button>
          </ModalFooterChild>

          <ModalFooterChild className="w-full">
            <Button
              className="w-full"
              variant="solid"
              color="primary"
              dimension="lg"
              onClick={handleSave}
              isLoading={saving}
              isDisable={loading || saving}
            >
              حفظ
            </Button>
          </ModalFooterChild>
        </ModalFooter>
      </Modal>
    </>
  );
}