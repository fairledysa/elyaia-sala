//apps/merchant/src/app/(app)/orders/[id]/edit/_components/EditOrderItemOptionsModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Modal, {
  ModalBody,
  ModalFooter,
  ModalFooterChild,
  ModalHeader,
} from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import type { OrderDetails, OrderItem } from "../OrderEditPageClient";
import { n, s } from "../OrderEditPageClient";

type SearchOptionValue = {
  id?: string | null;
  name?: string | null;
  extra_price?: number | null;
  quantity?: number | null;
  is_default?: boolean | null;
  image_url?: string | null;
  display_value?: string | null;
};

type SearchOption = {
  id?: string | null;
  name?: string | null;
  is_required?: boolean | null;
  option_field_type?: string | null;
  display_type?: string | null;
  values?: SearchOptionValue[] | null;
};

type SearchVariantValue = {
  option_id?: string | null;
  option_name?: string | null;
  value_id?: string | null;
  value_name?: string | null;
};

type SearchVariant = {
  id?: string | null;
  sku?: string | null;
  barcode?: string | null;
  price?: number | null;
  sale_price?: number | null;
  qty?: number | null;
  qtyUnlimited?: boolean | null;
  weight?: number | null;
  weightUnit?: string | null;
  option_value_ids?: string[] | null;
  option_value_names?: string[] | null;
  values?: SearchVariantValue[] | null;
  is_default?: boolean | null;
};

type SearchProduct = {
  id: string;
  name?: string | null;
  sku?: string | null;
  image_url?: string | null;
  price?: number | null;
  sale_price?: number | null;
  qty?: number | null;
  qtyUnlimited?: boolean | null;
  maximum_quantity_per_order?: number | null;
  optionsEnabled?: boolean | null;
  options?: SearchOption[] | null;
  variants?: SearchVariant[] | null;
  weight?: number | null;
  weightUnit?: string | null;
  base_price_fallback?: number | null;
  base_qty_fallback?: number | null;
};

type SearchResponse = {
  rows?: SearchProduct[];
  error?: string;
};

function optionValueName(x: SearchOptionValue) {
  return s(x?.display_value) || s(x?.name) || "-";
}

function normalizeText(x: unknown) {
  return s(x).toLowerCase();
}

function buildVariantLabel(v: SearchVariant) {
  const parts: string[] = [];

  const values = Array.isArray(v?.values) ? v.values : [];
  if (values.length > 0) {
    for (const row of values) {
      const optionName = s(row?.option_name);
      const valueName = s(row?.value_name);
      if (optionName && valueName) {
        parts.push(`${optionName}: ${valueName}`);
      }
    }
  } else {
    const names = Array.isArray(v?.option_value_names)
      ? v.option_value_names
      : [];
    for (const name of names) {
      const clean = s(name);
      if (clean) parts.push(clean);
    }
  }

  if (parts.length === 0 && s(v?.sku)) parts.push(s(v?.sku));
  if (parts.length === 0 && s(v?.id)) parts.push(`Variant ${s(v?.id)}`);

  return parts.join(" - ");
}

function hasAnyRealVariantValues(variants: SearchVariant[]) {
  return variants.some((variant) => {
    const ids = Array.isArray(variant?.option_value_ids)
      ? variant.option_value_ids.map((x) => s(x)).filter(Boolean)
      : [];
    const values = Array.isArray(variant?.values) ? variant.values : [];
    const names = Array.isArray(variant?.option_value_names)
      ? variant.option_value_names.map((x) => s(x)).filter(Boolean)
      : [];
    return ids.length > 0 || values.length > 0 || names.length > 0;
  });
}

