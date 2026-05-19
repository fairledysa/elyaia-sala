// FILE: apps/merchant/src/app/api/products/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";

const PRODUCTS_LIMIT_FALLBACK = 24;
const FALLBACK_CURRENCY = "SAR";

function firstRow<T>(x: T | T[] | null | undefined): T | null {
  if (!x) return null;
  return Array.isArray(x) ? (x[0] ?? null) : x;
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function cleanCurrencyCode(value: unknown) {
  const code = cleanText(value).toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : "";
}

async function getStoreIdFromSession() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
      },
    },
  );

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("UNAUTHENTICATED");

  const sb = supabaseAdmin();

  const { data, error } = await sb
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (error || !data?.store_id) throw new Error("STORE_NOT_FOUND");
  return data.store_id as string;
}

async function getStoreDefaultCurrency(
  sb: ReturnType<typeof supabaseAdmin>,
  storeId: string,
) {
  const { data, error } = await sb
    .from("stores")
    .select("default_currency")
    .eq("id", storeId)
    .single();

  if (error) throw new Error(error.message);

  return cleanCurrencyCode(data?.default_currency) || FALLBACK_CURRENCY;
}

function clampLimit(value: string | null) {
  const n = Number(value ?? PRODUCTS_LIMIT_FALLBACK);
  if (!Number.isFinite(n)) return PRODUCTS_LIMIT_FALLBACK;
  return Math.min(Math.max(Math.floor(n), 12), 60);
}

function parseCursor(value: string | null) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function cleanSearch(value: string | null) {
  return String(value ?? "").trim().slice(0, 80);
}

function normalizeChannels(value: unknown): Array<"web" | "app"> {
  if (!Array.isArray(value)) return ["web", "app"];

  const out: Array<"web" | "app"> = [];

  for (const item of value) {
    if (item === "web" || item === "app") {
      if (!out.includes(item)) out.push(item);
    }
  }

  return out;
}

function makeVariantsPriceLabel(min: number | null, max: number | null) {
  if (min == null || max == null) return null;
  return min === max ? `السعر: ${min}` : `السعر: ${min} - ${max}`;
}

function computeVariantsSummary(variantsRaw: unknown) {
  const variants = Array.isArray(variantsRaw) ? variantsRaw : [];

  const prices = variants
    .map((v: any) => {
      const n = Number(v?.price);
      return Number.isFinite(n) && n > 0 ? n : null;
    })
    .filter((x): x is number => x !== null);

  const qtyTotal = variants.reduce((acc: number, v: any) => {
    const q = Number(v?.qty ?? 0);
    return acc + (Number.isFinite(q) ? Math.max(0, Math.floor(q)) : 0);
  }, 0);

  const min = prices.length ? Math.min(...prices) : null;
  const max = prices.length ? Math.max(...prices) : null;

  return {
    variants_price_min: min,
    variants_price_max: max,
    variants_price_label: makeVariantsPriceLabel(min, max),
    variants_total_qty: qtyTotal,
  };
}

/**
 * مهم:
 * هذا Normalize لقائمة المنتجات فقط.
 * لا يرجع:
 * - options كاملة
 * - variants كاملة
 * - descriptionHtml
 * - productSpecs
 * - tags
 * - SEO
 * - images كاملة
 *
 * التفاصيل الكاملة مكانها:
 * apps/merchant/src/app/api/products/[id]/route.ts
 */
