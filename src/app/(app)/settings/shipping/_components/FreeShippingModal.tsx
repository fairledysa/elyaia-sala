// FILE: apps/merchant/src/app/(app)/settings/shipping/_components/FreeShippingModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Mode = "all" | "include";
type ApplyOn = "all" | "categories" | "products";

type OptionItem = {
  id: string;
  label: string;
  meta?: string | null;
  country_id?: string | null;
  enabled?: boolean;
  count?: number;
  icon?: string | null;
};

type FreeShippingRule = {
  id?: string;
  name: string;
  enabled: boolean;
  minimum_subtotal: number | string;

  countries_mode: Mode;
  cities_mode: Mode;
  products_mode: Mode;
  categories_mode: Mode;
  carriers_mode: Mode;
  customer_groups_mode: Mode;

  starts_at?: string | null;
  ends_at?: string | null;
  priority?: number;

  country_ids: string[];
  city_ids: string[];
  product_ids: string[];
  category_ids: string[];
  carrier_ids: string[];
  customer_group_ids: string[];
};

type ApiData = {
  currency_code: string;
  rules: FreeShippingRule[];
  countries: OptionItem[];
  cities: OptionItem[];
  products: OptionItem[];
  categories: OptionItem[];
  carriers: OptionItem[];
  customer_groups: OptionItem[];
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

function defaultRule(): FreeShippingRule {
  return {
    name: "شحن مجاني",
    enabled: true,
    minimum_subtotal: 0,

    countries_mode: "all",
    cities_mode: "all",
    products_mode: "all",
    categories_mode: "all",
    carriers_mode: "all",
    customer_groups_mode: "all",

    starts_at: null,
    ends_at: null,
    priority: 0,

    country_ids: [],
    city_ids: [],
    product_ids: [],
    category_ids: [],
    carrier_ids: [],
    customer_group_ids: [],
  };
}

function toInputDateTime(value?: string | null) {
  const raw = s(value);
  if (!raw) return "";

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";

  const pad = (x: number) => String(x).padStart(2, "0");

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate(),
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function applyOnFromRule(rule: FreeShippingRule): ApplyOn {
  if (rule.products_mode === "include") return "products";
  if (rule.categories_mode === "include") return "categories";
  return "all";
}

function selectedSummary(items: OptionItem[], ids: string[], label: string) {
  if (!ids.length) return "الكل";

  const names = ids
    .map((id) => items.find((item) => item.id === id)?.label || "")
    .filter(Boolean)
    .slice(0, 2);

  const rest = ids.length - names.length;

  if (!names.length) return `${ids.length} ${label}`;

  return `${names.join("، ")}${rest > 0 ? ` +${rest}` : ""}`;
}

async function fetchOptions(): Promise<ApiData> {
  const res = await fetch("/api/settings/store/shipping/free-shipping/options", {
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || "فشل تحميل إعدادات الشحن المجاني");
  }

  return {
    currency_code: s(json.value?.currency_code) || "SAR",
    rules: Array.isArray(json.value?.rules) ? json.value.rules : [],
    countries: Array.isArray(json.value?.countries) ? json.value.countries : [],
    cities: Array.isArray(json.value?.cities) ? json.value.cities : [],
    products: Array.isArray(json.value?.products) ? json.value.products : [],
    categories: Array.isArray(json.value?.categories)
      ? json.value.categories
      : [],
    carriers: Array.isArray(json.value?.carriers) ? json.value.carriers : [],
    customer_groups: Array.isArray(json.value?.customer_groups)
      ? json.value.customer_groups
      : [],
  };
}

async function saveRule(rule: FreeShippingRule) {
  const res = await fetch("/api/settings/store/shipping/free-shipping/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ rule }),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || "فشل حفظ قاعدة الشحن المجاني");
  }

  return json.value;
}

async function deleteRule(id: string) {
  const res = await fetch("/api/settings/store/shipping/free-shipping/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ action: "delete", id }),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || "فشل حذف قاعدة الشحن المجاني");
  }

  return json.value;
}

async function fetchProductPicker(args: {
  q: string;
  page: number;
  limit: number;
}) {
  const url = new URL(
    "/api/settings/store/shipping/free-shipping/picker/products",
    window.location.origin,
  );

  url.searchParams.set("q", args.q);
  url.searchParams.set("page", String(args.page));
  url.searchParams.set("limit", String(args.limit));

  const res = await fetch(url.toString(), {
    cache: "no-store",
  });

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

function RuleStatusSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        "adm-free-shipping-statusSwitch",
        checked && "adm-free-shipping-statusSwitch--on",
      )}
      title={checked ? "القاعدة تعمل الآن" : "القاعدة متوقفة الآن"}
    >
      <span className="adm-free-shipping-statusSwitch__text">
        {checked ? "القاعدة مفعّلة" : "القاعدة متوقفة"}
      </span>

      <span className="adm-free-shipping-statusSwitch__track" aria-hidden="true">
        <span className="adm-free-shipping-statusSwitch__thumb" />
      </span>
    </button>
  );
}

