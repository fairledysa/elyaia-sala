// FILE: apps/merchant/src/app/(app)/products/ProductsClient.tsx

"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import {
  Boxes,
  ImageOff,
  PackagePlus,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import SallaProductCard from "./_components/SallaProductCard";
import type {
  TaxonCatRow,
  TaxonLookup,
} from "./_components/TaxonTagsField";

const PRODUCTS_LIMIT = 24;

const loadProductDataDialog = () => import("./_dialogs/ProductDataDialog");
const loadProductImagesDialog = () => import("./_dialogs/ProductImagesDialog");
const loadOptionsQuantityDialog = () =>
  import("./_dialogs/OptionsQuantityDialog");

const ProductDataDialog = dynamic(loadProductDataDialog, {
  ssr: false,
});

const ProductImagesDialog = dynamic(loadProductImagesDialog, {
  ssr: false,
});

const OptionsQuantityDialog = dynamic(loadOptionsQuantityDialog, {
  ssr: false,
});

export type ProductStatus = "active" | "draft" | "archived" | "hidden";
export type OptionGroupType = "text" | "color" | "image";

export type OptionValue = {
  id: string;
  label: string;
  colorHex?: string;
  imageUrl?: string;
};

export type OptionGroup = {
  id: string;
  type: OptionGroupType;
  name: string;
  values: OptionValue[];
};

export type VariantRow = {
  id: string;
  optionValueIds: string[];
  sku?: string;
  qty?: number;
  price?: number;
  salePrice?: number;
};

export type ProductImage = {
  id: string;
  url: string;
  is_primary: boolean;
  sort_order: number;
};

export type ProductSpec = {
  id: string;
  name: string;
  value: string;
};

export type Product = {
  id: string;
  name: string;
  status: ProductStatus;
  pinned?: boolean;

  imageUrl?: string;
  images?: ProductImage[];

  price?: number;
  qty?: number;

  variants_price_min: number | null;
  variants_price_max: number | null;
  variants_price_label: string | null;
  variants_total_qty: number;
  base_price_fallback: number | null;
  base_qty_fallback: number;

  sku?: string;
  brand?: string | null;
  years?: string;
  descriptionHtml?: string;

  productSpecs?: ProductSpec[];

  seoTitleTpl?: string;
  seoSlugTpl?: string;
  seoDescTpl?: string;

  taxonNames?: string[];
  taxonIds?: string[];

  optionsEnabled?: boolean;
  qtyUnlimited?: boolean;
  options?: OptionGroup[];
  variants?: VariantRow[];

  requireShipping?: boolean;
  weight?: number;
  weightUnit?: "kg" | "g" | "oz" | "lb";
  costPrice?: number | null;
  salePrice?: number | null;
  saleEnd?: string;
  showSaleCountdown?: boolean;

  mpn?: string;
  gtin?: string;
  maxQtyPerOrder?: number | null;

  subtitle?: string;
  promotionTitle?: string;

  hideQuantity?: boolean;
  channels?: Array<"web" | "app">;

  enableUploadImage?: boolean;
  enableNote?: boolean;

  productWithTax?: boolean;
  taxReasonCode?: string;

  tags?: string[];
};

type ApiProductRow = any;
type ApiItemResponse = { data: ApiProductRow };

type ProductsStats = {
  total: number;
  visible: number;
  hidden: number;
  withoutImage: number;
};

type ProductsPage = {
  limit: number;
  cursor: string;
  nextCursor: string | null;
  hasMore: boolean;
  count: number;
};

type LoadProductsArgs = {
  cursor?: string;
  query?: string;
  append?: boolean;
};

const emptyStats: ProductsStats = {
  total: 0,
  visible: 0,
  hidden: 0,
  withoutImage: 0,
};

const emptyPage: ProductsPage = {
  limit: PRODUCTS_LIMIT,
  cursor: "0",
  nextCursor: null,
  hasMore: false,
  count: 0,
};

const nf = new Intl.NumberFormat("ar-SA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function makePriceLabel(min?: number | null, max?: number | null) {
  if (min == null || max == null) return null;
  return min === max
    ? nf.format(min)
    : `يبدأ من ${nf.format(min)} إلى ${nf.format(max)}`;
}

function normalizeList(json: any): ApiProductRow[] {
  const arr = Array.isArray(json?.data)
    ? json.data
    : Array.isArray(json)
      ? json
      : [];

  return arr as ApiProductRow[];
}