function normalizeProductListRow(p: any) {
  const pricing = firstRow<any>(p?.product_pricing);
  const stock = firstRow<any>(p?.product_stock);

  const price = Number(pricing?.price ?? 0);
  const qty = Number(stock?.quantity ?? 0);
  const currency = cleanCurrencyCode(pricing?.currency) || FALLBACK_CURRENCY;

  const media = Array.isArray(p?.product_media) ? p.product_media : [];

  const sortedMedia = media
    .slice()
    .sort(
      (a: any, b: any) =>
        Number(a?.sort_order ?? 0) - Number(b?.sort_order ?? 0),
    );

  const primary =
    sortedMedia.find((x: any) => Boolean(x?.is_default)) ?? sortedMedia[0];

  const imageUrl = primary?.original_url ? String(primary.original_url) : "";

  const meta = (p?.metadata ?? {}) as any;

  const cats = Array.isArray(p?.product_categories) ? p.product_categories : [];

  const taxonIds: string[] = cats
    .map((x: any) => x?.category_id)
    .filter(Boolean)
    .map((x: any) => String(x));

  const channels = normalizeChannels(meta?.channels);
  const isHiddenByChannels = channels.length === 0;

  const optionsEnabled = Boolean(meta?.optionsEnabled ?? false);
  const variantsSummary = optionsEnabled
    ? computeVariantsSummary(meta?.variants)
    : null;

  const qtyUnlimited =
    Boolean(meta?.qtyUnlimited ?? false) ||
    Boolean(stock?.unlimited_quantity ?? false);

  const metaBaseQty =
    typeof meta?.base_qty_fallback === "number"
      ? meta.base_qty_fallback
      : qty;

  const displayBaseQty = optionsEnabled ? metaBaseQty : qty;

  return {
    id: String(p.id),
    name: String(p.name ?? ""),
    status: isHiddenByChannels ? "hidden" : String(p.status ?? "draft"),
    pinned: Boolean(meta?.pinned ?? false),

    imageUrl,
    images: [],

    price,
    currency,
    currency_code: currency,
    currencyCode: currency,

    qty,

    variants_price_min: optionsEnabled
      ? variantsSummary?.variants_price_min
      : typeof meta?.variants_price_min === "number"
        ? meta.variants_price_min
        : null,
    variants_price_max: optionsEnabled
      ? variantsSummary?.variants_price_max
      : typeof meta?.variants_price_max === "number"
        ? meta.variants_price_max
        : null,
    variants_price_label: optionsEnabled
      ? variantsSummary?.variants_price_label
      : typeof meta?.variants_price_label === "string"
        ? meta.variants_price_label
        : null,
    variants_total_qty: optionsEnabled
      ? (variantsSummary?.variants_total_qty ?? 0)
      : typeof meta?.variants_total_qty === "number"
        ? meta.variants_total_qty
        : 0,
    base_price_fallback:
      typeof meta?.base_price_fallback === "number"
        ? meta.base_price_fallback
        : price,
    base_qty_fallback: displayBaseQty,

    sku: typeof meta?.sku === "string" ? meta.sku : "",
    brand: null,
    years: "",

    productSpecs: [],
    specs: [],

    taxonIds,
    taxonNames: [],

    optionsEnabled,
    qtyUnlimited,
    options: [],
    variants: [],

    channels,

    requireShipping: true,
    weight: 0,
    weightUnit: "kg",

    costPrice: null,
    salePrice:
      typeof pricing?.sale_price === "number" ? pricing.sale_price : null,
    saleEnd: "",

    mpn: "",
    gtin: "",
    maxQtyPerOrder: null,

    subtitle: typeof meta?.subtitle === "string" ? meta.subtitle : "",
    promotionTitle:
      typeof meta?.promotionTitle === "string" ? meta.promotionTitle : "",

    hideQuantity: Boolean(stock?.hide_quantity ?? false),

    enableUploadImage: false,
    enableNote: true,

    productWithTax: true,
    taxReasonCode: "",

    tags: [],

    seoTitleTpl: "",
    seoSlugTpl: "",
    seoDescTpl: "",
  };
}

async function countProducts(storeId: string) {
  const sb = supabaseAdmin();

  const totalQ = sb
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId);

  const visibleQ = sb
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("status", "active");

  const hiddenQ = sb
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("status", "hidden");

  const withImageQ = sb
    .from("products")
    .select("id, product_media!inner(id)", { count: "exact", head: true })
    .eq("store_id", storeId);

  const [totalR, visibleR, hiddenR, withImageR] = await Promise.all([
    totalQ,
    visibleQ,
    hiddenQ,
    withImageQ,
  ]);

  const total = totalR.count ?? 0;
  const visible = visibleR.count ?? 0;
  const hidden = hiddenR.count ?? 0;
  const withImage = withImageR.count ?? 0;

  return {
    total,
    visible,
    hidden,
    withoutImage: Math.max(0, total - withImage),
  };
}

