// FILE: apps/merchant/src/app/(app)/settings/shipping/_components/CourierRateModal.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type City = { id: string; name_ar?: string; name_en?: string; label?: string };

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
  eta_text: string;
  cod_enabled: boolean;
  cod_fee_customer: string;
  cod_fee_include_tax: boolean;
  currency: string;
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

function clsx(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

const fieldClass =
  "h-11 w-full rounded-2xl border border-[color:var(--adm-border)] bg-[var(--adm-surface)] px-4 text-sm text-[color:var(--adm-text)] outline-none transition focus:border-[color:var(--adm-primary)] focus:ring-4 focus:ring-[rgb(13_59_69_/_0.08)] disabled:cursor-not-allowed disabled:opacity-60";

const softCardClass =
  "rounded-2xl border border-[color:var(--adm-border)] bg-[color:var(--adm-soft)]/60 p-4";

const whiteCardClass =
  "rounded-2xl border border-[color:var(--adm-border)] bg-[var(--adm-surface)] p-4";

function Ico({ name }: { name: "close" | "search" | "ok" | "trash" }) {
  const common = "h-4 w-4";

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

function humanizeRateError(code: string) {
  const c = String(code || "").trim();

  if (c === "DUPLICATE_SAME_CITIES_RATE") {
    return "هذه التسعيرة موجودة مسبقًا لنفس المدن. عدّل التسعيرة الحالية بدل إنشاء واحدة جديدة.";
  }

  if (c === "included_city_ids_required") {
    return "لازم تختار مدينة واحدة على الأقل.";
  }

  if (c === "ALL_CITIES_RATE_ALREADY_EXISTS") {
    return "لا يمكن إضافة مدن محددة لأن تسعيرة كل المدن موجودة.";
  }

  if (c === "DUPLICATE_ALL_CITIES_RATE") {
    return "تسعيرة كل المدن موجودة بالفعل.";
  }

  return "تعذر الحفظ. تحقق من البيانات وحاول مرة أخرى.";
}

async function fetchCities(q?: string): Promise<City[]> {
  const url = new URL("/api/ref/locations/cities", window.location.origin);

  if (q) {
    url.searchParams.set("q", q);
  }

  const r = await fetch(url.toString(), { cache: "no-store" });
  const j = await r.json().catch(() => ({}));

  if (!r.ok || !j?.ok) return [];

  return (j.value || []) as City[];
}

async function ratesList(store_shipping_carrier_id: string): Promise<RateRow[]> {
  const url = new URL(
    "/api/settings/store/shipping/rates/list",
    window.location.origin,
  );

  url.searchParams.set("store_shipping_carrier_id", store_shipping_carrier_id);

  const r = await fetch(url.toString(), { cache: "no-store" });
  const j = await r.json().catch(() => ({}));

  if (!r.ok || !j?.ok) return [];

  return (j.value || []) as RateRow[];
}

async function createRate(payload: any) {
  const r = await fetch("/api/settings/store/shipping/rates/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const j = await r.json().catch(() => ({}));

  if (!r.ok || !j?.ok) throw new Error(j?.error || "RATE_CREATE_FAILED");

  return j.value;
}

async function updateRate(payload: any) {
  const r = await fetch("/api/settings/store/shipping/rates/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const j = await r.json().catch(() => ({}));

  if (!r.ok || !j?.ok) throw new Error(j?.error || "RATE_UPDATE_FAILED");

  return j.value;
}

async function deleteRate(rate_id: string) {
  const r = await fetch("/api/settings/store/shipping/rates/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rate_id }),
  });

  const j = await r.json().catch(() => ({}));

  if (!r.ok || !j?.ok) throw new Error(j?.error || "RATE_DELETE_FAILED");

  return j.value;
}

function TaxIncludeChoice({
  value,
  disabled,
  title,
  inclusiveTitle = "السعر شامل الضريبة",
  exclusiveTitle = "السعر بدون ضريبة",
  inclusiveText = "المبلغ الذي تكتبه هو النهائي للعميل، والنظام يستخرج الضريبة داخليًا.",
  exclusiveText = "المبلغ الذي تكتبه بدون ضريبة، والنظام يضيف الضريبة فوقه في السلة والدفع.",
  onChange,
}: {
  value: boolean;
  disabled?: boolean;
  title: string;
  inclusiveTitle?: string;
  exclusiveTitle?: string;
  inclusiveText?: string;
  exclusiveText?: string;
  onChange: (nextValue: boolean) => void;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--adm-border)] bg-[var(--adm-surface)] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 text-right">
          <div className="text-sm font-black text-[color:var(--adm-text)]">
            {title}
          </div>

          <div className="mt-1 text-xs font-semibold leading-6 text-[color:var(--adm-muted)]">
            اختر طريقة احتساب الضريبة بوضوح بدل نعم/لا.
          </div>
        </div>

        <span
          className={clsx(
            "shrink-0 rounded-full px-3 py-1 text-xs font-black",
            value
              ? "bg-[var(--adm-primary)] text-white"
              : "bg-[var(--adm-gold-soft)] text-[color:var(--adm-primary)]",
          )}
        >
          {value ? "شامل الضريبة" : "بدون ضريبة"}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(true)}
          className={clsx(
            "rounded-2xl border px-4 py-4 text-right transition active:translate-y-[1px]",
            value
              ? "border-[color:var(--adm-primary)] bg-[var(--adm-mint-soft)] shadow-[0_14px_30px_rgb(13_59_69_/_0.08)]"
              : "border-[color:var(--adm-border)] bg-[var(--adm-surface)] hover:bg-[var(--adm-soft)]",
            disabled && "cursor-not-allowed opacity-60",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-black text-[color:var(--adm-text)]">
              {inclusiveTitle}
            </span>

            <span
              className={clsx(
                "grid h-7 w-7 place-items-center rounded-full border text-xs font-black",
                value
                  ? "border-[color:var(--adm-primary)] bg-[color:var(--adm-primary)] text-white"
                  : "border-[color:var(--adm-border)] bg-white text-[color:var(--adm-muted)]",
              )}
            >
              {value ? "✓" : ""}
            </span>
          </div>

          <div className="mt-2 text-xs font-bold leading-6 text-[color:var(--adm-muted)]">
            {inclusiveText}
          </div>

          <div className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs font-black text-[color:var(--adm-primary)]">
            مثال: تكتب 500 = العميل يدفع 500
          </div>
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(false)}
          className={clsx(
            "rounded-2xl border px-4 py-4 text-right transition active:translate-y-[1px]",
            !value
              ? "border-[color:var(--adm-primary)] bg-[var(--adm-mint-soft)] shadow-[0_14px_30px_rgb(13_59_69_/_0.08)]"
              : "border-[color:var(--adm-border)] bg-[var(--adm-surface)] hover:bg-[var(--adm-soft)]",
            disabled && "cursor-not-allowed opacity-60",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-black text-[color:var(--adm-text)]">
              {exclusiveTitle}
            </span>

            <span
              className={clsx(
                "grid h-7 w-7 place-items-center rounded-full border text-xs font-black",
                !value
                  ? "border-[color:var(--adm-primary)] bg-[color:var(--adm-primary)] text-white"
                  : "border-[color:var(--adm-border)] bg-white text-[color:var(--adm-muted)]",
              )}
            >
              {!value ? "✓" : ""}
            </span>
          </div>

          <div className="mt-2 text-xs font-bold leading-6 text-[color:var(--adm-muted)]">
            {exclusiveText}
          </div>

          <div className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs font-black text-[color:var(--adm-primary)]">
            مثال: تكتب 500 = العميل يدفع 500 + الضريبة
          </div>
        </button>
      </div>
    </div>
  );
}

function CodToggle({
  enabled,
  disabled,
  onChange,
}: {
  enabled: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={onChange}
      className={clsx(
        "flex h-11 w-full items-center justify-between gap-4 rounded-2xl border px-4 text-sm font-black transition",
        enabled
          ? "border-[color:var(--adm-primary)] bg-[var(--adm-primary)] text-white"
          : "border-[color:var(--adm-border)] bg-[var(--adm-surface)] text-[color:var(--adm-text)] hover:bg-[var(--adm-soft)]",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span>الدفع عند الاستلام</span>

      <span
        className={clsx(
          "relative h-6 w-12 rounded-full border transition",
          enabled
            ? "border-white/30 bg-white/20"
            : "border-[color:var(--adm-border)] bg-[var(--adm-soft)]",
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
            enabled ? "right-[25px]" : "right-0.5",
          )}
        />
      </span>

      <span className={enabled ? "text-white" : "text-[color:var(--adm-muted)]"}>
        {enabled ? "مفعّل" : "متوقف"}
      </span>
    </button>
  );
}

function CityMultiSelect({
  label,
  hint,
  items,
  selectedIds,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  items: Array<{ id: string; label: string }>;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const el = wrapRef.current;
      if (!el) return;

      if (!el.contains(e.target as any)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onDoc);

    return () => {
      document.removeEventListener("mousedown", onDoc);
    };
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;

    return items.filter((item) =>
      String(item.label || "")
        .toLowerCase()
        .includes(qq),
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
    <div ref={wrapRef} className="relative">
      <div className="mb-2 text-right">
        <div className="text-sm font-black text-[color:var(--adm-text)]">
          {label}
        </div>

        {hint ? (
          <div className="mt-1 text-xs font-semibold leading-6 text-[color:var(--adm-muted)]">
            {hint}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;

          setOpen((x) => !x);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={clsx(
          "h-11 w-full rounded-2xl border border-[color:var(--adm-border)] bg-[var(--adm-surface)] px-4 text-right text-sm font-bold text-[color:var(--adm-text)] transition hover:bg-[var(--adm-soft)]",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        {selectedIds.length
          ? `تم اختيار ${selectedIds.length} مدينة`
          : "اختر المدن…"}
      </button>

      {chips.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              disabled={disabled}
              onClick={() =>
                onChange(selectedIds.filter((id) => id !== chip.id))
              }
              className={clsx(
                "rounded-full border border-[color:var(--adm-border)] bg-[var(--adm-surface)] px-3 py-1 text-xs font-bold text-[color:var(--adm-text)] transition hover:bg-[var(--adm-soft)]",
                disabled && "cursor-not-allowed opacity-60",
              )}
              title="إزالة"
            >
              {chip.label} ✕
            </button>
          ))}
        </div>
      ) : null}

      {open ? (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-[color:var(--adm-border)] bg-[var(--adm-surface)] shadow-2xl">
          <div className="border-b border-[color:var(--adm-border)] bg-[var(--adm-surface)] p-2">
            <div className="relative">
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--adm-muted)]">
                <Ico name="search" />
              </span>

              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث داخل المدن…"
                className="h-10 w-full rounded-xl border border-[color:var(--adm-border)] bg-[var(--adm-surface)] pl-3 pr-10 text-sm text-[color:var(--adm-text)] outline-none focus:border-[color:var(--adm-primary)] focus:ring-4 focus:ring-[rgb(13_59_69_/_0.08)]"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-sm font-semibold text-[color:var(--adm-muted)]">
                لا توجد نتائج
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
                      "w-full rounded-xl px-3 py-2 text-right text-sm font-bold transition active:translate-y-[1px]",
                      picked
                        ? "bg-[var(--adm-mint-soft)] text-[color:var(--adm-primary)]"
                        : "text-[color:var(--adm-text)] hover:bg-[var(--adm-soft)]",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate">{item.label}</div>
                      </div>

                      {picked ? (
                        <span className="text-[color:var(--adm-primary)]">
                          <Ico name="ok" />
                        </span>
                      ) : null}
                    </div>
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

export default function CourierRateModal({
  open,
  busy,
  storeShippingCarrierId,
  carrierName,
  onClose,
  onSaved,
}: {
  open: boolean;
  busy?: boolean;
  storeShippingCarrierId: string;
  carrierName?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
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

  const [cityItems, setCityItems] = useState<
    Array<{ id: string; label: string }>
  >([]);
  const [cityLabelById, setCityLabelById] = useState<Record<string, string>>({});
  const [loadingCities, setLoadingCities] = useState(false);

  const [includedCityIds, setIncludedCityIds] = useState<string[]>([]);
  const [cityRates, setCityRates] = useState<CityRateDraft[]>([]);
  const [currency, setCurrency] = useState("YER");

  const [editRateId, setEditRateId] = useState("");
  const [editCustomerPrice, setEditCustomerPrice] = useState("0");
  const [editEtaText, setEditEtaText] = useState("");
  const [editCodEnabled, setEditCodEnabled] = useState(false);
  const [editCodFeeCustomer, setEditCodFeeCustomer] = useState("0");
  const [editCodFeeIncludeTax, setEditCodFeeIncludeTax] = useState(false);

  const taxEnabled = Boolean(taxSettings.enabled);

  const formLocked =
    locked || saving || taxSaving || deletingRateId.length > 0;

  async function refreshRates() {
    const rs = await ratesList(storeShippingCarrierId);
    setRates(rs);
    onSaved();
  }

  async function setShippingIncludeTax(nextValue: boolean) {
    if (!taxEnabled) return;
    if (nextValue === Boolean(taxSettings.shipping_include_tax)) return;

    try {
      setErr("");
      setTaxSaving(true);

      const saved = await saveTaxSettings({
        ...taxSettings,
        shipping_include_tax: nextValue,
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
        if (mounted) {
          setTaxLoading(false);
        }
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
        const rs = await ratesList(storeShippingCarrierId);
        if (!mounted) return;

        setRates(rs);
        setShowCreate(rs.length === 0);
      } finally {
        if (mounted) {
          setLoadingRates(false);
        }
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

        setCityItems(mapped);
        setCityLabelById(mapObj);
        setCurrency("YER");
      } finally {
        if (mounted) {
          setLoadingCities(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    setCityRates((prev) => {
      const prevMap = new Map(prev.map((item) => [item.city_id, item]));

      return includedCityIds.map((id) => {
        const old = prevMap.get(id);

        return (
          old || {
            city_id: id,
            label: cityLabelById[id] || "مدينة",
            customer_price: "0",
            eta_text: "2-3 أيام عمل",
            cod_enabled: false,
            cod_fee_customer: "0",
            cod_fee_include_tax: false,
            currency,
          }
        );
      });
    });
  }, [open, includedCityIds, cityLabelById, currency]);

  useEffect(() => {
    if (!open) return;

    setErr("");
    setSaving(false);
    setIncludedCityIds([]);
    setCityRates([]);
    setEditRateId("");
    setEditCustomerPrice("0");
    setEditEtaText("");
    setEditCodEnabled(false);
    setEditCodFeeCustomer("0");
    setEditCodFeeIncludeTax(false);
  }, [open]);

  const rateTitle = useMemo(() => {
    const byId = cityLabelById;

    return (row: RateRow) => {
      const ids = Array.isArray(row.included_city_ids)
        ? row.included_city_ids
        : [];

      if (ids.length === 1) {
        return `مدينة: ${byId[ids[0]] || "مدينة"}`;
      }

      const names = ids.map((id) => byId[id] || "مدينة").slice(0, 3);
      const rest = ids.length - names.length;

      return `مدن محددة: ${names.join("، ")}${rest > 0 ? ` (+${rest})` : ""}`;
    };
  }, [cityLabelById]);

  const canSaveCreate = useMemo(() => {
    if (!storeShippingCarrierId) return false;
    if (includedCityIds.length === 0) return false;

    for (const row of cityRates) {
      if (numberOrZero(row.customer_price) < 0) return false;
      if (!String(row.eta_text || "").trim()) return false;
      if (row.cod_enabled && numberOrZero(row.cod_fee_customer) < 0) {
        return false;
      }
    }

    return true;
  }, [storeShippingCarrierId, includedCityIds.length, cityRates]);

  const canSaveEdit = useMemo(() => {
    if (!editRateId) return false;
    if (numberOrZero(editCustomerPrice) < 0) return false;
    if (!String(editEtaText || "").trim()) return false;
    if (editCodEnabled && numberOrZero(editCodFeeCustomer) < 0) return false;

    return true;
  }, [
    editRateId,
    editCustomerPrice,
    editEtaText,
    editCodEnabled,
    editCodFeeCustomer,
  ]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1100]" dir="rtl">
      <button
        type="button"
        className="absolute inset-0 bg-[rgb(3_19_23_/_0.48)]"
        onClick={() => (!formLocked ? onClose() : null)}
        aria-label="إغلاق"
      />

      <div className="absolute left-1/2 top-1/2 w-[min(980px,calc(100%-24px))] -translate-x-1/2 -translate-y-1/2">
        <div className="overflow-hidden rounded-3xl border border-[color:var(--adm-border)] bg-[var(--adm-surface)] shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-[color:var(--adm-border)] px-6 py-5">
            <div className="min-w-0 text-right">
              <div className="text-lg font-black text-[color:var(--adm-text)]">
                إدارة تسعيرة الموصل
              </div>

              <div className="mt-1 text-sm font-semibold leading-6 text-[color:var(--adm-muted)]">
                {carrierName
                  ? `الخدمة: ${carrierName}`
                  : "أضف المدن وأسعار الشحن ومدة التوصيل ورسوم الدفع عند الاستلام."}
              </div>
            </div>

            <button
              type="button"
              onClick={() => (!formLocked ? onClose() : null)}
              className={clsx(
                "grid h-10 w-10 place-items-center rounded-2xl border border-[color:var(--adm-border)] bg-[var(--adm-surface)] text-[color:var(--adm-muted)] transition hover:bg-[var(--adm-soft)] hover:text-[color:var(--adm-text)]",
                formLocked && "cursor-not-allowed opacity-60",
              )}
              aria-label="Close"
            >
              <Ico name="close" />
            </button>
          </div>

          <div className="max-h-[calc(100vh-180px)] overflow-auto px-6 py-6">
            {err ? (
              <div className="mb-4 rounded-2xl border border-[color:var(--adm-danger-border)] bg-[var(--adm-danger-soft)] px-4 py-3 text-sm font-bold leading-7 text-[color:var(--adm-danger)]">
                {err}
              </div>
            ) : null}

            {taxEnabled ? (
              <div className={`${whiteCardClass} mb-4`}>
                <TaxIncludeChoice
                  title="طريقة احتساب ضريبة رسوم الشحن"
                  value={Boolean(taxSettings.shipping_include_tax)}
                  disabled={formLocked || taxLoading}
                  inclusiveTitle="سعر الشحن شامل الضريبة"
                  exclusiveTitle="سعر الشحن بدون ضريبة"
                  inclusiveText="سعر الشحن الذي تكتبه يعتبر نهائيًا للعميل، ولا تتم إضافة ضريبة فوقه."
                  exclusiveText="سعر الشحن الذي تكتبه بدون ضريبة، وسيتم إضافة الضريبة فوقه في السلة والدفع."
                  onChange={(nextValue) => void setShippingIncludeTax(nextValue)}
                />
              </div>
            ) : null}

            <div className={softCardClass}>
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-black text-[color:var(--adm-text)]">
                  التسعيرات الحالية
                </div>

                <button
                  type="button"
                  disabled={formLocked}
                  onClick={() => setShowCreate((x) => !x)}
                  className="adm-btn adm-btn--outline adm-btn--sm"
                >
                  {showCreate ? "إخفاء الإضافة" : "إضافة تسعيرة"}
                </button>
              </div>

              {loadingRates ? (
                <div className="mt-3 text-sm font-semibold text-[color:var(--adm-muted)]">
                  جاري تحميل التسعيرات...
                </div>
              ) : rates.length === 0 ? (
                <div className="mt-3 text-sm font-semibold text-[color:var(--adm-muted)]">
                  لا توجد تسعيرة. أضف أول تسعيرة للموصل.
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {rates.map((rate) => {
                    const isSingleCity =
                      rate.scope === "include_cities" &&
                      (rate.included_city_ids?.length || 0) === 1;

                    const codFee = Number(rate.cod_fee_customer ?? 0);
                    const totalIfCod =
                      Number(rate.customer_price ?? 0) +
                      (rate.cod_enabled ? codFee : 0);

                    return (
                      <div
                        key={rate.id}
                        className="rounded-xl border border-[color:var(--adm-border)] bg-[var(--adm-surface)] px-3 py-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 text-right">
                            <div className="truncate text-sm font-black text-[color:var(--adm-text)]">
                              {rateTitle(rate)}
                            </div>

                            <div className="mt-1 text-xs font-semibold leading-6 text-[color:var(--adm-muted)]">
                              سعر الشحن: {rate.customer_price} {rate.currency} —
                              مدة: {rate.eta_text || "—"} — الدفع عند الاستلام:{" "}
                              {rate.cod_enabled ? "مفعل" : "غير مفعل"}
                              {rate.cod_enabled
                                ? ` — رسوم التحصيل: ${codFee} — إجمالي العميل عند الاستلام: ${totalIfCod} ${rate.currency}`
                                : ""}
                            </div>

                            {rate.cod_enabled && taxEnabled ? (
                              <div className="mt-1 text-xs font-semibold leading-6 text-[color:var(--adm-muted)]">
                                طريقة احتساب رسوم الدفع عند الاستلام:{" "}
                                {rate.cod_fee_include_tax
                                  ? "السعر شامل الضريبة"
                                  : "السعر بدون ضريبة"}
                              </div>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-2">
                            {isSingleCity ? (
                              <button
                                type="button"
                                disabled={formLocked}
                                onClick={() => {
                                  setErr("");
                                  setEditRateId(rate.id);
                                  setEditCustomerPrice(
                                    String(rate.customer_price ?? 0),
                                  );
                                  setEditEtaText(
                                    String(rate.eta_text || "2-3 أيام عمل"),
                                  );
                                  setEditCodEnabled(Boolean(rate.cod_enabled));
                                  setEditCodFeeCustomer(
                                    String(Number(rate.cod_fee_customer ?? 0)),
                                  );
                                  setEditCodFeeIncludeTax(
                                    Boolean(rate.cod_fee_include_tax),
                                  );
                                }}
                                className="adm-btn adm-btn--primary adm-btn--sm"
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
                                  setDeletingRateId(rate.id);
                                  await deleteRate(rate.id);
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
                              حذف
                            </button>
                          </div>
                        </div>

                        {editRateId === rate.id ? (
                          <div className="mt-3 rounded-xl border border-[color:var(--adm-border)] bg-[var(--adm-soft)] p-3">
                            <div className="grid gap-3 md:grid-cols-3">
                              <label className="block">
                                <div className="mb-1 text-sm font-black text-[color:var(--adm-text)]">
                                  سعر الشحن على العميل
                                </div>

                                <input
                                  value={editCustomerPrice}
                                  onChange={(e) =>
                                    setEditCustomerPrice(e.target.value)
                                  }
                                  inputMode="decimal"
                                  className={fieldClass}
                                />
                              </label>

                              <label className="block">
                                <div className="mb-1 text-sm font-black text-[color:var(--adm-text)]">
                                  مدة الشحن
                                </div>

                                <input
                                  value={editEtaText}
                                  onChange={(e) =>
                                    setEditEtaText(e.target.value)
                                  }
                                  className={fieldClass}
                                />
                              </label>

                              <div className="flex items-end">
                                <CodToggle
                                  enabled={editCodEnabled}
                                  disabled={formLocked}
                                  onChange={() =>
                                    setEditCodEnabled((value) => {
                                      const next = !value;
                                      if (!next) setEditCodFeeIncludeTax(false);
                                      return next;
                                    })
                                  }
                                />
                              </div>

                              {editCodEnabled ? (
                                <>
                                  <label className="block md:col-span-3">
                                    <div className="mb-1 text-sm font-black text-[color:var(--adm-text)]">
                                      رسوم الدفع عند الاستلام على العميل
                                    </div>

                                    <input
                                      value={editCodFeeCustomer}
                                      onChange={(e) =>
                                        setEditCodFeeCustomer(e.target.value)
                                      }
                                      inputMode="decimal"
                                      className={fieldClass}
                                    />
                                  </label>

                                  {taxEnabled ? (
                                    <div className="md:col-span-3">
                                      <TaxIncludeChoice
                                        title="طريقة احتساب ضريبة رسوم الدفع عند الاستلام"
                                        value={Boolean(editCodFeeIncludeTax)}
                                        disabled={formLocked}
                                        inclusiveTitle="رسوم الدفع شاملة الضريبة"
                                        exclusiveTitle="رسوم الدفع بدون ضريبة"
                                        inclusiveText="رسوم الدفع عند الاستلام التي تكتبها تعتبر نهائية للعميل."
                                        exclusiveText="رسوم الدفع عند الاستلام التي تكتبها بدون ضريبة، وسيتم إضافة الضريبة فوقها."
                                        onChange={setEditCodFeeIncludeTax}
                                      />
                                    </div>
                                  ) : null}
                                </>
                              ) : null}

                              <div className="flex items-center gap-2 md:col-span-3">
                                <button
                                  type="button"
                                  disabled={formLocked || !canSaveEdit}
                                  onClick={async () => {
                                    try {
                                      setErr("");
                                      setSaving(true);

                                      await updateRate({
                                        rate_id: rate.id,
                                        customer_price:
                                          numberOrZero(editCustomerPrice),
                                        eta_text: editEtaText,
                                        cod_enabled: editCodEnabled,
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
                                    "adm-btn flex-1",
                                    canSaveEdit
                                      ? "adm-btn--primary"
                                      : "adm-btn--outline",
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
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {showCreate ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className={whiteCardClass}>
                  <div className="text-sm font-black text-[color:var(--adm-text)]">
                    إضافة تسعيرة حسب المدن
                  </div>

                  {loadingCities ? (
                    <div className="mt-4 text-sm font-semibold text-[color:var(--adm-muted)]">
                      جاري تحميل المدن...
                    </div>
                  ) : (
                    <div className="mt-4">
                      <CityMultiSelect
                        label="المدن المدعومة"
                        hint="اختر المدن، ثم حدد سعر الشحن ومدة التوصيل ورسوم الدفع عند الاستلام لكل مدينة."
                        items={cityItems}
                        selectedIds={includedCityIds}
                        onChange={setIncludedCityIds}
                        disabled={formLocked}
                      />

                      <div className="mt-3 space-y-3">
                        {cityRates.map((row) => {
                          const ship = numberOrZero(row.customer_price);
                          const codFee = numberOrZero(row.cod_fee_customer);
                          const total = ship + (row.cod_enabled ? codFee : 0);

                          return (
                            <div
                              key={row.city_id}
                              className="rounded-2xl border border-[color:var(--adm-border)] bg-[var(--adm-surface)] p-3"
                            >
                              <div className="text-sm font-black text-[color:var(--adm-text)]">
                                {row.label}
                              </div>

                              <div className="mt-3 grid gap-3 md:grid-cols-2">
                                <label className="block">
                                  <div className="mb-1.5 text-sm font-black text-[color:var(--adm-text)]">
                                    سعر الشحن على العميل
                                  </div>

                                  <input
                                    value={row.customer_price}
                                    onChange={(e) => {
                                      const value = e.target.value;

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
                                    className={fieldClass}
                                  />
                                </label>

                                <label className="block">
                                  <div className="mb-1.5 text-sm font-black text-[color:var(--adm-text)]">
                                    مدة الشحن
                                  </div>

                                  <input
                                    value={row.eta_text}
                                    onChange={(e) => {
                                      const value = e.target.value;

                                      setCityRates((prev) =>
                                        prev.map((item) =>
                                          item.city_id === row.city_id
                                            ? {
                                                ...item,
                                                eta_text: value,
                                              }
                                            : item,
                                        ),
                                      );
                                    }}
                                    disabled={formLocked}
                                    className={fieldClass}
                                  />
                                </label>

                                <div className="md:col-span-2">
                                  <CodToggle
                                    enabled={row.cod_enabled}
                                    disabled={formLocked}
                                    onChange={() => {
                                      setCityRates((prev) =>
                                        prev.map((item) => {
                                          if (item.city_id !== row.city_id) {
                                            return item;
                                          }

                                          const next = !item.cod_enabled;

                                          return {
                                            ...item,
                                            cod_enabled: next,
                                            cod_fee_customer: next
                                              ? item.cod_fee_customer
                                              : "0",
                                            cod_fee_include_tax: next
                                              ? item.cod_fee_include_tax
                                              : false,
                                          };
                                        }),
                                      );
                                    }}
                                  />
                                </div>

                                {row.cod_enabled ? (
                                  <>
                                    <label className="block md:col-span-2">
                                      <div className="mb-1.5 text-sm font-black text-[color:var(--adm-text)]">
                                        رسوم الدفع عند الاستلام على العميل
                                      </div>

                                      <input
                                        value={row.cod_fee_customer}
                                        onChange={(e) => {
                                          const value = e.target.value;

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
                                        className={fieldClass}
                                        placeholder="مثال: 15"
                                      />
                                    </label>

                                    {taxEnabled ? (
                                      <div className="md:col-span-2">
                                        <TaxIncludeChoice
                                          title="طريقة احتساب ضريبة رسوم الدفع عند الاستلام"
                                          value={Boolean(
                                            row.cod_fee_include_tax,
                                          )}
                                          disabled={formLocked}
                                          inclusiveTitle="رسوم الدفع شاملة الضريبة"
                                          exclusiveTitle="رسوم الدفع بدون ضريبة"
                                          inclusiveText="رسوم الدفع عند الاستلام التي تكتبها تعتبر نهائية للعميل."
                                          exclusiveText="رسوم الدفع عند الاستلام التي تكتبها بدون ضريبة، وسيتم إضافة الضريبة فوقها."
                                          onChange={(nextValue) => {
                                            setCityRates((prev) =>
                                              prev.map((item) =>
                                                item.city_id === row.city_id
                                                  ? {
                                                      ...item,
                                                      cod_fee_include_tax:
                                                        nextValue,
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

                                <div className="rounded-2xl border border-[color:var(--adm-border)] bg-[var(--adm-surface)] px-4 py-3 text-xs font-bold text-[color:var(--adm-muted)] md:col-span-2">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="font-black text-[color:var(--adm-text)]">
                                      {row.cod_enabled
                                        ? "إجمالي العميل عند الدفع عند الاستلام"
                                        : "إجمالي الشحن على العميل"}
                                    </div>

                                    <div className="font-black text-[color:var(--adm-text)]">
                                      {row.cod_enabled ? total : ship}{" "}
                                      {row.currency}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {includedCityIds.length === 0 ? (
                        <div className="mt-2 text-xs font-bold text-[color:var(--adm-danger)]">
                          لازم تختار مدينة واحدة على الأقل.
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className={whiteCardClass}>
                  <div className="text-sm font-black text-[color:var(--adm-text)]">
                    طريقة الاستخدام
                  </div>

                  <div className="mt-3 grid gap-3 text-sm font-semibold leading-7 text-[color:var(--adm-muted)]">
                    <div>1. اختر المدن التي يغطيها الموصل.</div>
                    <div>2. لكل مدينة حدد سعر الشحن ومدة التوصيل.</div>
                    <div>
                      3. عند تفعيل الدفع عند الاستلام، أضف رسوم التحصيل على
                      العميل.
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-[rgb(13_59_69_/_0.14)] bg-[var(--adm-mint-soft)] px-4 py-3 text-sm font-bold leading-7 text-[color:var(--adm-primary)]">
                    الأفضل إضافة تسعيرة واضحة لكل مدينة حتى لا يظهر للعميل خيار
                    شحن غير مفهوم.
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-[color:var(--adm-border)] bg-[var(--adm-surface)] px-6 py-4">
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

                  for (const row of cityRates) {
                    await createRate({
                      store_shipping_carrier_id: storeShippingCarrierId,
                      scope: "include_cities",
                      excluded_city_ids: [],
                      included_city_ids: [row.city_id],
                      pricing_type: "flat",
                      merchant_cost: 0,
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
                showCreate && canSaveCreate && !formLocked
                  ? "adm-btn--primary"
                  : "adm-btn--outline",
              )}
            >
              {saving ? "جاري الحفظ..." : "حفظ التسعيرة"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}