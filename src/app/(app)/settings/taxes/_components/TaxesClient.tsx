// FILE: apps/merchant/src/app/(app)/settings/taxes/_components/TaxesClient.tsx

"use client";

import * as React from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Globe2,
  Percent,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";

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

type TaxRate = {
  id?: string;
  country_code: string;
  country_name_ar: string;
  country_name_en?: string | null;
  rate: number;
  is_active: boolean;
  sort_order: number;
};

type CountryOption = {
  code: string;
  name_ar: string;
  name_en: string;
};

function n(value: unknown, fallback = 0) {
  const next = Number(value ?? fallback);
  return Number.isFinite(next) ? next : fallback;
}

function s(value: unknown) {
  return String(value ?? "").trim();
}

function countryCode(value: unknown) {
  const code = s(value).toUpperCase();
  if (!code) return "";
  if (code === "ALL") return "ALL";
  return code.replace(/[^A-Z]/g, "").slice(0, 2);
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const DEFAULT_SETTINGS: TaxSettings = {
  enabled: false,
  tax_number: "",
  tax_certificate_url: "",
  show_tax_number_in_footer: false,
  show_tax_certificate_icon: false,
  prices_include_tax: false,
  shipping_include_tax: false,
  tax_label: "VAT",
  metadata: {},
};

const DEFAULT_RATE: TaxRate = {
  country_code: "ALL",
  country_name_ar: "كل الدول",
  country_name_en: "All Countries",
  rate: 0,
  is_active: true,
  sort_order: 0,
};

const COUNTRY_OPTIONS: CountryOption[] = [
  { code: "ALL", name_ar: "كل الدول", name_en: "All Countries" },
  { code: "SA", name_ar: "السعودية", name_en: "Saudi Arabia" },
  { code: "AE", name_ar: "الإمارات", name_en: "United Arab Emirates" },
  { code: "KW", name_ar: "الكويت", name_en: "Kuwait" },
  { code: "QA", name_ar: "قطر", name_en: "Qatar" },
  { code: "BH", name_ar: "البحرين", name_en: "Bahrain" },
  { code: "OM", name_ar: "عمان", name_en: "Oman" },
  { code: "YE", name_ar: "اليمن", name_en: "Yemen" },
  { code: "EG", name_ar: "مصر", name_en: "Egypt" },
  { code: "JO", name_ar: "الأردن", name_en: "Jordan" },
  { code: "IQ", name_ar: "العراق", name_en: "Iraq" },
  { code: "LB", name_ar: "لبنان", name_en: "Lebanon" },
  { code: "PS", name_ar: "فلسطين", name_en: "Palestine" },
  { code: "MA", name_ar: "المغرب", name_en: "Morocco" },
  { code: "DZ", name_ar: "الجزائر", name_en: "Algeria" },
  { code: "TN", name_ar: "تونس", name_en: "Tunisia" },
  { code: "SD", name_ar: "السودان", name_en: "Sudan" },
  { code: "LY", name_ar: "ليبيا", name_en: "Libya" },
  { code: "TR", name_ar: "تركيا", name_en: "Turkey" },
  { code: "US", name_ar: "الولايات المتحدة", name_en: "United States" },
  { code: "GB", name_ar: "المملكة المتحدة", name_en: "United Kingdom" },
  { code: "DE", name_ar: "ألمانيا", name_en: "Germany" },
  { code: "FR", name_ar: "فرنسا", name_en: "France" },
  { code: "IT", name_ar: "إيطاليا", name_en: "Italy" },
  { code: "ES", name_ar: "إسبانيا", name_en: "Spain" },
  { code: "CN", name_ar: "الصين", name_en: "China" },
  { code: "IN", name_ar: "الهند", name_en: "India" },
];

function getCountryLabel(row: TaxRate) {
  const code = countryCode(row.country_code);
  const found = COUNTRY_OPTIONS.find((item) => item.code === code);

  return {
    code: code || "ALL",
    name_ar: s(row.country_name_ar) || found?.name_ar || code || "كل الدول",
    name_en: s(row.country_name_en) || found?.name_en || code || "All Countries",
  };
}

function SettingToggle({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("adm-taxes__settingToggle", active && "is-active")}
    >
      <span className="adm-taxes__settingText">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>

      <span className="adm-taxes__settingState">
        {active ? "مفعّل" : "متوقف"}
      </span>

      <span className="adm-taxes__settingSwitch" aria-hidden="true">
        <span />
      </span>
    </button>
  );
}

