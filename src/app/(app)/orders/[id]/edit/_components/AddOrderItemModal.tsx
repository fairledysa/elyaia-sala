//app/(app)/orders/[id]/edit/_components/AddOrderItemModal.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import Modal, {
  ModalBody,
  ModalFooter,
  ModalFooterChild,
  ModalHeader,
} from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import type { OrderDetails } from "../OrderEditPageClient";
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

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 border px-4 py-3 text-sm font-medium transition ${
        active
          ? "border-[#83e0d1] bg-[#bfeee4] text-[#0f4c81]"
          : "border-slate-200 bg-white text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

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

export default function AddOrderItemModal({
  open,
  order,
  onClose,
  onSaved,
}: {
  open: boolean;
  order: OrderDetails;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [tab, setTab] = useState<"search" | "custom">("search");
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);

  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<SearchProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [selectedQty, setSelectedQty] = useState("1");
  const [selectedPrice, setSelectedPrice] = useState("");
  const [selectedOptionMap, setSelectedOptionMap] = useState<
    Record<string, string>
  >({});

  const [customName, setCustomName] = useState("");
  const [customQty, setCustomQty] = useState("1");
  const [customWeight, setCustomWeight] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customCostPrice, setCustomCostPrice] = useState("");

  useEffect(() => {
    if (!open) return;

    setTab("search");
    setSaving(false);
    setSearching(false);

    setQuery("");
    setRows([]);
    setSelectedProductId("");
    setSelectedVariantId("");
    setSelectedQty("1");
    setSelectedPrice("");
    setSelectedOptionMap({});

    setCustomName("");
    setCustomQty("1");
    setCustomWeight("");
    setCustomPrice("");
    setCustomCostPrice("");
  }, [open]);

  useEffect(() => {
    if (!open || tab !== "search") return;

    const q = s(query);
    if (q.length < 2) {
      setRows([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearching(true);

        const res = await fetch(
          `/api/orders/products-search?q=${encodeURIComponent(q)}`,
          {
            cache: "no-store",
            credentials: "include",
          },
        );

        const data: SearchResponse = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "تعذر البحث عن المنتجات");
        }

        setRows(Array.isArray(data?.rows) ? data.rows : []);
      } catch (e: any) {
        setRows([]);
        alert(s(e?.message) || "تعذر البحث عن المنتجات");
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, open, tab]);

  const selectedProduct = useMemo(() => {
    return rows.find((x) => s(x.id) === s(selectedProductId)) || null;
  }, [rows, selectedProductId]);

  const selectedOptions = useMemo(() => {
    return Array.isArray(selectedProduct?.options) ? selectedProduct.options : [];
  }, [selectedProduct]);

  const selectedVariants = useMemo(() => {
    return Array.isArray(selectedProduct?.variants)
      ? selectedProduct.variants
      : [];
  }, [selectedProduct]);

  const usesOptions = useMemo(() => {
    return Boolean(selectedProduct?.optionsEnabled) && selectedOptions.length > 0;
  }, [selectedProduct, selectedOptions]);

  const variantMatchingRequired = useMemo(() => {
    if (!usesOptions) return false;
    if (selectedVariants.length === 0) return false;
    return hasAnyRealVariantValues(selectedVariants);
  }, [usesOptions, selectedVariants]);

  const optionsReady = useMemo(() => {
    if (!usesOptions) return true;

    return selectedOptions.every((opt) => {
      const optionId = s(opt?.id);
      if (!optionId) return true;
      return Boolean(s(selectedOptionMap[optionId]));
    });
  }, [usesOptions, selectedOptions, selectedOptionMap]);

  const matchedVariant = useMemo(() => {
    const variants = selectedVariants;

    if (!usesOptions) {
      return variants.find((v) => s(v?.id) === s(selectedVariantId)) || null;
    }

    if (!variantMatchingRequired) {
      return null;
    }

    const selectedPairs = selectedOptions
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

    if (selectedPairs.length !== selectedOptions.length) return null;

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
            variantValueNames.includes(normalizeText(pair.valueName)),
          );
        }

        return false;
      }) || null
    );
  }, [
    usesOptions,
    selectedVariants,
    selectedVariantId,
    selectedOptions,
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
        (variant) => s(variant?.id) === s(selectedVariantId),
      );
      if (picked) {
        if (n(picked.sale_price) > 0) return n(picked.sale_price);
        if (n(picked.price) > 0) return n(picked.price);
      }
    }

    if (selectedProduct) {
      if (n(selectedProduct.sale_price) > 0) return n(selectedProduct.sale_price);
      if (n(selectedProduct.price) > 0) return n(selectedProduct.price);
      if (n(selectedProduct.base_price_fallback) > 0) {
        return n(selectedProduct.base_price_fallback);
      }
    }

    return 0;
  }, [matchedVariant, selectedProduct, selectedVariantId, selectedVariants, usesOptions]);

  const currentAvailableQty = useMemo(() => {
    if (matchedVariant) {
      return n(matchedVariant.qty);
    }

    if (!usesOptions && selectedVariantId) {
      const picked = selectedVariants.find(
        (variant) => s(variant?.id) === s(selectedVariantId),
      );
      if (picked) {
        return n(picked.qty);
      }
    }

    if (selectedProduct) {
      if (n(selectedProduct.qty) > 0) return n(selectedProduct.qty);
      return n(selectedProduct.base_qty_fallback);
    }

    return 0;
  }, [matchedVariant, selectedProduct, selectedVariantId, selectedVariants, usesOptions]);

  const currentUnlimited = useMemo(() => {
    if (matchedVariant) return Boolean(matchedVariant.qtyUnlimited);

    if (!usesOptions && selectedVariantId) {
      const picked = selectedVariants.find(
        (variant) => s(variant?.id) === s(selectedVariantId),
      );
      if (picked) return Boolean(picked.qtyUnlimited);
    }

    if (selectedProduct) return Boolean(selectedProduct.qtyUnlimited);
    return false;
  }, [matchedVariant, selectedProduct, selectedVariantId, selectedVariants, usesOptions]);

  const maxQtyPerOrder = useMemo(() => {
    return n(selectedProduct?.maximum_quantity_per_order) > 0
      ? n(selectedProduct?.maximum_quantity_per_order)
      : null;
  }, [selectedProduct]);

  const canSaveCatalog = useMemo(() => {
    if (!selectedProductId) return false;
    if (usesOptions && !optionsReady) return false;
    if (variantMatchingRequired && !matchedVariant) return false;
    return true;
  }, [
    selectedProductId,
    usesOptions,
    optionsReady,
    variantMatchingRequired,
    matchedVariant,
  ]);

  useEffect(() => {
    if (!selectedProduct) return;
    setSelectedPrice(String(currentPrice || 0));
  }, [selectedProduct, currentPrice]);

  function pickProduct(row: SearchProduct) {
    setSelectedProductId(s(row.id));
    setSelectedVariantId("");
    setSelectedOptionMap({});

    const hasOptions =
      Boolean(row.optionsEnabled) &&
      Array.isArray(row.options) &&
      row.options.length > 0;

    const variants = Array.isArray(row.variants) ? row.variants : [];
    const firstVariant =
      variants.find((v) => Boolean(v?.is_default)) || variants[0] || null;

    if (hasOptions) {
      const nextMap: Record<string, string> = {};

      for (const option of row.options || []) {
        const optionId = s(option?.id);
        const values = Array.isArray(option?.values) ? option.values : [];
        const defaultValue =
          values.find((v) => Boolean(v?.is_default)) || values[0] || null;

        if (optionId && defaultValue?.id) {
          nextMap[optionId] = s(defaultValue.id);
        }
      }

      setSelectedOptionMap(nextMap);
      setSelectedPrice(
        String(n(row.sale_price) > 0 ? n(row.sale_price) : n(row.price)),
      );
      return;
    }

    if (firstVariant?.id) {
      setSelectedVariantId(s(firstVariant.id));
      setSelectedPrice(
        String(
          n(firstVariant.sale_price) > 0
            ? n(firstVariant.sale_price)
            : n(firstVariant.price) > 0
              ? n(firstVariant.price)
              : n(row.sale_price) > 0
                ? n(row.sale_price)
                : n(row.price),
        ),
      );
    } else {
      setSelectedPrice(
        String(n(row.sale_price) > 0 ? n(row.sale_price) : n(row.price)),
      );
    }
  }

  function pickVariant(variantId: string) {
    setSelectedVariantId(variantId);

    const v = selectedVariants.find((x) => s(x.id) === s(variantId));
    if (!v) return;

    setSelectedPrice(String(n(v.sale_price) > 0 ? n(v.sale_price) : n(v.price)));
  }

  function pickOptionValue(optionId: string, valueId: string) {
    setSelectedOptionMap((prev) => ({
      ...prev,
      [optionId]: valueId,
    }));
  }

  async function saveSearchProduct() {
    try {
      if (!selectedProductId) {
        alert("اختر منتج");
        return;
      }

      if (usesOptions && !optionsReady) {
        alert("اختر جميع الخيارات المطلوبة");
        return;
      }

      if (variantMatchingRequired && !matchedVariant) {
        alert("التركيبة المختارة غير موجودة");
        return;
      }

      const qty = Number(selectedQty);
      const unit_price = Number(selectedPrice);

      if (!Number.isFinite(qty) || qty <= 0) {
        alert("الكمية غير صحيحة");
        return;
      }

      if (!Number.isFinite(unit_price) || unit_price < 0) {
        alert("السعر غير صحيح");
        return;
      }

      if (maxQtyPerOrder && qty > maxQtyPerOrder) {
        alert(`الحد الأقصى لهذا المنتج في الطلب هو ${maxQtyPerOrder}`);
        return;
      }

      if (!currentUnlimited && qty > currentAvailableQty) {
        alert(`الكمية المتاحة هي ${currentAvailableQty}`);
        return;
      }

      const optionRows = usesOptions
        ? selectedOptions
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

      const selectedOptionValueIds = usesOptions
        ? Object.values(selectedOptionMap).map((x) => s(x)).filter(Boolean)
        : [];

      setSaving(true);

      const res = await fetch(`/api/orders/${order.id}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          mode: "catalog",
          product_id: selectedProductId,
          variant_id: variantMatchingRequired
            ? s(matchedVariant?.id) || null
            : selectedVariantId || null,
          qty,
          unit_price,
          selected_options: optionRows,
          selected_option_value_ids: selectedOptionValueIds,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "فشل إضافة المنتج");
      }

      await onSaved();
    } catch (e: any) {
      alert(s(e?.message) || "فشل إضافة المنتج");
    } finally {
      setSaving(false);
    }
  }

  async function saveCustomProduct() {
    try {
      const name = s(customName);
      const qty = Number(customQty);
      const weight = Number(customWeight || 0);
      const unit_price = Number(customPrice);
      const cost_price = Number(customCostPrice || 0);

      if (!name) {
        alert("أدخل اسم المنتج");
        return;
      }

      if (!Number.isFinite(qty) || qty <= 0) {
        alert("الكمية غير صحيحة");
        return;
      }

      if (!Number.isFinite(unit_price) || unit_price < 0) {
        alert("السعر غير صحيح");
        return;
      }

      if (!Number.isFinite(weight) || weight < 0) {
        alert("الوزن غير صحيح");
        return;
      }

      if (!Number.isFinite(cost_price) || cost_price < 0) {
        alert("سعر التكلفة غير صحيح");
        return;
      }

      setSaving(true);

      const res = await fetch(`/api/orders/${order.id}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          mode: "custom",
          name,
          qty,
          weight,
          unit_price,
          cost_price,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "فشل إضافة المنتج الخاص");
      }

      await onSaved();
    } catch (e: any) {
      alert(s(e?.message) || "فشل إضافة المنتج الخاص");
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (tab === "search") {
      await saveSearchProduct();
      return;
    }

    await saveCustomProduct();
  }

  return (
    <Modal
      isOpen={open}
      setIsOpen={() => onClose()}
      isStaticBackdrop
      isScrollable
    >
      <ModalHeader>إضافة منتج</ModalHeader>

      <ModalBody>
        <div className="space-y-5" dir="rtl">
          <div className="flex overflow-hidden rounded-md">
            <TabButton active={tab === "search"} onClick={() => setTab("search")}>
              بحث عن منتج
            </TabButton>

            <TabButton active={tab === "custom"} onClick={() => setTab("custom")}>
              إضافة منتج خاص
            </TabButton>
          </div>

          {tab === "search" ? (
            <div className="space-y-4">
              <div className="relative">
                <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="البحث في قائمة المنتجات باسم المنتج أو الـ SKU"
                  className="h-12 w-full rounded-md border border-slate-200 bg-white pr-11 pl-4 text-right text-sm outline-none"
                />
              </div>

              <div className="min-h-[260px] rounded-md border border-slate-200 bg-white">
                {query.length < 2 ? (
                  <div className="flex h-[260px] flex-col items-center justify-center text-center text-slate-400">
                    <Search className="mb-3 h-14 w-14 text-slate-300" />
                    <div className="text-sm">ابحث عن منتج لإضافته في الطلب</div>
                  </div>
                ) : searching ? (
                  <div className="px-4 py-6 text-center text-sm text-slate-500">
                    جارٍ البحث...
                  </div>
                ) : rows.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-slate-400">
                    لا توجد نتائج
                  </div>
                ) : (
                  <div className="max-h-[320px] overflow-y-auto">
                    {rows.map((row) => {
                      const active = s(row.id) === s(selectedProductId);
                      const rowPrice =
                        n(row.sale_price) > 0 ? n(row.sale_price) : n(row.price);

                      return (
                        <button
                          key={row.id}
                          type="button"
                          onClick={() => pickProduct(row)}
                          className={`flex w-full items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 text-right last:border-b-0 ${
                            active ? "bg-[#f0fffb]" : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {s(row.image_url) ? (
                              <img
                                src={s(row.image_url)}
                                alt={s(row.name)}
                                className="h-12 w-12 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-full bg-slate-100" />
                            )}

                            <div className="text-right">
                              <div className="text-sm font-medium text-slate-700">
                                {s(row.name) || "منتج"}
                              </div>
                              <div className="mt-1 text-xs text-slate-400" dir="ltr">
                                {s(row.sku) || "-"}
                              </div>
                            </div>
                          </div>

                          <div
                            className="text-sm font-medium text-slate-700"
                            dir="ltr"
                          >
                            {rowPrice > 0 ? rowPrice : 0}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedProduct ? (
                <div className="space-y-4 rounded-md border border-slate-200 bg-slate-50 p-4">
                  {usesOptions ? (
                    <div className="space-y-4">
                      {selectedOptions.map((option) => {
                        const optionId = s(option?.id);
                        const values = Array.isArray(option?.values)
                          ? option.values
                          : [];
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
                                    onClick={() =>
                                      pickOptionValue(optionId, valueId)
                                    }
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
                  ) : Array.isArray(selectedProduct.variants) &&
                    selectedProduct.variants.length > 0 ? (
                    <div>
                      <div className="mb-2 text-sm font-medium text-slate-700">
                        اختر المتغير
                      </div>

                      <select
                        value={selectedVariantId}
                        onChange={(e) => pickVariant(e.target.value)}
                        className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-right text-sm outline-none"
                      >
                        {(selectedProduct.variants || []).map((variant) => (
                          <option key={s(variant.id)} value={s(variant.id)}>
                            {buildVariantLabel(variant)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <div className="mb-2 text-sm font-medium text-slate-700">
                        الكمية
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={selectedQty}
                        onChange={(e) => setSelectedQty(e.target.value)}
                        className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-left text-sm outline-none"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <div className="mb-2 text-sm font-medium text-slate-700">
                        السعر
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={selectedPrice}
                        onChange={(e) => setSelectedPrice(e.target.value)}
                        className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-left text-sm outline-none"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="rounded-md border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
                    <div>نوع المخزون: {currentUnlimited ? "غير محدود" : "محدود"}</div>
                    {!currentUnlimited ? (
                      <div className="mt-1">المتاح: {currentAvailableQty}</div>
                    ) : null}
                    {maxQtyPerOrder ? (
                      <div className="mt-1">
                        الحد الأقصى في الطلب: {maxQtyPerOrder}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="اسم المنتج"
                className="h-12 w-full rounded-md border border-slate-200 bg-white px-4 text-right text-sm outline-none"
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input
                  type="number"
                  min="1"
                  value={customQty}
                  onChange={(e) => setCustomQty(e.target.value)}
                  placeholder="الكمية"
                  className="h-12 w-full rounded-md border border-slate-200 bg-white px-4 text-left text-sm outline-none"
                  dir="ltr"
                />

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder="السعر"
                  className="h-12 w-full rounded-md border border-slate-200 bg-white px-4 text-left text-sm outline-none"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="grid grid-cols-[110px_1fr] overflow-hidden rounded-md border border-slate-200">
                  <div className="flex items-center justify-center border-l border-slate-200 bg-slate-50 text-sm text-slate-700">
                    كجم
                  </div>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={customWeight}
                    onChange={(e) => setCustomWeight(e.target.value)}
                    placeholder="الوزن"
                    className="h-12 bg-white px-4 text-left text-sm outline-none"
                    dir="ltr"
                  />
                </div>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={customCostPrice}
                  onChange={(e) => setCustomCostPrice(e.target.value)}
                  placeholder="سعر التكلفة"
                  className="h-12 w-full rounded-md border border-slate-200 bg-white px-4 text-left text-sm outline-none"
                  dir="ltr"
                />
              </div>
            </div>
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
            onClick={handleSave}
            isLoading={saving}
            isDisable={saving || (tab === "search" && !canSaveCatalog)}
          >
            إضافة
          </Button>
        </ModalFooterChild>
      </ModalFooter>
    </Modal>
  );
}