// FILE: apps/merchant/src/app/(app)/settings/shipping/_components/CodRulesModal.tsx

"use client";

import { useEffect, useMemo, useState } from "react";

type TabKey = "rules" | "exceptions";

type OptionItem = {
  id: string;
  label: string;
  meta?: string | null;
};

type CodRestrictions = {
  minimum_subtotal: number | string;
  maximum_subtotal: number | string | null;
  maximum_weight_kg: number | string | null;
  block_untrusted_customers: boolean;
  excluded_product_ids: string[];
  excluded_category_ids: string[];
};

type ApiData = {
  currency_code: string;
  restrictions: CodRestrictions;
  products: OptionItem[];
  categories: OptionItem[];
};

function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function s(value: unknown) {
  return String(value ?? "").trim();
}

function n(value: unknown, fallback = 0) {
  const num = Number(value ?? fallback);
  return Number.isFinite(num) ? num : fallback;
}

function defaultRestrictions(): CodRestrictions {
  return {
    minimum_subtotal: 0,
    maximum_subtotal: "",
    maximum_weight_kg: "",
    block_untrusted_customers: false,
    excluded_product_ids: [],
    excluded_category_ids: [],
  };
}

async function fetchOptions(): Promise<ApiData> {
  const res = await fetch("/api/settings/store/shipping/cod/options", {
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || "فشل تحميل شروط الدفع عند الاستلام");
  }

  return {
    currency_code: s(json.value?.currency_code) || "SAR",
    restrictions: {
      ...defaultRestrictions(),
      ...(json.value?.restrictions || {}),
    },
    products: Array.isArray(json.value?.products) ? json.value.products : [],
    categories: Array.isArray(json.value?.categories)
      ? json.value.categories
      : [],
  };
}

async function saveRestrictions(restrictions: CodRestrictions) {
  const res = await fetch("/api/settings/store/shipping/cod/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ restrictions }),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || "فشل حفظ شروط الدفع عند الاستلام");
  }

  return json.value;
}

async function fetchProductPicker(args: {
  q: string;
  page: number;
  limit: number;
}) {
  const url = new URL(
    "/api/settings/store/shipping/cod/picker/products",
    window.location.origin,
  );

  url.searchParams.set("q", args.q);
  url.searchParams.set("page", String(args.page));
  url.searchParams.set("limit", String(args.limit));

  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = await res.json().catch(() => ({}));

  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || "فشل تحميل المنتجات");
  }

  return {
    items: Array.isArray(json.value?.items)
      ? (json.value.items as OptionItem[])
      : [],
    total: Number(json.value?.total ?? 0),
    page: Number(json.value?.page ?? args.page),
    limit: Number(json.value?.limit ?? args.limit),
    has_more: Boolean(json.value?.has_more),
  };
}

