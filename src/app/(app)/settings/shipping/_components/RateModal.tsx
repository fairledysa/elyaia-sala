// FILE: apps/merchant/src/app/(app)/settings/shipping/_components/RateModal.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type City = { id: string; name_ar?: string; name_en?: string; label?: string };

type CoverageCity = {
  city_id: string;
  status: "active" | "inactive";
  cod_available: boolean;
  cod_fee: number;
  merchant_shipping_cost: number;
  currency: string;
  eta_text: string | null;
};

type RateRow = {
  id: string;
  scope: "all_cities" | "include_cities";
  excluded_city_ids: string[];
  included_city_ids: string[];
  pricing_type: "flat" | "weight";
  merchant_cost: number;
  customer_price: number;
  eta_text: string | null;
  cod_enabled: boolean;
  currency: string;
  enabled: boolean;
  status: "active" | "inactive";
  created_at: string;
  cod_fee_customer?: number;
  cod_fee_include_tax?: boolean;
};

type CityRateDraft = {
  city_id: string;
  label: string;
  customer_price: string;
  cod_enabled: boolean;
  cod_available: boolean;
  cod_fee: number;
  merchant_cost: number;
  currency: string;
  eta_text: string;
  cod_fee_customer: string;
  cod_fee_include_tax: boolean;
};

type TaxSettings = {
  enabled: boolean;
  tax_number: string | null;
  tax_certificate_url: string | null;
  show_tax_number_in_footer: boolean;
  show_tax_certificate_icon: boolean;
  prices_include_tax: boolean;
  shipping_include_tax: boolean;
  tax_label: string;
  metadata?: Record<string, any>;
};

const DEFAULT_TAX_SETTINGS: TaxSettings = {
  enabled: false,
  tax_number: null,
  tax_certificate_url: null,
  show_tax_number_in_footer: false,
  show_tax_certificate_icon: false,
  prices_include_tax: false,
  shipping_include_tax: false,
  tax_label: "VAT",
  metadata: {},
};

function humanizeRateError(code: string) {
  const c = String(code || "").trim();

  if (c === "DUPLICATE_ALL_CITIES_RATE") {
    return "لا يمكن إضافة تسعيرة (كل المدن المتاحة) لأن هناك تسعيرة (كل المدن المتاحة) موجودة بالفعل. احذفها أو عدّلها.";
  }

  if (c === "ALL_CITIES_RATE_ALREADY_EXISTS") {
    return "لا يمكن إضافة تسعيرة مدن محددة لأن تسعيرة (كل المدن المتاحة) موجودة بالفعل. احذف تسعيرة (كل المدن) أولاً أو استخدم الاستثناءات.";
  }

  if (c === "DUPLICATE_SAME_CITIES_RATE") {
    return "هذه التسعيرة موجودة مسبقًا لنفس المدن. عدّل التسعيرة الحالية بدل إنشاء واحدة جديدة.";
  }

  if (c === "included_city_ids_required") {
    return "لازم تختار مدينة واحدة على الأقل عند (تحديد مدن).";
  }

  return "تعذر حفظ التسعيرة. تحقق من البيانات وحاول مرة أخرى.";
}