function toNumOrNull(x: any): number | null {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function normalizeProductSpecs(raw: any): ProductSpec[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item: any, index: number) => {
      const id = String(item?.id ?? `spec-${index}`).trim();
      const name = String(item?.name ?? item?.label ?? item?.title ?? "").trim();
      const value = String(
        item?.value ?? item?.description ?? item?.text ?? "",
      ).trim();

      return {
        id: id || `spec-${index}`,
        name,
        value,
      };
    })
    .filter((item) => item.name || item.value);
}

function mapApiToProduct(p: ApiProductRow): Product {
  const price = typeof p.price === "number" ? p.price : 0;
  const qty = typeof p.qty === "number" ? p.qty : 0;

  const variantsPriceMin = toNumOrNull(p.variants_price_min);
  const variantsPriceMax = toNumOrNull(p.variants_price_max);

  const variantsPriceLabel =
    typeof p.variants_price_label === "string" && p.variants_price_label.trim()
      ? p.variants_price_label
      : makePriceLabel(variantsPriceMin, variantsPriceMax);

  const variantsTotalQty = Number.isFinite(Number(p.variants_total_qty))
    ? Number(p.variants_total_qty)
    : 0;

  const basePriceFallback = Number.isFinite(Number(p.base_price_fallback))
    ? Number(p.base_price_fallback)
    : price;

  const baseQtyFallback = Number.isFinite(Number(p.base_qty_fallback))
    ? Number(p.base_qty_fallback)
    : qty;

  return {
    id: String(p.id),
    name: p.name ?? "منتج",
    status: (p.status ?? "draft") as ProductStatus,
    pinned: Boolean(p.pinned),

    imageUrl: p.imageUrl ?? "",
    images: Array.isArray(p.images) ? p.images : [],

    price,
    qty,

    variants_price_min: variantsPriceMin,
    variants_price_max: variantsPriceMax,
    variants_price_label: variantsPriceLabel,
    variants_total_qty: variantsTotalQty,
    base_price_fallback: basePriceFallback,
    base_qty_fallback: baseQtyFallback,

    sku: p.sku ?? "",
    brand: p.brand ?? null,
    years: p.years ?? "",
    descriptionHtml: p.descriptionHtml ?? "",

    productSpecs: normalizeProductSpecs(p.productSpecs),

    requireShipping: Boolean(p.requireShipping ?? true),
    weight: typeof p.weight === "number" ? p.weight : 0,
    weightUnit: (p.weightUnit as any) ?? "kg",

    costPrice: p.costPrice ?? null,
    salePrice: p.salePrice ?? null,
    saleEnd: p.saleEnd ?? "",
    showSaleCountdown: Boolean(p.showSaleCountdown ?? false),

    mpn: p.mpn ?? "",
    gtin: p.gtin ?? "",
    maxQtyPerOrder: p.maxQtyPerOrder ?? null,

    subtitle: p.subtitle ?? "",
    promotionTitle: p.promotionTitle ?? "",

    hideQuantity: Boolean(p.hideQuantity ?? false),
    channels: Array.isArray(p.channels) ? p.channels : ["web", "app"],

    enableUploadImage: Boolean(p.enableUploadImage ?? false),
    enableNote: Boolean(p.enableNote ?? true),

    productWithTax: Boolean(p.productWithTax ?? true),
    taxReasonCode: p.taxReasonCode ?? "",

    tags: Array.isArray(p.tags) ? p.tags : [],

    seoTitleTpl: p.seoTitleTpl ?? "",
    seoSlugTpl: p.seoSlugTpl ?? "",
    seoDescTpl: p.seoDescTpl ?? "",

    taxonNames: Array.isArray(p.taxonNames) ? p.taxonNames : [],
    taxonIds: Array.isArray(p.taxonIds) ? p.taxonIds : [],

    optionsEnabled: Boolean(p.optionsEnabled ?? false),
    qtyUnlimited: Boolean(p.qtyUnlimited ?? false),
    options: Array.isArray(p.options) ? p.options : [],
    variants: Array.isArray(p.variants) ? p.variants : [],
  } as any;
}

