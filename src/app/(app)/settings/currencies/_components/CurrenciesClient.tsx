// FILE: apps/merchant/src/app/(app)/settings/currencies/_components/CurrenciesClient.tsx

"use client";

import * as React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Coins,
  Plus,
  RefreshCw,
  Save,
  ShieldAlert,
} from "lucide-react";

type CurrencyCatalogItem = {
  code: string;
  name_ar: string;
  name_en: string;
  symbol: string;
  decimal_digits: number;
};

type CurrencyRow = {
  id?: string;
  store_id?: string;
  currency_code: string;
  name_ar: string;
  name_en?: string | null;
  symbol: string;
  decimal_digits: number;
  is_enabled: boolean;
  is_default: boolean;
  sort_order: number;
  metadata?: Record<string, any> | null;
};

function n(value: unknown, fallback = 0) {
  const next = Number(value ?? fallback);
  return Number.isFinite(next) ? next : fallback;
}

function codeOf(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function safeObject(value: any): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      //
    }
  }

  return {};
}

function normalizeRateInput(value: string) {
  let next = String(value ?? "").trim().replace(",", ".");

  next = next.replace(/[^\d.]/g, "");

  const firstDot = next.indexOf(".");
  if (firstDot >= 0) {
    next =
      next.slice(0, firstDot + 1) +
      next.slice(firstDot + 1).replace(/\./g, "");
  }

  return next;
}

function parseRateInput(value: unknown, fallback = 1) {
  const raw = String(value ?? "").trim().replace(",", ".");

  if (!raw || raw === ".") return fallback;

  const next = Number(raw);

  return Number.isFinite(next) && next > 0 ? next : fallback;
}

function positiveRate(value: unknown, fallback = 1) {
  return parseRateInput(value, fallback);
}

function rateDraftKey(code: string) {
  return codeOf(code);
}

function readRateToDefault(row: CurrencyRow, isDefault: boolean) {
  if (isDefault) return 1;

  const metadata = safeObject(row.metadata);

  return positiveRate(
    metadata.rate_to_default ??
      metadata.exchange_rate ??
      metadata.exchangeRate ??
      metadata.rate ??
      metadata.conversion_rate ??
      metadata.conversionRate,
    1,
  );
}

function buildRateMetadata(row: CurrencyRow, isDefault: boolean) {
  const metadata = safeObject(row.metadata);
  const rate = isDefault ? 1 : readRateToDefault(row, false);

  return {
    ...metadata,
    rate_to_default: rate,
    exchange_rate: rate,
    rate,
  };
}

function buildRateDrafts(rows: CurrencyRow[], selectedDefault: string) {
  const drafts: Record<string, string> = {};

  for (const row of rows) {
    const code = rateDraftKey(row.currency_code);
    const isDefault = row.currency_code === selectedDefault;

    drafts[code] = String(readRateToDefault(row, isDefault));
  }

  return drafts;
}

