// FILE: apps/merchant/src/app/(app)/products/_components/SallaProductCard.tsx

"use client";

import * as React from "react";
import Image from "next/image";
import {
  ChevronDown,
  ImagePlus,
  Monitor,
  Pin,
  Settings,
  Smartphone,
  Trash2,
} from "lucide-react";

import type { Product, ProductStatus } from "../ProductsClient";
import TaxonTagsField, { type TaxonLookup } from "./TaxonTagsField";

type CurrencyInfo = {
  code: string;
  symbol: string;
  name: string;
};

const DEFAULT_CURRENCY: CurrencyInfo = {
  code: "SAR",
  symbol: "ر.س",
  name: "ريال سعودي",
};

const CURRENCY_SYMBOLS: Record<string, CurrencyInfo> = {
  SAR: { code: "SAR", symbol: "ر.س", name: "ريال سعودي" },
  AED: { code: "AED", symbol: "د.إ", name: "درهم إماراتي" },
  USD: { code: "USD", symbol: "$", name: "دولار أمريكي" },
  EUR: { code: "EUR", symbol: "€", name: "يورو" },
  KWD: { code: "KWD", symbol: "د.ك", name: "دينار كويتي" },
  BHD: { code: "BHD", symbol: "د.ب", name: "دينار بحريني" },
  OMR: { code: "OMR", symbol: "ر.ع", name: "ريال عماني" },
  QAR: { code: "QAR", symbol: "ر.ق", name: "ريال قطري" },
  YER: { code: "YER", symbol: "ر.ي", name: "ريال يمني" },
  EGP: { code: "EGP", symbol: "ج.م", name: "جنيه مصري" },
  JOD: { code: "JOD", symbol: "د.أ", name: "دينار أردني" },
  GBP: { code: "GBP", symbol: "£", name: "جنيه إسترليني" },
  CAD: { code: "CAD", symbol: "CA$", name: "دولار كندي" },
  AUD: { code: "AUD", symbol: "A$", name: "دولار أسترالي" },
  CNY: { code: "CNY", symbol: "¥", name: "يوان صيني" },
};

let cachedStoreCurrency: CurrencyInfo | null = null;
let storeCurrencyPromise: Promise<CurrencyInfo> | null = null;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function cleanCurrencyCode(value: unknown) {
  const code = String(value ?? "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : "";
}

function currencyInfoFromCode(codeRaw: unknown): CurrencyInfo {
  const code = cleanCurrencyCode(codeRaw) || DEFAULT_CURRENCY.code;
  return CURRENCY_SYMBOLS[code] ?? { code, symbol: code, name: code };
}

function readProductCurrencyCode(product: any) {
  return (
    cleanCurrencyCode(product?.currency_code) ||
    cleanCurrencyCode(product?.currencyCode) ||
    cleanCurrencyCode(product?.currency) ||
    DEFAULT_CURRENCY.code
  );
}

async function loadStoreCurrencyInfo() {
  if (cachedStoreCurrency) return cachedStoreCurrency;

  if (!storeCurrencyPromise) {
    storeCurrencyPromise = fetch("/api/settings/store/currencies/get", {
      cache: "no-store",
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));

        if (!res.ok) return DEFAULT_CURRENCY;

        const defaultCode =
          cleanCurrencyCode(json?.defaultCurrency) || DEFAULT_CURRENCY.code;

        const currencies = Array.isArray(json?.currencies)
          ? json.currencies
          : [];

        const catalog = Array.isArray(json?.catalog) ? json.catalog : [];

        const row =
          currencies.find(
            (item: any) =>
              cleanCurrencyCode(item?.currency_code) === defaultCode,
          ) ||
          currencies.find((item: any) => Boolean(item?.is_default)) ||
          catalog.find(
            (item: any) => cleanCurrencyCode(item?.code) === defaultCode,
          );

        const info: CurrencyInfo = {
          code: defaultCode,
          symbol:
            String(row?.symbol ?? "").trim() ||
            CURRENCY_SYMBOLS[defaultCode]?.symbol ||
            defaultCode,
          name:
            String(row?.name_ar ?? row?.name_en ?? "").trim() ||
            CURRENCY_SYMBOLS[defaultCode]?.name ||
            defaultCode,
        };

        cachedStoreCurrency = info;
        return info;
      })
      .catch(() => DEFAULT_CURRENCY);
  }

  return storeCurrencyPromise;
}