function currentItemOptionMap(item: OrderItem, options: SearchOption[]) {
  const map: Record<string, string> = {};

  const selectedIds = Array.isArray(item?.selected_option_value_ids)
    ? item.selected_option_value_ids.map((x: any) => s(x)).filter(Boolean)
    : [];

  if (selectedIds.length > 0) {
    for (const option of options) {
      const optionId = s(option?.id);
      const values = Array.isArray(option?.values) ? option.values : [];

      if (!optionId) continue;

      const matchedValue = values.find((value) =>
        selectedIds.includes(s(value?.id))
      );

      if (matchedValue?.id) {
        map[optionId] = s(matchedValue.id);
      }
    }

    if (Object.keys(map).length > 0) {
      return map;
    }
  }

  const rawSelectedOptions = Array.isArray(item?.selected_options)
    ? item.selected_options
    : [];

  for (const option of options) {
    const optionId = s(option?.id);
    const optionName = s(option?.name);
    const values = Array.isArray(option?.values) ? option.values : [];

    const hit = rawSelectedOptions.find(
      (row: any) => s(row?.name) === optionName
    );

    const selectedValueLabel = s(hit?.value);
    if (!optionId || !selectedValueLabel) continue;

    const selectedValue = values.find(
      (value) =>
        s(value?.id) === selectedValueLabel ||
        normalizeText(optionValueName(value)) === normalizeText(selectedValueLabel)
    );

    if (selectedValue?.id) {
      map[optionId] = s(selectedValue.id);
    }
  }

  return map;
}