export default function CurrenciesClient() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [ok, setOk] = React.useState("");

  const [catalog, setCatalog] = React.useState<CurrencyCatalogItem[]>([]);
  const [rows, setRows] = React.useState<CurrencyRow[]>([]);
  const [defaultCurrency, setDefaultCurrency] = React.useState("SAR");
  const [selectedDefault, setSelectedDefault] = React.useState("SAR");
  const [hasOrders, setHasOrders] = React.useState(false);
  const [canChangeDefaultCurrency, setCanChangeDefaultCurrency] =
    React.useState(false);

  const [rateDrafts, setRateDrafts] = React.useState<Record<string, string>>({});

  async function load() {
    setErr("");
    setOk("");
    setLoading(true);

    try {
      const res = await fetch("/api/settings/store/currencies/get", {
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "فشل تحميل العملات");
      }

      const list: CurrencyRow[] = Array.isArray(json?.currencies)
        ? json.currencies
        : [];

      const nextDefault =
        codeOf(list.find((x) => x.is_default)?.currency_code) ||
        codeOf(json?.defaultCurrency) ||
        "SAR";

      setCatalog(Array.isArray(json?.catalog) ? json.catalog : []);
      setRows(list);
      setDefaultCurrency(codeOf(json?.defaultCurrency) || "SAR");
      setSelectedDefault(nextDefault);
      setRateDrafts(buildRateDrafts(list, nextDefault));
      setHasOrders(Boolean(json?.hasOrders));
      setCanChangeDefaultCurrency(Boolean(json?.canChangeDefaultCurrency));
    } catch (e: any) {
      setErr(e?.message || "فشل تحميل العملات");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

  function updateRow(code: string, patch: Partial<CurrencyRow>) {
    const target = codeOf(code);

    setRows((current) =>
      current.map((row) =>
        row.currency_code === target
          ? {
              ...row,
              ...patch,
            }
          : row,
      ),
    );
  }

  function updateRate(code: string, value: string) {
    const target = codeOf(code);
    const clean = normalizeRateInput(value);

    setRateDrafts((current) => ({
      ...current,
      [target]: clean,
    }));

    const parsed = parseRateInput(clean, 0);

    if (parsed <= 0) return;

    setRows((current) =>
      current.map((row) => {
        if (row.currency_code !== target) return row;

        const metadata = safeObject(row.metadata);

        return {
          ...row,
          metadata: {
            ...metadata,
            rate_to_default: parsed,
            exchange_rate: parsed,
            rate: parsed,
          },
        };
      }),
    );
  }

  function commitRate(code: string) {
    const target = codeOf(code);
    const raw = rateDrafts[target];
    const parsed = parseRateInput(raw, 1);

    setRateDrafts((current) => ({
      ...current,
      [target]: String(parsed),
    }));

    setRows((current) =>
      current.map((row) => {
        if (row.currency_code !== target) return row;

        const metadata = safeObject(row.metadata);

        return {
          ...row,
          metadata: {
            ...metadata,
            rate_to_default: parsed,
            exchange_rate: parsed,
            rate: parsed,
          },
        };
      }),
    );
  }

  function addCurrency(code: string) {
    const target = codeOf(code);
    if (!target) return;

    const exists = rows.some((row) => row.currency_code === target);
    if (exists) {
      setErr("العملة مضافة مسبقًا");
      return;
    }

    const item = catalog.find((x) => x.code === target);

    if (!item) {
      setErr("العملة غير موجودة في القائمة");
      return;
    }

    setErr("");

    setRows((current) => [
      ...current,
      {
        currency_code: item.code,
        name_ar: item.name_ar,
        name_en: item.name_en,
        symbol: item.symbol,
        decimal_digits: item.decimal_digits,
        is_enabled: true,
        is_default: false,
        sort_order: current.length,
        metadata: {
          rate_to_default: 1,
          exchange_rate: 1,
          rate: 1,
        },
      },
    ]);

    setRateDrafts((current) => ({
      ...current,
      [target]: "1",
    }));
  }

  function setAsDefault(code: string) {
    const target = codeOf(code);

    if (!canChangeDefaultCurrency && target !== defaultCurrency) {
      setErr("لا يمكن تغيير العملة الأساسية بعد وجود طلبات شراء.");
      return;
    }

    setErr("");
    setSelectedDefault(target);

    setRateDrafts((current) => ({
      ...current,
      [target]: "1",
    }));

    setRows((current) =>
      current.map((row) => {
        const isTarget = row.currency_code === target;

        return {
          ...row,
          is_default: isTarget,
          is_enabled: isTarget ? true : row.is_enabled,
          metadata: isTarget
            ? {
                ...safeObject(row.metadata),
                rate_to_default: 1,
                exchange_rate: 1,
                rate: 1,
              }
            : row.metadata,
        };
      }),
    );
  }

  function toggleEnabled(code: string) {
    const target = codeOf(code);

    if (target === selectedDefault) {
      setErr("لا يمكن إيقاف العملة الأساسية.");
      return;
    }

    setErr("");

    setRows((current) =>
      current.map((row) =>
        row.currency_code === target
          ? {
              ...row,
              is_enabled: !row.is_enabled,
            }
          : row,
      ),
    );
  }

  async function save() {
    setErr("");
    setOk("");
    setSaving(true);

    try {
      const enabledRows = rows.filter((row) => row.is_enabled);

      for (const row of enabledRows) {
        const isDefault = row.currency_code === selectedDefault;

        const draftRate = isDefault
          ? 1
          : parseRateInput(rateDrafts[rateDraftKey(row.currency_code)], 0);

        if (!isDefault && draftRate <= 0) {
          throw new Error(
            `أدخل سعر صرف صحيح للعملة ${row.currency_code} مقابل ${selectedDefault}.`,
          );
        }
      }

      const payload = {
        defaultCurrency: selectedDefault,
        currencies: rows.map((row, index) => {
          const isDefault = row.currency_code === selectedDefault;

          const draftRate = isDefault
            ? 1
            : parseRateInput(rateDrafts[rateDraftKey(row.currency_code)], 1);

          const rowWithDraftRate: CurrencyRow = {
            ...row,
            metadata: {
              ...safeObject(row.metadata),
              rate_to_default: draftRate,
              exchange_rate: draftRate,
              rate: draftRate,
            },
          };

          return {
            currency_code: row.currency_code,
            name_ar: row.name_ar,
            name_en: row.name_en || row.currency_code,
            symbol: row.symbol || row.currency_code,
            decimal_digits: n(row.decimal_digits, 2),
            is_enabled: Boolean(row.is_enabled),
            is_default: isDefault,
            sort_order: index,
            metadata: buildRateMetadata(rowWithDraftRate, isDefault),
          };
        }),
      };

      const res = await fetch("/api/settings/store/currencies/update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "فشل حفظ العملات");
      }

      const nextRows = Array.isArray(json?.currencies) ? json.currencies : rows;
      const nextDefault = codeOf(json?.defaultCurrency) || selectedDefault;

      setRows(nextRows);
      setDefaultCurrency(nextDefault);
      setSelectedDefault(nextDefault);
      setRateDrafts(buildRateDrafts(nextRows, nextDefault));
      setOk("تم حفظ إعدادات العملات بنجاح.");
    } catch (e: any) {
      setErr(e?.message || "فشل حفظ العملات");
    } finally {
      setSaving(false);
    }
  }

  const addedCodes = new Set(rows.map((row) => row.currency_code));
  const availableCatalog = catalog.filter((item) => !addedCodes.has(item.code));
  const enabledCount = rows.filter((row) => row.is_enabled).length;

  return (
    <section dir="rtl" className="adm-page adm-currencies">
      <div className="adm-page__inner">
        <header className="adm-hero adm-currencies__hero">
          <div className="adm-hero__main">
            <div className="adm-hero__icon">
              <Coins />
            </div>

            <div className="adm-hero__text">
              <h1 className="adm-hero__title">العملات</h1>
              <p className="adm-hero__desc">
                إدارة العملات المتاحة في المتجر وتحديد العملة الأساسية وسعر
                الصرف مقابلها.
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
          <div className="adm-alert adm-alert--danger adm-currencies__alert">
            <AlertCircle />
            <span>{err}</span>
          </div>
        ) : null}

        {ok ? (
          <div className="adm-alert adm-alert--success adm-currencies__alert">
            <CheckCircle2 />
            <span>{ok}</span>
          </div>
        ) : null}

        {hasOrders ? (
          <div className="adm-currencies__notice">
            <ShieldAlert />
            <div>
              <strong>تنبيه مهم</strong>
              <p>
                يوجد طلبات شراء في المتجر، لذلك لا يمكن تغيير العملة الأساسية.
                يمكنك تفعيل أو إيقاف العملات الإضافية فقط.
              </p>
            </div>
          </div>
        ) : null}

        <div className="adm-currencies__summary">
          <div className="adm-currencies__summaryCard">
            <span>العملة الأساسية</span>
            <strong>{selectedDefault}</strong>
          </div>

          <div className="adm-currencies__summaryCard">
            <span>العملات المفعلة</span>
            <strong>{enabledCount}</strong>
          </div>

          <div className="adm-currencies__summaryCard">
            <span>إجمالي العملات</span>
            <strong>{rows.length}</strong>
          </div>
        </div>

        <div className="adm-currencies__layout">
          <div className="adm-card adm-currencies__mainCard">
            <div className="adm-card__head">
              <div>
                <h2 className="adm-card__title">عملات المتجر</h2>
                <p className="adm-card__desc">
                  العملة الأساسية هي مرجع التسعير، وكل عملة إضافية تحتاج سعر
                  صرف مقابلها.
                </p>
              </div>
            </div>

            <div className="adm-card__body">
              {loading ? (
                <div className="adm-currencies__empty">جاري التحميل...</div>
              ) : rows.length ? (
                <div className="adm-currencies__list">
                  {rows.map((row) => {
                    const isDefault = row.currency_code === selectedDefault;
                    const rate = readRateToDefault(row, isDefault);
                    const draftKey = rateDraftKey(row.currency_code);
                    const draftValue = isDefault
                      ? "1"
                      : rateDrafts[draftKey] ?? String(rate);

                    return (
                      <article
                        key={row.currency_code}
                        className={cn(
                          "adm-currencies__row",
                          isDefault && "is-default",
                          !row.is_enabled && "is-disabled",
                        )}
                      >
                        <div className="adm-currencies__coin">
                          {row.symbol || row.currency_code}
                        </div>

                        <div className="adm-currencies__info">
                          <strong>{row.name_ar || row.currency_code}</strong>
                          <span>
                            {row.currency_code} ·{" "}
                            {row.name_en || row.currency_code}
                          </span>
                        </div>

                        <div className="adm-currencies__fields">
                          <label>
                            <span>الرمز</span>
                            <input
                              value={row.symbol || ""}
                              onChange={(e) =>
                                updateRow(row.currency_code, {
                                  symbol: e.currentTarget.value,
                                })
                              }
                            />
                          </label>

                          <label>
                            <span>الخانات</span>
                            <input
                              type="number"
                              min={0}
                              max={4}
                              value={row.decimal_digits}
                              onChange={(e) =>
                                updateRow(row.currency_code, {
                                  decimal_digits: n(e.currentTarget.value, 2),
                                })
                              }
                            />
                          </label>

                          <label>
                            <span>
                              {isDefault
                                ? "سعر الصرف"
                                : `سعر الصرف مقابل ${selectedDefault}`}
                            </span>

                            <input
                              type="text"
                              inputMode="decimal"
                              dir="ltr"
                              value={draftValue}
                              disabled={isDefault}
                              placeholder="0.01"
                              onChange={(e) =>
                                updateRate(
                                  row.currency_code,
                                  e.currentTarget.value,
                                )
                              }
                              onBlur={() => commitRate(row.currency_code)}
                            />
                          </label>
                        </div>

                        <div className="adm-currencies__actions">
                          <button
                            type="button"
                            onClick={() => setAsDefault(row.currency_code)}
                            disabled={
                              saving ||
                              loading ||
                              isDefault ||
                              (!canChangeDefaultCurrency &&
                                row.currency_code !== defaultCurrency)
                            }
                            className={cn(
                              "adm-currencies__pill",
                              isDefault && "is-active",
                            )}
                          >
                            {isDefault ? "أساسية" : "تعيين أساسية"}
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleEnabled(row.currency_code)}
                            disabled={saving || loading || isDefault}
                            className={cn(
                              "adm-currencies__switch",
                              row.is_enabled && "is-on",
                            )}
                            title={row.is_enabled ? "مفعلة" : "متوقفة"}
                          >
                            <span />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="adm-currencies__empty">لا توجد عملات.</div>
              )}
            </div>
          </div>

          <aside className="adm-card adm-currencies__sideCard">
            <div className="adm-card__head">
              <div>
                <h2 className="adm-card__title">إضافة عملة</h2>
                <p className="adm-card__desc">
                  اختر من العملات الجاهزة لإضافتها للمتجر.
                </p>
              </div>
            </div>

            <div className="adm-card__body">
              {availableCatalog.length ? (
                <div className="adm-currencies__catalog">
                  {availableCatalog.map((item) => (
                    <button
                      type="button"
                      key={item.code}
                      onClick={() => addCurrency(item.code)}
                      className="adm-currencies__catalogItem"
                    >
                      <span>
                        <strong>{item.name_ar}</strong>
                        <small>{item.code}</small>
                      </span>
                      <Plus />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="adm-currencies__empty">
                  كل العملات المتاحة مضافة.
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}