function normalizePage(raw: any): ProductsPage {
  return {
    limit: Number.isFinite(Number(raw?.limit))
      ? Number(raw.limit)
      : PRODUCTS_LIMIT,
    cursor: String(raw?.cursor ?? "0"),
    nextCursor:
      raw?.nextCursor === null || raw?.nextCursor === undefined
        ? null
        : String(raw.nextCursor),
    hasMore: Boolean(raw?.hasMore),
    count: Number.isFinite(Number(raw?.count)) ? Number(raw.count) : 0,
  };
}

function normalizeStats(raw: any): ProductsStats {
  return {
    total: Number.isFinite(Number(raw?.total)) ? Number(raw.total) : 0,
    visible: Number.isFinite(Number(raw?.visible)) ? Number(raw.visible) : 0,
    hidden: Number.isFinite(Number(raw?.hidden)) ? Number(raw.hidden) : 0,
    withoutImage: Number.isFinite(Number(raw?.withoutImage))
      ? Number(raw.withoutImage)
      : 0,
  };
}

function productChannels(p: Product) {
  return Array.isArray(p.channels) ? p.channels : [];
}

function isProductVisible(p: Product) {
  return p.status === "active" && productChannels(p).length > 0;
}

function isProductHidden(p: Product) {
  return p.status === "hidden" || productChannels(p).length === 0;
}

function mergeProductLists(prev: Product[], next: Product[]) {
  const seen = new Set<string>();
  const out: Product[] = [];

  for (const item of [...prev, ...next]) {
    if (!item.id || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }

  return out;
}

function buildProductsUrl({
  cursor,
  query,
}: {
  cursor: string;
  query: string;
}) {
  const params = new URLSearchParams();

  params.set("limit", String(PRODUCTS_LIMIT));
  params.set("cursor", cursor);

  const q = query.trim();
  if (q) params.set("q", q);

  return `/api/products?${params.toString()}`;
}

function sortCats(list: TaxonCatRow[]) {
  return list.slice().sort((a, b) => {
    const pa = (a.path ?? "/") + "/" + (a.slug ?? "");
    const pb = (b.path ?? "/") + "/" + (b.slug ?? "");

    if (pa < pb) return -1;
    if (pa > pb) return 1;

    if ((a.sort_order ?? 0) !== (b.sort_order ?? 0)) {
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    }

    return a.name.localeCompare(b.name);
  });
}

function labelFor(cat: TaxonCatRow) {
  const d = Math.max(1, Number(cat.depth ?? 1));
  const prefix = "— ".repeat(Math.max(0, d - 1));
  return `${prefix}${cat.name}`.trim();
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr));
}