function useStoreCurrency(fallbackCode: string) {
  const [currency, setCurrency] = React.useState<CurrencyInfo>(() =>
    currencyInfoFromCode(fallbackCode),
  );

  React.useEffect(() => {
    let alive = true;

    loadStoreCurrencyInfo().then((next) => {
      if (alive) setCurrency(next);
    });

    return () => {
      alive = false;
    };
  }, []);

  return currency;
}

const toNum = (x: unknown) => {
  if (x == null) return null;
  const s = typeof x === "string" ? x.trim().replace(/,/g, ".") : x;
  const n = typeof s === "string" ? Number(s) : s;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};

function normalizeDecimalInput(value: string) {
  const cleaned = String(value ?? "")
    .replace(/,/g, ".")
    .replace(/[^\d.]/g, "");

  const parts = cleaned.split(".");
  if (parts.length <= 1) return cleaned;

  return `${parts[0]}.${parts.slice(1).join("")}`;
}

function normalizeChannels(x: any): Array<"web" | "app"> {
  if (!Array.isArray(x)) return ["web", "app"];

  const out: Array<"web" | "app"> = [];

  for (const v of x) {
    if (v === "web" || v === "app") {
      if (!out.includes(v)) out.push(v);
    }
  }

  return out;
}

type Props = {
  p: Product;
  taxonLookup: TaxonLookup;
  onDelete: (id: string) => Promise<void>;
  onOpenEdit: (id: string) => Promise<void>;
  onOpenOptions: (id: string) => Promise<void>;
  onOpenImages: (id: string) => Promise<void>;
  onSaveCard: (id: string, patch: Partial<Product>) => Promise<void>;
  onToggleVisibility: (
    id: string,
    nextChannels: Array<"web" | "app">,
    nextStatus?: ProductStatus,
  ) => Promise<void>;
};