export default function TaxesClient() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [ok, setOk] = React.useState("");

  const [settings, setSettings] =
    React.useState<TaxSettings>(DEFAULT_SETTINGS);
  const [rates, setRates] = React.useState<TaxRate[]>([DEFAULT_RATE]);

  const [rateModalOpen, setRateModalOpen] = React.useState(false);
  const [countrySearch, setCountrySearch] = React.useState("");
  const [selectedCountryCode, setSelectedCountryCode] = React.useState("ALL");
  const [modalRate, setModalRate] = React.useState("0");

  async function load() {
    setErr("");
    setOk("");
    setLoading(true);

    try {
      const res = await fetch("/api/settings/store/taxes/get", {
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "فشل تحميل إعدادات الضريبة");
      }

      setSettings({
        ...DEFAULT_SETTINGS,
        ...(json?.settings ?? {}),
      });

      const list = Array.isArray(json?.rates) ? json.rates : [];

      setRates(
        list.length
          ? list.map((row: any, index: number) => ({
              id: row.id,
              country_code: countryCode(row.country_code) || "ALL",
              country_name_ar: s(row.country_name_ar) || "كل الدول",
              country_name_en: s(row.country_name_en) || "",
              rate: n(row.rate, 0),
              is_active: row.is_active !== false,
              sort_order: n(row.sort_order, index),
            }))
          : [DEFAULT_RATE],
      );
    } catch (e: any) {
      setErr(e?.message || "فشل تحميل إعدادات الضريبة");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

  function patchSettings(patch: Partial<TaxSettings>) {
    setSettings((current) => ({
      ...current,
      ...patch,
    }));
  }

  function updateRate(index: number, patch: Partial<TaxRate>) {
    setRates((current) =>
      current.map((row, i) =>
        i === index
          ? {
              ...row,
              ...patch,
            }
          : row,
      ),
    );
  }

  function removeRate(index: number) {
    setRates((current) => {
      const target = current[index];

      if (!target || countryCode(target.country_code) === "ALL") {
        return current;
      }

      return current.filter((_, i) => i !== index);
    });
  }

  function openAddRateModal() {
    setSelectedCountryCode("ALL");
    setCountrySearch("");
    setModalRate("0");
    setRateModalOpen(true);
  }

  function closeRateModal() {
    setRateModalOpen(false);
    setCountrySearch("");
  }

  function upsertRateFromModal() {
    const selected =
      COUNTRY_OPTIONS.find((item) => item.code === selectedCountryCode) ??
      COUNTRY_OPTIONS[0];

    const cleanRate = Math.min(Math.max(n(modalRate, 0), 0), 100);

    setRates((current) => {
      const existingIndex = current.findIndex(
        (row) => countryCode(row.country_code) === selected.code,
      );

      const nextRow: TaxRate = {
        country_code: selected.code,
        country_name_ar: selected.name_ar,
        country_name_en: selected.name_en,
        rate: cleanRate,
        is_active: true,
        sort_order:
          existingIndex >= 0
            ? n(current[existingIndex]?.sort_order, existingIndex)
            : current.length,
      };

      if (existingIndex >= 0) {
        return current.map((row, index) =>
          index === existingIndex
            ? {
                ...row,
                ...nextRow,
              }
            : row,
        );
      }

      return [...current, nextRow];
    });

    closeRateModal();
  }

  async function save() {
    setErr("");
    setOk("");
    setSaving(true);

    try {
      const cleanedRatesMap = new Map<string, TaxRate>();

      rates.forEach((row, index) => {
        const code = countryCode(row.country_code || "ALL");
        if (!code) return;

        const country =
          COUNTRY_OPTIONS.find((item) => item.code === code) ??
          ({
            code,
            name_ar: s(row.country_name_ar) || code,
            name_en: s(row.country_name_en) || code,
          } satisfies CountryOption);

        cleanedRatesMap.set(code, {
          country_code: country.code,
          country_name_ar: s(row.country_name_ar) || country.name_ar,
          country_name_en: s(row.country_name_en) || country.name_en,
          rate: Math.min(Math.max(n(row.rate, 0), 0), 100),
          is_active: Boolean(row.is_active),
          sort_order: index,
        });
      });

      if (!cleanedRatesMap.has("ALL")) {
        cleanedRatesMap.set("ALL", DEFAULT_RATE);
      }

      const cleanedRates = Array.from(cleanedRatesMap.values()).sort((a, b) => {
        const aAll = countryCode(a.country_code) === "ALL";
        const bAll = countryCode(b.country_code) === "ALL";
        if (aAll && !bAll) return -1;
        if (!aAll && bAll) return 1;
        return n(a.sort_order) - n(b.sort_order);
      });

      const payload = {
        settings: {
          enabled: Boolean(settings.enabled),
          tax_number: s(settings.tax_number) || null,
          tax_certificate_url: s(settings.tax_certificate_url) || null,
          show_tax_number_in_footer: Boolean(
            settings.show_tax_number_in_footer,
          ),
          show_tax_certificate_icon: Boolean(
            settings.show_tax_certificate_icon,
          ),
          prices_include_tax: Boolean(settings.prices_include_tax),
          shipping_include_tax: Boolean(settings.shipping_include_tax),
          tax_label: s(settings.tax_label) || "VAT",
          metadata: settings.metadata ?? {},
        },
        rates: cleanedRates,
      };

      const res = await fetch("/api/settings/store/taxes/update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "فشل حفظ إعدادات الضريبة");
      }

      setSettings({
        ...DEFAULT_SETTINGS,
        ...(json?.settings ?? payload.settings),
      });

      setRates(Array.isArray(json?.rates) ? json.rates : payload.rates);
      setOk("تم حفظ إعدادات الضريبة بنجاح.");
    } catch (e: any) {
      setErr(e?.message || "فشل حفظ إعدادات الضريبة");
    } finally {
      setSaving(false);
    }
  }

  const mainRate = rates.find((row) => countryCode(row.country_code) === "ALL") ?? rates[0];

  const orderedRates = React.useMemo(() => {
    return rates
      .map((rate, index) => ({ rate, index }))
      .sort((a, b) => {
        const aAll = countryCode(a.rate.country_code) === "ALL";
        const bAll = countryCode(b.rate.country_code) === "ALL";

        if (aAll && !bAll) return -1;
        if (!aAll && bAll) return 1;

        return n(a.rate.sort_order, a.index) - n(b.rate.sort_order, b.index);
      });
  }, [rates]);

  const filteredCountries = React.useMemo(() => {
    const q = s(countrySearch).toLowerCase();

    if (!q) return COUNTRY_OPTIONS;

    return COUNTRY_OPTIONS.filter((item) => {
      return (
        item.code.toLowerCase().includes(q) ||
        item.name_ar.toLowerCase().includes(q) ||
        item.name_en.toLowerCase().includes(q)
      );
    });
  }, [countrySearch]);

  const selectedCountry =
    COUNTRY_OPTIONS.find((item) => item.code === selectedCountryCode) ??
    COUNTRY_OPTIONS[0];

  return (
    <section dir="rtl" className="adm-page adm-taxes">
      <div className="adm-page__inner">
        <header className="adm-hero adm-taxes__hero">
          <div className="adm-hero__main">
            <div className="adm-hero__icon">
              <Percent />
            </div>

            <div className="adm-hero__text">
              <h1 className="adm-hero__title">الضرائب</h1>
              <p className="adm-hero__desc">
                إدارة ضريبة القيمة المضافة، الرقم الضريبي، ونسب الضرائب حسب
                الدولة.
              </p>
            </div>
          </div>

          <div className="adm-hero__actions">
            <button
              type="button"
              onClick={load}
              disabled={loading || saving}
              className="adm-btn adm-btn--secondary"
            >
              <RefreshCw />
              تحديث
            </button>

            <button
              type="button"
              onClick={save}
              disabled={loading || saving}
              className="adm-btn adm-btn--primary"
            >
              <Save />
              {saving ? "جارٍ الحفظ..." : "حفظ"}
            </button>
          </div>
        </header>

        {err ? (
          <div className="adm-alert adm-alert--danger adm-taxes__alert">
            <AlertCircle />
            <span>{err}</span>
          </div>
        ) : null}

        {ok ? (
          <div className="adm-alert adm-alert--success adm-taxes__alert">
            <CheckCircle2 />
            <span>{ok}</span>
          </div>
        ) : null}

        <div className="adm-taxes__summary">
          <div className="adm-taxes__summaryCard">
            <span>حالة الضريبة</span>
            <strong>{settings.enabled ? "مفعلة" : "متوقفة"}</strong>
          </div>

          <div className="adm-taxes__summaryCard">
            <span>النسبة العامة</span>
            <strong>{n(mainRate?.rate, 0)}%</strong>
          </div>

          <div className="adm-taxes__summaryCard">
            <span>عدد المناطق</span>
            <strong>{rates.length}</strong>
          </div>
        </div>

        <div className="adm-taxes__layout">
          <div className="adm-card adm-taxes__mainCard">
            <div className="adm-card__head">
              <div>
                <h2 className="adm-card__title">إعدادات الضريبة</h2>
                <p className="adm-card__desc">
                  هذه الإعدادات تتحكم بطريقة ظهور وحساب الضريبة في المتجر.
                </p>
              </div>
            </div>

            <div className="adm-card__body">
              {loading ? (
                <div className="adm-taxes__empty">جاري التحميل...</div>
              ) : (
                <div className="adm-taxes__form">
                  <div className="adm-taxes__switchRow">
                    <div>
                      <strong>تفعيل الضريبة</strong>
                      <span>
                        عند التفعيل يتم استخدام إعدادات الضريبة لاحقًا في الطلبات.
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        patchSettings({ enabled: !settings.enabled })
                      }
                      className={cn(
                        "adm-taxes__switch",
                        settings.enabled && "is-on",
                      )}
                    >
                      <span />
                    </button>
                  </div>

                  <div className="adm-taxes__grid2">
                    <label className="adm-taxes__field">
                      <span>اسم الضريبة</span>
                      <input
                        value={settings.tax_label || ""}
                        onChange={(e) =>
                          patchSettings({ tax_label: e.currentTarget.value })
                        }
                        placeholder="VAT"
                      />
                    </label>

                    <label className="adm-taxes__field">
                      <span>الرقم الضريبي</span>
                      <input
                        value={settings.tax_number || ""}
                        onChange={(e) =>
                          patchSettings({ tax_number: e.currentTarget.value })
                        }
                        placeholder="مثال: 300000000000003"
                        dir="ltr"
                      />
                    </label>
                  </div>

                  <label className="adm-taxes__field">
                    <span>رابط شهادة الضريبة</span>
                    <input
                      value={settings.tax_certificate_url || ""}
                      onChange={(e) =>
                        patchSettings({
                          tax_certificate_url: e.currentTarget.value,
                        })
                      }
                      placeholder="https://..."
                      dir="ltr"
                    />
                  </label>

                  <div className="adm-taxes__optionsList">
                    <SettingToggle
                      active={settings.prices_include_tax}
                      title="أسعار المنتجات شاملة الضريبة"
                      description="فعّلها إذا كانت أسعار المنتجات المدخلة تشمل الضريبة مسبقًا."
                      onClick={() =>
                        patchSettings({
                          prices_include_tax: !settings.prices_include_tax,
                        })
                      }
                    />

                    <SettingToggle
                      active={settings.shipping_include_tax}
                      title="رسوم الشحن شاملة الضريبة"
                      description="فعّلها إذا كانت تكلفة الشحن تشمل الضريبة مسبقًا."
                      onClick={() =>
                        patchSettings({
                          shipping_include_tax: !settings.shipping_include_tax,
                        })
                      }
                    />

                    <SettingToggle
                      active={settings.show_tax_number_in_footer}
                      title="إظهار الرقم الضريبي في الفوتر"
                      description="يعرض الرقم الضريبي أسفل المتجر عند توفره."
                      onClick={() =>
                        patchSettings({
                          show_tax_number_in_footer:
                            !settings.show_tax_number_in_footer,
                        })
                      }
                    />

                    <SettingToggle
                      active={settings.show_tax_certificate_icon}
                      title="إظهار أيقونة الشهادة الضريبية"
                      description="تظهر أيقونة أو رابط للشهادة عند توفر رابط الشهادة."
                      onClick={() =>
                        patchSettings({
                          show_tax_certificate_icon:
                            !settings.show_tax_certificate_icon,
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <aside className="adm-card adm-taxes__sideCard">
            <div className="adm-card__head">
              <div>
                <h2 className="adm-card__title">ملاحظة</h2>
                <p className="adm-card__desc">
                  الربط مع حساب الطلبات والـ checkout سيكون في المرحلة التالية.
                </p>
              </div>
            </div>

            <div className="adm-card__body">
              <div className="adm-taxes__note">
                <strong>المرحلة الحالية</strong>
                <p>
                  نحفظ إعدادات الضريبة فقط. بعد نجاح build نربط الحساب الفعلي
                  في السلة والطلبات بدون تغيير عشوائي.
                </p>
              </div>
            </div>
          </aside>
        </div>

        <div className="adm-card adm-taxes__ratesCard">
          <div className="adm-card__head">
            <div>
              <h2 className="adm-card__title">نسب الضرائب</h2>
              <p className="adm-card__desc">
                أضف نسبة عامة لكل الدول أو نسبة مخصصة لدولة معينة.
              </p>
            </div>

            <button
              type="button"
              onClick={openAddRateModal}
              className="adm-btn adm-btn--secondary"
              disabled={loading || saving}
            >
              <Plus />
              إضافة ضريبة
            </button>
          </div>

          <div className="adm-card__body">
            <div className="adm-taxes__rates">
              {orderedRates.map(({ rate, index }) => {
                const isAll = countryCode(rate.country_code) === "ALL";
                const label = getCountryLabel(rate);

                return (
                  <article
                    key={`${rate.country_code}-${index}`}
                    className={cn(
                      "adm-taxes__rateRow",
                      isAll && "is-main",
                      !rate.is_active && "is-disabled",
                    )}
                  >
                    <div className="adm-taxes__countryCell">
                      <span className="adm-taxes__countryIcon">
                        <Globe2 />
                      </span>

                      <div>
                        <strong>{label.name_ar}</strong>
                        <small>
                          {label.code} · {label.name_en}
                        </small>
                      </div>

                      {isAll ? (
                        <span className="adm-taxes__mainBadge">افتراضية</span>
                      ) : null}
                    </div>

                    <label className="adm-taxes__ratePercent">
                      <span>نسبة الضريبة</span>
                      <div>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={rate.rate}
                          onChange={(e) =>
                            updateRate(index, {
                              rate: Math.min(
                                Math.max(n(e.currentTarget.value, 0), 0),
                                100,
                              ),
                            })
                          }
                          dir="ltr"
                        />
                        <b>%</b>
                      </div>
                    </label>

                    <div className="adm-taxes__rateActions">
                      <button
                        type="button"
                        onClick={() =>
                          updateRate(index, {
                            is_active: !rate.is_active,
                          })
                        }
                        className={cn(
                          "adm-taxes__pill",
                          rate.is_active && "is-active",
                        )}
                      >
                        {rate.is_active ? "مفعلة" : "متوقفة"}
                      </button>

                      <button
                        type="button"
                        onClick={() => removeRate(index)}
                        disabled={isAll}
                        className="adm-taxes__delete"
                        title={isAll ? "لا يمكن حذف كل الدول" : "حذف"}
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {rateModalOpen ? (
        <div
          className="adm-taxes__modalOverlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeRateModal();
          }}
        >
          <div
            className="adm-taxes__modal"
            role="dialog"
            aria-modal="true"
            aria-label="إنشاء الضريبة"
          >
            <div className="adm-taxes__modalHead">
              <div>
                <strong>إنشاء الضريبة</strong>
                <span>اختر الدولة ثم أدخل نسبة الضريبة.</span>
              </div>

              <button type="button" onClick={closeRateModal} aria-label="إغلاق">
                <X />
              </button>
            </div>

            <div className="adm-taxes__modalBody">
              <div className="adm-taxes__selectPreview">
                <span>
                  <Globe2 />
                  {selectedCountry.name_en}
                </span>
                <ChevronDown />
              </div>

              <div className="adm-taxes__countrySearch">
                <Search />
                <input
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.currentTarget.value)}
                  placeholder="ابحث عن الدولة..."
                  autoFocus
                />
              </div>

              <div className="adm-taxes__countryList">
                {filteredCountries.map((country) => {
                  const active = selectedCountryCode === country.code;

                  return (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => setSelectedCountryCode(country.code)}
                      className={cn(
                        "adm-taxes__countryOption",
                        active && "is-active",
                      )}
                    >
                      <span>
                        <strong>{country.name_ar}</strong>
                        <small>
                          {country.code} · {country.name_en}
                        </small>
                      </span>

                      {active ? <CheckCircle2 /> : null}
                    </button>
                  );
                })}
              </div>

              <label className="adm-taxes__modalRate">
                <span>نسبة الضريبة</span>
                <div>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={modalRate}
                    onChange={(e) => setModalRate(e.currentTarget.value)}
                    placeholder="0"
                    dir="ltr"
                  />
                  <b>%</b>
                </div>
              </label>
            </div>

            <div className="adm-taxes__modalFooter">
              <button
                type="button"
                onClick={closeRateModal}
                className="adm-btn adm-btn--secondary"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={upsertRateFromModal}
                className="adm-btn adm-btn--primary"
              >
                حفظ الضريبة
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}