function ProductExceptionPicker({
  selectedItems,
  selectedIds,
  disabled,
  onChange,
}: {
  selectedItems: OptionItem[];
  selectedIds: string[];
  disabled?: boolean;
  onChange: (ids: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<OptionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [openList, setOpenList] = useState(false);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const itemById = useMemo(() => {
    const map = new Map<string, OptionItem>();

    for (const item of selectedItems) map.set(item.id, item);
    for (const item of items) map.set(item.id, item);

    return map;
  }, [selectedItems, items]);

  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(async () => {
      setLoading(true);

      try {
        const res = await fetchProductPicker({
          q,
          page: 1,
          limit: 20,
        });

        if (cancelled) return;

        setItems(res.items);
        setTotal(res.total);
        setPage(res.page);
        setHasMore(res.has_more);
      } catch {
        if (cancelled) return;
        setItems([]);
        setTotal(0);
        setPage(1);
        setHasMore(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [q]);

  async function loadMore() {
    if (loading || !hasMore) return;

    const nextPage = page + 1;

    setLoading(true);

    try {
      const res = await fetchProductPicker({
        q,
        page: nextPage,
        limit: 20,
      });

      setItems((current) => {
        const map = new Map<string, OptionItem>();

        for (const item of current) map.set(item.id, item);
        for (const item of res.items) map.set(item.id, item);

        return Array.from(map.values());
      });

      setTotal(res.total);
      setPage(res.page);
      setHasMore(res.has_more);
    } finally {
      setLoading(false);
    }
  }

  function toggle(id: string) {
    if (disabled) return;

    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((x) => x !== id));
      return;
    }

    onChange([...selectedIds, id]);
  }

  function remove(id: string) {
    if (disabled) return;
    onChange(selectedIds.filter((x) => x !== id));
  }

  return (
    <div className="adm-cod-salla-picker">
      <div className="adm-cod-salla-picker__box">
        <div className="adm-cod-salla-chips">
          {selectedIds.map((id) => {
            const item = itemById.get(id);

            return (
              <button
                key={id}
                type="button"
                disabled={disabled}
                onClick={() => remove(id)}
                className="adm-cod-salla-chip"
              >
                <span>{item?.label || "منتج محدد"}</span>
                <b>×</b>
              </button>
            );
          })}

          <input
            value={q}
            disabled={disabled}
            onFocus={() => setOpenList(true)}
            onChange={(event) => {
              setQ(event.currentTarget.value);
              setOpenList(true);
            }}
            className="adm-cod-salla-picker__input"
            placeholder={selectedIds.length ? "" : "ابحث عن منتج..."}
          />
        </div>
      </div>

      {openList ? (
        <div className="adm-cod-salla-picker__menu">
          {loading ? (
            <div className="adm-cod-salla-picker__empty">جاري البحث...</div>
          ) : items.length === 0 ? (
            <div className="adm-cod-salla-picker__empty">
              {q ? "لا توجد نتائج" : "ابدأ بالبحث عن منتج"}
            </div>
          ) : (
            <>
              <div className="adm-cod-salla-picker__list">
                {items.map((item) => {
                  const picked = selectedSet.has(item.id);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggle(item.id)}
                      className={clsx(
                        "adm-cod-salla-picker__option",
                        picked && "is-picked",
                      )}
                    >
                      <span className="adm-cod-salla-picker__optionText">
                        <strong>{item.label}</strong>
                        {item.meta ? <small>{item.meta}</small> : null}
                      </span>

                      <span className="adm-cod-salla-picker__mark">
                        {picked ? "✓" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="adm-cod-salla-picker__foot">
                <span>
                  عرض {items.length} من {total}
                </span>

                {hasMore ? (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void loadMore()}
                  >
                    عرض المزيد
                  </button>
                ) : null}

                <button type="button" onClick={() => setOpenList(false)}>
                  إغلاق القائمة
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function CategoryExceptionPicker({
  items,
  selectedIds,
  disabled,
  onChange,
}: {
  items: OptionItem[];
  selectedIds: string[];
  disabled?: boolean;
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedText = useMemo(() => {
    if (!selectedIds.length) return "اختيار التصنيفات المستثناة";

    const names = selectedIds
      .map((id) => items.find((item) => item.id === id)?.label || "")
      .filter(Boolean);

    return names.length ? names.join(" — ") : "تصنيفات محددة";
  }, [items, selectedIds]);

  function toggle(id: string) {
    if (disabled) return;

    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((x) => x !== id));
      return;
    }

    onChange([...selectedIds, id]);
  }

  return (
    <div className="adm-cod-salla-select">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className={clsx(
          "adm-cod-salla-select__trigger",
          selectedIds.length > 0 && "has-value",
        )}
      >
        <span>{selectedText}</span>
        <b>{open ? "⌃" : "⌄"}</b>
      </button>

      {open ? (
        <div className="adm-cod-salla-select__menu">
          {items.length === 0 ? (
            <div className="adm-cod-salla-select__empty">
              لا توجد تصنيفات متاحة
            </div>
          ) : (
            items.map((item) => {
              const picked = selectedSet.has(item.id);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggle(item.id)}
                  className={clsx(
                    "adm-cod-salla-select__option",
                    picked && "is-picked",
                  )}
                >
                  <span>{item.label}</span>
                  <b>{picked ? "✓" : ""}</b>
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function CodRulesModal({
  open,
  busy,
  onClose,
  onSaved,
}: {
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
}) {
  const [tab, setTab] = useState<TabKey>("rules");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const [data, setData] = useState<ApiData>({
    currency_code: "SAR",
    restrictions: defaultRestrictions(),
    products: [],
    categories: [],
  });

  const [draft, setDraft] = useState<CodRestrictions>(() =>
    defaultRestrictions(),
  );

  const locked = Boolean(busy || loading || saving);
  const currencyCode = s(data.currency_code) || "SAR";

  async function load() {
    setLoading(true);
    setErr("");
    setOkMsg("");

    try {
      const next = await fetchOptions();

      setData(next);
      setDraft({
        ...defaultRestrictions(),
        ...next.restrictions,
        maximum_subtotal:
          next.restrictions.maximum_subtotal === null ||
          next.restrictions.maximum_subtotal === undefined
            ? ""
            : next.restrictions.maximum_subtotal,
        maximum_weight_kg:
          next.restrictions.maximum_weight_kg === null ||
          next.restrictions.maximum_weight_kg === undefined
            ? ""
            : next.restrictions.maximum_weight_kg,
      });
    } catch (e: any) {
      setErr(e?.message || "فشل تحميل شروط الدفع عند الاستلام");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;

    setTab("rules");
    void load();
  }, [open]);

  function patch(patchValue: Partial<CodRestrictions>) {
    setDraft((current) => ({
      ...current,
      ...patchValue,
    }));
  }

  function validate() {
    const min = Math.max(0, n(draft.minimum_subtotal, 0));

    const maxRaw = s(draft.maximum_subtotal);
    const max = maxRaw ? Number(maxRaw) : null;

    if (max !== null && (!Number.isFinite(max) || max < 0)) {
      return "الحد الأعلى للمشتريات غير صحيح.";
    }

    if (max !== null && max < min) {
      return "الحد الأعلى للمشتريات يجب أن يكون أكبر من أو يساوي الحد الأدنى.";
    }

    const weightRaw = s(draft.maximum_weight_kg);
    const weight = weightRaw ? Number(weightRaw) : null;

    if (weight !== null && (!Number.isFinite(weight) || weight <= 0)) {
      return "الحد الأعلى لوزن المنتجات في منصة غير صحيح.";
    }

    return "";
  }

  async function submit() {
    const validation = validate();

    if (validation) {
      setErr(validation);
      setOkMsg("");
      return;
    }

    setSaving(true);
    setErr("");
    setOkMsg("");

    try {
      await saveRestrictions({
        ...draft,
        minimum_subtotal: Math.max(0, n(draft.minimum_subtotal, 0)),
        maximum_subtotal: s(draft.maximum_subtotal)
          ? Math.max(0, n(draft.maximum_subtotal, 0))
          : null,
        maximum_weight_kg: s(draft.maximum_weight_kg)
          ? Math.max(0, n(draft.maximum_weight_kg, 0))
          : null,
      });

      const next = await fetchOptions();

      setData(next);
      setDraft({
        ...defaultRestrictions(),
        ...next.restrictions,
        maximum_subtotal:
          next.restrictions.maximum_subtotal === null ||
          next.restrictions.maximum_subtotal === undefined
            ? ""
            : next.restrictions.maximum_subtotal,
        maximum_weight_kg:
          next.restrictions.maximum_weight_kg === null ||
          next.restrictions.maximum_weight_kg === undefined
            ? ""
            : next.restrictions.maximum_weight_kg,
      });

      setOkMsg("تم حفظ شروط الدفع عند الاستلام بنجاح.");
      await onSaved?.();
    } catch (e: any) {
      setErr(e?.message || "فشل حفظ شروط الدفع عند الاستلام");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="adm-cod-salla-modal" role="dialog" aria-modal="true" dir="rtl">
      <button
        type="button"
        className="adm-cod-salla-modal__backdrop"
        onClick={() => {
          if (!locked) onClose();
        }}
        aria-label="إغلاق"
      />

      <div className="adm-cod-salla-modal__panel">
        <div className="adm-cod-salla-modal__head">
          <button
            type="button"
            className="adm-cod-salla-modal__close"
            disabled={locked}
            onClick={() => {
              if (!locked) onClose();
            }}
            aria-label="إغلاق"
          >
            ×
          </button>

          <h2>شروط الدفع عند الاستلام</h2>
        </div>

        <div className="adm-cod-salla-modal__body">
          <p className="adm-cod-salla-intro">
            بإمكانك تحديد الشروط التي عند تحققها يتم{" "}
            <strong>تعطيل</strong> خيار الدفع عند الاستلام في صفحة الدفع
            بالمتجر
          </p>

          <div className="adm-cod-salla-info">
            <span>🔔</span>
            <b>
              علمًا أن تفعيل خيار الدفع عند الاستلام يتم من خلال إعدادات شركة
              الشحن
            </b>
          </div>

          <div className="adm-cod-salla-tabs">
            <button
              type="button"
              onClick={() => setTab("rules")}
              className={tab === "rules" ? "is-active" : ""}
            >
              <span>☷</span>
              شروط الدفع عند الاستلام
            </button>

            <button
              type="button"
              onClick={() => setTab("exceptions")}
              className={tab === "exceptions" ? "is-active" : ""}
            >
              <span>☑</span>
              مستثناة عن الدفع عند الاستلام
            </button>
          </div>

          {err ? <div className="adm-cod-salla-error">{err}</div> : null}
          {okMsg ? <div className="adm-cod-salla-ok">{okMsg}</div> : null}

          {loading ? (
            <div className="adm-cod-salla-loading">جاري تحميل البيانات...</div>
          ) : tab === "rules" ? (
            <div className="adm-cod-salla-form">
              <div className="adm-cod-salla-titleBlock">
                <h3>شروط الدفع عند الاستلام</h3>
                <p>الحد الأدنى للمشتريات اختياري</p>
              </div>

              <label className="adm-cod-salla-field">
                <span>الحد الأدنى للمشتريات (اختياري)</span>

                <div className="adm-cod-salla-money">
                  <input
                    value={String(draft.minimum_subtotal ?? 0)}
                    disabled={locked}
                    inputMode="decimal"
                    dir="ltr"
                    onChange={(event) =>
                      patch({ minimum_subtotal: event.currentTarget.value })
                    }
                    placeholder="20"
                  />
                  <b>{currencyCode}</b>
                </div>
              </label>

              <label className="adm-cod-salla-field">
                <span>الحد الأعلى للمشتريات (اختياري)</span>

                <div className="adm-cod-salla-money">
                  <input
                    value={String(draft.maximum_subtotal ?? "")}
                    disabled={locked}
                    inputMode="decimal"
                    dir="ltr"
                    onChange={(event) =>
                      patch({ maximum_subtotal: event.currentTarget.value })
                    }
                    placeholder="10000"
                  />
                  <b>{currencyCode}</b>
                </div>
              </label>

              <div className="adm-cod-salla-warning">
                <span>⚠️</span>
                <b>
                  في حال كانت شركة الشحن المختارة ضمن بوليصات  المنصة  فسوف يتم
                  تطبيق حد شركة الشحن أولًا
                </b>
              </div>

              <label className="adm-cod-salla-field">
                <span>الحد الأعلى لوزن المنتجات في ال المنصة  (اختياري)</span>

                <div className="adm-cod-salla-money">
                  <input
                    value={String(draft.maximum_weight_kg ?? "")}
                    disabled={locked}
                    inputMode="decimal"
                    dir="ltr"
                    onChange={(event) =>
                      patch({ maximum_weight_kg: event.currentTarget.value })
                    }
                    placeholder="10"
                  />
                  <b>KG</b>
                </div>
              </label>

              <label className="adm-cod-salla-checkRow">
                <input
                  type="checkbox"
                  checked={Boolean(draft.block_untrusted_customers)}
                  disabled={locked}
                  onChange={(event) =>
                    patch({
                      block_untrusted_customers: event.currentTarget.checked,
                    })
                  }
                />

                <span>
                  <strong>إيقاف خدمة الدفع عند الاستلام عن العملاء الغير جادين</strong>
                  <small>
                    سيتم إخفاء الدفع عند الاستلام في صفحة الشراء عن العملاء
                    الذين لديهم حظر على متاجر  المنصة  الأخرى
                  </small>
                </span>
              </label>
            </div>
          ) : (
            <div className="adm-cod-salla-form">
              <div className="adm-cod-salla-titleBlock">
                <h3>منتجات مستثناة</h3>
                <p>المنتجات المستثناة من الدفع عند الاستلام (اختياري)</p>
              </div>

              <ProductExceptionPicker
                selectedItems={data.products}
                selectedIds={draft.excluded_product_ids}
                disabled={locked}
                onChange={(ids) => patch({ excluded_product_ids: ids })}
              />

              <div className="adm-cod-salla-titleBlock adm-cod-salla-titleBlock--gap">
                <h3>تصنيفات المستثناة</h3>
                <p>التصنيفات المستثناة من الدفع عند الاستلام (اختياري)</p>
              </div>

              <CategoryExceptionPicker
                items={data.categories}
                selectedIds={draft.excluded_category_ids}
                disabled={locked}
                onChange={(ids) => patch({ excluded_category_ids: ids })}
              />
            </div>
          )}
        </div>

        <div className="adm-cod-salla-modal__footer">
          <button
            type="button"
            disabled={locked}
            onClick={() => void submit()}
            className="adm-cod-salla-save"
          >
            {saving ? "جاري الحفظ..." : "حفظ"}
          </button>
        </div>
      </div>
    </div>
  );
}