function clsx(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function Ico({ name }: { name: "close" | "search" | "ok" | "trash" }) {
  const common = "adm-shipping-rate-ico";

  switch (name) {
    case "close":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M6 6l12 12M18 6L6 18"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );

    case "search":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M10.5 18a7.5 7.5 0 110-15 7.5 7.5 0 010 15z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M16.5 16.5L21 21"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );

    case "ok":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M20 6L9 17l-5-5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "trash":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M4 7h16"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M10 11v7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M14 11v7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M6 7l1-3h10l1 3v14a2 2 0 01-2 2H8a2 2 0 01-2-2V7z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

function TaxInclusionChoice({
  value,
  disabled,
  title,
  description,
  badge = "شامل الضريبة",
  inclusiveTitle,
  inclusiveDescription,
  inclusiveExample,
  exclusiveTitle,
  exclusiveDescription,
  exclusiveExample,
  onChange,
}: {
  value: boolean;
  disabled?: boolean;
  title: string;
  description: string;
  badge?: string;
  inclusiveTitle: string;
  inclusiveDescription: string;
  inclusiveExample: string;
  exclusiveTitle: string;
  exclusiveDescription: string;
  exclusiveExample: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="rounded-[24px] border border-[color:var(--adm-border)] bg-[var(--adm-surface)] p-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 text-right">
          <div className="text-sm font-black text-[color:var(--adm-text)]">
            {title}
          </div>

          <div className="mt-1 text-xs font-bold leading-6 text-[color:var(--adm-muted)]">
            {description}
          </div>
        </div>

        <span className="inline-flex w-fit shrink-0 items-center justify-center rounded-full bg-[var(--adm-primary)] px-4 py-1.5 text-xs font-black text-white">
          {badge}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(true)}
          className={clsx(
            "relative min-h-[132px] rounded-[20px] border p-4 text-right transition",
            "focus:outline-none focus:ring-4 focus:ring-[rgb(13_59_69_/_0.10)]",
            value
              ? "border-[color:var(--adm-primary)] bg-[var(--adm-mint-soft)] shadow-[0_14px_34px_rgb(13_59_69_/_0.08)]"
              : "border-[color:var(--adm-border)] bg-white hover:bg-[var(--adm-soft)]",
            disabled && "cursor-not-allowed opacity-60",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <strong className="block text-sm font-black text-[color:var(--adm-text)]">
                {inclusiveTitle}
              </strong>

              <small className="mt-2 block text-xs font-bold leading-6 text-[color:var(--adm-muted)]">
                {inclusiveDescription}
              </small>
            </div>

            <span
              className={clsx(
                "grid h-8 w-8 shrink-0 place-items-center rounded-full border",
                value
                  ? "border-[color:var(--adm-primary)] bg-[var(--adm-primary)] text-white"
                  : "border-[color:var(--adm-border)] bg-white text-transparent",
              )}
            >
              {value ? <Ico name="ok" /> : null}
            </span>
          </div>

          <div
            className={clsx(
              "mt-4 rounded-2xl px-4 py-2 text-center text-xs font-black leading-5",
              value
                ? "bg-white/80 text-[color:var(--adm-primary)]"
                : "bg-[var(--adm-soft)] text-[color:var(--adm-muted)]",
            )}
          >
            {inclusiveExample}
          </div>
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(false)}
          className={clsx(
            "relative min-h-[132px] rounded-[20px] border p-4 text-right transition",
            "focus:outline-none focus:ring-4 focus:ring-[rgb(13_59_69_/_0.10)]",
            !value
              ? "border-[color:var(--adm-primary)] bg-[var(--adm-mint-soft)] shadow-[0_14px_34px_rgb(13_59_69_/_0.08)]"
              : "border-[color:var(--adm-border)] bg-white hover:bg-[var(--adm-soft)]",
            disabled && "cursor-not-allowed opacity-60",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <strong className="block text-sm font-black text-[color:var(--adm-text)]">
                {exclusiveTitle}
              </strong>

              <small className="mt-2 block text-xs font-bold leading-6 text-[color:var(--adm-muted)]">
                {exclusiveDescription}
              </small>
            </div>

            <span
              className={clsx(
                "grid h-8 w-8 shrink-0 place-items-center rounded-full border",
                !value
                  ? "border-[color:var(--adm-primary)] bg-[var(--adm-primary)] text-white"
                  : "border-[color:var(--adm-border)] bg-white text-transparent",
              )}
            >
              {!value ? <Ico name="ok" /> : null}
            </span>
          </div>

          <div
            className={clsx(
              "mt-4 rounded-2xl px-4 py-2 text-center text-xs font-black leading-5",
              !value
                ? "bg-white/80 text-[color:var(--adm-primary)]"
                : "bg-[var(--adm-soft)] text-[color:var(--adm-muted)]",
            )}
          >
            {exclusiveExample}
          </div>
        </button>
      </div>
    </div>
  );
}

function numberOrZero(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeTaxSettings(row: any): TaxSettings {
  return {
    ...DEFAULT_TAX_SETTINGS,
    ...(row || {}),
    enabled: Boolean(row?.enabled),
    prices_include_tax: Boolean(row?.prices_include_tax),
    shipping_include_tax: Boolean(row?.shipping_include_tax),
    show_tax_number_in_footer: Boolean(row?.show_tax_number_in_footer),
    show_tax_certificate_icon: Boolean(row?.show_tax_certificate_icon),
    tax_label: String(row?.tax_label || "VAT"),
    metadata:
      row?.metadata && typeof row.metadata === "object" ? row.metadata : {},
  };
}

async function fetchTaxSettings(): Promise<TaxSettings> {
  const res = await fetch("/api/settings/store/taxes/get", {
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) return DEFAULT_TAX_SETTINGS;

  return normalizeTaxSettings(json?.settings);
}

async function saveTaxSettings(settings: TaxSettings): Promise<TaxSettings> {
  const res = await fetch("/api/settings/store/taxes/update", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      settings: {
        enabled: Boolean(settings.enabled),
        tax_number: settings.tax_number || null,
        tax_certificate_url: settings.tax_certificate_url || null,
        show_tax_number_in_footer: Boolean(settings.show_tax_number_in_footer),
        show_tax_certificate_icon: Boolean(settings.show_tax_certificate_icon),
        prices_include_tax: Boolean(settings.prices_include_tax),
        shipping_include_tax: Boolean(settings.shipping_include_tax),
        tax_label: settings.tax_label || "VAT",
        metadata: settings.metadata ?? {},
      },
    }),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.error || "FAILED_TO_SAVE_TAX_SETTINGS");
  }

  return normalizeTaxSettings(json?.settings ?? settings);
}

async function fetchCities(q?: string): Promise<City[]> {
  const url = new URL("/api/ref/locations/cities", window.location.origin);
  if (q) url.searchParams.set("q", q);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = await res.json().catch(() => ({}));

  if (!res.ok || !json?.ok) return [];
  return (json.value || []) as City[];
}

async function fetchCarrierCoverage(
  carrier_code: string,
): Promise<CoverageCity[]> {
  const url = new URL(
    "/api/settings/store/shipping/carriers/coverage",
    window.location.origin,
  );

  url.searchParams.set("carrier_code", carrier_code);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = await res.json().catch(() => ({}));

  if (!res.ok || !json?.ok) return [];
  return (json.value?.cities || []) as CoverageCity[];
}

async function ratesList(
  store_shipping_carrier_id: string,
): Promise<RateRow[]> {
  const url = new URL(
    "/api/settings/store/shipping/rates/list",
    window.location.origin,
  );

  url.searchParams.set(
    "store_shipping_carrier_id",
    store_shipping_carrier_id,
  );

  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = await res.json().catch(() => ({}));

  if (!res.ok || !json?.ok) return [];
  return (json.value || []) as RateRow[];
}

async function createRate(payload: any) {
  const res = await fetch("/api/settings/store/shipping/rates/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || "RATE_CREATE_FAILED");
  }

  return json.value;
}

async function deleteRate(rate_id: string) {
  const res = await fetch("/api/settings/store/shipping/rates/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rate_id }),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || "RATE_DELETE_FAILED");
  }

  return json.value;
}

async function updateRate(payload: any) {
  const res = await fetch("/api/settings/store/shipping/rates/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || "RATE_UPDATE_FAILED");
  }

  return json.value;
}

function CityMultiSelect({
  label,
  hint,
  items,
  selectedIds,
  onChange,
  disabled,
  emptyText = "لا توجد نتائج",
}: {
  label: string;
  hint?: string;
  items: Array<{ id: string; label: string; meta?: string }>;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      const el = wrapRef.current;
      if (!el) return;
      if (!el.contains(event.target as any)) setOpen(false);
    }

    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;

    return items.filter((item) =>
      String(item.label || "").toLowerCase().includes(qq),
    );
  }, [items, q]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const chips = useMemo(() => {
    const byId = new Map(items.map((item) => [item.id, item.label]));

    return selectedIds.map((id) => ({
      id,
      label: byId.get(id) || "مدينة",
    }));
  }, [items, selectedIds]);

  return (
    <div ref={wrapRef} className="adm-shipping-rate-citySelect">
      <div className="adm-shipping-rate-citySelect__head">
        <div className="adm-shipping-rate-citySelect__label">{label}</div>

        {hint ? (
          <div className="adm-shipping-rate-citySelect__hint">{hint}</div>
        ) : null}
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;

          setOpen((value) => !value);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="adm-shipping-rate-citySelect__trigger"
      >
        {selectedIds.length
          ? `تم اختيار ${selectedIds.length} مدينة`
          : "اختر المدن…"}
      </button>

      {chips.length ? (
        <div className="adm-shipping-rate-citySelect__chips">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              disabled={disabled}
              onClick={() =>
                onChange(selectedIds.filter((id) => id !== chip.id))
              }
              className="adm-shipping-rate-chip"
              title="إزالة"
            >
              {chip.label} ×
            </button>
          ))}
        </div>
      ) : null}

      {open ? (
        <div className="adm-shipping-rate-citySelect__menu">
          <div className="adm-shipping-rate-citySelect__search">
            <span className="adm-shipping-rate-citySelect__searchIcon">
              <Ico name="search" />
            </span>

            <input
              ref={inputRef}
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="ابحث داخل المدن…"
              className="adm-shipping-rate-citySelect__searchInput"
            />
          </div>

          <div className="adm-shipping-rate-citySelect__list">
            {filtered.length === 0 ? (
              <div className="adm-shipping-rate-citySelect__empty">
                {emptyText}
              </div>
            ) : (
              filtered.map((item) => {
                const picked = selectedSet.has(item.id);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (picked) {
                        onChange(selectedIds.filter((id) => id !== item.id));
                      } else {
                        onChange([...selectedIds, item.id]);
                      }
                    }}
                    className={clsx(
                      "adm-shipping-rate-cityOption",
                      picked && "adm-shipping-rate-cityOption--active",
                    )}
                  >
                    <span className="adm-shipping-rate-cityOption__text">
                      <span className="adm-shipping-rate-cityOption__label">
                        {item.label}
                      </span>

                      {item.meta ? (
                        <span className="adm-shipping-rate-cityOption__meta">
                          {item.meta}
                        </span>
                      ) : null}
                    </span>

                    {picked ? (
                      <span className="adm-shipping-rate-cityOption__check">
                        <Ico name="ok" />
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function RateModal({
  open,
  busy,
  storeShippingCarrierId,
  carrierName,
  carrierCode,
  onClose,
  onSaved,
}: {
  open: boolean;
  busy?: boolean;
  storeShippingCarrierId: string;
  carrierName?: string;
  carrierCode?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isAden = carrierCode === "aden_shipping";
  const locked = !!busy;

  const [loadingRates, setLoadingRates] = useState(false);
  const [rates, setRates] = useState<RateRow[]>([]);
  const [deletingRateId, setDeletingRateId] = useState("");

  const [showCreate, setShowCreate] = useState(false);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [taxLoading, setTaxLoading] = useState(false);
  const [taxSaving, setTaxSaving] = useState(false);
  const [taxSettings, setTaxSettings] =
    useState<TaxSettings>(DEFAULT_TAX_SETTINGS);

  const [coverage, setCoverage] = useState<CoverageCity[]>([]);
  const [cityItems, setCityItems] = useState<
    Array<{ id: string; label: string; meta?: string }>
  >([]);
  const [cityLabelById, setCityLabelById] = useState<Record<string, string>>(
    {},
  );
  const [loadingCities, setLoadingCities] = useState(false);

  const [scope, setScope] = useState<"all_cities" | "include_cities">(
    isAden ? "include_cities" : "all_cities",
  );
  const [includedCityIds, setIncludedCityIds] = useState<string[]>([]);
  const [excludedCityIds, setExcludedCityIds] = useState<string[]>([]);

  const [customerPriceAll, setCustomerPriceAll] = useState("0");
  const [currency, setCurrency] = useState("YER");

  const [cityRates, setCityRates] = useState<CityRateDraft[]>([]);

  const [editRateId, setEditRateId] = useState("");
  const [editCustomerPrice, setEditCustomerPrice] = useState("0");
  const [editCodEnabled, setEditCodEnabled] = useState(false);
  const [editEtaText, setEditEtaText] = useState("");
  const [editCodFeeCustomer, setEditCodFeeCustomer] = useState("0");
  const [editCodFeeIncludeTax, setEditCodFeeIncludeTax] = useState(false);

  const taxEnabled = Boolean(taxSettings.enabled);

  const coverageByCityId = useMemo(() => {
    const map = new Map<string, CoverageCity>();

    for (const city of coverage) {
      map.set(city.city_id, city);
    }

    return map;
  }, [coverage]);

  async function refreshRates() {
    const rows = await ratesList(storeShippingCarrierId);
    setRates(rows);
    onSaved();
  }

  async function setShippingIncludeTax(next: boolean) {
    if (!taxEnabled) return;
    if (next === Boolean(taxSettings.shipping_include_tax)) return;

    try {
      setErr("");
      setTaxSaving(true);

      const saved = await saveTaxSettings({
        ...taxSettings,
        shipping_include_tax: next,
      });

      setTaxSettings(saved);
    } catch (e: any) {
      setErr(e?.message || "فشل حفظ إعداد الضريبة على الشحن");
    } finally {
      setTaxSaving(false);
    }
  }

  useEffect(() => {
    if (!open) return;

    let mounted = true;

    (async () => {
      setTaxLoading(true);

      try {
        const settings = await fetchTaxSettings();
        if (!mounted) return;

        setTaxSettings(settings);
      } finally {
        if (mounted) setTaxLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !storeShippingCarrierId) return;

    let mounted = true;

    (async () => {
      setLoadingRates(true);

      try {
        const rows = await ratesList(storeShippingCarrierId);

        if (!mounted) return;

        setRates(rows);
        setShowCreate(rows.length === 0);
      } finally {
        if (mounted) setLoadingRates(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open, storeShippingCarrierId]);

  useEffect(() => {
    if (!open) return;

    let mounted = true;

    (async () => {
      setLoadingCities(true);

      try {
        setErr("");

        let cov: CoverageCity[] = [];

        if (isAden) {
          cov = await fetchCarrierCoverage("aden_shipping");

          if (!mounted) return;

          setCoverage(cov);
        } else {
          setCoverage([]);
        }

        const all = await fetchCities("");

        if (!mounted) return;

        const mapped = all
          .map((city) => ({
            id: city.id,
            label: city.name_ar || city.label || city.name_en || "",
          }))
          .filter((item) => item.label);

        const mapObj: Record<string, string> = {};

        for (const item of mapped) {
          mapObj[item.id] = item.label;
        }

        setCityLabelById(mapObj);

        if (isAden) {
          const covIds = new Set(cov.map((item) => item.city_id));

          const items = mapped
            .filter((item) => covIds.has(item.id))
            .map((item) => {
              const row = cov.find((x) => x.city_id === item.id);
              const cur = row?.currency || "YER";

              const costText = `رسوم على التاجر: ${
                row?.merchant_shipping_cost ?? 0
              } ${cur}`;

              const codText = row?.cod_available
                ? `رسوم الشركة للدفع عند الاستلام: ${row.cod_fee} ${cur}`
                : "الدفع عند الاستلام: غير متاح";

              return {
                id: item.id,
                label: item.label,
                meta: `${costText} — ${codText}`,
              };
            });

          setCityItems(items);

          const first = cov[0];
          if (first) setCurrency(first.currency || "YER");
        } else {
          setCityItems(mapped);
          setCurrency("YER");
        }
      } catch (e: any) {
        if (!mounted) return;

        setErr(e?.message || "فشل تحميل المدن");
        setCityItems([]);
      } finally {
        if (mounted) setLoadingCities(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open, isAden]);

  useEffect(() => {
    if (!open) return;
    if (scope !== "include_cities") return;

    setCityRates((prev) => {
      const prevMap = new Map(prev.map((row) => [row.city_id, row]));

      return includedCityIds.map((id) => {
        const old = prevMap.get(id);
        const label = cityLabelById[id] || "مدينة";

        if (!isAden) {
          return (
            old || {
              city_id: id,
              label,
              customer_price: "0",
              cod_enabled: false,
              cod_available: true,
              cod_fee: 0,
              merchant_cost: 0,
              currency,
              eta_text: "7 - 10 أيام عمل",
              cod_fee_customer: "0",
              cod_fee_include_tax: false,
            }
          );
        }

        const cov = coverageByCityId.get(id);
        const codAvailable = Boolean(cov?.cod_available);
        const codFee = Number(cov?.cod_fee || 0);
        const merchantCost = Number(cov?.merchant_shipping_cost || 0);
        const cur = cov?.currency || currency;

        return {
          city_id: id,
          label,
          customer_price: old?.customer_price ?? "0",
          cod_enabled: codAvailable ? (old?.cod_enabled ?? false) : false,
          cod_available: codAvailable,
          cod_fee: codFee,
          merchant_cost: merchantCost,
          currency: cur,
          eta_text: old?.eta_text ?? (cov?.eta_text || "7 - 10 أيام عمل"),
          cod_fee_customer: old?.cod_fee_customer ?? String(codFee),
          cod_fee_include_tax: old?.cod_fee_include_tax ?? false,
        };
      });
    });
  }, [
    open,
    scope,
    includedCityIds,
    isAden,
    cityLabelById,
    coverageByCityId,
    currency,
  ]);

  useEffect(() => {
    if (!open) return;

    setErr("");
    setSaving(false);
    setScope(isAden ? "include_cities" : "all_cities");
    setIncludedCityIds([]);
    setExcludedCityIds([]);
    setCustomerPriceAll("0");
    setCityRates([]);
    setEditRateId("");
    setEditCustomerPrice("0");
    setEditCodEnabled(false);
    setEditEtaText("");
    setEditCodFeeCustomer("0");
    setEditCodFeeIncludeTax(false);
  }, [open, isAden]);

  const rateTitle = useMemo(() => {
    const byId = cityLabelById;

    return (row: RateRow) => {
      if (row.scope === "all_cities") {
        return `كل المدن المتاحة (استثناء: ${
          row.excluded_city_ids?.length || 0
        })`;
      }

      const ids = Array.isArray(row.included_city_ids)
        ? row.included_city_ids
        : [];

      if (ids.length === 1) return `مدينة: ${byId[ids[0]] || "مدينة"}`;

      const names = ids.map((id) => byId[id] || "مدينة").slice(0, 3);
      const rest = ids.length - names.length;

      return `مدن محددة: ${names.join("، ")}${
        rest > 0 ? ` (+${rest})` : ""
      }`;
    };
  }, [cityLabelById]);

  const canSaveCreate = useMemo(() => {
    if (!storeShippingCarrierId) return false;

    if (scope === "all_cities") {
      return numberOrZero(customerPriceAll) >= 0;
    }

    if (includedCityIds.length === 0) return false;

    for (const row of cityRates) {
      if (numberOrZero(row.customer_price) < 0) return false;
      if (!String(row.eta_text || "").trim()) return false;
      if (isAden && row.cod_enabled && !row.cod_available) return false;
      if (row.cod_enabled && numberOrZero(row.cod_fee_customer) < 0) {
        return false;
      }
    }

    return true;
  }, [
    storeShippingCarrierId,
    scope,
    customerPriceAll,
    includedCityIds.length,
    cityRates,
    isAden,
  ]);

  const canSaveEdit = useMemo(() => {
    if (!editRateId) return false;
    if (numberOrZero(editCustomerPrice) < 0) return false;
    if (!String(editEtaText || "").trim()) return false;
    if (editCodEnabled && numberOrZero(editCodFeeCustomer) < 0) return false;

    if (isAden && editCodEnabled) {
      const row = rates.find((x) => x.id === editRateId);
      const cityId = (row?.included_city_ids || [])[0];

      if (cityId) {
        const cov = coverageByCityId.get(cityId);
        if (!cov?.cod_available) return false;
      }
    }

    return true;
  }, [
    editRateId,
    editCustomerPrice,
    editCodEnabled,
    editEtaText,
    editCodFeeCustomer,
    isAden,
    rates,
    coverageByCityId,
  ]);

  const formLocked =
    locked || saving || taxSaving || deletingRateId.length > 0;

  if (!open) return null;

  return (
    <div className="adm-shipping-rate-modal" dir="rtl">
      <button
        type="button"
        className="adm-shipping-rate-modal__backdrop"
        onClick={() => (!formLocked ? onClose() : null)}
        aria-label="إغلاق"
      />

      <div className="adm-shipping-rate-modal__wrap">
        <div className="adm-shipping-rate-modal__panel">
          <div className="adm-shipping-rate-modal__head">
            <div className="adm-shipping-rate-modal__titleWrap">
              <h2 className="adm-shipping-rate-modal__title">تسعيرة الشحن</h2>

              <p className="adm-shipping-rate-modal__desc">
                {carrierName ? `للخدمة: ${carrierName}` : "إدارة تسعيرة الشحن"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => (!formLocked ? onClose() : null)}
              disabled={formLocked}
              className="adm-shipping-rate-modal__close"
              aria-label="إغلاق"
            >
              <Ico name="close" />
            </button>
          </div>

          <div className="adm-shipping-rate-modal__body">
            {err ? (
              <div className="adm-shipping-rate-alert adm-shipping-rate-alert--danger">
                {err}
              </div>
            ) : null}

            {taxEnabled ? (
              <section className="adm-shipping-rate-card">
                <TaxInclusionChoice
                  value={Boolean(taxSettings.shipping_include_tax)}
                  disabled={formLocked || taxLoading}
                  title="طريقة احتساب ضريبة رسوم الشحن"
                  description="اختر هل سعر الشحن الذي تكتبه للعميل يعتبر سعرًا نهائيًا شاملًا للضريبة، أو سعرًا بدون ضريبة وتضاف عليه الضريبة في السلة والدفع."
                  badge="شامل الضريبة"
                  inclusiveTitle="سعر الشحن شامل الضريبة"
                  inclusiveDescription="سعر الشحن الذي تكتبه يعتبر نهائيًا للعميل، ولا تتم إضافة ضريبة فوقه."
                  inclusiveExample="مثال: تكتب 1000 = العميل يدفع 1000"
                  exclusiveTitle="سعر الشحن بدون ضريبة"
                  exclusiveDescription="سعر الشحن الذي تكتبه بدون ضريبة، وسيتم إضافة الضريبة فوقه في السلة والدفع."
                  exclusiveExample="مثال: تكتب 1000 = العميل يدفع 1000 + الضريبة"
                  onChange={(next) => void setShippingIncludeTax(next)}
                />
              </section>
            ) : null}

            <section className="adm-shipping-rate-card">
              <div className="adm-shipping-rate-card__head">
                <div className="adm-shipping-rate-card__titleWrap">
                  <h3 className="adm-shipping-rate-card__title">
                    التسعيرات الحالية
                  </h3>

                  <p className="adm-shipping-rate-card__desc">
                    راجع التسعيرات المضافة، أو أضف تسعيرة جديدة للمدن.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={formLocked}
                  onClick={() => setShowCreate((value) => !value)}
                  className="adm-btn adm-btn--outline adm-btn--sm"
                >
                  {showCreate ? "إخفاء الإضافة" : "إضافة تسعيرة"}
                </button>
              </div>

              {loadingRates ? (
                <div className="adm-loading-box">جاري تحميل التسعيرات…</div>
              ) : rates.length === 0 ? (
                <div className="adm-empty">
                  لا توجد تسعيرة بعد. أضف تسعيرة الآن.
                </div>
              ) : (
                <div className="adm-shipping-rate-list">
                  {rates.map((row) => {
                    const isSingleCity =
                      row.scope === "include_cities" &&
                      (row.included_city_ids?.length || 0) === 1;

                    const cityId = isSingleCity ? row.included_city_ids[0] : "";
                    const cov =
                      isAden && cityId ? coverageByCityId.get(cityId) : null;

                    const codAllowed =
                      !isAden || !cityId ? true : !!cov?.cod_available;

                    const codFeeOnClient = Number(row.cod_fee_customer ?? 0);
                    const totalClientIfCod =
                      Number(row.customer_price ?? 0) +
                      (row.cod_enabled ? codFeeOnClient : 0);

                    return (
                      <article key={row.id} className="adm-shipping-rate-item">
                        <div className="adm-shipping-rate-item__top">
                          <div className="adm-shipping-rate-item__main">
                            <h4 className="adm-shipping-rate-item__title">
                              {rateTitle(row)}
                            </h4>

                            <div className="adm-shipping-rate-item__meta">
                              سعر الشحن على العميل: {row.customer_price}{" "}
                              {row.currency} — مدة: {row.eta_text || "—"} —
                              الدفع عند الاستلام:{" "}
                              {row.cod_enabled ? "مفعل" : "غير مفعل"}
                              {row.cod_enabled
                                ? ` — إجمالي العميل عند الدفع: ${totalClientIfCod} ${row.currency}`
                                : ""}
                            </div>

                            {isAden && isSingleCity && cov ? (
                              <div className="adm-shipping-rate-item__meta">
                                رسوم على التاجر من الشركة:{" "}
                                {cov.merchant_shipping_cost} {cov.currency} —
                                رسوم الشركة للدفع عند الاستلام:{" "}
                                {cov.cod_available
                                  ? `${cov.cod_fee} ${cov.currency}`
                                  : "غير متاح"}
                              </div>
                            ) : null}

                            {row.cod_enabled ? (
                              <div className="adm-shipping-rate-item__meta">
                                رسوم الدفع عند الاستلام على العميل:{" "}
                                {codFeeOnClient} {row.currency}
                                {taxEnabled
                                  ? ` — طريقة الضريبة: ${
                                      row.cod_fee_include_tax
                                        ? "شاملة الضريبة"
                                        : "بدون ضريبة"
                                    }`
                                  : ""}
                              </div>
                            ) : null}
                          </div>

                          <div className="adm-shipping-rate-item__actions">
                            {isSingleCity ? (
                              <button
                                type="button"
                                disabled={formLocked}
                                onClick={() => {
                                  setErr("");
                                  setEditRateId(row.id);
                                  setEditCustomerPrice(
                                    String(row.customer_price ?? 0),
                                  );
                                  setEditCodEnabled(Boolean(row.cod_enabled));
                                  setEditEtaText(
                                    String(row.eta_text || "7 - 10 أيام عمل"),
                                  );
                                  setEditCodFeeCustomer(
                                    String(Number(row.cod_fee_customer ?? 0)),
                                  );
                                  setEditCodFeeIncludeTax(
                                    Boolean(row.cod_fee_include_tax),
                                  );
                                }}
                                className="adm-btn adm-btn--mint adm-btn--sm"
                              >
                                تعديل
                              </button>
                            ) : null}

                            <button
                              type="button"
                              disabled={formLocked}
                              onClick={async () => {
                                const ok = confirm("حذف هذه التسعيرة؟");
                                if (!ok) return;

                                try {
                                  setDeletingRateId(row.id);
                                  await deleteRate(row.id);
                                  await refreshRates();
                                } catch (e: any) {
                                  setErr(
                                    humanizeRateError(String(e?.message || "")),
                                  );
                                } finally {
                                  setDeletingRateId("");
                                }
                              }}
                              className="adm-btn adm-btn--danger adm-btn--sm"
                            >
                              <Ico name="trash" />
                              حذف
                            </button>
                          </div>
                        </div>

                        {editRateId === row.id ? (
                          <div className="adm-shipping-rate-edit">
                            {isAden && isSingleCity && cov ? (
                              <div className="adm-shipping-rate-costBox">
                                <div className="adm-shipping-rate-costBox__row">
                                  <span>رسوم على التاجر من الشركة</span>
                                  <strong>
                                    {cov.merchant_shipping_cost} {cov.currency}
                                  </strong>
                                </div>

                                <div className="adm-shipping-rate-costBox__row">
                                  <span>رسوم الشركة للدفع عند الاستلام</span>
                                  <strong>
                                    {cov.cod_available
                                      ? `${cov.cod_fee} ${cov.currency}`
                                      : "غير متاح"}
                                  </strong>
                                </div>
                              </div>
                            ) : null}

                            <div className="adm-shipping-rate-fieldGrid adm-shipping-rate-fieldGrid--3">
                              <label className="adm-shipping-rate-field">
                                <span className="adm-shipping-rate-field__label">
                                  سعر الشحن على العميل
                                </span>

                                <input
                                  value={editCustomerPrice}
                                  onChange={(event) =>
                                    setEditCustomerPrice(event.target.value)
                                  }
                                  inputMode="decimal"
                                  className="adm-shipping-rate-field__control"
                                />
                              </label>

                              <label className="adm-shipping-rate-field">
                                <span className="adm-shipping-rate-field__label">
                                  مدة الشحن
                                </span>

                                <input
                                  value={editEtaText}
                                  onChange={(event) =>
                                    setEditEtaText(event.target.value)
                                  }
                                  className="adm-shipping-rate-field__control"
                                  placeholder="مثال: 2-3 أيام عمل"
                                />
                              </label>

                              <div className="adm-shipping-rate-field adm-shipping-rate-field--button">
                                <button
                                  type="button"
                                  disabled={!codAllowed}
                                  onClick={() =>
                                    setEditCodEnabled((value) => {
                                      const next = !value;
                                      if (!next) setEditCodFeeIncludeTax(false);
                                      return next;
                                    })
                                  }
                                  className={clsx(
                                    "adm-shipping-rate-toggle",
                                    editCodEnabled &&
                                      "adm-shipping-rate-toggle--active",
                                    !codAllowed &&
                                      "adm-shipping-rate-toggle--disabled",
                                  )}
                                  title={
                                    !codAllowed
                                      ? "هذه المدينة لا تدعم الدفع عند الاستلام"
                                      : ""
                                  }
                                >
                                  الدفع عند الاستلام:{" "}
                                  {editCodEnabled ? "مفعل" : "غير مفعل"}
                                </button>
                              </div>

                              {editCodEnabled ? (
                                <>
                                  <label className="adm-shipping-rate-field adm-shipping-rate-field--wide">
                                    <span className="adm-shipping-rate-field__label">
                                      رسوم الدفع عند الاستلام على العميل
                                    </span>

                                    <input
                                      value={editCodFeeCustomer}
                                      onChange={(event) =>
                                        setEditCodFeeCustomer(event.target.value)
                                      }
                                      inputMode="decimal"
                                      className="adm-shipping-rate-field__control"
                                      placeholder="مثال: 15"
                                    />
                                  </label>

                                  {taxEnabled ? (
                                    <div className="adm-shipping-rate-field--wide">
                                      <TaxInclusionChoice
                                        value={Boolean(editCodFeeIncludeTax)}
                                        disabled={formLocked}
                                        title="طريقة احتساب ضريبة رسوم الدفع عند الاستلام"
                                        description="اختر هل رسوم الدفع عند الاستلام التي تكتبها للعميل شاملة الضريبة أو بدون ضريبة."
                                        badge="شامل الضريبة"
                                        inclusiveTitle="رسوم التحصيل شاملة الضريبة"
                                        inclusiveDescription="رسوم الدفع عند الاستلام التي تكتبها تعتبر نهائية للعميل."
                                        inclusiveExample="مثال: تكتب 500 = العميل يدفع 500"
                                        exclusiveTitle="رسوم التحصيل بدون ضريبة"
                                        exclusiveDescription="رسوم الدفع عند الاستلام التي تكتبها بدون ضريبة، وتضاف الضريبة فوقها."
                                        exclusiveExample="مثال: تكتب 500 = العميل يدفع 500 + الضريبة"
                                        onChange={setEditCodFeeIncludeTax}
                                      />
                                    </div>
                                  ) : null}
                                </>
                              ) : null}

                              <div className="adm-shipping-rate-edit__actions">
                                <button
                                  type="button"
                                  disabled={formLocked || !canSaveEdit}
                                  onClick={async () => {
                                    try {
                                      setErr("");
                                      setSaving(true);

                                      await updateRate({
                                        rate_id: row.id,
                                        customer_price:
                                          numberOrZero(editCustomerPrice),
                                        cod_enabled: editCodEnabled,
                                        eta_text: editEtaText,
                                        cod_fee_customer: editCodEnabled
                                          ? numberOrZero(editCodFeeCustomer)
                                          : 0,
                                        cod_fee_include_tax:
                                          taxEnabled && editCodEnabled
                                            ? editCodFeeIncludeTax
                                            : false,
                                      });

                                      setEditRateId("");
                                      await refreshRates();
                                    } catch (e: any) {
                                      setErr(
                                        humanizeRateError(
                                          String(e?.message || ""),
                                        ),
                                      );
                                    } finally {
                                      setSaving(false);
                                    }
                                  }}
                                  className={clsx(
                                    "adm-btn",
                                    canSaveEdit
                                      ? "adm-btn--primary"
                                      : "adm-btn--disabled",
                                  )}
                                >
                                  حفظ التعديل
                                </button>

                                <button
                                  type="button"
                                  disabled={saving}
                                  onClick={() => setEditRateId("")}
                                  className="adm-btn adm-btn--outline"
                                >
                                  إلغاء
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {showCreate ? (
              <div className="adm-shipping-rate-create">
                <section className="adm-shipping-rate-card">
                  <div className="adm-shipping-rate-card__head">
                    <div className="adm-shipping-rate-card__titleWrap">
                      <h3 className="adm-shipping-rate-card__title">المدن</h3>

                      <p className="adm-shipping-rate-card__desc">
                        اختر نطاق التسعيرة ثم حدد المدن المطلوبة.
                      </p>
                    </div>
                  </div>

                  <div className="adm-shipping-rate-mode">
                    {!isAden ? (
                      <button
                        type="button"
                        disabled={formLocked}
                        onClick={() => {
                          setScope("all_cities");
                          setIncludedCityIds([]);
                          setCityRates([]);
                        }}
                        className={clsx(
                          "adm-shipping-rate-mode__btn",
                          scope === "all_cities" &&
                            "adm-shipping-rate-mode__btn--active",
                        )}
                      >
                        كل المدن
                      </button>
                    ) : null}

                    <button
                      type="button"
                      disabled={formLocked}
                      onClick={() => {
                        setScope("include_cities");
                        setExcludedCityIds([]);
                      }}
                      className={clsx(
                        "adm-shipping-rate-mode__btn",
                        scope === "include_cities" &&
                          "adm-shipping-rate-mode__btn--active",
                      )}
                    >
                      تحديد مدن
                    </button>
                  </div>

                  {loadingCities ? (
                    <div className="adm-loading-box">جاري تحميل المدن…</div>
                  ) : scope === "all_cities" ? (
                    <CityMultiSelect
                      label="المدن المستثناة"
                      hint="استثنِ مدن محددة من هذه التسعيرة."
                      items={cityItems}
                      selectedIds={excludedCityIds}
                      onChange={setExcludedCityIds}
                      disabled={formLocked}
                    />
                  ) : (
                    <div className="adm-shipping-rate-cityRates">
                      <CityMultiSelect
                        label="المدن المدعومة"
                        hint="اختر المدن، وبعدها حدد سعر الشحن ومدة الشحن ورسوم الدفع عند الاستلام على العميل."
                        items={cityItems}
                        selectedIds={includedCityIds}
                        onChange={setIncludedCityIds}
                        disabled={formLocked}
                      />

                      <div className="adm-shipping-rate-cityRates__list">
                        {cityRates.map((row) => {
                          const shipClient = numberOrZero(row.customer_price);
                          const codClientFee = numberOrZero(
                            row.cod_fee_customer,
                          );
                          const totalClientIfCod =
                            shipClient + (row.cod_enabled ? codClientFee : 0);

                          return (
                            <article
                              key={row.city_id}
                              className="adm-shipping-rate-cityCard"
                            >
                              <h4 className="adm-shipping-rate-cityCard__title">
                                {row.label}
                              </h4>

                              {isAden ? (
                                <div className="adm-shipping-rate-costBox">
                                  <div className="adm-shipping-rate-costBox__row">
                                    <span>رسوم على التاجر من الشركة</span>
                                    <strong>
                                      {row.merchant_cost} {row.currency}
                                    </strong>
                                  </div>

                                  <div className="adm-shipping-rate-costBox__row">
                                    <span>رسوم الشركة للدفع عند الاستلام</span>
                                    <strong>
                                      {row.cod_available
                                        ? `${row.cod_fee} ${row.currency}`
                                        : "غير متاح"}
                                    </strong>
                                  </div>
                                </div>
                              ) : null}

                              <div className="adm-shipping-rate-fieldGrid">
                                <label className="adm-shipping-rate-field">
                                  <span className="adm-shipping-rate-field__label">
                                    سعر الشحن على العميل
                                  </span>

                                  <input
                                    value={row.customer_price}
                                    onChange={(event) => {
                                      const value = event.target.value;

                                      setCityRates((prev) =>
                                        prev.map((item) =>
                                          item.city_id === row.city_id
                                            ? {
                                                ...item,
                                                customer_price: value,
                                              }
                                            : item,
                                        ),
                                      );
                                    }}
                                    disabled={formLocked}
                                    inputMode="decimal"
                                    className="adm-shipping-rate-field__control"
                                  />
                                </label>

                                <label className="adm-shipping-rate-field">
                                  <span className="adm-shipping-rate-field__label">
                                    مدة الشحن
                                  </span>

                                  <input
                                    value={row.eta_text}
                                    onChange={(event) => {
                                      const value = event.target.value;

                                      setCityRates((prev) =>
                                        prev.map((item) =>
                                          item.city_id === row.city_id
                                            ? { ...item, eta_text: value }
                                            : item,
                                        ),
                                      );
                                    }}
                                    disabled={formLocked}
                                    className="adm-shipping-rate-field__control"
                                    placeholder="مثال: 2-3 أيام عمل"
                                  />
                                </label>

                                <div className="adm-shipping-rate-codBox">
                                  <div className="adm-shipping-rate-codBox__label">
                                    الدفع عند الاستلام
                                  </div>

                                  <button
                                    type="button"
                                    disabled={
                                      formLocked ||
                                      (isAden && !row.cod_available)
                                    }
                                    onClick={() => {
                                      setCityRates((prev) =>
                                        prev.map((item) => {
                                          if (item.city_id !== row.city_id) {
                                            return item;
                                          }

                                          if (isAden && !item.cod_available) {
                                            return {
                                              ...item,
                                              cod_enabled: false,
                                              cod_fee_include_tax: false,
                                            };
                                          }

                                          const next = !item.cod_enabled;

                                          return {
                                            ...item,
                                            cod_enabled: next,
                                            cod_fee_include_tax: next
                                              ? item.cod_fee_include_tax
                                              : false,
                                          };
                                        }),
                                      );
                                    }}
                                    className={clsx(
                                      "adm-shipping-rate-toggle",
                                      row.cod_enabled &&
                                        "adm-shipping-rate-toggle--active",
                                      (formLocked ||
                                        (isAden && !row.cod_available)) &&
                                        "adm-shipping-rate-toggle--disabled",
                                    )}
                                  >
                                    {row.cod_enabled ? "مفعل" : "غير مفعل"}
                                  </button>
                                </div>

                                {row.cod_enabled ? (
                                  <>
                                    <label className="adm-shipping-rate-field adm-shipping-rate-field--wide">
                                      <span className="adm-shipping-rate-field__label">
                                        رسوم الدفع عند الاستلام على العميل
                                      </span>

                                      <input
                                        value={row.cod_fee_customer}
                                        onChange={(event) => {
                                          const value = event.target.value;

                                          setCityRates((prev) =>
                                            prev.map((item) =>
                                              item.city_id === row.city_id
                                                ? {
                                                    ...item,
                                                    cod_fee_customer: value,
                                                  }
                                                : item,
                                            ),
                                          );
                                        }}
                                        disabled={formLocked}
                                        inputMode="decimal"
                                        className="adm-shipping-rate-field__control"
                                        placeholder="مثال: 15"
                                      />
                                    </label>

                                    {taxEnabled ? (
                                      <div className="adm-shipping-rate-field--wide">
                                        <TaxInclusionChoice
                                          value={Boolean(
                                            row.cod_fee_include_tax,
                                          )}
                                          disabled={formLocked}
                                          title="طريقة احتساب ضريبة رسوم الدفع عند الاستلام"
                                          description="اختر هل رسوم الدفع عند الاستلام التي تكتبها للعميل شاملة الضريبة أو بدون ضريبة."
                                          badge="شامل الضريبة"
                                          inclusiveTitle="رسوم التحصيل شاملة الضريبة"
                                          inclusiveDescription="رسوم الدفع عند الاستلام التي تكتبها تعتبر نهائية للعميل."
                                          inclusiveExample="مثال: تكتب 500 = العميل يدفع 500"
                                          exclusiveTitle="رسوم التحصيل بدون ضريبة"
                                          exclusiveDescription="رسوم الدفع عند الاستلام التي تكتبها بدون ضريبة، وتضاف الضريبة فوقها."
                                          exclusiveExample="مثال: تكتب 500 = العميل يدفع 500 + الضريبة"
                                          onChange={(next) => {
                                            setCityRates((prev) =>
                                              prev.map((item) =>
                                                item.city_id === row.city_id
                                                  ? {
                                                      ...item,
                                                      cod_fee_include_tax: next,
                                                    }
                                                  : item,
                                              ),
                                            );
                                          }}
                                        />
                                      </div>
                                    ) : null}
                                  </>
                                ) : null}

                                <div className="adm-shipping-rate-total adm-shipping-rate-field--wide">
                                  <span>
                                    {row.cod_enabled
                                      ? "إجمالي العميل عند الدفع عند الاستلام"
                                      : "إجمالي العميل"}
                                  </span>

                                  <strong>
                                    {row.cod_enabled
                                      ? totalClientIfCod
                                      : shipClient}{" "}
                                    {row.currency}
                                  </strong>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>

                      {includedCityIds.length === 0 ? (
                        <div className="adm-shipping-rate-note adm-shipping-rate-note--danger">
                          لازم تختار مدينة واحدة على الأقل.
                        </div>
                      ) : null}
                    </div>
                  )}
                </section>

                <section className="adm-shipping-rate-card">
                  <div className="adm-shipping-rate-card__head">
                    <div className="adm-shipping-rate-card__titleWrap">
                      <h3 className="adm-shipping-rate-card__title">
                        التسعيرة
                      </h3>

                      <p className="adm-shipping-rate-card__desc">
                        {scope === "all_cities"
                          ? "حدد سعر شحن موحد لكل المدن مع إمكانية استثناء مدن."
                          : "كل مدينة محددة لها سعر ومدة ورسوم دفع عند الاستلام."}
                      </p>
                    </div>
                  </div>

                  {scope === "all_cities" ? (
                    <label className="adm-shipping-rate-field">
                      <span className="adm-shipping-rate-field__label">
                        سعر الشحن على العميل
                      </span>

                      <input
                        value={customerPriceAll}
                        onChange={(event) =>
                          setCustomerPriceAll(event.target.value)
                        }
                        disabled={formLocked}
                        inputMode="decimal"
                        className="adm-shipping-rate-field__control"
                      />
                    </label>
                  ) : (
                    <div className="adm-shipping-rate-hint">
                      بعد اختيار المدن، ستظهر بطاقات لكل مدينة لتحديد السعر
                      والمدة ورسوم الدفع عند الاستلام.
                    </div>
                  )}
                </section>
              </div>
            ) : null}
          </div>

          <div className="adm-shipping-rate-modal__footer">
            <button
              type="button"
              disabled={formLocked}
              onClick={() => onClose()}
              className="adm-btn adm-btn--outline"
            >
              إغلاق
            </button>

            <button
              type="button"
              disabled={!showCreate || !canSaveCreate || formLocked}
              onClick={async () => {
                try {
                  setErr("");
                  setSaving(true);

                  if (scope === "all_cities") {
                    await createRate({
                      store_shipping_carrier_id: storeShippingCarrierId,
                      scope: "all_cities",
                      excluded_city_ids: excludedCityIds,
                      included_city_ids: [],
                      pricing_type: "flat",
                      merchant_cost: 0,
                      customer_price: numberOrZero(customerPriceAll),
                      first_weight_kg: null,
                      additional_kg_cost: null,
                      eta_text: null,
                      cod_enabled: false,
                      currency,
                      cod_fee_customer: 0,
                      cod_fee_include_tax: false,
                    });
                  } else {
                    for (const row of cityRates) {
                      await createRate({
                        store_shipping_carrier_id: storeShippingCarrierId,
                        scope: "include_cities",
                        excluded_city_ids: [],
                        included_city_ids: [row.city_id],
                        pricing_type: "flat",
                        merchant_cost: isAden ? row.merchant_cost : 0,
                        customer_price: numberOrZero(row.customer_price),
                        first_weight_kg: null,
                        additional_kg_cost: null,
                        eta_text: String(row.eta_text || "").trim() || null,
                        cod_enabled: row.cod_enabled,
                        currency: row.currency || currency,
                        cod_fee_customer: row.cod_enabled
                          ? numberOrZero(row.cod_fee_customer)
                          : 0,
                        cod_fee_include_tax:
                          taxEnabled && row.cod_enabled
                            ? row.cod_fee_include_tax
                            : false,
                      });
                    }
                  }

                  await refreshRates();
                  setShowCreate(false);
                } catch (e: any) {
                  setErr(humanizeRateError(String(e?.message || "")));
                } finally {
                  setSaving(false);
                }
              }}
              className={clsx(
                "adm-btn",
                showCreate && !formLocked && canSaveCreate
                  ? "adm-btn--primary"
                  : "adm-btn--disabled",
              )}
            >
              حفظ التسعيرة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}