function ModeSwitch({
  value,
  onChange,
  allText = "الكل",
  includeText = "تحديد",
}: {
  value: Mode;
  onChange: (value: Mode) => void;
  allText?: string;
  includeText?: string;
}) {
  return (
    <div className="adm-free-shipping-segment adm-free-shipping-segment--2">
      <button
        type="button"
        onClick={() => onChange("all")}
        className={value === "all" ? "is-active" : ""}
      >
        {allText}
      </button>

      <button
        type="button"
        onClick={() => onChange("include")}
        className={value === "include" ? "is-active" : ""}
      >
        {includeText}
      </button>
    </div>
  );
}

function SmartPickerBox({
  title,
  description,
  items,
  selectedIds,
  onChange,
  emptyText = "لا توجد بيانات",
  searchPlaceholder = "ابحث ثم اختر...",
}: {
  title: string;
  description?: string;
  items: OptionItem[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  emptyText?: string;
  searchPlaceholder?: string;
}) {
  const [q, setQ] = useState("");
  const [visibleCount, setVisibleCount] = useState(24);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filtered = useMemo(() => {
    const query = s(q).toLowerCase();

    if (!query) return items;

    return items.filter((item) => {
      return (
        s(item.label).toLowerCase().includes(query) ||
        s(item.meta).toLowerCase().includes(query)
      );
    });
  }, [items, q]);

  const visible = filtered.slice(0, visibleCount);

  function toggle(id: string) {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((x) => x !== id));
      return;
    }

    onChange([...selectedIds, id]);
  }

  function remove(id: string) {
    onChange(selectedIds.filter((x) => x !== id));
  }

  return (
    <div className="adm-free-shipping-pickerBox">
      <div className="adm-free-shipping-pickerBox__head">
        <div>
          <strong>{title}</strong>
          {description ? <span>{description}</span> : null}
        </div>

        <em>
          {selectedIds.length} محدد من {items.length}
        </em>
      </div>

      {selectedIds.length > 0 ? (
        <div className="adm-free-shipping-selectedBar">
          <div className="adm-free-shipping-selectedBar__chips">
            {selectedIds.slice(0, 8).map((id) => {
              const item = items.find((x) => x.id === id);

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => remove(id)}
                  className="adm-free-shipping-selectedChip"
                >
                  <span>{item?.label || "عنصر محدد"}</span>
                  <b>×</b>
                </button>
              );
            })}

            {selectedIds.length > 8 ? (
              <span className="adm-free-shipping-moreChip">
                +{selectedIds.length - 8}
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => onChange([])}
            className="adm-free-shipping-clearBtn"
          >
            مسح التحديد
          </button>
        </div>
      ) : null}

      <div className="adm-free-shipping-searchRow">
        <input
          value={q}
          onChange={(event) => {
            setQ(event.currentTarget.value);
            setVisibleCount(24);
          }}
          className="adm-shipping-rate-field__control"
          placeholder={searchPlaceholder}
        />

        <span>
          عرض {visible.length} من {filtered.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="adm-free-shipping-empty">{emptyText}</div>
      ) : (
        <>
          <div className="adm-free-shipping-smartGrid">
            {visible.map((item) => {
              const active = selectedSet.has(item.id);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggle(item.id)}
                  className={clsx(
                    "adm-free-shipping-smartItem",
                    active && "adm-free-shipping-smartItem--active",
                  )}
                >
                  <span className="adm-free-shipping-smartItem__check">
                    {active ? "✓" : "+"}
                  </span>

                  <span className="adm-free-shipping-smartItem__text">
                    <strong>{item.label}</strong>
                    <small>
                      {active ? "محدد" : item.meta || "اضغط للتحديد"}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>

          {visible.length < filtered.length ? (
            <button
              type="button"
              onClick={() => setVisibleCount((current) => current + 24)}
              className="adm-free-shipping-loadMore"
            >
              عرض المزيد
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}

function RemoteProductPickerBox({
  selectedItems,
  selectedIds,
  onChange,
}: {
  selectedItems: OptionItem[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<OptionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const itemById = useMemo(() => {
    const map = new Map<string, OptionItem>();

    for (const item of selectedItems) {
      map.set(item.id, item);
    }

    for (const item of items) {
      map.set(item.id, item);
    }

    return map;
  }, [selectedItems, items]);

  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setErr("");

      try {
        const res = await fetchProductPicker({
          q,
          page: 1,
          limit: 24,
        });

        if (cancelled) return;

        setItems(res.items);
        setTotal(res.total);
        setPage(res.page);
        setHasMore(res.has_more);
      } catch (e: any) {
        if (cancelled) return;

        setItems([]);
        setTotal(0);
        setPage(1);
        setHasMore(false);
        setErr(e?.message || "فشل تحميل المنتجات");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
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
    setErr("");

    try {
      const res = await fetchProductPicker({
        q,
        page: nextPage,
        limit: 24,
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
    } catch (e: any) {
      setErr(e?.message || "فشل تحميل المنتجات");
    } finally {
      setLoading(false);
    }
  }

  function toggle(id: string) {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((x) => x !== id));
      return;
    }

    onChange([...selectedIds, id]);
  }

  function remove(id: string) {
    onChange(selectedIds.filter((x) => x !== id));
  }

  return (
    <div className="adm-free-shipping-pickerBox">
      <div className="adm-free-shipping-pickerBox__head">
        <div>
          <strong>اختيار المنتجات</strong>
          <span>
            مناسب حتى لو عندك 100 ألف منتج؛ البحث يحمل النتائج المطلوبة فقط.
          </span>
        </div>

        <em>
          {selectedIds.length} محدد من {total}
        </em>
      </div>

      {selectedIds.length > 0 ? (
        <div className="adm-free-shipping-selectedBar">
          <div className="adm-free-shipping-selectedBar__chips">
            {selectedIds.slice(0, 10).map((id) => {
              const item = itemById.get(id);

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => remove(id)}
                  className="adm-free-shipping-selectedChip"
                >
                  <span>{item?.label || "منتج محدد"}</span>
                  <b>×</b>
                </button>
              );
            })}

            {selectedIds.length > 10 ? (
              <span className="adm-free-shipping-moreChip">
                +{selectedIds.length - 10}
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => onChange([])}
            className="adm-free-shipping-clearBtn"
          >
            مسح التحديد
          </button>
        </div>
      ) : null}

      <div className="adm-free-shipping-searchRow">
        <input
          value={q}
          onChange={(event) => setQ(event.currentTarget.value)}
          className="adm-shipping-rate-field__control"
          placeholder="ابحث باسم المنتج أو الرقم..."
        />

        <span>{loading ? "جاري البحث..." : `عرض ${items.length} من ${total}`}</span>
      </div>

      {err ? <div className="adm-free-shipping-empty">{err}</div> : null}

      {!err && items.length === 0 ? (
        <div className="adm-free-shipping-empty">
          {loading ? "جاري تحميل المنتجات..." : "ابحث عن منتج لعرض النتائج."}
        </div>
      ) : null}

      {items.length > 0 ? (
        <>
          <div className="adm-free-shipping-smartGrid">
            {items.map((item) => {
              const active = selectedSet.has(item.id);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggle(item.id)}
                  className={clsx(
                    "adm-free-shipping-smartItem",
                    active && "adm-free-shipping-smartItem--active",
                  )}
                >
                  <span className="adm-free-shipping-smartItem__check">
                    {active ? "✓" : "+"}
                  </span>

                  <span className="adm-free-shipping-smartItem__text">
                    <strong>{item.label}</strong>
                    <small>{active ? "محدد" : item.meta || "منتج"}</small>
                  </span>
                </button>
              );
            })}
          </div>

          {hasMore ? (
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loading}
              className="adm-free-shipping-loadMore"
            >
              {loading ? "جاري التحميل..." : "عرض المزيد"}
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default function FreeShippingModal({
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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const [data, setData] = useState<ApiData>({
    currency_code: "SAR",
    rules: [],
    countries: [],
    cities: [],
    products: [],
    categories: [],
    carriers: [],
    customer_groups: [],
  });

  const [draft, setDraft] = useState<FreeShippingRule>(() => defaultRule());

  const locked = Boolean(busy || loading || saving || deletingId);
  const applyOn = applyOnFromRule(draft);
  const currencyCode = s(data.currency_code) || "SAR";

  async function load() {
    setLoading(true);
    setErr("");
    setOkMsg("");

    try {
      const next = await fetchOptions();

      setData(next);

      if (next.rules.length) {
        setDraft({
          ...defaultRule(),
          ...next.rules[0],
        });
      } else {
        setDraft(defaultRule());
      }
    } catch (e: any) {
      setErr(e?.message || "فشل تحميل الشحن المجاني");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open]);

  function patch(patchValue: Partial<FreeShippingRule>) {
    setDraft((current) => ({
      ...current,
      ...patchValue,
    }));
  }

  function setApplyOn(next: ApplyOn) {
    if (next === "all") {
      patch({
        products_mode: "all",
        categories_mode: "all",
        product_ids: [],
        category_ids: [],
      });
      return;
    }

    if (next === "categories") {
      patch({
        products_mode: "all",
        product_ids: [],
        categories_mode: "include",
      });
      return;
    }

    patch({
      categories_mode: "all",
      category_ids: [],
      products_mode: "include",
    });
  }

  function validate() {
    if (!s(draft.name)) return "اكتب اسم قاعدة الشحن المجاني.";

    if (n(draft.minimum_subtotal, 0) < 0) {
      return "الحد الأدنى للطلب لا يمكن أن يكون أقل من صفر.";
    }

    if (draft.countries_mode === "include" && draft.country_ids.length === 0) {
      return "اختر دولة واحدة على الأقل أو اجعل البلدان: الكل.";
    }

    if (draft.cities_mode === "include" && draft.city_ids.length === 0) {
      return "اختر مدينة واحدة على الأقل أو اجعل المدن: الكل.";
    }

    if (draft.products_mode === "include" && draft.product_ids.length === 0) {
      return "اختر منتجًا واحدًا على الأقل.";
    }

    if (
      draft.categories_mode === "include" &&
      draft.category_ids.length === 0
    ) {
      return "اختر تصنيفًا واحدًا على الأقل.";
    }

    if (draft.carriers_mode === "include" && draft.carrier_ids.length === 0) {
      return "اختر شركة شحن واحدة على الأقل أو اجعل شركات الشحن: الكل.";
    }

    if (
      draft.customer_groups_mode === "include" &&
      draft.customer_group_ids.length === 0
    ) {
      return "اختر مجموعة عملاء واحدة على الأقل أو اجعل العملاء: الكل.";
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
      const savedResult = await saveRule({
        ...draft,
        minimum_subtotal: n(draft.minimum_subtotal, 0),
      });

      const savedId = s(savedResult?.id);

      const next = await fetchOptions();
      setData(next);

      const saved =
        next.rules.find((rule) => s(rule.id) === savedId) ||
        next.rules.find((rule) => rule.name === draft.name) ||
        next.rules[0];

      if (saved) {
        setDraft({
          ...defaultRule(),
          ...saved,
        });
      }

      setOkMsg("تم حفظ قاعدة الشحن المجاني بنجاح.");
      await onSaved?.();
    } catch (e: any) {
      setErr(e?.message || "فشل حفظ قاعدة الشحن المجاني");
    } finally {
      setSaving(false);
    }
  }

  async function removeRule(rule: FreeShippingRule) {
    const id = s(rule.id);
    if (!id) return;

    const sure = confirm("حذف قاعدة الشحن المجاني؟");
    if (!sure) return;

    setDeletingId(id);
    setErr("");
    setOkMsg("");

    try {
      await deleteRule(id);

      const next = await fetchOptions();
      setData(next);
      setDraft(
        next.rules.length
          ? { ...defaultRule(), ...next.rules[0] }
          : defaultRule(),
      );

      setOkMsg("تم حذف قاعدة الشحن المجاني.");
      await onSaved?.();
    } catch (e: any) {
      setErr(e?.message || "فشل حذف قاعدة الشحن المجاني");
    } finally {
      setDeletingId("");
    }
  }

  if (!open) return null;

  const activeRules = data.rules.filter((rule) => rule.enabled).length;
  const inactiveRules = data.rules.length - activeRules;

  return (
    <div className="adm-shipping-rate-modal" role="dialog" aria-modal="true">
      <button
        type="button"
        className="adm-shipping-rate-modal__backdrop"
        onClick={() => {
          if (!locked) onClose();
        }}
        aria-label="إغلاق"
      />

      <div className="adm-shipping-rate-modal__wrap adm-free-shipping-modal__wrap">
        <div className="adm-shipping-rate-modal__panel">
          <div className="adm-shipping-rate-modal__head">
            <div className="adm-shipping-rate-modal__titleWrap">
              <h2 className="adm-shipping-rate-modal__title">
                إعدادات الشحن المجاني
              </h2>

              <p className="adm-shipping-rate-modal__desc">
                أنشئ قواعد متعددة حسب البلد، المدينة، المنتج، التصنيف، شركة
                الشحن، ومجموعة العملاء.
              </p>
            </div>

            <button
              type="button"
              className="adm-shipping-rate-modal__close"
              onClick={() => {
                if (!locked) onClose();
              }}
              disabled={locked}
              aria-label="إغلاق"
            >
              ×
            </button>
          </div>

          <div className="adm-shipping-rate-modal__body adm-free-shipping-modal__body">
            {err ? (
              <div className="adm-shipping-rate-alert adm-shipping-rate-alert--danger">
                {err}
              </div>
            ) : null}

            {okMsg ? (
              <div className="adm-free-shipping-notice">{okMsg}</div>
            ) : null}

            <div className="adm-free-shipping-summary">
              <div className="adm-free-shipping-summary__card">
                <span>القواعد المحفوظة</span>
                <strong>{data.rules.length}</strong>
              </div>

              <div className="adm-free-shipping-summary__card">
                <span>القواعد المفعّلة</span>
                <strong>{activeRules}</strong>
              </div>

              <div className="adm-free-shipping-summary__card">
                <span>القواعد المتوقفة</span>
                <strong>{inactiveRules}</strong>
              </div>
            </div>

            {loading ? (
              <div className="adm-free-shipping-empty">
                جاري تحميل إعدادات الشحن المجاني...
              </div>
            ) : (
              <div className="adm-free-shipping-layout">
                <main className="adm-free-shipping-editor">
                  <div className="adm-free-shipping-sectionHead">
                    <div>
                      <h3>{draft.id ? "تعديل القاعدة" : "قاعدة جديدة"}</h3>
                      <p>اضبط الشرط كما سيظهر ويُحتسب داخل السلة وصفحة الدفع.</p>
                    </div>

                    <RuleStatusSwitch
                      checked={draft.enabled}
                      disabled={locked}
                      onChange={(next) => patch({ enabled: next })}
                    />
                  </div>

                  <div className="adm-free-shipping-basicGrid">
                    <label className="adm-free-shipping-field adm-free-shipping-field--name">
                      <span className="adm-shipping-rate-field__label">
                        اسم القاعدة
                      </span>

                      <input
                        value={draft.name}
                        onChange={(event) =>
                          patch({ name: event.currentTarget.value })
                        }
                        className="adm-shipping-rate-field__control"
                        placeholder="مثال: شحن مجاني لليمن"
                        disabled={locked}
                      />
                    </label>

                    <label className="adm-free-shipping-field adm-free-shipping-field--amount">
                      <span className="adm-shipping-rate-field__label">
                        الحد الأدنى للطلب
                      </span>

                      <div className="adm-free-shipping-moneyField">
                        <input
                          value={String(draft.minimum_subtotal ?? 0)}
                          onChange={(event) =>
                            patch({
                              minimum_subtotal: event.currentTarget.value,
                            })
                          }
                          inputMode="decimal"
                          className="adm-shipping-rate-field__control"
                          placeholder="0"
                          disabled={locked}
                          dir="ltr"
                        />

                        <span>{currencyCode}</span>
                      </div>

                      <small className="adm-free-shipping-fieldHint">
                        إذا تركته 0 يظهر الشحن المجاني بدون حد أدنى.
                      </small>
                    </label>

                    <label className="adm-free-shipping-field adm-free-shipping-field--date">
                      <span className="adm-shipping-rate-field__label">
                        بداية الشرط
                      </span>

                      <input
                        type="datetime-local"
                        value={toInputDateTime(draft.starts_at)}
                        onChange={(event) =>
                          patch({ starts_at: event.currentTarget.value || null })
                        }
                        className="adm-shipping-rate-field__control adm-free-shipping-dateInput"
                        disabled={locked}
                        dir="ltr"
                      />
                    </label>

                    <label className="adm-free-shipping-field adm-free-shipping-field--date">
                      <span className="adm-shipping-rate-field__label">
                        نهاية الشرط
                      </span>

                      <input
                        type="datetime-local"
                        value={toInputDateTime(draft.ends_at)}
                        onChange={(event) =>
                          patch({ ends_at: event.currentTarget.value || null })
                        }
                        className="adm-shipping-rate-field__control adm-free-shipping-dateInput"
                        disabled={locked}
                        dir="ltr"
                      />
                    </label>
                  </div>

                  <div className="adm-free-shipping-editorGrid">
                    <section className="adm-free-shipping-pro-card">
                      <div className="adm-free-shipping-pro-card__head">
                        <div>
                          <h4>البلدان</h4>
                          <p>اختر كل البلدان أو حدد بلدانًا معينة.</p>
                        </div>
                      </div>

                      <div className="adm-free-shipping-pro-card__body">
                        <ModeSwitch
                          value={draft.countries_mode}
                          allText="كل البلدان"
                          includeText="بلدان محددة"
                          onChange={(value) =>
                            patch({
                              countries_mode: value,
                              country_ids:
                                value === "all" ? [] : draft.country_ids,
                            })
                          }
                        />

                        {draft.countries_mode === "include" ? (
                          <SmartPickerBox
                            title="اختيار البلدان"
                            description="ابحث وحدد البلدان حبة حبة."
                            items={data.countries}
                            selectedIds={draft.country_ids}
                            onChange={(ids) => patch({ country_ids: ids })}
                            emptyText="لا توجد بلدان متاحة."
                            searchPlaceholder="ابحث عن بلد..."
                          />
                        ) : null}
                      </div>
                    </section>

                    <section className="adm-free-shipping-pro-card">
                      <div className="adm-free-shipping-pro-card__head">
                        <div>
                          <h4>المدن</h4>
                          <p>استخدمها إذا كان الشحن المجاني داخل مدن محددة فقط.</p>
                        </div>
                      </div>

                      <div className="adm-free-shipping-pro-card__body">
                        <ModeSwitch
                          value={draft.cities_mode}
                          allText="كل المدن"
                          includeText="مدن محددة"
                          onChange={(value) =>
                            patch({
                              cities_mode: value,
                              city_ids: value === "all" ? [] : draft.city_ids,
                            })
                          }
                        />

                        {draft.cities_mode === "include" ? (
                          <SmartPickerBox
                            title="اختيار المدن"
                            description="ابحث وحدد المدن المطلوبة."
                            items={data.cities}
                            selectedIds={draft.city_ids}
                            onChange={(ids) => patch({ city_ids: ids })}
                            emptyText="لا توجد مدن متاحة."
                            searchPlaceholder="ابحث عن مدينة..."
                          />
                        ) : null}
                      </div>
                    </section>

                    <section className="adm-free-shipping-pro-card">
                      <div className="adm-free-shipping-pro-card__head">
                        <div>
                          <h4>تطبيق الشرط على</h4>
                          <p>
                            اختر هل القاعدة على كل المنتجات أو تصنيفات أو منتجات
                            محددة.
                          </p>
                        </div>
                      </div>

                      <div className="adm-free-shipping-pro-card__body">
                        <div className="adm-free-shipping-segment">
                          <button
                            type="button"
                            onClick={() => setApplyOn("all")}
                            className={applyOn === "all" ? "is-active" : ""}
                          >
                            كل المنتجات
                          </button>

                          <button
                            type="button"
                            onClick={() => setApplyOn("categories")}
                            className={
                              applyOn === "categories" ? "is-active" : ""
                            }
                          >
                            تصنيفات
                          </button>

                          <button
                            type="button"
                            onClick={() => setApplyOn("products")}
                            className={applyOn === "products" ? "is-active" : ""}
                          >
                            منتجات
                          </button>
                        </div>

                        {applyOn === "categories" ? (
                          <SmartPickerBox
                            title="اختيار التصنيفات"
                            description="الشحن المجاني يطبق على منتجات التصنيفات المحددة."
                            items={data.categories}
                            selectedIds={draft.category_ids}
                            onChange={(ids) => patch({ category_ids: ids })}
                            emptyText="لا توجد تصنيفات متاحة."
                            searchPlaceholder="ابحث عن تصنيف..."
                          />
                        ) : null}

                        {applyOn === "products" ? (
                          <RemoteProductPickerBox
                            selectedItems={data.products}
                            selectedIds={draft.product_ids}
                            onChange={(ids) => patch({ product_ids: ids })}
                          />
                        ) : null}
                      </div>
                    </section>

                    <section className="adm-free-shipping-pro-card">
                      <div className="adm-free-shipping-pro-card__head">
                        <div>
                          <h4>شركات الشحن</h4>
                          <p>حدد هل الشرط يعمل مع كل شركات الشحن أو شركات معينة.</p>
                        </div>
                      </div>

                      <div className="adm-free-shipping-pro-card__body">
                        <ModeSwitch
                          value={draft.carriers_mode}
                          allText="كل شركات الشحن"
                          includeText="شركات محددة"
                          onChange={(value) =>
                            patch({
                              carriers_mode: value,
                              carrier_ids:
                                value === "all" ? [] : draft.carrier_ids,
                            })
                          }
                        />

                        {draft.carriers_mode === "include" ? (
                          <SmartPickerBox
                            title="اختيار شركات الشحن"
                            description="حدد الشركات التي يسمح لها بتطبيق الشحن المجاني."
                            items={data.carriers}
                            selectedIds={draft.carrier_ids}
                            onChange={(ids) => patch({ carrier_ids: ids })}
                            emptyText="لا توجد شركات شحن مفعّلة."
                            searchPlaceholder="ابحث عن شركة شحن..."
                          />
                        ) : null}
                      </div>
                    </section>

                    <section className="adm-free-shipping-pro-card">
                      <div className="adm-free-shipping-pro-card__head">
                        <div>
                          <h4>مجموعة العملاء</h4>
                          <p>
                            اختر كل العملاء أو مجموعات معينة، مع عرض عدد العملاء
                            داخل كل مجموعة.
                          </p>
                        </div>
                      </div>

                      <div className="adm-free-shipping-pro-card__body">
                        <ModeSwitch
                          value={draft.customer_groups_mode}
                          allText="كل العملاء"
                          includeText="مجموعات محددة"
                          onChange={(value) =>
                            patch({
                              customer_groups_mode: value,
                              customer_group_ids:
                                value === "all"
                                  ? []
                                  : draft.customer_group_ids,
                            })
                          }
                        />

                        {draft.customer_groups_mode === "include" ? (
                          <SmartPickerBox
                            title="اختيار مجموعات العملاء"
                            description="الشحن المجاني يطبق فقط على العملاء داخل هذه المجموعات."
                            items={data.customer_groups}
                            selectedIds={draft.customer_group_ids}
                            onChange={(ids) =>
                              patch({ customer_group_ids: ids })
                            }
                            emptyText="لا توجد مجموعات عملاء. أنشئ مجموعة عملاء أولًا."
                            searchPlaceholder="ابحث عن مجموعة..."
                          />
                        ) : null}
                      </div>
                    </section>

                    <section className="adm-free-shipping-preview">
                      <div className="adm-free-shipping-preview__head">
                        <strong>ملخص الشرط</strong>
                        <span>{draft.enabled ? "مفعّل" : "متوقف"}</span>
                      </div>

                      <dl>
                        <div>
                          <dt>الحد الأدنى</dt>
                          <dd>
                            {n(draft.minimum_subtotal, 0) > 0
                              ? `${currencyCode} ${n(draft.minimum_subtotal, 0)}`
                              : "بدون حد"}
                          </dd>
                        </div>

                        <div>
                          <dt>البلدان</dt>
                          <dd>
                            {draft.countries_mode === "all"
                              ? "كل البلدان"
                              : selectedSummary(
                                  data.countries,
                                  draft.country_ids,
                                  "بلد",
                                )}
                          </dd>
                        </div>

                        <div>
                          <dt>المدن</dt>
                          <dd>
                            {draft.cities_mode === "all"
                              ? "كل المدن"
                              : selectedSummary(
                                  data.cities,
                                  draft.city_ids,
                                  "مدينة",
                                )}
                          </dd>
                        </div>

                        <div>
                          <dt>المنتجات</dt>
                          <dd>
                            {applyOn === "all"
                              ? "كل المنتجات"
                              : applyOn === "categories"
                                ? selectedSummary(
                                    data.categories,
                                    draft.category_ids,
                                    "تصنيف",
                                  )
                                : selectedSummary(
                                    data.products,
                                    draft.product_ids,
                                    "منتج",
                                  )}
                          </dd>
                        </div>

                        <div>
                          <dt>شركات الشحن</dt>
                          <dd>
                            {draft.carriers_mode === "all"
                              ? "كل شركات الشحن"
                              : selectedSummary(
                                  data.carriers,
                                  draft.carrier_ids,
                                  "شركة",
                                )}
                          </dd>
                        </div>

                        <div>
                          <dt>مجموعة العملاء</dt>
                          <dd>
                            {draft.customer_groups_mode === "all"
                              ? "كل العملاء"
                              : selectedSummary(
                                  data.customer_groups,
                                  draft.customer_group_ids,
                                  "مجموعة",
                                )}
                          </dd>
                        </div>
                      </dl>
                    </section>

                    {draft.id ? (
                      <div className="adm-free-shipping-deleteRow">
                        <button
                          type="button"
                          disabled={locked}
                          onClick={() => void removeRule(draft)}
                          className="adm-btn adm-btn--dangerGhost"
                        >
                          {deletingId ? "جاري الحذف..." : "حذف هذه القاعدة"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </main>

                <aside className="adm-free-shipping-list">
                  <div className="adm-free-shipping-sectionHead">
                    <div>
                      <h3>قواعد الشحن المجاني</h3>
                      <p>اختر قاعدة لتعديلها أو أنشئ قاعدة جديدة.</p>
                    </div>

                    <button
                      type="button"
                      className="adm-btn adm-btn--primary adm-btn--sm"
                      disabled={locked}
                      onClick={() => {
                        setErr("");
                        setOkMsg("");
                        setDraft(defaultRule());
                      }}
                    >
                      + قاعدة جديدة
                    </button>
                  </div>

                  {data.rules.length === 0 ? (
                    <div className="adm-free-shipping-empty">
                      لا توجد قواعد بعد. أنشئ أول قاعدة للشحن المجاني.
                    </div>
                  ) : (
                    <div className="adm-free-shipping-rules">
                      {data.rules.map((rule) => {
                        const active = s(rule.id) && s(rule.id) === s(draft.id);

                        return (
                          <button
                            key={rule.id}
                            type="button"
                            disabled={locked}
                            onClick={() => {
                              setErr("");
                              setOkMsg("");
                              setDraft({
                                ...defaultRule(),
                                ...rule,
                              });
                            }}
                            className={clsx(
                              "adm-free-shipping-rule",
                              active && "adm-free-shipping-rule--active",
                              !rule.enabled && "adm-free-shipping-rule--disabled",
                            )}
                          >
                            <div className="adm-free-shipping-rule__top">
                              <div className="adm-free-shipping-rule__title">
                                {rule.name}
                              </div>

                              <span
                                className={clsx(
                                  "adm-free-shipping-rule__badge",
                                  rule.enabled &&
                                    "adm-free-shipping-rule__badge--active",
                                )}
                              >
                                {rule.enabled ? "مفعّلة" : "متوقفة"}
                              </span>
                            </div>

                            <div className="adm-free-shipping-rule__meta">
                              الحد الأدنى:{" "}
                              {n(rule.minimum_subtotal, 0) > 0
                                ? `${currencyCode} ${n(
                                    rule.minimum_subtotal,
                                    0,
                                  )}`
                                : "بدون حد"}
                              <br />
                              البلدان:{" "}
                              {rule.countries_mode === "all"
                                ? "كل البلدان"
                                : selectedSummary(
                                    data.countries,
                                    rule.country_ids,
                                    "بلد",
                                  )}
                              <br />
                              شركات الشحن:{" "}
                              {rule.carriers_mode === "all"
                                ? "كل الشركات"
                                : selectedSummary(
                                    data.carriers,
                                    rule.carrier_ids,
                                    "شركة",
                                  )}
                            </div>

                            <div className="adm-free-shipping-rule__foot">
                              <span>تعديل الشرط</span>

                              {rule.id ? (
                                <span
                                  role="button"
                                  tabIndex={0}
                                  className="adm-free-shipping-rule__delete"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void removeRule(rule);
                                  }}
                                >
                                  حذف
                                </span>
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </aside>
              </div>
            )}
          </div>

          <div className="adm-shipping-rate-modal__footer">
            <button
              type="button"
              disabled={locked}
              onClick={onClose}
              className="adm-btn adm-btn--secondary"
            >
              إغلاق
            </button>

            <button
              type="button"
              disabled={locked}
              onClick={() => void submit()}
              className="adm-btn adm-btn--primary"
            >
              {saving ? "جاري الحفظ..." : "حفظ إعدادات الشحن المجاني"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}