export default function EditOrderItemOptionsModal({
  open,
  order,
  item,
  onClose,
  onSaved,
}: {
  open: boolean;
  order: OrderDetails;
  item: OrderItem | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [product, setProduct] = useState<SearchProduct | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [selectedOptionMap, setSelectedOptionMap] = useState<Record<string, string>>({});
  const [priceDraft, setPriceDraft] = useState("");
  const [qtyDraft, setQtyDraft] = useState("");

  useEffect(() => {
    if (!open || !item?.product_id) return;

    const currentItem = item;
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setSaving(false);
        setError("");
        setFormError("");
        setProduct(null);
        setSelectedVariantId("");
        setSelectedOptionMap({});
        setPriceDraft(String(n(currentItem?.unit_price)));
        setQtyDraft(String(n(currentItem?.qty) || 1));

        const q = s(currentItem?.sku) || s(currentItem?.name);
        if (!q) {
          throw new Error("بيانات المنتج غير متوفرة");
        }

        const res = await fetch(
          `/api/orders/products-search?q=${encodeURIComponent(q)}&limit=20`,
          {
            cache: "no-store",
            credentials: "include",
          }
        );

        const data: SearchResponse = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "تعذر تحميل المنتج");
        }

        const rows = Array.isArray(data?.rows) ? data.rows : [];

        const p =
          rows.find((row) => s(row.id) === s(currentItem?.product_id)) ||
          rows.find((row) => s(row.sku) === s(currentItem?.sku)) ||
          rows.find(
            (row) => normalizeText(row.name) === normalizeText(currentItem?.name)
          ) ||
          null;

        if (!p) {
          throw new Error("بيانات المنتج غير متوفرة");
        }

        if (cancelled) return;

        setProduct(p);
        setSelectedVariantId(s(currentItem?.variant_id));

        const options = Array.isArray(p.options) ? p.options : [];
        const initialMap = currentItemOptionMap(currentItem, options);
        setSelectedOptionMap(initialMap);
      } catch (e: any) {
        if (cancelled) return;
        setError(s(e?.message) || "تعذر تحميل المنتج");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [open, item]);

  const options = useMemo(() => {
    return Array.isArray(product?.options) ? product.options : [];
  }, [product]);

  const selectedVariants = useMemo(() => {
    return Array.isArray(product?.variants) ? product.variants : [];
  }, [product]);

  const usesOptions = useMemo(() => {
    return Boolean(product?.optionsEnabled) && options.length > 0;
  }, [product, options]);

  const variantMatchingRequired = useMemo(() => {
    if (!usesOptions) return false;
    if (selectedVariants.length === 0) return false;
    return hasAnyRealVariantValues(selectedVariants);
  }, [usesOptions, selectedVariants]);

  const optionsReady = useMemo(() => {
    if (!usesOptions) return true;

    return options.every((opt) => {
      const optionId = s(opt?.id);
      if (!optionId) return true;
      return Boolean(s(selectedOptionMap[optionId]));
    });
  }, [usesOptions, options, selectedOptionMap]);

  const matchedVariant = useMemo(() => {
    const variants = selectedVariants;

    if (!usesOptions) {
      return variants.find((v) => s(v?.id) === s(selectedVariantId)) || null;
    }

    if (!variantMatchingRequired) {
      return null;
    }

    const selectedPairs = options
      .map((opt) => {
        const optionId = s(opt?.id);
        const optionName = s(opt?.name);
        const valueId = s(selectedOptionMap[optionId]);

        const values = Array.isArray(opt?.values) ? opt.values : [];
        const value = values.find((x) => s(x?.id) === valueId);

        if (!optionId || !valueId || !value) return null;

        return {
          optionId,
          optionName,
          valueId,
          valueName: optionValueName(value),
        };
      })
      .filter(Boolean) as Array<{
        optionId: string;
        optionName: string;
        valueId: string;
        valueName: string;
      }>;

    if (selectedPairs.length !== options.length) return null;

    return (
      variants.find((variant) => {
        const variantValues = Array.isArray(variant?.values) ? variant.values : [];
        const variantIds = Array.isArray(variant?.option_value_ids)
          ? variant.option_value_ids.map((x) => s(x)).filter(Boolean)
          : [];
        const variantValueNames = Array.isArray(variant?.option_value_names)
          ? variant.option_value_names.map((x) => normalizeText(x)).filter(Boolean)
          : [];

        if (variantIds.length > 0) {
          if (variantIds.length !== selectedPairs.length) return false;
          return selectedPairs.every((pair) => variantIds.includes(pair.valueId));
        }

        if (variantValues.length > 0) {
          return selectedPairs.every((pair) => {
            return variantValues.some((row) => {
              const sameOption =
                (s(row?.option_id) && s(row?.option_id) === pair.optionId) ||
                normalizeText(row?.option_name) === normalizeText(pair.optionName);

              const sameValue =
                (s(row?.value_id) && s(row?.value_id) === pair.valueId) ||
                normalizeText(row?.value_name) === normalizeText(pair.valueName);

              return sameOption && sameValue;
            });
          });
        }

        if (variantValueNames.length > 0) {
          return selectedPairs.every((pair) =>
            variantValueNames.includes(normalizeText(pair.valueName))
          );
        }

        return false;
      }) || null
    );
  }, [
    usesOptions,
    selectedVariants,
    selectedVariantId,
    options,
    selectedOptionMap,
    variantMatchingRequired,
  ]);

  const currentPrice = useMemo(() => {
    if (matchedVariant) {
      if (n(matchedVariant.sale_price) > 0) return n(matchedVariant.sale_price);
      if (n(matchedVariant.price) > 0) return n(matchedVariant.price);
    }

    if (!usesOptions && selectedVariantId) {
      const picked = selectedVariants.find(
        (variant) => s(variant?.id) === s(selectedVariantId)
      );
      if (picked) {
        if (n(picked.sale_price) > 0) return n(picked.sale_price);
        if (n(picked.price) > 0) return n(picked.price);
      }
    }

    if (product) {
      if (n(product.sale_price) > 0) return n(product.sale_price);
      if (n(product.price) > 0) return n(product.price);
      if (n(product.base_price_fallback) > 0) return n(product.base_price_fallback);
    }

    return 0;
  }, [matchedVariant, product, selectedVariantId, selectedVariants, usesOptions]);

  const currentAvailableQty = useMemo(() => {
    if (matchedVariant) {
      return n(matchedVariant.qty);
    }

    if (!usesOptions && selectedVariantId) {
      const picked = selectedVariants.find(
        (variant) => s(variant?.id) === s(selectedVariantId)
      );
      if (picked) {
        return n(picked.qty);
      }
    }

    if (product) {
      if (n(product.qty) > 0) return n(product.qty);
      return n(product.base_qty_fallback);
    }

    return 0;
  }, [matchedVariant, product, selectedVariantId, selectedVariants, usesOptions]);

  const currentUnlimited = useMemo(() => {
    if (matchedVariant) return Boolean(matchedVariant.qtyUnlimited);

    if (!usesOptions && selectedVariantId) {
      const picked = selectedVariants.find(
        (variant) => s(variant?.id) === s(selectedVariantId)
      );
      if (picked) return Boolean(picked.qtyUnlimited);
    }

    if (product) return Boolean(product.qtyUnlimited);
    return false;
  }, [matchedVariant, product, selectedVariantId, selectedVariants, usesOptions]);

  const maxQtyPerOrder = useMemo(() => {
    return n(product?.maximum_quantity_per_order) > 0
      ? n(product?.maximum_quantity_per_order)
      : null;
  }, [product]);

  useEffect(() => {
    if (!product) return;
    setPriceDraft(String(currentPrice || 0));
  }, [product, currentPrice]);

  function pickOptionValue(optionId: string, valueId: string) {
    setFormError("");
    setSelectedOptionMap((prev) => ({
      ...prev,
      [optionId]: valueId,
    }));
  }

  function pickVariant(variantId: string) {
    setFormError("");
    setSelectedVariantId(variantId);

    const picked = selectedVariants.find((variant) => s(variant?.id) === s(variantId));
    if (!picked) return;

    const nextPrice =
      n(picked.sale_price) > 0 ? n(picked.sale_price) : n(picked.price);

    setPriceDraft(String(nextPrice));
  }

  async function save() {
    try {
      if (!item?.id) return;

      setFormError("");

      if (usesOptions && !optionsReady) {
        setFormError("يرجى اختيار جميع الخيارات المطلوبة قبل حفظ التعديلات.");
        return;
      }

      if (variantMatchingRequired && !matchedVariant) {
        setFormError("عذرًا، التركيبة المختارة غير متوفرة لهذا المنتج.");
        return;
      }

      const qty = Number(qtyDraft);
      const unit_price = Number(priceDraft);

      if (!Number.isFinite(qty) || qty <= 0) {
        setFormError("يرجى إدخال كمية صحيحة أكبر من 0.");
        return;
      }

      if (!Number.isFinite(unit_price) || unit_price < 0) {
        setFormError("يرجى إدخال سعر صحيح.");
        return;
      }

      if (maxQtyPerOrder && qty > maxQtyPerOrder) {
        setFormError(
          `عذرًا، الحد الأقصى المسموح لهذا المنتج في الطلب هو ${maxQtyPerOrder} قطعة.`
        );
        return;
      }

      if (!currentUnlimited && qty > currentAvailableQty) {
        setFormError(
          `عذرًا، الكمية المتاحة حاليًا لهذه التركيبة هي ${currentAvailableQty} قطعة فقط.`
        );
        return;
      }

      const selected_option_value_ids = usesOptions
        ? Object.values(selectedOptionMap).map((x) => s(x)).filter(Boolean)
        : [];

      const selected_options = usesOptions
        ? options
            .map((opt) => {
              const optionId = s(opt?.id);
              const valueId = s(selectedOptionMap[optionId]);
              const values = Array.isArray(opt?.values) ? opt.values : [];
              const value = values.find((x) => s(x?.id) === valueId);

              if (!optionId || !valueId || !value) return null;

              return {
                name: s(opt?.name),
                value: optionValueName(value),
              };
            })
            .filter(Boolean)
        : [];

      const finalVariantId = variantMatchingRequired
        ? s(matchedVariant?.id) || null
        : selectedVariantId || null;

      const finalSku = variantMatchingRequired
        ? s(matchedVariant?.sku) || null
        : s(selectedVariants.find((v) => s(v?.id) === s(finalVariantId))?.sku) ||
          s(item?.sku) ||
          null;

      const payload = {
        qty,
        unit_price,
        variant_id: finalVariantId,
        sku: finalSku,
        selected_option_value_ids,
        selected_options,
      };

      setSaving(true);

      const res = await fetch(`/api/orders/${order.id}/items/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) {
        throw new Error(data?.error || "فشل تحديث الخيارات");
      }

      await onSaved();
    } catch (e: any) {
      setFormError(s(e?.message) || "تعذر حفظ التعديلات حاليًا. حاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={open} setIsOpen={() => onClose()} isStaticBackdrop isScrollable>
      <ModalHeader>تعديل الخيارات</ModalHeader>

      <ModalBody>
        <div dir="rtl" className="space-y-4">
          {loading ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              جارٍ تحميل الخيارات...
            </div>
          ) : error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
              {error}
            </div>
          ) : !product ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              لا توجد بيانات
            </div>
          ) : (
            <>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-sm text-slate-500">المنتج</div>
                <div className="mt-1 text-base font-medium text-slate-700">
                  {s(product.name) || "منتج"}
                </div>
              </div>

              {usesOptions ? (
                <div className="space-y-4 rounded-md border border-slate-200 bg-slate-50 p-4">
                  {options.map((option) => {
                    const optionId = s(option?.id);
                    const values = Array.isArray(option?.values) ? option.values : [];
                    const currentValue = s(selectedOptionMap[optionId]);

                    return (
                      <div key={optionId}>
                        <div className="mb-2 text-sm font-medium text-slate-700">
                          {s(option?.name) || "خيار"}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {values.map((value) => {
                            const valueId = s(value?.id);
                            const active = currentValue === valueId;

                            return (
                              <button
                                key={valueId}
                                type="button"
                                onClick={() => pickOptionValue(optionId, valueId)}
                                className={`rounded-md border px-3 py-2 text-sm transition ${
                                  active
                                    ? "border-[#83e0d1] bg-[#bfeee4] text-[#0f4c81]"
                                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                {optionValueName(value)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {variantMatchingRequired && optionsReady && matchedVariant ? (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
                      <div>المتغير المحدد: {buildVariantLabel(matchedVariant)}</div>
                      <div className="mt-1" dir="ltr">
                        SKU: {s(matchedVariant?.sku) || "-"}
                      </div>
                    </div>
                  ) : null}

                  {variantMatchingRequired && optionsReady && !matchedVariant ? (
                    <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
                      التركيبة المختارة غير موجودة
                    </div>
                  ) : null}
                </div>
              ) : Array.isArray(product.variants) && product.variants.length > 0 ? (
                <div>
                  <div className="mb-2 text-sm font-medium text-slate-700">
                    اختر المتغير
                  </div>

                  <select
                    value={selectedVariantId}
                    onChange={(e) => pickVariant(e.target.value)}
                    className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-right text-sm outline-none"
                  >
                    {(product.variants || []).map((variant) => (
                      <option key={s(variant.id)} value={s(variant.id)}>
                        {buildVariantLabel(variant)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  هذا المنتج لا يحتوي على خيارات قابلة للتعديل.
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-2 text-sm font-medium text-slate-700">الكمية</div>
                  <input
                    type="number"
                    min="1"
                    dir="ltr"
                    value={qtyDraft}
                    onChange={(e) => {
                      setFormError("");
                      setQtyDraft(e.target.value);
                    }}
                    className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-left text-sm outline-none"
                  />
                </div>

                <div>
                  <div className="mb-2 text-sm font-medium text-slate-700">السعر</div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    dir="ltr"
                    value={priceDraft}
                    onChange={(e) => {
                      setFormError("");
                      setPriceDraft(e.target.value);
                    }}
                    className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-left text-sm outline-none"
                  />
                </div>
              </div>

              <div className="rounded-md border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
                <div>نوع المخزون: {currentUnlimited ? "غير محدود" : "محدود"}</div>
                {!currentUnlimited ? (
                  <div className="mt-1">المتاح: {currentAvailableQty}</div>
                ) : null}
                {maxQtyPerOrder ? (
                  <div className="mt-1">الحد الأقصى في الطلب: {maxQtyPerOrder}</div>
                ) : null}
              </div>

              {formError ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {formError}
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
            onClick={onClose}
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
            onClick={save}
            isLoading={saving}
            isDisable={
              saving ||
              loading ||
              !!error ||
              (usesOptions && !optionsReady) ||
              (variantMatchingRequired && !matchedVariant)
            }
          >
            حفظ التعديلات
          </Button>
        </ModalFooterChild>
      </ModalFooter>
    </Modal>
  );
}