export async function GET(req: Request) {
  try {
    const storeId = await getStoreIdFromSession();
    const sb = supabaseAdmin();

    const url = new URL(req.url);
    const limit = clampLimit(url.searchParams.get("limit"));
    const cursor = parseCursor(url.searchParams.get("cursor"));
    const q = cleanSearch(url.searchParams.get("q"));
    const status = cleanSearch(url.searchParams.get("status"));
    const categoryId = cleanSearch(url.searchParams.get("categoryId"));

    const from = cursor;
    const to = cursor + limit - 1;

    const categoryJoin = categoryId
      ? "product_categories!inner ( category_id )"
      : "product_categories ( category_id )";

    let query: any = sb
      .from("products")
      .select(
        `
        id,
        store_id,
        name,
        status,
        metadata,
        created_at,
        product_pricing ( currency, price, sale_price ),
        product_stock ( quantity, unlimited_quantity, hide_quantity ),
        product_media ( id, original_url, is_default, sort_order ),
        ${categoryJoin}
      `,
        { count: "exact" },
      )
      .eq("store_id", storeId);

    if (q) {
      query = query.ilike("name", `%${q}%`);
    }

    if (
      status &&
      ["active", "draft", "hidden", "archived"].includes(status)
    ) {
      query = query.eq("status", status);
    }

    if (categoryId) {
      query = query.eq("product_categories.category_id", categoryId);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw new Error(error.message);

    const list = (data ?? []).map(normalizeProductListRow);
    const nextCursor = list.length === limit ? String(cursor + limit) : null;

    const stats = await countProducts(storeId);

    return NextResponse.json({
      data: list,
      page: {
        limit,
        cursor: String(cursor),
        nextCursor,
        hasMore: Boolean(nextCursor),
        count: count ?? list.length,
      },
      stats,
    });
  } catch (e: any) {
    const msg = e?.message ?? "Unknown error";

    return NextResponse.json(
      {
        error: msg,
        data: [],
        page: {
          limit: PRODUCTS_LIMIT_FALLBACK,
          cursor: "0",
          nextCursor: null,
          hasMore: false,
          count: 0,
        },
        stats: {
          total: 0,
          visible: 0,
          hidden: 0,
          withoutImage: 0,
        },
      },
      { status: msg === "UNAUTHENTICATED" ? 401 : 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const storeId = await getStoreIdFromSession();
    const body = await req.json().catch(() => ({}));

    const name = String(body?.name ?? "").trim() || "منتج جديد";
    const sb = supabaseAdmin();
    const storeDefaultCurrency = await getStoreDefaultCurrency(sb, storeId);

    const meta = {
      pinned: false,
      sku: "",
      brand: null,
      years: "",
      descriptionHtml: "",
      productSpecs: [],
      optionsEnabled: false,
      qtyUnlimited: false,
      options: [],
      variants: [],
      variants_price_min: null,
      variants_price_max: null,
      variants_price_label: null,
      variants_total_qty: 0,
      base_price_fallback: 0,
      base_qty_fallback: 0,
      channels: ["web", "app"],
      subtitle: "",
      promotionTitle: "",
    };

    const { data: created, error: e1 } = await sb
      .from("products")
      .insert({
        store_id: storeId,
        name,
        status: "draft",
        metadata: meta,
      })
      .select("id, store_id, name, status, metadata, created_at")
      .single();

    if (e1) throw new Error(e1.message);

    const pid = created.id as string;

    const { error: e2 } = await sb.from("product_pricing").upsert(
      {
        product_id: pid,
        currency: storeDefaultCurrency,
        price: 0,
        sale_price: 0,
        cost_price: 0,
      },
      { onConflict: "product_id" },
    );

    if (e2) throw new Error(e2.message);

    const { error: e3 } = await sb.from("product_stock").upsert(
      {
        product_id: pid,
        quantity: 0,
        unlimited_quantity: false,
        hide_quantity: false,
      },
      { onConflict: "product_id" },
    );

    if (e3) throw new Error(e3.message);

    const { data: full, error: e4 } = await sb
      .from("products")
      .select(
        `
        id,
        store_id,
        name,
        status,
        metadata,
        created_at,
        product_pricing ( currency, price, sale_price ),
        product_stock ( quantity, unlimited_quantity, hide_quantity ),
        product_media ( id, original_url, is_default, sort_order ),
        product_categories ( category_id )
      `,
      )
      .eq("id", pid)
      .single();

    if (e4) throw new Error(e4.message);

    return NextResponse.json(
      { data: normalizeProductListRow(full) },
      { status: 201 },
    );
  } catch (e: any) {
    const msg = e?.message ?? "Unknown error";

    return NextResponse.json(
      { error: msg },
      { status: msg === "UNAUTHENTICATED" ? 401 : 500 },
    );
  }
}