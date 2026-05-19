// FILE: apps/merchant/src/app/(app)/dashboard/settings/shipping/_components/PickupLocationModal.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type City = { id: string; name_ar?: string; name_en?: string; label?: string };
type District = {
  id: string;
  city_id: string;
  name_ar?: string;
  name_en?: string;
  label?: string;
};

export type PickupLocationValue = {
  city_id: string;
  city_name: string;
  district_id: string;
  district_name: string;
  street: string;
  landmark: string;
  notes: string;
};

const EMPTY: PickupLocationValue = {
  city_id: "",
  city_name: "",
  district_id: "",
  district_name: "",
  street: "",
  landmark: "",
  notes: "",
};

function clsx(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function Ico({
  name,
}: {
  name: "pin" | "search" | "chev" | "close" | "spark" | "ok";
}) {
  const common = "adm-shipping-pickup-ico";

  switch (name) {
    case "pin":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 22s7-4.5 7-12a7 7 0 10-14 0c0 7.5 7 12 7 12z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M12 13a3 3 0 100-6 3 3 0 000 6z"
            stroke="currentColor"
            strokeWidth="1.8"
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

    case "chev":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M7 10l5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

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

    case "spark":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2l1.2 4.2L17 7l-3.8.8L12 12l-1.2-4.2L7 7l3.8-.8L12 2z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M5 13l.7 2.4L8 16l-2.3.6L5 19l-.7-2.4L2 16l2.3-.6L5 13z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
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
  }
}

function SearchSelect({
  label,
  required,
  placeholder,
  valueId,
  valueLabel,
  items,
  loading,
  disabled,
  onPick,
  emptyText = "لا توجد نتائج",
  errorText,
}: {
  label: string;
  required?: boolean;
  placeholder?: string;
  valueId: string;
  valueLabel: string;
  items: Array<{ id: string; label: string }>;
  loading?: boolean;
  disabled?: boolean;
  onPick: (id: string, label: string) => void;
  emptyText?: string;
  errorText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const el = wrapRef.current;
      if (!el) return;
      if (!el.contains(e.target as any)) setOpen(false);
    }

    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;

    return items.filter((it) => (it.label || "").toLowerCase().includes(qq));
  }, [items, q]);

  return (
    <div ref={wrapRef} className="adm-shipping-pickup-field">
      <div className="adm-shipping-pickup-field__labelRow">
        <div className="adm-shipping-pickup-field__label">{label}</div>
        {required ? (
          <span className="adm-shipping-pickup-field__required">*</span>
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
        className="adm-shipping-pickup-select__trigger"
      >
        <div className="adm-shipping-pickup-select__triggerInner">
          <div
            className={clsx(
              "adm-shipping-pickup-select__value",
              !valueId && "adm-shipping-pickup-select__value--placeholder",
            )}
          >
            {valueId ? valueLabel : placeholder || "اختر"}
          </div>

          <div
            className={clsx(
              "adm-shipping-pickup-select__chev",
              open && "adm-shipping-pickup-select__chev--open",
            )}
          >
            <Ico name="chev" />
          </div>
        </div>
      </button>

      {open ? (
        <div className="adm-shipping-pickup-select__menu">
          <div className="adm-shipping-pickup-select__searchWrap">
            <div className="adm-shipping-pickup-select__searchBox">
              <span className="adm-shipping-pickup-select__searchIcon">
                <Ico name="search" />
              </span>

              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث داخل القائمة…"
                className="adm-shipping-pickup-select__searchInput"
              />
            </div>
          </div>

          <div className="adm-shipping-pickup-select__list">
            {errorText ? (
              <div className="adm-shipping-pickup-select__message adm-shipping-pickup-select__message--danger">
                {errorText}
              </div>
            ) : loading ? (
              <div className="adm-shipping-pickup-select__message">
                جاري التحميل…
              </div>
            ) : filtered.length === 0 ? (
              <div className="adm-shipping-pickup-select__message">
                {emptyText}
              </div>
            ) : (
              filtered.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => {
                    onPick(it.id, it.label);
                    setOpen(false);
                    setQ("");
                  }}
                  className={clsx(
                    "adm-shipping-pickup-select__item",
                    it.id === valueId &&
                      "adm-shipping-pickup-select__item--active",
                  )}
                >
                  <span className="adm-shipping-pickup-select__itemText">
                    {it.label}
                  </span>

                  {it.id === valueId ? (
                    <span className="adm-shipping-pickup-select__itemCheck">
                      <Ico name="ok" />
                    </span>
                  ) : null}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Input({
  label,
  required,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="adm-shipping-pickup-field">
      <div className="adm-shipping-pickup-field__labelRow">
        <div className="adm-shipping-pickup-field__label">{label}</div>
        {required ? (
          <span className="adm-shipping-pickup-field__required">*</span>
        ) : null}
      </div>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="adm-shipping-pickup-input"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="adm-shipping-pickup-field">
      <div className="adm-shipping-pickup-field__labelRow">
        <div className="adm-shipping-pickup-field__label">{label}</div>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="adm-shipping-pickup-textarea"
      />
    </label>
  );
}

async function fetchCities(): Promise<City[]> {
  const res = await fetch("/api/ref/locations/cities", { cache: "no-store" });
  const text = await res.text();

  let json: any = {};
  try {
    json = JSON.parse(text);
  } catch {}

  if (!res.ok || !json?.ok) {
    console.error("cities api failed:", { status: res.status, text, json });
    throw new Error(json?.error || `فشل تحميل المدن (${res.status})`);
  }

  return (json.value || []) as City[];
}

async function fetchDistricts(cityId: string): Promise<District[]> {
  const res = await fetch(
    `/api/ref/locations/districts?city_id=${encodeURIComponent(cityId)}`,
    { cache: "no-store" },
  );

  const text = await res.text();

  let json: any = {};
  try {
    json = JSON.parse(text);
  } catch {}

  if (!res.ok || !json?.ok) {
    console.error("districts api failed:", { status: res.status, text, json });
    throw new Error(json?.error || `فشل تحميل الأحياء (${res.status})`);
  }

  return (json.value || []) as District[];
}

export default function PickupLocationModal({
  open,
  initialValue,
  onClose,
  onConfirm,
  busy,
}: {
  open: boolean;
  initialValue?: Partial<PickupLocationValue> | null;
  onClose: () => void;
  onConfirm: (value: PickupLocationValue) => Promise<void> | void;
  busy?: boolean;
}) {
  const [value, setValue] = useState<PickupLocationValue>(EMPTY);

  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  const [citiesErr, setCitiesErr] = useState("");
  const [districtsErr, setDistrictsErr] = useState("");

  useEffect(() => {
    if (!open) return;

    setValue({ ...EMPTY, ...(initialValue || {}) } as PickupLocationValue);
    setCitiesErr("");
    setDistrictsErr("");
  }, [open, initialValue]);

  useEffect(() => {
    if (!open) return;

    let mounted = true;

    (async () => {
      setCitiesErr("");
      setLoadingCities(true);

      try {
        const data = await fetchCities();
        if (!mounted) return;

        setCities(data);
      } catch (e: any) {
        if (!mounted) return;

        setCities([]);
        setCitiesErr(e?.message || "فشل تحميل المدن");
      } finally {
        if (mounted) setLoadingCities(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (!value.city_id) {
      setDistricts([]);
      setDistrictsErr("");
      return;
    }

    let mounted = true;

    (async () => {
      setDistrictsErr("");
      setLoadingDistricts(true);

      try {
        const data = await fetchDistricts(value.city_id);
        if (!mounted) return;

        setDistricts(data);
      } catch (e: any) {
        if (!mounted) return;

        setDistricts([]);
        setDistrictsErr(e?.message || "فشل تحميل الأحياء");
      } finally {
        if (mounted) setLoadingDistricts(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open, value.city_id]);

  const citiesItems = useMemo(() => {
    return cities.map((city) => ({
      id: city.id,
      label: city.name_ar || city.label || city.name_en || "",
    }));
  }, [cities]);

  const districtsItems = useMemo(() => {
    return districts.map((district) => ({
      id: district.id,
      label: district.name_ar || district.label || district.name_en || "",
    }));
  }, [districts]);

  const canConfirm = useMemo(() => {
    return (
      !!value.city_id &&
      !!value.district_id &&
      !!value.street.trim() &&
      !!value.landmark.trim()
    );
  }, [value]);

  if (!open) return null;

  return (
    <div className="adm-shipping-pickup-modal" dir="rtl">
      <button
        type="button"
        className="adm-shipping-pickup-modal__backdrop"
        onClick={() => (!busy ? onClose() : null)}
        aria-label="إغلاق"
      />

      <div className="adm-shipping-pickup-modal__wrap">
        <div className="adm-shipping-pickup-modal__panel">
          <div className="adm-shipping-pickup-modal__head">
            <div className="adm-shipping-pickup-modal__titleGroup">
              <span className="adm-shipping-pickup-modal__icon">
                <Ico name="pin" />
              </span>

              <div className="adm-shipping-pickup-modal__titleText">
                <h2 className="adm-shipping-pickup-modal__title">
                  تحديد موقع الاستلام
                </h2>

                <p className="adm-shipping-pickup-modal__desc">
                  اختر المدينة والحي من القائمة، ثم اكتب العنوان والمعلم.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => (!busy ? onClose() : null)}
              disabled={!!busy}
              className="adm-shipping-pickup-modal__close"
              aria-label="إغلاق"
              title="إغلاق"
            >
              <Ico name="close" />
            </button>
          </div>

          <div className="adm-shipping-pickup-modal__body">
            <div className="adm-shipping-pickup-modal__grid">
              <SearchSelect
                label="المدينة"
                required
                placeholder="اختر المدينة"
                valueId={value.city_id}
                valueLabel={value.city_name}
                items={citiesItems}
                loading={loadingCities}
                disabled={!!busy}
                errorText={citiesErr || undefined}
                onPick={(id, label) => {
                  setValue((prev) => ({
                    ...prev,
                    city_id: id,
                    city_name: label,
                    district_id: "",
                    district_name: "",
                  }));
                }}
              />

              <SearchSelect
                label="الحي"
                required
                placeholder={value.city_id ? "اختر الحي" : "اختر المدينة أولاً"}
                valueId={value.district_id}
                valueLabel={value.district_name}
                items={districtsItems}
                loading={loadingDistricts}
                disabled={!!busy || !value.city_id}
                errorText={districtsErr || undefined}
                onPick={(id, label) =>
                  setValue((prev) => ({
                    ...prev,
                    district_id: id,
                    district_name: label,
                  }))
                }
                emptyText={
                  value.city_id ? "لا توجد أحياء لهذه المدينة" : "اختر المدينة أولاً"
                }
              />

              <Input
                label="العنوان"
                required
                value={value.street}
                onChange={(next) =>
                  setValue((prev) => ({ ...prev, street: next }))
                }
                placeholder="اسم الشارع / رقم المنزل"
                disabled={!!busy}
              />

              <Input
                label="أقرب معلم"
                required
                value={value.landmark}
                onChange={(next) =>
                  setValue((prev) => ({ ...prev, landmark: next }))
                }
                placeholder="مثال: بجانب كذا…"
                disabled={!!busy}
              />
            </div>

            <div className="adm-shipping-pickup-modal__notes">
              <TextArea
                label="ملاحظة (اختياري)"
                value={value.notes}
                onChange={(next) =>
                  setValue((prev) => ({ ...prev, notes: next }))
                }
                placeholder="أي ملاحظة للمندوب…"
                disabled={!!busy}
              />
            </div>

            <div className="adm-shipping-pickup-summary">
              <div className="adm-shipping-pickup-summary__head">
                <span className="adm-shipping-pickup-summary__icon">
                  <Ico name="spark" />
                </span>
                <span>ملخص سريع</span>
              </div>

              <div className="adm-shipping-pickup-summary__text">
                {value.city_name || "—"} / {value.district_name || "—"} /{" "}
                {value.street || "—"}
                {value.landmark ? ` — ${value.landmark}` : ""}
              </div>
            </div>
          </div>

          <div className="adm-shipping-pickup-modal__footer">
            <button
              type="button"
              disabled={!!busy}
              onClick={() => onClose()}
              className="adm-btn adm-btn--outline"
            >
              إغلاق
            </button>

            <button
              type="button"
              disabled={!canConfirm || !!busy}
              onClick={async () => onConfirm(value)}
              className={clsx(
                "adm-btn",
                canConfirm && !busy ? "adm-btn--primary" : "adm-btn--disabled",
              )}
            >
              تأكيد
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}