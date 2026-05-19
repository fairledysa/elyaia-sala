// FILE: apps/merchant/src/app/(app)/products/_dialogs/OptionsQuantityDialog.tsx
"use client";

import * as React from "react";
import {
  X,
  Info,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";

import type {
  OptionGroup,
  OptionValue,
  OptionsPayload,
  OptionFeatureType,
  VariantRow,
} from "./options-types";
import {
  uid,
  buildVariantsFromGroups,
  countCartesian,
  computeSummary,
} from "./variant-utils";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productName: string;
  initial?: Partial<OptionsPayload>;
  onApply: (payload: OptionsPayload) => void;
  maxOptions?: number;
  maxVariants?: number;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function numOrNull(x: string) {
  const s = x.trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function ensureAtLeastOneValue(values: OptionValue[]) {
  if (values.length) return values;
  return [{ id: uid(), name: "", isDefault: true }];
}

function defaultGroup(): OptionGroup {
  return {
    id: uid(),
    name: "",
    featureType: "text",
    values: ensureAtLeastOneValue([]),
  };
}

export default function OptionsQuantityDialog({
  open,
  onOpenChange,
  productName,
  initial,
  onApply,
  maxOptions = 4,
  maxVariants = 100,
}: Props) {
  const [hasOptions, setHasOptions] = React.useState<boolean>(
    initial?.hasOptions ?? false,
  );
  const [unlimitedQty, setUnlimitedQty] = React.useState<boolean>(
    initial?.unlimitedQty ?? false,
  );

  const [optionGroups, setOptionGroups] = React.useState<OptionGroup[]>(
    (initial?.optionGroups?.length
      ? initial.optionGroups
      : [defaultGroup()]) as OptionGroup[],
  );

  const [variants, setVariants] = React.useState<VariantRow[]>(
    (initial?.variants ?? []) as VariantRow[],
  );

  const [expandedKeys, setExpandedKeys] = React.useState<Set<string>>(
    new Set(),
  );
  const [err, setErr] = React.useState<string | null>(null);

  const prevMap = React.useMemo(() => {
    const m = new Map<string, VariantRow>();
    for (const v of variants) m.set(v.key, v);
    return m;
  }, [variants]);

  React.useEffect(() => {
    if (!hasOptions) return;

    const count = countCartesian(optionGroups);
    if (count > maxVariants) {
      setErr(`لقد تجاوزت الحد الأقصى (${maxVariants}) لإحتمالات المنتج`);
      return;
    }

    setErr(null);
    const next = buildVariantsFromGroups(optionGroups, prevMap);
    setVariants(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasOptions, optionGroups, maxVariants]);

  React.useEffect(() => {
    if (!hasOptions) {
      setErr(null);
      setVariants([]);
      setExpandedKeys(new Set());
    } else {
      if (!optionGroups.length) setOptionGroups([defaultGroup()]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasOptions]);

  function setGroup<K extends keyof OptionGroup>(
    id: string,
    key: K,
    value: OptionGroup[K],
  ) {
    setOptionGroups((gs) =>
      gs.map((g) => (g.id === id ? { ...g, [key]: value } : g)),
    );
  }

  function addGroup() {
    setErr(null);
    setOptionGroups((gs) => {
      if (gs.length >= maxOptions) {
        setErr(`لقد تجاوزت الحد الأقصى لعدد الخيارات (${maxOptions})`);
        return gs;
      }
      return [...gs, defaultGroup()];
    });
  }

  function removeGroup(id: string) {
    setOptionGroups((gs) => gs.filter((g) => g.id !== id));
  }

  function addValue(groupId: string) {
    setGroup(groupId, "values", [
      ...(optionGroups.find((g) => g.id === groupId)?.values ?? []),
      { id: uid(), name: "" },
    ]);
  }

  function removeValue(groupId: string, valueId: string) {
    const g = optionGroups.find((x) => x.id === groupId);
    if (!g) return;

    let next = g.values.filter((v) => v.id !== valueId);
    if (next.length === 0) next = ensureAtLeastOneValue(next);

    if (!next.some((v) => v.isDefault)) {
      next = next.map((v, i) => ({ ...v, isDefault: i === 0 }));
    }

    setGroup(groupId, "values", next);
  }

  function setDefaultValue(groupId: string, valueId: string) {
    const g = optionGroups.find((x) => x.id === groupId);
    if (!g) return;

    const next = g.values.map((v) => ({
      ...v,
      isDefault: v.id === valueId,
    }));

    setGroup(groupId, "values", next);
  }

  function toggleExpand(key: string) {
    setExpandedKeys((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function patchVariant(key: string, patch: Partial<VariantRow>) {
    setVariants((vs) =>
      vs.map((v) => (v.key === key ? { ...v, ...patch } : v)),
    );
  }

  function incQty(key: string, delta: number) {
    setVariants((vs) =>
      vs.map((v) => {
        if (v.key !== key) return v;
        const cur = Number(v.qty) || 0;
        return { ...v, qty: Math.max(0, cur + delta) };
      }),
    );
  }

  const variantsCount = hasOptions ? countCartesian(optionGroups) : 0;

  const summary = React.useMemo(() => {
    return computeSummary(unlimitedQty, variants);
  }, [unlimitedQty, variants]);

  function handleSave() {
    setErr(null);

    if (hasOptions) {
      if (optionGroups.length > maxOptions) {
        setErr(`لقد تجاوزت الحد الأقصى لعدد الخيارات (${maxOptions})`);
        return;
      }

      const c = countCartesian(optionGroups);
      if (c > maxVariants) {
        setErr(`لقد تجاوزت الحد الأقصى (${maxVariants}) لإحتمالات المنتج`);
        return;
      }

      if (c === 0) {
        setErr("قم بإضافة قيم للخيارات أولاً");
        return;
      }
    }

    const payload: OptionsPayload = {
      hasOptions,
      unlimitedQty,
      optionGroups: hasOptions ? optionGroups : [],
      variants: hasOptions ? variants : [],
      summary,
    };

    onApply(payload);
    onOpenChange(false);
  }

  if (!open) return null;

  return (
    <div
      className="adm-options-modal"
      dir="rtl"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <section className="adm-options-modal__panel">
        <header className="adm-options-modal__header">
          <div className="adm-options-modal__title">
            <span className="adm-options-modal__icon">
              <Info />
            </span>

            <div>
              <h3>إدارة الخيارات والكميات</h3>
              <p>{productName || "منتج"}</p>
            </div>
          </div>

          <button
            type="button"
            className="adm-options-modal__close"
            onClick={() => onOpenChange(false)}
            aria-label="إغلاق"
          >
            <X />
            خروج
          </button>
        </header>

        <div className="adm-options-modal__body">
          <div className="adm-options-modal__info">
            <Info />
            <div>
              <strong>إدارة خيارات المنتج</strong>
              <span>
                أضف خيار مثل المقاس أو اللون، ثم أضف القيم مثل 50 / 52 / أسود.
              </span>
            </div>
          </div>

          <label className="adm-options-modal__switch">
            <div>
              <strong>تفعيل خيارات المنتج</strong>
              <span>
                عند التفعيل سيتم توليد احتمالات المنتج بناءً على القيم المدخلة.
              </span>
            </div>

            <input
              type="checkbox"
              checked={hasOptions}
              onChange={(e) => setHasOptions(e.currentTarget.checked)}
            />
          </label>

          {hasOptions && (
            <section className="adm-options-modal__section">
              <div className="adm-options-modal__sectionHead">
                <div>
                  <h4>الخيارات والقيم</h4>
                  <p>
                    الخيار = مقاس/لون، والقيم = 50/52 أو أسود/أبيض.
                  </p>
                </div>

                <span>{optionGroups.length} خيار</span>
              </div>

              <div className="adm-options-modal__groups">
                {optionGroups.map((g, groupIndex) => (
                  <article key={g.id} className="adm-options-modal__group">
                    <div className="adm-options-modal__groupTop">
                      <div className="adm-options-modal__groupIndex">
                        {groupIndex + 1}
                      </div>

                      <div className="adm-options-modal__groupFields">
                        <div className="adm-options-modal__field">
                          <label>مسمى الخيار</label>
                          <input
                            placeholder="مثال: مقاس"
                            value={g.name}
                            onChange={(e) =>
                              setGroup(g.id, "name", e.currentTarget.value)
                            }
                          />
                        </div>

                        <div className="adm-options-modal__field">
                          <label>نوع الخيار</label>
                          <select
                            value={g.featureType}
                            onChange={(e) =>
                              setGroup(
                                g.id,
                                "featureType",
                                e.currentTarget.value as OptionFeatureType,
                              )
                            }
                          >
                            <option value="text">نص</option>
                            <option value="color">اللون</option>
                            <option value="image">صورة</option>
                          </select>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="adm-options-modal__dangerIcon"
                        onClick={() => removeGroup(g.id)}
                        title="حذف الخيار"
                      >
                        <Trash2 />
                      </button>
                    </div>

                    <div className="adm-options-modal__valuesHead">
                      <div>
                        <strong>قيم الخيار</strong>
                        <span>هنا تضيف المقاسات مثل 50 و 52</span>
                      </div>

                      <button
                        type="button"
                        className="adm-options-modal__addValueMini"
                        onClick={() => addValue(g.id)}
                      >
                        <Plus />
                        إضافة مقاس/قيمة
                      </button>
                    </div>

                    <div className="adm-options-modal__values">
                      {g.values.map((v, vi) => (
                        <div key={v.id} className="adm-options-modal__valueRow">
                          <button
                            type="button"
                            className={cn(
                              "adm-options-modal__defaultBtn",
                              v.isDefault && "is-active",
                            )}
                            onClick={() => setDefaultValue(g.id, v.id)}
                            title="تعيين كافتراضي"
                          >
                            <Check />
                          </button>

                          <input
                            placeholder={`القيمة ${vi + 1}`}
                            value={v.name}
                            onChange={(e) => {
                              const next = g.values.map((x) =>
                                x.id === v.id
                                  ? { ...x, name: e.currentTarget.value }
                                  : x,
                              );
                              setGroup(g.id, "values", next);
                            }}
                          />

                          <button
                            type="button"
                            className="adm-options-modal__dangerIcon"
                            onClick={() => removeValue(g.id, v.id)}
                            title="حذف القيمة"
                          >
                            <Trash2 />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="adm-options-modal__addValue"
                      onClick={() => addValue(g.id)}
                    >
                      <Plus />
                      إضافة مقاس/قيمة جديدة
                    </button>
                  </article>
                ))}

                <button
                  type="button"
                  className="adm-options-modal__addGroup"
                  onClick={addGroup}
                >
                  <Plus />
                  إضافة خيار جديد
                </button>

                {optionGroups.length > maxOptions && (
                  <div className="adm-alert adm-alert--danger">
                    لقد تجاوزت الحد الأقصى لعدد الخيارات ({maxOptions})
                  </div>
                )}

                {variantsCount > maxVariants && (
                  <div className="adm-alert adm-alert--danger">
                    لقد تجاوزت الحد الأقصى ({maxVariants}) لإحتمالات المنتج
                  </div>
                )}
              </div>
            </section>
          )}

          {hasOptions && variants.length === 0 && (
            <div className="adm-options-modal__empty">
              قم بإضافة قيم للخيارات لتظهر الاحتمالات والكميات.
            </div>
          )}

          {hasOptions && variants.length > 0 && (
            <section className="adm-options-modal__section">
              <div className="adm-options-modal__sectionHead">
                <div>
                  <h4>الكميات والاحتمالات</h4>
                  <p>اضبط السعر والكمية لكل احتمال من احتمالات المنتج.</p>
                </div>

                <span>{variants.length} احتمال</span>
              </div>

              <div className="adm-options-modal__qtyTop">
                <label>
                  <input
                    type="checkbox"
                    checked={unlimitedQty}
                    onChange={(e) => setUnlimitedQty(e.currentTarget.checked)}
                  />
                  الكمية غير محدودة
                </label>

                <div>
                  إجمالي الكمية{" "}
                  <strong>
                    {unlimitedQty ? "∞" : summary.variants_total_qty}
                  </strong>
                </div>
              </div>

              <div className="adm-options-modal__variants">
                {variants.map((v) => {
                  const isOpen = expandedKeys.has(v.key);
                  const available = unlimitedQty ? "∞" : Number(v.qty) || 0;

                  return (
                    <article key={v.key} className="adm-options-modal__variant">
                      <button
                        type="button"
                        className="adm-options-modal__variantHead"
                        onClick={() => toggleExpand(v.key)}
                      >
                        <span>{v.label}</span>

                        <div>
                          <small>
                            متوفر عدد <strong>{available}</strong>
                          </small>
                          {isOpen ? <ChevronUp /> : <ChevronDown />}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="adm-options-modal__variantBody">
                          <div className="adm-options-modal__grid3">
                            <FieldMoney
                              label="السعر"
                              value={v.price}
                              onChange={(n) =>
                                patchVariant(v.key, { price: n })
                              }
                            />

                            <FieldMoney
                              label="سعر التكلفة"
                              value={v.cost}
                              onChange={(n) => patchVariant(v.key, { cost: n })}
                            />

                            <FieldMoney
                              label="السعر المخفض"
                              value={v.discount}
                              onChange={(n) =>
                                patchVariant(v.key, { discount: n })
                              }
                            />
                          </div>

                          <div className="adm-options-modal__grid4">
                            <FieldNumber
                              label="الوزن (كجم)"
                              value={v.weightKg}
                              onChange={(n) =>
                                patchVariant(v.key, { weightKg: n })
                              }
                            />

                            <FieldText
                              label="الباركود"
                              value={v.barcode}
                              onChange={(s) =>
                                patchVariant(v.key, { barcode: s })
                              }
                            />

                            <FieldText
                              label="SKU"
                              value={v.sku}
                              onChange={(s) => patchVariant(v.key, { sku: s })}
                            />

                            <FieldNumber
                              label="أقل كمية للتنبيه"
                              value={v.lowQuantity}
                              onChange={(n) =>
                                patchVariant(v.key, { lowQuantity: n })
                              }
                            />
                          </div>

                          <div className="adm-options-modal__grid2">
                            <FieldText
                              label="MPN"
                              value={v.mpn}
                              onChange={(s) => patchVariant(v.key, { mpn: s })}
                            />

                            <FieldText
                              label="GTIN"
                              value={v.gtin}
                              onChange={(s) => patchVariant(v.key, { gtin: s })}
                            />
                          </div>

                          <div
                            className={cn(
                              "adm-options-modal__qtyBox",
                              unlimitedQty && "is-muted",
                            )}
                          >
                            <span>كمية المنتج</span>

                            <div>
                              <button
                                type="button"
                                onClick={() => incQty(v.key, +1)}
                                disabled={unlimitedQty}
                              >
                                <Plus />
                              </button>

                              <input
                                type="number"
                                min={0}
                                value={Number(v.qty) || 0}
                                disabled={unlimitedQty}
                                onChange={(e) => {
                                  const n = Number(e.currentTarget.value);
                                  patchVariant(v.key, {
                                    qty: Number.isFinite(n)
                                      ? Math.max(0, n)
                                      : 0,
                                  });
                                }}
                              />

                              <button
                                type="button"
                                onClick={() => incQty(v.key, -1)}
                                disabled={unlimitedQty}
                              >
                                −
                              </button>
                            </div>
                          </div>

                          {unlimitedQty && (
                            <div className="adm-alert adm-alert--warning adm-options-modal__smallAlert">
                              تم تفعيل <strong>الكمية غير محدودة</strong> — لن
                              تحتاج لتحديد أرقام الكميات لكل خيار.
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>

              <div className="adm-options-modal__summary">
                {summary.variants_price_label}
              </div>
            </section>
          )}

          {err && (
            <div className="adm-alert adm-alert--danger adm-options-modal__error">
              {err}
            </div>
          )}
        </div>

        <footer className="adm-options-modal__footer">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="adm-btn adm-btn--secondary"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="adm-btn adm-btn--primary adm-options-modal__save"
          >
            حفظ
          </button>
        </footer>
      </section>
    </div>
  );
}

function FieldMoney({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number | null;
  onChange: (n: number | null) => void;
}) {
  const [local, setLocal] = React.useState<string>(
    value == null ? "" : String(value),
  );

  React.useEffect(() => {
    setLocal(value == null ? "" : String(value));
  }, [value]);

  return (
    <div className="adm-options-modal__fieldBox">
      <label>{label}</label>

      <div className="adm-options-modal__moneyInput">
        <input
          inputMode="decimal"
          value={local}
          onChange={(e) =>
            setLocal(e.currentTarget.value.replace(/[^\d.]/g, ""))
          }
          onBlur={() => onChange(numOrNull(local))}
          placeholder={label}
        />

        <span>ر.س</span>
      </div>
    </div>
  );
}

function FieldNumber({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number | null;
  onChange: (n: number | null) => void;
}) {
  const [local, setLocal] = React.useState<string>(
    value == null ? "" : String(value),
  );

  React.useEffect(() => {
    setLocal(value == null ? "" : String(value));
  }, [value]);

  return (
    <div className="adm-options-modal__fieldBox">
      <label>{label}</label>

      <input
        inputMode="decimal"
        value={local}
        onChange={(e) => setLocal(e.currentTarget.value.replace(/[^\d.]/g, ""))}
        onBlur={() => onChange(numOrNull(local))}
        placeholder={label}
      />
    </div>
  );
}

function FieldText({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string | null;
  onChange: (s: string) => void;
}) {
  return (
    <div className="adm-options-modal__fieldBox">
      <label>{label}</label>

      <input
        value={value ?? ""}
        onChange={(e) => onChange(e.currentTarget.value)}
        placeholder={label}
      />
    </div>
  );
}