export default function ProductsClient() {
  const [rows, setRows] = React.useState<Product[]>([]);
  const [q, setQ] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");

  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [page, setPage] = React.useState<ProductsPage>(emptyPage);
  const [stats, setStats] = React.useState<ProductsStats>(emptyStats);

  const [categories, setCategories] = React.useState<TaxonCatRow[]>([]);
  const [categoriesLoading, setCategoriesLoading] = React.useState(true);

  const [openEdit, setOpenEdit] = React.useState<null | Product>(null);
  const [openImages, setOpenImages] = React.useState<null | Product>(null);
  const [openOptions, setOpenOptions] = React.useState<null | Product>(null);

  const rowsRef = React.useRef<Product[]>([]);
  const requestSeqRef = React.useRef(0);
const loadMoreSentinelRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQ(q.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [q]);

  React.useEffect(() => {
    const warmup = () => {
      void loadProductImagesDialog();
      void loadProductDataDialog();
      void loadOptionsQuantityDialog();
    };

    const timer = window.setTimeout(warmup, 800);
    return () => window.clearTimeout(timer);
  }, []);

  const loadProductsPage = React.useCallback(
    async ({ cursor = "0", query = "", append = false }: LoadProductsArgs) => {
      const seq = ++requestSeqRef.current;

      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
          setLoadError(null);
        }

        const res = await fetch(
          buildProductsUrl({
            cursor,
            query,
          }),
          { cache: "no-store" },
        );

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(json?.error || "فشل تحميل المنتجات");
        }

        if (seq !== requestSeqRef.current) return;

        const list = normalizeList(json);
        const mapped = list.map(mapApiToProduct);

        setRows((prev) => (append ? mergeProductLists(prev, mapped) : mapped));
        setPage(normalizePage(json?.page));
        setStats(normalizeStats(json?.stats));
      } catch (e: any) {
        if (seq !== requestSeqRef.current) return;

        setLoadError(e?.message || "فشل تحميل المنتجات");

        if (!append) {
          setRows([]);
          setPage(emptyPage);
          setStats(emptyStats);
        }
      } finally {
        if (seq === requestSeqRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [],
  );

  React.useEffect(() => {
    void loadProductsPage({
      cursor: "0",
      query: debouncedQ,
      append: false,
    });
  }, [debouncedQ, loadProductsPage]);

  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setCategoriesLoading(true);

        const res = await fetch("/api/categories", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        const list: TaxonCatRow[] = Array.isArray(json?.data) ? json.data : [];

        if (alive) setCategories(list);
      } catch {
        if (alive) setCategories([]);
      } finally {
        if (alive) setCategoriesLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const taxonLookup = React.useMemo<TaxonLookup>(() => {
    const idToLabel: Record<string, string> = {};
    const labelToId: Record<string, string> = {};
    const labels: string[] = [];

    sortCats(categories)
      .filter((c) => (c.status ?? "active") === "active")
      .forEach((cat) => {
        const label = labelFor(cat);
        idToLabel[cat.id] = label;
        labelToId[label] = cat.id;
        labels.push(label);
      });

    return {
      idToLabel,
      labelToId,
      suggestions: uniq(labels),
      loading: categoriesLoading,
    };
  }, [categories, categoriesLoading]);

  const patchLocal = React.useCallback((id: string, patch: Partial<Product>) => {
    setRows((list) => list.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }, []);

  const deleteLocal = React.useCallback((id: string) => {
    setRows((list) => list.filter((x) => x.id !== id));
  }, []);

  const replaceLocalByApi = React.useCallback((apiRow: ApiProductRow) => {
    const full = mapApiToProduct(apiRow);

    setRows((list) =>
      list.map((x) => (x.id === full.id ? { ...x, ...full } : x)),
    );

    setOpenEdit((cur) => (cur?.id === full.id ? { ...cur, ...full } : cur));
    setOpenImages((cur) => (cur?.id === full.id ? { ...cur, ...full } : cur));
    setOpenOptions((cur) => (cur?.id === full.id ? { ...cur, ...full } : cur));

    return full;
  }, []);

  const apiCreate = React.useCallback(async (): Promise<Product> => {
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "منتج جديد" }),
    });

    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "فشل إنشاء المنتج");

    return mapApiToProduct(json.data);
  }, []);

  const apiGetOne = React.useCallback(async (id: string): Promise<Product> => {
    const res = await fetch(`/api/products/${id}`, { cache: "no-store" });
    const json: any = await res.json().catch(() => ({}));

    if (!res.ok) throw new Error(json?.error || "فشل جلب المنتج");

    return mapApiToProduct(json.data);
  }, []);

  const apiPatch = React.useCallback(
    async (id: string, patch: Partial<Product> & any) => {
      const payload: any = {};
      Object.assign(payload, patch);

      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(json?.error || "فشل تحديث المنتج");

      return json as ApiItemResponse;
    },
    [],
  );

  const apiDelete = React.useCallback(async (id: string) => {
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) throw new Error(json?.error || "فشل حذف المنتج");
  }, []);

  const addNew = React.useCallback(() => {
    const tmpId = `tmp-${crypto.randomUUID()}`;

    const optimistic: Product = {
      id: tmpId,
      name: "منتج جديد",
      status: "draft",
      pinned: false,
      imageUrl: "",
      images: [],
      price: 0,
      qty: 0,
      variants_price_min: null,
      variants_price_max: null,
      variants_price_label: null,
      variants_total_qty: 0,
      base_price_fallback: 0,
      base_qty_fallback: 0,
      sku: "",
      brand: null,
      years: "",
      descriptionHtml: "",
      productSpecs: [],
      taxonNames: [],
      taxonIds: [],
      optionsEnabled: false,
      qtyUnlimited: false,
      options: [],
      variants: [],
      tags: [],
      channels: ["web", "app"],
      showSaleCountdown: false,
    } as any;

    setRows((r) => [optimistic, ...r]);
    setStats((current) => ({
      ...current,
      total: current.total + 1,
    }));

    (async () => {
      try {
        const created = await apiCreate();
        setRows((list) => list.map((x) => (x.id === tmpId ? created : x)));
      } catch (e: any) {
        setRows((list) => list.filter((x) => x.id !== tmpId));
        setStats((current) => ({
          ...current,
          total: Math.max(0, current.total - 1),
        }));
        alert(e?.message || "فشل إنشاء المنتج");
      }
    })();
  }, [apiCreate]);

  const handleDelete = React.useCallback(
    async (id: string) => {
      const target = rowsRef.current.find((item) => item.id === id);

      try {
        await apiDelete(id);
        deleteLocal(id);

        if (target) {
          setStats((current) => ({
            total: Math.max(0, current.total - 1),
            visible: Math.max(
              0,
              current.visible - (isProductVisible(target) ? 1 : 0),
            ),
            hidden: Math.max(
              0,
              current.hidden - (isProductHidden(target) ? 1 : 0),
            ),
            withoutImage: Math.max(
              0,
              current.withoutImage - (!target.imageUrl ? 1 : 0),
            ),
          }));
        }
      } catch (e: any) {
        alert(e?.message || "فشل حذف المنتج");
      }
    },
    [apiDelete, deleteLocal],
  );

  const handleOpenEdit = React.useCallback(
    async (id: string) => {
      const quickProduct = rowsRef.current.find((item) => item.id === id);

      if (quickProduct) {
        setOpenEdit({
          ...quickProduct,
          __dialogRev: "quick",
        } as Product & any);
      }

      void loadProductDataDialog();

      try {
        const full = await apiGetOne(id);

        setOpenEdit((current) => {
          if (!current || current.id !== id) return current;

          return {
            ...full,
            __dialogRev: `full-${Date.now()}`,
          } as Product & any;
        });
      } catch (e: any) {
        if (!quickProduct) {
          alert(e?.message || "فشل فتح بيانات المنتج");
        }
      }
    },
    [apiGetOne],
  );

  const handleOpenImages = React.useCallback(
    async (id: string) => {
      const quickProduct = rowsRef.current.find((item) => item.id === id);

      if (quickProduct) {
        setOpenImages(quickProduct);
      }

      void loadProductImagesDialog();

      try {
        const full = await apiGetOne(id);

        setOpenImages((current) => {
          if (!current || current.id !== id) return current;
          return full;
        });
      } catch (e: any) {
        if (!quickProduct) {
          alert(e?.message || "فشل فتح الصور");
        }
      }
    },
    [apiGetOne],
  );

  const handleOpenOptions = React.useCallback(
    async (id: string) => {
      const quickProduct = rowsRef.current.find((item) => item.id === id);

      if (quickProduct) {
        setOpenOptions({
          ...quickProduct,
          __dialogRev: "quick",
        } as Product & any);
      }

      void loadOptionsQuantityDialog();

      try {
        const full = await apiGetOne(id);

        setOpenOptions((current) => {
          if (!current || current.id !== id) return current;

          return {
            ...full,
            __dialogRev: `full-${Date.now()}`,
          } as Product & any;
        });
      } catch (e: any) {
        if (!quickProduct) {
          alert(e?.message || "فشل فتح الخيارات");
        }
      }
    },
    [apiGetOne],
  );

  const handleSaveCard = React.useCallback(
    async (id: string, patch: Partial<Product>) => {
      const resp = await apiPatch(id, patch);
      replaceLocalByApi(resp.data);
    },
    [apiPatch, replaceLocalByApi],
  );

  const handleToggleVisibility = React.useCallback(
    async (
      id: string,
      nextChannels: Array<"web" | "app">,
      nextStatus?: ProductStatus,
    ) => {
      const before = rowsRef.current.find((item) => item.id === id);

      const payload: any = {
        channels: nextChannels,
      };

      if (nextStatus) {
        payload.status = nextStatus;
      }

      const resp = await apiPatch(id, payload);
      const after = replaceLocalByApi(resp.data);

      if (before) {
        const beforeVisible = isProductVisible(before);
        const afterVisible = isProductVisible(after);
        const beforeHidden = isProductHidden(before);
        const afterHidden = isProductHidden(after);

        setStats((current) => ({
          ...current,
          visible: Math.max(
            0,
            current.visible + (afterVisible ? 1 : 0) - (beforeVisible ? 1 : 0),
          ),
          hidden: Math.max(
            0,
            current.hidden + (afterHidden ? 1 : 0) - (beforeHidden ? 1 : 0),
          ),
        }));
      }
    },
    [apiPatch, replaceLocalByApi],
  );

  const handleLoadMore = React.useCallback(() => {
    if (loading || loadingMore || !page.hasMore || !page.nextCursor) return;

    void loadProductsPage({
      cursor: page.nextCursor,
      query: debouncedQ,
      append: true,
    });
  }, [
    debouncedQ,
    loadProductsPage,
    loading,
    loadingMore,
    page.hasMore,
    page.nextCursor,
  ]);
  React.useEffect(() => {
  const el = loadMoreSentinelRef.current;
  if (!el) return;
  if (!page.hasMore) return;
  if (loading || loadingMore) return;

  const observer = new IntersectionObserver(
    (entries) => {
      const first = entries[0];

      if (first?.isIntersecting) {
        handleLoadMore();
      }
    },
    {
      root: null,
      rootMargin: "520px 0px",
      threshold: 0.01,
    },
  );

  observer.observe(el);

  return () => observer.disconnect();
}, [handleLoadMore, loading, loadingMore, page.hasMore]);

  function applyOptionsSummary(p: Product, patch: Partial<Product> & any) {
    const next: Product = { ...p, ...patch };

    const vars = next.variants ?? [];
    const hasOptions = !!next.optionsEnabled && vars.length > 0;

    if (!hasOptions) {
      return {
        ...next,
        variants_price_min: null,
        variants_price_max: null,
        variants_price_label: null,
        variants_total_qty: 0,
        base_price_fallback: typeof next.price === "number" ? next.price : null,
        base_qty_fallback: typeof next.qty === "number" ? next.qty : 0,
      };
    }

    const prices = vars
      .map((v) => (typeof v.price === "number" ? v.price : null))
      .filter((x): x is number => typeof x === "number" && x > 0);

    const qtySum = vars
      .map((v) => (typeof v.qty === "number" ? v.qty : 0))
      .reduce((a, b) => a + b, 0);

    const min = prices.length ? Math.min(...prices) : null;
    const max = prices.length ? Math.max(...prices) : null;

    return {
      ...next,
      variants_price_min: min,
      variants_price_max: max,
      variants_price_label: makePriceLabel(min, max),
      variants_total_qty: next.qtyUnlimited ? 0 : qtySum,
      base_price_fallback: typeof next.price === "number" ? next.price : null,
      base_qty_fallback: typeof next.qty === "number" ? next.qty : 0,
    };
  }

  const resultHint = loading
    ? "جاري تحميل المنتجات…"
    : q.trim() !== debouncedQ
      ? "جاري تجهيز البحث…"
      : debouncedQ
        ? `${rows.length} من ${page.count} نتيجة`
        : `${rows.length} من ${stats.total} منتج`;

  return (
    <section dir="rtl" className="adm-page adm-products">
      <div className="adm-page__inner">
        <header className="adm-hero adm-products__hero">
          <div className="adm-hero__main">
            <div className="adm-hero__icon">
              <Boxes />
            </div>

            <div className="adm-hero__text">
              <h1 className="adm-hero__title">المنتجات</h1>
              <p className="adm-hero__desc">
                إدارة المنتجات والصور والأسعار والمخزون والخيارات من مكان واحد.
              </p>
            </div>
          </div>

          <div className="adm-hero__actions">
            <a href="/categories" className="adm-btn adm-btn--secondary">
              <SlidersHorizontal />
              الأقسام
            </a>

            <button
              type="button"
              onClick={addNew}
              className="adm-btn adm-btn--primary"
            >
              <PackagePlus />
              إضافة منتج
            </button>
          </div>
        </header>

        <div className="adm-products__stats">
          <div className="adm-products__stat">
            <span>إجمالي المنتجات</span>
            <strong>{stats.total}</strong>
          </div>

          <div className="adm-products__stat">
            <span>ظاهرة في المتجر</span>
            <strong>{stats.visible}</strong>
          </div>

          <div className="adm-products__stat">
            <span>مخفية</span>
            <strong>{stats.hidden}</strong>
          </div>

          <div className="adm-products__stat">
            <span>بدون صور</span>
            <strong>{stats.withoutImage}</strong>
          </div>
        </div>

        <div className="adm-card adm-products__toolbar">
          <div className="adm-card__body adm-products__toolbarBody">
            <label className="adm-search adm-products__search">
              <Search className="adm-search__icon" />
              <input
                placeholder="ابحث باسم المنتج…"
                value={q}
                onChange={(e) => setQ(e.currentTarget.value)}
              />
            </label>

            <div className="adm-products__resultHint">{resultHint}</div>
          </div>
        </div>

        {loadError ? (
          <div className="adm-alert adm-alert--danger">{loadError}</div>
        ) : null}

        {loading ? (
          <div className="adm-products__grid">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="adm-products-card adm-products-card--skeleton"
              >
                <div className="adm-products-skeleton adm-products-skeleton--media" />
                <div className="adm-products-skeleton adm-products-skeleton--line" />
                <div className="adm-products-skeleton adm-products-skeleton--line" />
                <div className="adm-products-skeleton adm-products-skeleton--button" />
              </div>
            ))}
          </div>
        ) : rows.length ? (
          <>
            <div className="adm-products__grid">
              {rows.map((p) => (
                <SallaProductCard
                  key={p.id}
                  p={p}
                  taxonLookup={taxonLookup}
                  onDelete={handleDelete}
                  onOpenEdit={handleOpenEdit}
                  onOpenImages={handleOpenImages}
                  onOpenOptions={handleOpenOptions}
                  onSaveCard={handleSaveCard}
                  onToggleVisibility={handleToggleVisibility}
                />
              ))}
            </div>

        <div ref={loadMoreSentinelRef} className="adm-products__autoLoad">
  {page.hasMore ? (
    <div className="adm-products__autoLoadCard">
      {loadingMore ? "جاري تحميل المزيد…" : "انزل للأسفل لتحميل المزيد تلقائيًا"}
    </div>
  ) : rows.length > 0 ? (
    <div className="adm-products__autoLoadDone">
      تم عرض كل المنتجات المتاحة.
    </div>
  ) : null}
</div>
          </>
        ) : (
          <div className="adm-empty adm-products__empty">
            <ImageOff />
            <span>
              {debouncedQ
                ? "لا توجد منتجات مطابقة للبحث الحالي."
                : "لا توجد منتجات حتى الآن."}
            </span>
          </div>
        )}

        {openEdit ? (
          <ProductDataDialog
            key={`${openEdit.id}-${(openEdit as any).__dialogRev ?? "ready"}`}
            product={openEdit}
            onClose={() => setOpenEdit(null)}
            onSaved={async (patch) => {
              try {
                const resp = await apiPatch(openEdit.id, patch);
                replaceLocalByApi(resp.data);
              } catch (e: any) {
                alert(e?.message || "فشل حفظ بيانات المنتج");
              }
            }}
          />
        ) : null}

        {openImages ? (
          <ProductImagesDialog
            product={openImages}
            onClose={() => setOpenImages(null)}
            onSaved={(patch) => {
              patchLocal(openImages.id, patch);
              setOpenImages((cur) =>
                cur ? ({ ...cur, ...patch } as Product) : cur,
              );

              if (patch.imageUrl) {
                setStats((current) => ({
                  ...current,
                  withoutImage: Math.max(0, current.withoutImage - 1),
                }));
              }
            }}
          />
        ) : null}

        {openOptions ? (
          <OptionsQuantityDialog
            key={`${openOptions.id}-${(openOptions as any).__dialogRev ?? "ready"}`}
            open={true}
            onOpenChange={(v) => {
              if (!v) setOpenOptions(null);
            }}
            productName={openOptions.name}
            initial={{
              hasOptions: Boolean(openOptions.optionsEnabled),
              unlimitedQty: Boolean(openOptions.qtyUnlimited),
              optionGroups: (openOptions.options ?? []) as any,
              variants: (openOptions.variants ?? []) as any,
            }}
            onApply={async (payload) => {
              const patch: any = {
                optionsEnabled: Boolean(payload.hasOptions),
                qtyUnlimited: Boolean(payload.unlimitedQty),
                options: payload.optionGroups ?? [],
                variants: payload.variants ?? [],
              };

              setRows((list) =>
                list.map((x) => {
                  if (x.id !== openOptions.id) return x;
                  return applyOptionsSummary(x, patch);
                }),
              );

              try {
                const resp = await apiPatch(openOptions.id, patch);
                replaceLocalByApi(resp.data);
              } catch (e: any) {
                alert(e?.message || "فشل حفظ الخيارات");
              }
            }}
          />
        ) : null}
      </div>
    </section>
  );
}