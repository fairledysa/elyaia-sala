// FILE: apps/merchant/src/app/(app)/products/_dialogs/ProductDataDialog.tsx

"use client";

import * as React from "react";
import {
  BadgePercent,
  Barcode,
  Calendar,
  Eye,
  EyeOff,
  Globe,
  Info,
  ListChecks,
  Package,
  Paperclip,
  Plus,
  Search,
  ShieldCheck,
  Smartphone,
  StickyNote,
  Tag,
  Trash2,
  Truck,
  Weight,
} from "lucide-react";
import type { Product } from "../ProductsClient";

type WeightUnit = "kg" | "g" | "oz" | "lb";
type Channel = "web" | "app";
type TabKey = "product" | "specs" | "tags" | "seo" | "extras";

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

type Props = {
  product: Product;
  onClose: () => void;
  onSaved: (patch: Partial<Product>) => void;
};

type BrandItem = {
  id: string;
  name: string;
  is_active: boolean;
  logo_url?: string | null;
};

type ProductSpecRow = {
  id: string;
  name: string;
  value: string;
};

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

function uid() {
  try {
    return crypto.randomUUID();
  } catch {
    return `spec_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

function n2s(x: unknown) {
  if (x == null) return "";
  const s = String(x).trim();
  return s === "null" || s === "undefined" ? "" : s;
}

function normalizeDecimalInput(value: string) {
  const cleaned = String(value ?? "")
    .replace(/,/g, ".")
    .replace(/[^\d.]/g, "");

  const parts = cleaned.split(".");
  if (parts.length <= 1) return cleaned;

  return `${parts[0]}.${parts.slice(1).join("")}`;
}

function toNumOrNull(x: string) {
  const v = normalizeDecimalInput(x);
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function computeDiscount(price: number | null, sale: number | null) {
  if (!price || !sale) return { percent: "", amount: "" };
  const diff = price - sale;
  if (!(diff > 0)) return { percent: "", amount: "" };
  const percent = ((diff / price) * 100).toFixed(2) + "%";
  const amount = diff.toFixed(2);
  return { percent, amount };
}

function normalizeSpecs(value: any): ProductSpecRow[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item: any) => ({
      id: n2s(item?.id) || uid(),
      name: n2s(item?.name || item?.title || item?.label),
      value: n2s(item?.value || item?.description || item?.text),
    }))
    .filter((item) => item.name || item.value);
}

function emptySpec(): ProductSpecRow {
  return {
    id: uid(),
    name: "",
    value: "",
  };
}

function moneyText(value: string, currency: CurrencyInfo) {
  const amount = n2s(value);
  if (!amount) return "";
  return `${amount} ${currency.code}`;
}

function Card({
  title,
  icon,
  children,
  hint,
}: {
  title: string;
  icon: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="adm-product-dialog__card">
      <div className="adm-product-dialog__cardHead">
        <div className="adm-product-dialog__cardTitle">
          <span className="adm-product-dialog__cardIcon">{icon}</span>
          <span>{title}</span>
        </div>

        {hint ? <span className="adm-product-dialog__hint">{hint}</span> : null}
      </div>

      <div className="adm-product-dialog__cardBody">{children}</div>
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="adm-product-dialog__label">{children}</label>;
}

function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & {
    icon?: React.ReactNode;
  },
) {
  const { icon, className, ...rest } = props;
  const hasIcon = Boolean(icon);

  return (
    <div className="adm-product-dialog__inputWrap">
      {hasIcon ? (
        <span className="adm-product-dialog__inputIcon">{icon}</span>
      ) : null}

      <input
        {...rest}
        className={cn(
          "adm-product-dialog__input",
          hasIcon && "has-icon",
          className,
        )}
      />
    </div>
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return (
    <textarea
      {...rest}
      className={cn("adm-product-dialog__textarea", className)}
    />
  );
}

function PillButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="adm-product-dialog__pill"
    >
      {children}
    </button>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("adm-product-dialog__tab", active && "is-active")}
    >
      <span>{icon}</span>
      {children}
    </button>
  );
}

function BrandPicker({
  valueName,
  onChangeName,
}: {
  valueName: string;
  onChangeName: (next: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [q, setQ] = React.useState("");
  const [items, setItems] = React.useState<BrandItem[]>([]);

  async function load() {
    setErr("");
    setLoading(true);

    try {
      const res = await fetch("/api/brands", { cache: "no-store" });
      const json: any = await res.json().catch(() => ({}));
      const list = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json?.items)
          ? json.items
          : [];

      const mapped: BrandItem[] = list
        .map((x: any) => ({
          id: String(x?.id ?? ""),
          name: String(x?.name ?? ""),
          is_active: Boolean(x?.is_active ?? x?.status ?? true),
          logo_url: x?.logo_url ?? null,
        }))
        .filter((x: any) => x.id && x.name);

      setItems(mapped);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((b) => b.name.toLowerCase().includes(s));
  }, [items, q]);

  const selectedLabel = valueName?.trim() ? valueName.trim() : "بدون ماركة";

  return (
    <div className="adm-product-dialog__brand">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="adm-product-dialog__brandBtn"
      >
        <span>{selectedLabel}</span>
        <Search />
      </button>

      {open ? (
        <div
          className="adm-product-dialog__brandMenu"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="adm-product-dialog__brandSearch">
            <TextInput
              value={q}
              onChange={(e) => setQ(e.currentTarget.value)}
              placeholder="ابحث عن ماركة…"
              icon={<Search />}
            />

            <div className="adm-product-dialog__brandActions">
              <button
                type="button"
                onClick={() => {
                  onChangeName("");
                  setOpen(false);
                }}
                className="adm-btn adm-btn--secondary adm-btn--sm"
              >
                بدون ماركة
              </button>

              <button
                type="button"
                onClick={load}
                className="adm-btn adm-btn--secondary adm-btn--sm"
              >
                تحديث القائمة
              </button>
            </div>

            {err ? (
              <div className="adm-alert adm-alert--danger adm-product-dialog__brandError">
                {err}
              </div>
            ) : null}
          </div>

          <div className="adm-product-dialog__brandList">
            {loading ? (
              <div className="adm-product-dialog__emptyLine">
                جاري التحميل…
              </div>
            ) : !filtered.length ? (
              <div className="adm-product-dialog__emptyLine">
                لا توجد نتائج.
              </div>
            ) : (
              filtered.map((b) => {
                const active = b.name === valueName;

                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      onChangeName(b.name);
                      setOpen(false);
                    }}
                    className={cn(
                      "adm-product-dialog__brandItem",
                      active && "is-active",
                    )}
                  >
                    <span className="adm-product-dialog__brandLogo">
                      {b.logo_url ? (
                        <img src={b.logo_url} alt={b.name} />
                      ) : null}
                    </span>

                    <span className="adm-product-dialog__brandText">
                      <strong>{b.name}</strong>
                      <small>{b.is_active ? "مفعلة" : "موقفة"}</small>
                    </span>

                    {active ? (
                      <span className="adm-product-dialog__brandBadge">
                        محددة
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

export default function ProductDataDialog({
  product,
  onClose,
  onSaved,
}: Props) {
  const storeCurrency = useStoreCurrency(readProductCurrencyCode(product));
  const meta = product as any;

  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const [tab, setTab] = React.useState<TabKey>("product");

  const [name, setName] = React.useState(n2s(product.name) || "منتج");
  const [sku, setSku] = React.useState(n2s(product.sku));
  const [mpn, setMpn] = React.useState(n2s(meta.mpn));
  const [gtin, setGtin] = React.useState(n2s(meta.gtin));

  const [requireShipping, setRequireShipping] = React.useState<boolean>(
    Boolean(meta.requireShipping ?? true),
  );
  const [weight, setWeight] = React.useState<string>(
    n2s(meta.weight ?? "0.25"),
  );
  const [weightUnit, setWeightUnit] = React.useState<WeightUnit>(
    (meta.weightUnit as WeightUnit) || "kg",
  );

  const basePrice = typeof product.price === "number" ? product.price : null;
  const [costPrice, setCostPrice] = React.useState<string>(
    n2s(meta.costPrice ?? ""),
  );
  const [salePrice, setSalePrice] = React.useState<string>(
    n2s(meta.salePrice ?? ""),
  );
  const [saleEnd, setSaleEnd] = React.useState<string>(n2s(meta.saleEnd ?? ""));
  const [showSaleCountdown, setShowSaleCountdown] = React.useState<boolean>(
    Boolean(meta.showSaleCountdown ?? false),
  );

  const [brand, setBrand] = React.useState(n2s(product.brand));
  const [years, setYears] = React.useState(n2s(product.years));
  const [subtitle, setSubtitle] = React.useState(n2s(meta.subtitle));
  const [promotionTitle, setPromotionTitle] = React.useState(
    n2s(meta.promotionTitle),
  );
  const [maxQtyPerOrder, setMaxQtyPerOrder] = React.useState<string>(
    n2s(meta.maxQtyPerOrder ?? ""),
  );
  const [hideQuantity, setHideQuantity] = React.useState<boolean>(
    Boolean(meta.hideQuantity ?? false),
  );

  const [channels, setChannels] = React.useState<Channel[]>(() => {
    const raw = meta.channels;
    if (Array.isArray(raw)) return raw as Channel[];
    return ["web", "app"];
  });

  React.useEffect(() => {
    const raw = (product as any)?.channels;
    if (Array.isArray(raw)) setChannels(raw as Channel[]);
  }, [product.id]);

  const isHidden = channels.length === 0;

  function setHidden(hidden: boolean) {
    if (hidden) setChannels([]);
    else setChannels(["web", "app"]);
  }

  function toggleChannel(c: Channel) {
    setChannels((list) => {
      if (list.length === 0) return [c];
      const has = list.includes(c);
      const next = has ? list.filter((x) => x !== c) : [...list, c];
      return next;
    });
  }

  const [enableUploadImage, setEnableUploadImage] = React.useState<boolean>(
    Boolean(meta.enableUploadImage ?? false),
  );
  const [enableNote, setEnableNote] = React.useState<boolean>(
    Boolean(meta.enableNote ?? true),
  );

  const [productWithTax, setProductWithTax] = React.useState<boolean>(
    Boolean(meta.productWithTax ?? true),
  );
  const [taxReasonCode, setTaxReasonCode] = React.useState<string>(
    n2s(meta.taxReasonCode ?? ""),
  );

  const [desc, setDesc] = React.useState(n2s(product.descriptionHtml));

  const [productSpecs, setProductSpecs] = React.useState<ProductSpecRow[]>(
    () => {
      const specs = normalizeSpecs(meta.productSpecs ?? meta.specs);
      return specs.length ? specs : [emptySpec()];
    },
  );

  const [tagInput, setTagInput] = React.useState("");
  const [tags, setTags] = React.useState<string[]>(() => {
    const raw = meta.tags;
    return Array.isArray(raw)
      ? raw.map((x: any) => String(x)).filter(Boolean)
      : [];
  });

  const [seoTitleTpl, setSeoTitleTpl] = React.useState(
    n2s(product.seoTitleTpl),
  );
  const [seoSlugTpl, setSeoSlugTpl] = React.useState(n2s(product.seoSlugTpl));
  const [seoDescTpl, setSeoDescTpl] = React.useState(n2s(product.seoDescTpl));

  const discountInfo = React.useMemo(() => {
    const sale = toNumOrNull(salePrice);
    return computeDiscount(basePrice, sale);
  }, [basePrice, salePrice]);

  function patchSpec(id: string, patch: Partial<ProductSpecRow>) {
    setProductSpecs((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function addSpec() {
    setProductSpecs((rows) => [...rows, emptySpec()]);
  }

  function removeSpec(id: string) {
    setProductSpecs((rows) => {
      const next = rows.filter((row) => row.id !== id);
      return next.length ? next : [emptySpec()];
    });
  }

  function applyVar(
    which: "subtitle" | "promotion",
    variable: "brand" | "discount" | "percent",
  ) {
    const token =
      variable === "brand"
        ? "{brand}"
        : variable === "discount"
          ? "{discount}"
          : "{percent}";

    const inject = (prev: string) => {
      const s = (prev || "").trim();
      if (s.includes(token)) return prev;
      return s ? `${s} ${token}` : token;
    };

    if (which === "subtitle") setSubtitle(inject);
    else setPromotionTitle(inject);
  }

  function renderTemplate(tpl: string) {
    return (tpl || "")
      .replaceAll("{brand}", brand?.trim() || "")
      .replaceAll(
        "{discount}",
        discountInfo.amount ? moneyText(discountInfo.amount, storeCurrency) : "",
      )
      .replaceAll("{percent}", discountInfo.percent || "")
      .replaceAll("  ", " ")
      .trim();
  }

  function addTagFromInput() {
    const v = tagInput.trim();
    if (!v) return;
    setTags((list) => (list.includes(v) ? list : [...list, v]));
    setTagInput("");
  }

  function removeTag(v: string) {
    setTags((list) => list.filter((x) => x !== v));
  }

  function save() {
    const cleanSpecs = productSpecs
      .map((row) => ({
        id: row.id || uid(),
        name: row.name.trim(),
        value: row.value.trim(),
      }))
      .filter((row) => row.name && row.value);

    onSaved({
      name: name.trim() || "منتج",
      sku: sku.trim(),
      brand: brand.trim() ? brand.trim() : null,
      years: years.trim(),
      descriptionHtml: desc,

      productSpecs: cleanSpecs,

      mpn: mpn.trim(),
      gtin: gtin.trim(),

      requireShipping,
      weight: toNumOrNull(weight) ?? 0,
      weightUnit,

      costPrice: toNumOrNull(costPrice),
      salePrice: toNumOrNull(salePrice),
      saleEnd: saleEnd.trim(),
      showSaleCountdown,

      maxQtyPerOrder: toNumOrNull(maxQtyPerOrder),
      subtitle: subtitle.trim(),
      promotionTitle: promotionTitle.trim(),
      hideQuantity,

      channels,

      enableUploadImage,
      enableNote,

      productWithTax,
      taxReasonCode: taxReasonCode.trim(),

      tags,

      seoTitleTpl: seoTitleTpl.trim(),
      seoSlugTpl: seoSlugTpl.trim(),
      seoDescTpl: seoDescTpl.trim(),
    } as any);

    onClose();
  }

  const subtitlePreview = renderTemplate(subtitle);
  const promotionPreview = renderTemplate(promotionTitle);

  return (
    <div
      className="adm-product-dialog"
      dir="rtl"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="adm-product-dialog__frame">
        <div className="adm-product-dialog__panel">
          <header className="adm-product-dialog__header">
            <div className="adm-product-dialog__headerMain">
              <span className="adm-product-dialog__headerIcon">
                <Package />
              </span>

              <div className="adm-product-dialog__headerText">
                <h3>بيانات المنتج</h3>
                <p>{product.name}</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="adm-product-dialog__close"
              type="button"
            >
              خروج
            </button>
          </header>

          <nav className="adm-product-dialog__tabs">
            <TabButton
              active={tab === "product"}
              onClick={() => setTab("product")}
              icon={<Package />}
            >
              بيانات المنتج
            </TabButton>

            <TabButton
              active={tab === "specs"}
              onClick={() => setTab("specs")}
              icon={<ListChecks />}
            >
              مواصفات
            </TabButton>

            <TabButton
              active={tab === "tags"}
              onClick={() => setTab("tags")}
              icon={<Tag />}
            >
              الوسوم
            </TabButton>

            <TabButton
              active={tab === "seo"}
              onClick={() => setTab("seo")}
              icon={<Search />}
            >
              SEO
            </TabButton>

            <TabButton
              active={tab === "extras"}
              onClick={() => setTab("extras")}
              icon={<ShieldCheck />}
            >
              خيارات إضافية
            </TabButton>
          </nav>

          <div className="adm-product-dialog__body">
            {tab === "product" ? (
              <div className="adm-product-dialog__stack">
                <div className="adm-product-dialog__grid2">
                  <Card title="الشحن" icon={<Truck />}>
                    <div className="adm-product-dialog__grid2">
                      <div className="adm-product-dialog__field">
                        <Label>يتطلب شحن / توصيل؟</Label>

                        <div className="adm-product-dialog__choiceGroup">
                          <button
                            type="button"
                            onClick={() => setRequireShipping(true)}
                            className={cn(
                              "adm-product-dialog__choice",
                              requireShipping && "is-active",
                            )}
                          >
                            نعم
                          </button>

                          <button
                            type="button"
                            onClick={() => setRequireShipping(false)}
                            className={cn(
                              "adm-product-dialog__choice",
                              !requireShipping && "is-active",
                            )}
                          >
                            لا
                          </button>
                        </div>
                      </div>

                      <div
                        className={cn(
                          "adm-product-dialog__field",
                          !requireShipping && "is-muted",
                        )}
                      >
                        <Label>
                          وزن المنتج <small>(لشركات الشحن)</small>
                        </Label>

                        <div className="adm-product-dialog__weightRow">
                          <TextInput
                            dir="ltr"
                            value={weight}
                            onChange={(e) =>
                              setWeight(
                                normalizeDecimalInput(e.currentTarget.value),
                              )
                            }
                            placeholder="0.25"
                            inputMode="decimal"
                            icon={<Weight />}
                          />

                          <select
                            className="adm-product-dialog__select"
                            value={weightUnit}
                            onChange={(e) =>
                              setWeightUnit(e.currentTarget.value as WeightUnit)
                            }
                          >
                            <option value="kg">كجم</option>
                            <option value="g">جم</option>
                            <option value="oz">أوقية</option>
                            <option value="lb">رطل</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card
                    title="التسعير"
                    icon={<BadgePercent />}
                    hint={`عملة التسعير: ${storeCurrency.name} (${storeCurrency.code})`}
                  >
                    <div className="adm-alert adm-alert--info adm-product-dialog__softAlert">
                      الأسعار هنا تحفظ بعملة المتجر الأساسية:{" "}
                      <strong>{storeCurrency.code}</strong>
                    </div>

                    <div className="adm-product-dialog__grid2">
                      <div className="adm-product-dialog__field">
                        <Label>سعر التكلفة ({storeCurrency.code})</Label>
                        <TextInput
                          dir="ltr"
                          value={costPrice}
                          onChange={(e) =>
                            setCostPrice(
                              normalizeDecimalInput(e.currentTarget.value),
                            )
                          }
                          placeholder={`اختياري (${storeCurrency.code})`}
                          inputMode="decimal"
                          icon={<Info />}
                        />
                      </div>

                      <div className="adm-product-dialog__field">
                        <Label>السعر المخفض ({storeCurrency.code})</Label>
                        <TextInput
                          dir="ltr"
                          value={salePrice}
                          onChange={(e) =>
                            setSalePrice(
                              normalizeDecimalInput(e.currentTarget.value),
                            )
                          }
                          placeholder={`اختياري (${storeCurrency.code})`}
                          inputMode="decimal"
                          icon={<BadgePercent />}
                        />

                        {discountInfo.percent ? (
                          <div className="adm-product-dialog__note">
                            نسبة الخصم: <strong>{discountInfo.percent}</strong>{" "}
                            — مقدار الخصم:{" "}
                            <strong>
                              {moneyText(discountInfo.amount, storeCurrency)}
                            </strong>
                          </div>
                        ) : null}
                      </div>

                      <div className="adm-product-dialog__field adm-product-dialog__span2">
                        <Label>نهاية التخفيض</Label>

                        <TextInput
                          value={saleEnd}
                          onChange={(e) => {
                            const next = e.currentTarget.value;
                            setSaleEnd(next);
                            if (!next.trim()) setShowSaleCountdown(false);
                          }}
                          placeholder="YYYY-MM-DD أو ISO Date (اختياري)"
                          inputMode="numeric"
                          icon={<Calendar />}
                        />

                        <label
                          className={cn(
                            "adm-product-dialog__toggleRow",
                            !saleEnd.trim() && "is-disabled",
                          )}
                        >
                          <span>
                            <Calendar />
                            عرض العد التنازلي في المتجر
                          </span>

                          <input
                            type="checkbox"
                            checked={showSaleCountdown}
                            disabled={!saleEnd.trim()}
                            onChange={(e) =>
                              setShowSaleCountdown(e.currentTarget.checked)
                            }
                          />
                        </label>

                        {!saleEnd.trim() ? (
                          <div className="adm-product-dialog__note">
                            لازم تحدد نهاية التخفيض أولًا حتى تفعّل العد
                            التنازلي.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                </div>

                <Card title="المعرفات" icon={<Barcode />}>
                  <div className="adm-product-dialog__grid3">
                    <div className="adm-product-dialog__field">
                      <Label>رمز التخزين SKU</Label>
                      <TextInput
                        dir="ltr"
                        value={sku}
                        onChange={(e) => setSku(e.currentTarget.value)}
                        placeholder="SKU"
                        className="adm-dir-ltr"
                      />
                    </div>

                    <div className="adm-product-dialog__field">
                      <Label>MPN</Label>
                      <TextInput
                        dir="ltr"
                        value={mpn}
                        onChange={(e) => setMpn(e.currentTarget.value)}
                        placeholder="MPN"
                        className="adm-dir-ltr"
                      />
                    </div>

                    <div className="adm-product-dialog__field">
                      <Label>GTIN</Label>
                      <TextInput
                        dir="ltr"
                        value={gtin}
                        onChange={(e) => setGtin(e.currentTarget.value)}
                        placeholder="GTIN"
                        className="adm-dir-ltr"
                      />
                    </div>
                  </div>
                </Card>

                <Card title="معلومات المنتج" icon={<Package />}>
                  <div className="adm-product-dialog__grid2">
                    <div className="adm-product-dialog__field adm-product-dialog__span2">
                      <Label>اسم المنتج</Label>
                      <TextInput
                        value={name}
                        onChange={(e) => setName(e.currentTarget.value)}
                        placeholder="اسم المنتج"
                      />
                    </div>

                    <div className="adm-product-dialog__field">
                      <Label>تحديد الماركة التجارية (اختياري)</Label>
                      <BrandPicker
                        valueName={brand}
                        onChangeName={(next) => setBrand(next)}
                      />
                      <div className="adm-product-dialog__note">
                        تقدر تختار “بدون ماركة” وبيصير الحقل NULL.
                      </div>
                    </div>

                    <div className="adm-product-dialog__field">
                      <Label>السنوات</Label>
                      <TextInput
                        value={years}
                        onChange={(e) => setYears(e.currentTarget.value)}
                        placeholder="مثال: 2016-2024"
                      />
                    </div>

                    <div className="adm-product-dialog__field">
                      <Label>أقصى كمية لكل عميل</Label>
                      <TextInput
                        dir="ltr"
                        value={maxQtyPerOrder}
                        onChange={(e) =>
                          setMaxQtyPerOrder(
                            e.currentTarget.value.replace(/[^\d]/g, ""),
                          )
                        }
                        placeholder="اختياري"
                        inputMode="numeric"
                      />
                    </div>

                    <div className="adm-product-dialog__field">
                      <Label>تحديد كمية المنتج</Label>
                      <select
                        className="adm-product-dialog__select"
                        value={hideQuantity ? "disabled" : "enabled"}
                        onChange={(e) =>
                          setHideQuantity(e.currentTarget.value === "disabled")
                        }
                      >
                        <option value="enabled">تفعيل خيار تحديد الكمية</option>
                        <option value="disabled">
                          تعطيل خيار تحديد الكمية
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="adm-product-dialog__grid2 adm-product-dialog__mt">
                    <div className="adm-product-dialog__field">
                      <Label>
                        العنوان الفرعي <small>(حتى 35 حرف)</small>
                      </Label>

                      <TextInput
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.currentTarget.value)}
                        placeholder="يظهر تحت اسم المنتج"
                        maxLength={35}
                      />

                      <div className="adm-product-dialog__pillRow">
                        <PillButton
                          onClick={() => applyVar("subtitle", "brand")}
                        >
                          {"{brand}"}
                        </PillButton>
                        <PillButton
                          onClick={() => applyVar("subtitle", "discount")}
                        >
                          {"{discount}"}
                        </PillButton>
                        <PillButton
                          onClick={() => applyVar("subtitle", "percent")}
                        >
                          {"{percent}"}
                        </PillButton>
                      </div>

                      <div className="adm-product-dialog__preview">
                        <span>معاينة:</span>
                        <strong>{subtitlePreview || "—"}</strong>
                      </div>
                    </div>

                    <div className="adm-product-dialog__field">
                      <Label>
                        العنوان الترويجي <small>(حتى 25 حرف)</small>
                      </Label>

                      <TextInput
                        value={promotionTitle}
                        onChange={(e) =>
                          setPromotionTitle(e.currentTarget.value)
                        }
                        placeholder="يظهر على صورة المنتج"
                        maxLength={25}
                      />

                      <div className="adm-product-dialog__pillRow">
                        <PillButton
                          onClick={() => applyVar("promotion", "brand")}
                        >
                          {"{brand}"}
                        </PillButton>
                        <PillButton
                          onClick={() => applyVar("promotion", "discount")}
                        >
                          {"{discount}"}
                        </PillButton>
                        <PillButton
                          onClick={() => applyVar("promotion", "percent")}
                        >
                          {"{percent}"}
                        </PillButton>
                      </div>

                      <div className="adm-product-dialog__preview">
                        <span>معاينة:</span>
                        <strong>{promotionPreview || "—"}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="adm-product-dialog__field adm-product-dialog__mt">
                    <Label>وصف المنتج</Label>
                    <TextArea
                      rows={7}
                      value={desc}
                      onChange={(e) => setDesc(e.currentTarget.value)}
                      placeholder="اكتب وصف المنتج…"
                    />
                  </div>
                </Card>
              </div>
            ) : null}

            {tab === "specs" ? (
              <div className="adm-product-dialog__stack">
                <Card
                  title="مواصفات المنتج"
                  icon={<ListChecks />}
                  hint="مثال: نوع القماش / قماش نواعم كوري"
                >
                  <div className="adm-product-dialog__specHead">
                    <span>اسم الوصف</span>
                    <span>الوصف</span>
                    <span />
                  </div>

                  <div className="adm-product-dialog__specList">
                    {productSpecs.map((row, index) => (
                      <div key={row.id} className="adm-product-dialog__specRow">
                        <div className="adm-product-dialog__field">
                          <Label>اسم الوصف</Label>
                          <TextInput
                            value={row.name}
                            onChange={(e) =>
                              patchSpec(row.id, {
                                name: e.currentTarget.value,
                              })
                            }
                            placeholder={
                              index === 0 ? "مثال: نوع القماش" : "اسم الوصف"
                            }
                          />
                        </div>

                        <div className="adm-product-dialog__field">
                          <Label>الوصف</Label>
                          <TextInput
                            value={row.value}
                            onChange={(e) =>
                              patchSpec(row.id, {
                                value: e.currentTarget.value,
                              })
                            }
                            placeholder={
                              index === 0
                                ? "مثال: قماش نواعم كوري"
                                : "الوصف"
                            }
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removeSpec(row.id)}
                          className="adm-icon-btn adm-icon-btn--danger adm-product-dialog__specDelete"
                          title="حذف"
                        >
                          <Trash2 />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="adm-product-dialog__actionsLine">
                    <button
                      type="button"
                      onClick={addSpec}
                      className="adm-btn adm-btn--secondary"
                    >
                      <Plus />
                      إضافة مواصفة
                    </button>
                  </div>

                  <div className="adm-alert adm-alert--info adm-product-dialog__softAlert">
                    عند الحفظ، أي صف ناقص فيه اسم الوصف أو الوصف سيتم تجاهله.
                  </div>
                </Card>
              </div>
            ) : null}

            {tab === "tags" ? (
              <div className="adm-product-dialog__stack">
                <Card title="الوسوم" icon={<Tag />}>
                  <div className="adm-product-dialog__tagAdd">
                    <TextInput
                      value={tagInput}
                      onChange={(e) => setTagInput(e.currentTarget.value)}
                      placeholder="اكتب الوسم ثم Enter"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTagFromInput();
                        }
                      }}
                    />

                    <button
                      type="button"
                      onClick={addTagFromInput}
                      className="adm-btn adm-btn--primary"
                    >
                      إضافة
                    </button>
                  </div>

                  <div className="adm-product-dialog__chips">
                    {!tags.length ? (
                      <div className="adm-product-dialog__emptyLine">
                        لا توجد وسوم.
                      </div>
                    ) : (
                      tags.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => removeTag(t)}
                          className="adm-product-dialog__chip"
                          title="حذف الوسم"
                        >
                          {t}
                          <span>×</span>
                        </button>
                      ))
                    )}
                  </div>
                </Card>
              </div>
            ) : null}

            {tab === "seo" ? (
              <div className="adm-product-dialog__stack">
                <Card title="تحسينات SEO" icon={<Search />}>
                  <div className="adm-product-dialog__stack">
                    <div className="adm-product-dialog__field">
                      <Label>عنوان صفحة المنتج</Label>
                      <TextInput
                        value={seoTitleTpl}
                        onChange={(e) => setSeoTitleTpl(e.currentTarget.value)}
                        placeholder="مثال: {Name} | {Brand}"
                      />
                    </div>

                    <div className="adm-product-dialog__field">
                      <Label>رابط صفحة المنتج (Slug)</Label>
                      <TextInput
                        value={seoSlugTpl}
                        onChange={(e) => setSeoSlugTpl(e.currentTarget.value)}
                        placeholder="مثال: {Name}-{SKU}"
                      />
                    </div>

                    <div className="adm-product-dialog__field">
                      <Label>وصف صفحة المنتج</Label>
                      <TextArea
                        rows={4}
                        value={seoDescTpl}
                        onChange={(e) => setSeoDescTpl(e.currentTarget.value)}
                        placeholder="وصف مختصر لمحركات البحث…"
                      />
                    </div>
                  </div>
                </Card>
              </div>
            ) : null}

            {tab === "extras" ? (
              <div className="adm-product-dialog__stack">
                <Card
                  title="خيارات إضافية"
                  icon={<ShieldCheck />}
                  hint="التحكم في العرض والقنوات والضرائب"
                >
                  <div className="adm-product-dialog__stack">
                    <div className="adm-product-dialog__noticeBox">
                      <div className="adm-product-dialog__noticeTop">
                        <span>
                          {isHidden ? <EyeOff /> : <Eye />}
                          حالة عرض المنتج
                        </span>

                        <button
                          type="button"
                          onClick={() => setHidden(!isHidden)}
                          className={cn(
                            "adm-btn adm-btn--sm",
                            isHidden
                              ? "adm-btn--secondary"
                              : "adm-btn--gold",
                          )}
                        >
                          {isHidden ? "إظهار المنتج" : "إخفاء المنتج"}
                        </button>
                      </div>

                      <p>
                        إذا كان المنتج “مخفي” يتم حفظ القنوات كقائمة فارغة.
                      </p>
                    </div>

                    <label className="adm-product-dialog__toggleRow">
                      <span>
                        <Paperclip />
                        ارفاق ملف عند الطلب
                      </span>

                      <input
                        type="checkbox"
                        checked={enableUploadImage}
                        onChange={(e) =>
                          setEnableUploadImage(e.currentTarget.checked)
                        }
                      />
                    </label>

                    <label className="adm-product-dialog__toggleRow">
                      <span>
                        <StickyNote />
                        امكانية كتابة ملاحظة
                      </span>

                      <input
                        type="checkbox"
                        checked={enableNote}
                        onChange={(e) => setEnableNote(e.currentTarget.checked)}
                      />
                    </label>

                    <div className="adm-product-dialog__noticeBox">
                      <label className="adm-product-dialog__taxTop">
                        <span>المنتج خاضع لضريبة</span>

                        <input
                          type="checkbox"
                          checked={productWithTax}
                          onChange={(e) =>
                            setProductWithTax(e.currentTarget.checked)
                          }
                        />
                      </label>

                      {!productWithTax ? (
                        <div className="adm-product-dialog__field adm-product-dialog__mt">
                          <Label>سبب عدم خضوع المنتج للضريبة</Label>

                          <select
                            className="adm-product-dialog__select"
                            value={taxReasonCode}
                            onChange={(e) =>
                              setTaxReasonCode(e.currentTarget.value)
                            }
                          >
                            <option value="">إختر السبب</option>
                            <option value="VATEX-SA-29">الخدمات المالية</option>
                            <option value="VATEX-SA-29-7">
                              عقد تأمين على الحياة
                            </option>
                            <option value="VATEX-SA-30">
                              التوريدات العقارية المعفاة
                            </option>
                            <option value="VATEX-SA-32">
                              صادرات السلع من المملكة
                            </option>
                            <option value="VATEX-SA-33">
                              صادرات الخدمات من المملكة
                            </option>
                            <option value="VATEX-SA-34-1">
                              النقل الدولي للسلع
                            </option>
                            <option value="VATEX-SA-34-2">
                              النقل الدولي للركاب
                            </option>
                            <option value="VATEX-SA-34-3">
                              خدمات النقل الدولي للركاب
                            </option>
                            <option value="VATEX-SA-34-4">
                              توريد وسائل النقل المؤهلة
                            </option>
                            <option value="VATEX-SA-34-5">
                              الخدمات ذات الصلة بالنقل
                            </option>
                            <option value="VATEX-SA-35">
                              الأدوية والمعدات الطبية
                            </option>
                            <option value="VATEX-SA-36">المعادن المؤهلة</option>
                            <option value="VATEX-SA-EDU">
                              الخدمات التعليمية الخاصة
                            </option>
                            <option value="VATEX-SA-HEA">
                              الخدمات الصحية الخاصة
                            </option>
                            <option value="VATEX-SA-MLTRY">
                              توريد السلع العسكرية المؤهلة
                            </option>
                          </select>
                        </div>
                      ) : null}
                    </div>

                    <div
                      className={cn(
                        "adm-product-dialog__noticeBox",
                        isHidden && "is-disabled",
                      )}
                    >
                      <div className="adm-product-dialog__boxTitle">
                        قنوات عرض المنتج
                      </div>

                      <div className="adm-product-dialog__channels">
                        <button
                          type="button"
                          onClick={() => toggleChannel("web")}
                          disabled={isHidden}
                          className={cn(
                            "adm-product-dialog__channel",
                            channels.includes("web") && !isHidden
                              ? "is-active"
                              : "",
                          )}
                        >
                          <Globe />
                          اظهار في موقع المتجر
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleChannel("app")}
                          disabled={isHidden}
                          className={cn(
                            "adm-product-dialog__channel",
                            channels.includes("app") && !isHidden
                              ? "is-active"
                              : "",
                          )}
                        >
                          <Smartphone />
                          اظهار في تطبيق المتجر
                        </button>
                      </div>

                      {!isHidden && channels.length === 0 ? (
                        <div className="adm-alert adm-alert--warning adm-product-dialog__softAlert">
                          المنتج مخفي لأن القنوات فارغة.
                        </div>
                      ) : null}
                    </div>

                    <div className="adm-alert adm-alert--info adm-product-dialog__softAlert">
                      <strong>ملاحظة:</strong> تقدر تقفل المودال من “خروج” أو
                      الضغط خارج النافذة.
                    </div>
                  </div>
                </Card>
              </div>
            ) : null}
          </div>

          <footer className="adm-product-dialog__footer">
            <button
              type="button"
              onClick={onClose}
              className="adm-btn adm-btn--secondary"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={save}
              className="adm-btn adm-btn--primary adm-product-dialog__save"
            >
              حفظ بيانات المنتج
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}