function SallaProductCard({
  p,
  taxonLookup,
  onDelete,
  onOpenEdit,
  onOpenOptions,
  onOpenImages,
  onSaveCard,
  onToggleVisibility,
}: Props) {
  const storeCurrency = useStoreCurrency(readProductCurrencyCode(p));

  const [name, setName] = React.useState(p.name ?? "");
  const [pinned, setPinned] = React.useState(Boolean(p.pinned));
  const [taxonIds, setTaxonIds] = React.useState<string[]>(p.taxonIds ?? []);

  const [localChannels, setLocalChannels] = React.useState<
    Array<"web" | "app">
  >(() => normalizeChannels(p.channels));
  const [localStatus, setLocalStatus] = React.useState<ProductStatus>(p.status);

  const [localQtyUnlimited, setLocalQtyUnlimited] = React.useState(
    Boolean(p.qtyUnlimited),
  );

  const [saving, setSaving] = React.useState(false);
  const [saveDone, setSaveDone] = React.useState(false);
  const [saveErr, setSaveErr] = React.useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [toggling, setToggling] = React.useState<null | "web" | "app" | "all">(
    null,
  );

  React.useEffect(() => {
    setName(p.name ?? "");
    setPinned(Boolean(p.pinned));
    setTaxonIds(p.taxonIds ?? []);
    setLocalChannels(normalizeChannels(p.channels));
    setLocalStatus(p.status);
    setLocalQtyUnlimited(Boolean(p.qtyUnlimited));
  }, [p.id, p.name, p.pinned, p.taxonIds, p.channels, p.status, p.qtyUnlimited]);

  const vMin = toNum(p.variants_price_min);
  const vMax = toNum(p.variants_price_max);
  const priceLabel = p.variants_price_label;

  const baseP = toNum(p.base_price_fallback);
  const baseQ = toNum(p.base_qty_fallback);

  const hasOptions = Boolean(p.optionsEnabled);

  const variants = Array.isArray(p.variants) ? p.variants : [];

  const variantsQtyFromRows = variants.reduce((sum, v: any) => {
    const q = Number(v?.qty ?? 0);
    return sum + (Number.isFinite(q) ? Math.max(0, q) : 0);
  }, 0);

  const summaryQtyRaw = toNum(p.variants_total_qty);
  const effectiveVariantsQty =
    summaryQtyRaw !== null && summaryQtyRaw >= 0
      ? summaryQtyRaw
      : variantsQtyFromRows;

  const rangeHasNumbers =
    vMin !== null && vMin > 0 && vMax !== null && vMax >= vMin;

  const rangeFromOptions =
    !!rangeHasNumbers &&
    ((vMin as number) !== (vMax as number) ||
      (typeof baseP === "number" ? (vMin as number) !== baseP : false));

  const apiDisplayPrice = rangeFromOptions
    ? (vMin as number)
    : typeof baseP === "number"
      ? baseP
      : null;

  const apiDisplayQtyNumber = hasOptions
    ? localQtyUnlimited
      ? typeof baseQ === "number"
        ? baseQ
        : typeof p.qty === "number"
          ? p.qty
          : null
      : effectiveVariantsQty
    : localQtyUnlimited
      ? typeof baseQ === "number"
        ? baseQ
        : typeof p.qty === "number"
          ? p.qty
          : null
      : typeof baseQ === "number"
        ? baseQ
        : typeof p.qty === "number"
          ? p.qty
          : null;

  const qtyDisplayText = localQtyUnlimited
    ? "غير محدود"
    : apiDisplayQtyNumber != null
      ? String(apiDisplayQtyNumber)
      : "";

  const [priceInput, setPriceInput] = React.useState<string>(
    apiDisplayPrice != null ? String(apiDisplayPrice) : "",
  );

  const [qtyInput, setQtyInput] = React.useState<string>(qtyDisplayText);

  React.useEffect(() => {
    setPriceInput(apiDisplayPrice != null ? String(apiDisplayPrice) : "");
  }, [apiDisplayPrice]);

  React.useEffect(() => {
    setQtyInput(qtyDisplayText);
  }, [qtyDisplayText]);

  const lockPrice = rangeFromOptions;
  const lockQty = hasOptions || localQtyUnlimited;

  const hasWeb = localChannels.includes("web");
  const hasApp = localChannels.includes("app");

  const isDraft = localStatus === "draft";
  const isArchived = localStatus === "archived";
  const isHiddenStatus = localStatus === "hidden";
  const isHiddenByChannels = localChannels.length === 0;
  const isVisible = localStatus === "active" && localChannels.length > 0;

  const statusLabel =
    toggling === "all"
      ? "..."
      : isDraft
        ? "مسودة"
        : isArchived
          ? "مؤرشف"
          : isVisible
            ? "شغّال"
            : "مخفي";

  const statusTitle = isVisible
    ? "إخفاء المنتج بالكامل"
    : "إظهار المنتج بالكامل";

  const statusTone =
    toggling === "all"
      ? "is-busy"
      : isDraft
        ? "is-draft"
        : isArchived || isHiddenStatus || isHiddenByChannels
          ? "is-hidden"
          : "is-visible";

  function disableBusyState() {
    return saving || deleting || toggling !== null;
  }

  const disableInputs = saving || deleting;
  const disableAll = disableInputs || toggling !== null;
  const canToggleUnlimitedFromCard = !hasOptions && !disableBusyState();

  function buildSavePatch(): Partial<Product> {
    const patch: Partial<Product> & any = {
      name: name.trim() || "منتج",
      pinned,
      taxonIds,
      channels: localChannels,
      qtyUnlimited: localQtyUnlimited,
    };

    if (!lockPrice) {
      const n = toNum(priceInput);
      patch.price = n == null ? undefined : n;
      patch.base_price_fallback = n as any;
    }

    if (!lockQty) {
      const n = toNum(qtyInput);
      patch.qty = n == null ? undefined : n;
      patch.base_qty_fallback = (n ?? 0) as any;
    } else {
      patch.base_qty_fallback =
        typeof baseQ === "number"
          ? baseQ
          : typeof p.qty === "number"
            ? p.qty
            : 0;
    }

    return patch;
  }

  async function handleSave() {
    if (saving) return;

    setSaveErr(null);
    setSaving(true);
    setSaveDone(false);

    try {
      await onSaveCard(p.id, buildSavePatch());
      setSaveDone(true);
      setTimeout(() => setSaveDone(false), 900);
    } catch (e: any) {
      setSaveErr(e?.message || "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  }

  async function doDelete() {
    try {
      setDeleting(true);
      await onDelete(p.id);
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  async function toggleWholeProduct() {
    if (disableAll) return;

    const prevChannels: Array<"web" | "app"> = [...localChannels];
    const prevStatus = localStatus;

    const nextVisible = !isVisible;
    const nextChannels: Array<"web" | "app"> = nextVisible
      ? ["web", "app"]
      : [];
    const nextStatus: ProductStatus = nextVisible ? "active" : "hidden";

    try {
      setToggling("all");
      setSaveErr(null);

      setLocalChannels(nextChannels);
      setLocalStatus(nextStatus);

      await onToggleVisibility(p.id, nextChannels, nextStatus);
    } catch (e: any) {
      setSaveErr(e?.message || "فشل تحديث حالة العرض");
      setLocalChannels(prevChannels);
      setLocalStatus(prevStatus);
    } finally {
      setToggling(null);
    }
  }

  async function toggleSingleChannel(channel: "web" | "app") {
    if (disableAll) return;

    const prevChannels: Array<"web" | "app"> = [...localChannels];
    const prevStatus = localStatus;

    const set = new Set<"web" | "app">(prevChannels);

    if (set.has(channel)) set.delete(channel);
    else set.add(channel);

    const nextChannels = Array.from(set) as Array<"web" | "app">;
    const nextStatus: ProductStatus =
      nextChannels.length > 0 ? "active" : "hidden";

    try {
      setToggling(channel);
      setSaveErr(null);

      setLocalChannels(nextChannels);
      setLocalStatus(nextStatus);

      await onToggleVisibility(p.id, nextChannels, nextStatus);
    } catch (e: any) {
      setSaveErr(e?.message || "فشل تحديث حالة العرض");
      setLocalChannels(prevChannels);
      setLocalStatus(prevStatus);
    } finally {
      setToggling(null);
    }
  }

  function toggleUnlimitedFromCard() {
    if (!canToggleUnlimitedFromCard) return;
    setLocalQtyUnlimited((current) => !current);
  }

  return (
    <article className="adm-products-card adm-products-card--compact">
      <div className="adm-products-card__media">
        <div className="adm-products-card__imageBox">
          {p.imageUrl ? (
            <Image
              src={p.imageUrl}
              alt={p.name || "صورة المنتج"}
              fill
              sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
              loading="lazy"
              unoptimized
              className="adm-products-card__image"
            />
          ) : (
            <div className="adm-products-card__noImage">لا صورة</div>
          )}
        </div>

        <button
          type="button"
          title={pinned ? "إلغاء التثبيت" : "تثبيت"}
          onClick={() => setPinned((current) => !current)}
          disabled={disableAll}
          className={cn("adm-products-card__pin", pinned && "is-active")}
        >
          <Pin />
        </button>

        <div className="adm-products-card__mediaToggles">
          <button
            type="button"
            onClick={() => toggleSingleChannel("web")}
            disabled={disableAll}
            title={hasWeb ? "إيقاف نسخة الكمبيوتر" : "تشغيل نسخة الكمبيوتر"}
            className={cn(
              "adm-products-card__channelBtn",
              hasWeb ? "is-on" : "is-off",
            )}
          >
            {toggling === "web" ? (
              <span className="adm-products-card__spinner" />
            ) : (
              <Monitor />
            )}
          </button>

          <button
            type="button"
            onClick={() => toggleSingleChannel("app")}
            disabled={disableAll}
            title={hasApp ? "إيقاف نسخة الجوال" : "تشغيل نسخة الجوال"}
            className={cn(
              "adm-products-card__channelBtn",
              hasApp ? "is-on" : "is-off",
            )}
          >
            {toggling === "app" ? (
              <span className="adm-products-card__spinner" />
            ) : (
              <Smartphone />
            )}
          </button>

          <button
            type="button"
            onClick={toggleWholeProduct}
            disabled={disableAll || isArchived}
            title={statusTitle}
            className={cn("adm-products-card__status", statusTone)}
          >
            {statusLabel}
          </button>
        </div>

        <button
          type="button"
          onClick={() => void onOpenImages(p.id)}
          disabled={disableAll}
          className="adm-products-card__imageAction"
        >
          <ImagePlus />
          إضافة صورة أو فيديو
        </button>
      </div>

      <div className="adm-products-card__body">
        <input
          className="adm-input adm-products-card__nameInput"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="اسم المنتج"
          disabled={disableAll}
        />

        <div className="adm-products-card__priceRow">
          <input
            dir="ltr"
            type="text"
            inputMode="decimal"
            className="adm-input adm-products-card__priceInput"
            placeholder={`السعر (${storeCurrency.code})`}
            value={lockPrice ? String(apiDisplayPrice ?? "") : priceInput}
            onChange={(e) => {
              if (lockPrice) return;
              setPriceInput(normalizeDecimalInput(e.currentTarget.value));
            }}
            readOnly={lockPrice}
            disabled={lockPrice || disableAll}
          />

          <span
            className="adm-products-card__currency"
            title={`عملة التسعير: ${storeCurrency.name} (${storeCurrency.code})`}
          >
            {storeCurrency.code}
          </span>
        </div>

        {lockPrice ? (
          <div className="adm-products-card__priceHelp">
            {priceLabel || "السعر محدد من الخيارات"} · {storeCurrency.code}
          </div>
        ) : null}

        <div className="adm-products-card__optionsRow">
          <button
            type="button"
            onClick={() => void onOpenOptions(p.id)}
            disabled={disableAll}
            className="adm-products-card__optionBtn"
            title="الخيارات والكمية"
          >
            <span>
              <Settings />
              الخيارات
            </span>
            <ChevronDown />
          </button>

          <button
            type="button"
            onClick={toggleUnlimitedFromCard}
            disabled={!canToggleUnlimitedFromCard}
            className={cn(
              "adm-products-card__infinityBtn",
              localQtyUnlimited && "is-active",
              hasOptions && "is-disabled",
            )}
            title={
              hasOptions
                ? localQtyUnlimited
                  ? "الكمية غير محدودة من الخيارات"
                  : "التحكم من نافذة الخيارات"
                : localQtyUnlimited
                  ? "إلغاء الكمية غير المحدودة"
                  : "تفعيل الكمية غير المحدودة"
            }
          >
            ∞
          </button>

          <input
            type="text"
            inputMode="numeric"
            className="adm-input adm-products-card__qtyInput"
            placeholder="الكمية"
            value={lockQty ? qtyDisplayText : qtyInput}
            onChange={(e) => {
              if (lockQty || localQtyUnlimited) return;
              const raw = e.currentTarget.value.replace(/[^\d]/g, "");
              setQtyInput(raw);
            }}
            readOnly={lockQty || localQtyUnlimited}
            disabled={lockQty || localQtyUnlimited || disableAll}
          />
        </div>

        <TaxonTagsField
          valueIds={taxonIds}
          onChangeIds={setTaxonIds}
          lookup={taxonLookup}
          placeholder="أضف تصنيف"
        />

        <div className="adm-products-card__actions">
          <button
            type="button"
            disabled={disableAll}
            onClick={() => !disableAll && void onOpenEdit(p.id)}
            className="adm-btn adm-btn--secondary adm-btn--sm adm-products-card__action"
            title="بيانات المنتج"
          >
            <Settings />
            بيانات المنتج
          </button>

          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={disableAll}
            className="adm-btn adm-btn--danger adm-btn--sm adm-products-card__action"
            title="حذف"
          >
            <Trash2 />
            حذف
          </button>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={disableAll}
          aria-busy={saving ? "true" : "false"}
          className="adm-btn adm-btn--primary adm-btn--block adm-products-card__save"
          title="حفظ التعديلات"
        >
          {saving ? "جارٍ الحفظ…" : saveDone ? "تم الحفظ ✓" : "حفظ"}
        </button>

        {saveErr ? (
          <div className="adm-alert adm-alert--danger adm-products-card__error">
            {saveErr}
          </div>
        ) : null}
      </div>

      {confirmOpen ? (
        <div className="adm-products-card__confirm">
          <div className="adm-products-card__confirmBox">
            <h4>تأكيد الحذف</h4>

            <p>
              هل أنت متأكد من حذف المنتج <strong>“{p.name}”</strong>؟
            </p>

            <div className="adm-products-card__confirmActions">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmOpen(false)}
                className="adm-btn adm-btn--secondary adm-btn--sm"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={doDelete}
                disabled={deleting}
                className="adm-btn adm-btn--danger adm-btn--sm"
              >
                {deleting ? "جارٍ الحذف…" : "نعم، احذف"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export default React.memo(SallaProductCard);