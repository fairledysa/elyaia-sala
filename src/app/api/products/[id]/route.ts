// FILE: apps/merchant/src/app/api/products/[id]/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";

/* -------------------------------- Helpers -------------------------------- */

const FALLBACK_CURRENCY = "SAR";

function firstRow<T>(x: T | T[] | null | undefined): T | null {
  if (!x) return null;
  return Array.isArray(x) ? (x[0] ?? null) : x;
}

function cleanText(x: unknown) {
  return String(x ?? "").trim();
}

function cleanCurrencyCode(x: unknown) {
  const code = cleanText(x).toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : "";
}

function cleanAlt(x: unknown) {
  return cleanText(x).replace(/\s+/g, " ").slice(0, 160);
}

function uniqStrArr(x: unknown): string[] {
  if (!Array.isArray(x)) return [];

  const out: string[] = [];
  const seen = new Set<string>();

  for (const v of x) {
    const s = cleanText(v);
    if (!s) continue;
    if (s === "null" || s === "undefined") continue;
    if (seen.has(s)) continue;

    seen.add(s);
    out.push(s);
  }

  return out;
}

function toNumOrNull(x: unknown): number | null {
  if (x === null) return null;
  if (x === undefined) return null;
  if (typeof x === "number") return Number.isFinite(x) ? x : null;

  const s = cleanText(x);
  if (!s) return null;

  const cleaned = s.replace(/[^\d.]/g, "");
  if (!cleaned) return null;

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function toBoolOrNull(x: unknown): boolean | null {
  if (x === null) return null;
  if (x === undefined) return null;
  if (typeof x === "boolean") return x;

  if (typeof x === "string") {
    const v = x.trim().toLowerCase();

    if (v === "true" || v === "1" || v === "yes") return true;
    if (v === "false" || v === "0" || v === "no") return false;
  }

  return null;
}

function makeVariantsPriceLabel(min: number | null, max: number | null) {
  if (min == null || max == null) return null;
  return min === max ? `السعر: ${min}` : `السعر: ${min} - ${max}`;
}

function computeVariantsSummary(variants: any[]) {
  const rows = Array.isArray(variants) ? variants : [];

  const prices = rows
    .map((v) => {
      const n = Number(v?.price);
      return Number.isFinite(n) && n > 0 ? n : null;
    })
    .filter((x): x is number => x !== null);

  const qtyTotal = rows.reduce((acc, v) => {
    const q = Number(v?.qty);
    return acc + (Number.isFinite(q) ? Math.max(0, q) : 0);
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

function normalizeProductSpecs(value: any) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item: any, index: number) => ({
      id: cleanText(item?.id ?? `spec-${index + 1}`),
      name: cleanText(item?.name ?? item?.title ?? item?.label ?? ""),
      value: cleanText(item?.value ?? item?.description ?? item?.text ?? ""),
    }))
    .filter((item: any) => item.name && item.value);
}

/* -------------------------- Auth → store_id helper ------------------------- */

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

  if (!auth.user?.id) {
    throw new Error("UNAUTHENTICATED");
  }

  const sb = supabaseAdmin();

  const byAuth = await sb
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (byAuth.error) {
    throw new Error(byAuth.error.message);
  }

  if (byAuth.data?.store_id) {
    return byAuth.data.store_id as string;
  }

  const email = cleanText(auth.user.email).toLowerCase();

  if (email) {
    const byEmail = await sb
      .from("store_users")
      .select("store_id")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (byEmail.error) {
      throw new Error(byEmail.error.message);
    }

    if (byEmail.data?.store_id) {
      return byEmail.data.store_id as string;
    }
  }

  throw new Error("STORE_NOT_FOUND");
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

/* ------------------------------ Normalization ------------------------------ */

function normalizeProductRow(p: any) {
  const pricing = firstRow<any>(p?.product_pricing);
  const stock = firstRow<any>(p?.product_stock);
  const ship = firstRow<any>(p?.product_shipping);
  const metaRow = firstRow<any>(p?.product_metadata);

  const media = Array.isArray(p?.product_media) ? p.product_media : [];

  const images = media
    .slice()
    .sort(
      (a: any, b: any) =>
        Number(a?.sort_order ?? 0) - Number(b?.sort_order ?? 0),
    )
    .map((m: any, idx: number) => ({
      id: String(m?.id ?? `db-${idx}`),
      url: cleanText(m?.original_url),
      alt: cleanAlt(m?.alt),
      is_primary: Boolean(m?.is_default ?? false),
      sort_order: Number(m?.sort_order ?? idx),
    }))
    .filter((x: any) => x.url);

  const imageUrl =
    images.find((x: any) => x.is_primary)?.url || images[0]?.url || "";

  const meta = (p?.metadata ?? {}) as any;

  const cats = Array.isArray(p?.product_categories) ? p.product_categories : [];

  const taxonIds: string[] = cats
    .map((x: any) => x?.category_id)
    .filter(Boolean)
    .map((x: any) => String(x));

  const taxonNames: string[] = cats
    .map((x: any) => x?.categories?.name)
    .filter(Boolean)
    .map((x: any) => String(x));

  const tagLinks = Array.isArray(p?.product_tag_links)
    ? p.product_tag_links
    : [];

  const tags: string[] = tagLinks
    .map((x: any) => x?.product_tags?.name)
    .filter(Boolean)
    .map((x: any) => String(x));

  const brandName = p?.brands?.name ? String(p.brands.name) : null;

  const optionsEnabled = Boolean(meta?.optionsEnabled ?? false);

  const qtyUnlimited =
    Boolean(meta?.qtyUnlimited ?? false) ||
    Boolean(stock?.unlimited_quantity ?? false);

  const stockQty = Number(stock?.quantity ?? 0);

  const metaBaseQty =
    typeof meta?.base_qty_fallback === "number"
      ? meta.base_qty_fallback
      : stockQty;

  const displayBaseQty = optionsEnabled ? metaBaseQty : stockQty;

  const productSpecs = normalizeProductSpecs(meta?.productSpecs);
  const currency = cleanCurrencyCode(pricing?.currency) || FALLBACK_CURRENCY;

  return {
    id: String(p.id),
    name: String(p.name ?? ""),
    status: String(p.status ?? "draft"),
    pinned: Boolean(meta?.pinned ?? false),

    imageUrl,
    images,

    price: Number(pricing?.price ?? 0),
    currency,
    currency_code: currency,
    currencyCode: currency,

    qty: stockQty,
    variants_price_min:
      typeof meta?.variants_price_min === "number"
        ? meta.variants_price_min
        : null,
    variants_price_max:
      typeof meta?.variants_price_max === "number"
        ? meta.variants_price_max
        : null,
    variants_price_label:
      typeof meta?.variants_price_label === "string"
        ? meta.variants_price_label
        : null,
    variants_total_qty:
      typeof meta?.variants_total_qty === "number"
        ? meta.variants_total_qty
        : 0,
    base_price_fallback:
      typeof meta?.base_price_fallback === "number"
        ? meta.base_price_fallback
        : Number(pricing?.price ?? 0),
    base_qty_fallback: displayBaseQty,

    sku: meta?.sku ?? "",
    years: meta?.years ?? "",
    descriptionHtml: meta?.descriptionHtml ?? "",

    productSpecs,
    specs: productSpecs,

    brand: brandName,

    taxonIds,
    taxonNames,

    optionsEnabled,
    options: Array.isArray(meta?.options) ? meta.options : [],
    variants: Array.isArray(meta?.variants) ? meta.variants : [],
    qtyUnlimited,

    requireShipping: Boolean(p?.require_shipping ?? true),
    weight: Number(ship?.weight ?? 0),
    weightUnit: (ship?.weight_unit as any) ?? "kg",

    costPrice: pricing?.cost_price ?? null,
    salePrice: pricing?.sale_price ?? null,
    saleEnd: pricing?.sale_end ?? "",
    showSaleCountdown: Boolean(meta?.showSaleCountdown ?? false),

    mpn: meta?.mpn ?? "",
    gtin: meta?.gtin ?? "",

    maxQtyPerOrder: stock?.maximum_quantity_per_order ?? null,
    subtitle: meta?.subtitle ?? "",
    promotionTitle: meta?.promotionTitle ?? "",

    hideQuantity: Boolean(stock?.hide_quantity ?? false),
    channels: Array.isArray(meta?.channels) ? meta.channels : ["web", "app"],

    enableUploadImage: Boolean(meta?.enableUploadImage ?? false),
    enableNote: Boolean(meta?.enableNote ?? true),

    productWithTax: Boolean(pricing?.with_tax ?? true),
    taxReasonCode: pricing?.tax_reason_code ?? "",

    tags,

    seoTitleTpl: metaRow?.title ?? "",
    seoDescTpl: metaRow?.description ?? "",
    seoSlugTpl: metaRow?.url ?? "",
  };
}

/* ------------------------------- DB Readers -------------------------------- */

async function readFull(
  sb: ReturnType<typeof supabaseAdmin>,
  storeId: string,
  id: string,
) {
  const { data, error } = await sb
    .from("products")
    .select(
      `
      id,
      store_id,
      name,
      status,
      description,
      require_shipping,
      brand_id,
      metadata,
      created_at,
      updated_at,

      brands ( id, name ),

      product_pricing ( currency, price, sale_price, cost_price, sale_start, sale_end, with_tax, tax_reason_code ),
      product_stock ( quantity, unlimited_quantity, hide_quantity, maximum_quantity_per_order, notify_low ),
      product_shipping ( weight, weight_unit ),

      product_media ( id, original_url, alt, is_default, sort_order ),

      product_categories (
        category_id,
        categories ( name )
      ),

      product_tag_links (
        tag_id,
        product_tags ( name )
      ),

      product_metadata ( title, description, url )
    `,
    )
    .eq("store_id", storeId)
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);

  return data;
}

/* ------------------------------ Brand handling ----------------------------- */

async function resolveBrandId(
  sb: ReturnType<typeof supabaseAdmin>,
  storeId: string,
  brandNameRaw: unknown,
): Promise<string | null> {
  if (brandNameRaw === null) return null;

  const name = cleanText(brandNameRaw);
  if (!name) return null;

  const { data: found, error: fErr } = await sb
    .from("brands")
    .select("id,name")
    .eq("store_id", storeId)
    .ilike("name", name)
    .limit(1);

  if (fErr) throw new Error(fErr.message);
  if (found?.[0]?.id) return String(found[0].id);

  const { data: created, error: cErr } = await sb
    .from("brands")
    .insert({ store_id: storeId, name })
    .select("id")
    .single();

  if (cErr) throw new Error(cErr.message);

  return created?.id ? String(created.id) : null;
}

/* ------------------------------ Tags handling ------------------------------ */

async function setProductTags(
  sb: ReturnType<typeof supabaseAdmin>,
  storeId: string,
  productId: string,
  tagsInput: unknown,
) {
  const tags = uniqStrArr(tagsInput).slice(0, 50);

  const { error: delErr } = await sb
    .from("product_tag_links")
    .delete()
    .eq("product_id", productId);

  if (delErr) throw new Error(delErr.message);
  if (!tags.length) return;

  const { data: existing, error: exErr } = await sb
    .from("product_tags")
    .select("id,name")
    .eq("store_id", storeId)
    .in("name", tags);

  if (exErr) throw new Error(exErr.message);

  const map = new Map<string, string>();

  for (const r of existing ?? []) {
    if (!r?.name || !r?.id) continue;
    map.set(String(r.name), String(r.id));
  }

  const missing = tags.filter((t) => !map.has(t));

  if (missing.length) {
    const { data: inserted, error: insErr } = await sb
      .from("product_tags")
      .insert(missing.map((name) => ({ store_id: storeId, name })))
      .select("id,name");

    if (insErr) throw new Error(insErr.message);

    for (const r of inserted ?? []) {
      if (!r?.name || !r?.id) continue;
      map.set(String(r.name), String(r.id));
    }
  }

  const tagIds = tags.map((t) => map.get(t)).filter(Boolean) as string[];
  if (!tagIds.length) return;

  const { error: linkErr } = await sb.from("product_tag_links").insert(
    tagIds.map((tag_id) => ({
      product_id: productId,
      tag_id,
    })),
  );

  if (linkErr) throw new Error(linkErr.message);
}

/* --------------------------------- Routes --------------------------------- */

export async function GET(
  _: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const storeId = await getStoreIdFromSession();
    const sb = supabaseAdmin();

    const full = await readFull(sb, storeId, id);

    return NextResponse.json({
      data: normalizeProductRow(full),
    });
  } catch (e: any) {
    const msg = e?.message ?? "Unknown error";

    return NextResponse.json(
      { error: msg },
      { status: msg === "UNAUTHENTICATED" ? 401 : 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const storeId = await getStoreIdFromSession();
    const body = await req.json().catch(() => ({}));
    const sb = supabaseAdmin();

    const storeDefaultCurrency = await getStoreDefaultCurrency(sb, storeId);
    const existing = await readFull(sb, storeId, id);
    const currentMeta = (existing?.metadata ?? {}) as any;

    const productsUpdates: any = {};
    const metaPatch: any = { ...currentMeta };

    const incomingPriceValue =
      body.price !== undefined ? body.price : body.base_price_fallback;

    const incomingQtyValue =
      body.qty !== undefined ? body.qty : body.base_qty_fallback;

    const metaPriceNum = toNumOrNull(incomingPriceValue);
    const metaQtyNum = toNumOrNull(incomingQtyValue);

    if (typeof body.name === "string" && body.name.trim()) {
      productsUpdates.name = body.name.trim();
    }

    if (typeof body.status === "string") {
      productsUpdates.status = body.status;
    }

    if (typeof body.requireShipping === "boolean") {
      productsUpdates.require_shipping = body.requireShipping;
    }

    if (body.brand === null || typeof body.brand === "string") {
      const brandId = await resolveBrandId(sb, storeId, body.brand);
      productsUpdates.brand_id = brandId;
    }

    if (typeof body.pinned === "boolean") metaPatch.pinned = body.pinned;
    if (typeof body.sku === "string") metaPatch.sku = body.sku.trim();
    if (typeof body.years === "string") metaPatch.years = body.years.trim();

    if (typeof body.descriptionHtml === "string") {
      metaPatch.descriptionHtml = body.descriptionHtml;
    }

    if (Array.isArray(body.productSpecs)) {
      metaPatch.productSpecs = normalizeProductSpecs(body.productSpecs);
    }

    if (typeof body.mpn === "string") metaPatch.mpn = body.mpn.trim();
    if (typeof body.gtin === "string") metaPatch.gtin = body.gtin.trim();
    if (typeof body.subtitle === "string") metaPatch.subtitle = body.subtitle;

    if (typeof body.promotionTitle === "string") {
      metaPatch.promotionTitle = body.promotionTitle;
    }

    if (typeof body.showSaleCountdown === "boolean") {
      metaPatch.showSaleCountdown = body.showSaleCountdown;
    }

    if (typeof body.optionsEnabled === "boolean") {
      metaPatch.optionsEnabled = body.optionsEnabled;
    }

    if (typeof body.qtyUnlimited === "boolean") {
      metaPatch.qtyUnlimited = body.qtyUnlimited;
    }

    if (metaPriceNum !== null) {
      metaPatch.base_price_fallback = metaPriceNum;
    }

    if (metaQtyNum !== null) {
      metaPatch.base_qty_fallback = Math.max(0, Math.floor(metaQtyNum));
    }

    if (Array.isArray(body.options)) {
      metaPatch.options = body.options;
    }

    if (Array.isArray(body.variants)) {
      metaPatch.variants = body.variants;

      const summary = computeVariantsSummary(body.variants);

      metaPatch.variants_price_min = summary.variants_price_min;
      metaPatch.variants_price_max = summary.variants_price_max;
      metaPatch.variants_price_label = summary.variants_price_label;
      metaPatch.variants_total_qty = summary.variants_total_qty;
    }

    if (Array.isArray(body.channels)) {
      const nextChannels = body.channels.filter(
        (x: any) => x === "web" || x === "app",
      );

      metaPatch.channels = nextChannels;

      if (typeof body.status !== "string") {
        productsUpdates.status = nextChannels.length > 0 ? "active" : "hidden";
      }
    }

    if (typeof body.enableUploadImage === "boolean") {
      metaPatch.enableUploadImage = body.enableUploadImage;
    }

    if (typeof body.enableNote === "boolean") {
      metaPatch.enableNote = body.enableNote;
    }

    productsUpdates.metadata = metaPatch;

    const { error: prodErr } = await sb
      .from("products")
      .update(productsUpdates)
      .eq("store_id", storeId)
      .eq("id", id);

    if (prodErr) throw new Error(prodErr.message);

    const productAltText =
      cleanAlt(productsUpdates.name) || cleanAlt(existing?.name) || null;

    const existingPricing = firstRow<any>(existing?.product_pricing);
    const existingPricingCurrency =
      cleanCurrencyCode(existingPricing?.currency) || storeDefaultCurrency;

    const priceNum = metaPriceNum;
    const costNum = toNumOrNull(body.costPrice);
    const saleNum = toNumOrNull(body.salePrice);
    const saleEnd =
      typeof body.saleEnd === "string" ? body.saleEnd.trim() : undefined;

    const withTax = toBoolOrNull(body.productWithTax);
    const taxReason =
      typeof body.taxReasonCode === "string" ? body.taxReasonCode.trim() : "";

    const pricingTouched =
      priceNum !== null ||
      costNum !== null ||
      saleNum !== null ||
      saleEnd !== undefined ||
      withTax !== null ||
      typeof body.taxReasonCode === "string";

    const pricingCurrencyMismatch =
      existingPricingCurrency !== storeDefaultCurrency;

    if (pricingTouched || pricingCurrencyMismatch) {
      const upRow: any = {
        product_id: id,
        currency: storeDefaultCurrency,
        price:
          priceNum !== null ? priceNum : Number(existingPricing?.price ?? 0),
        cost_price:
          costNum !== null ? costNum : Number(existingPricing?.cost_price ?? 0),
        sale_price:
          saleNum !== null ? saleNum : Number(existingPricing?.sale_price ?? 0),
        sale_start: existingPricing?.sale_start ?? null,
        sale_end:
          saleEnd !== undefined
            ? saleEnd || null
            : (existingPricing?.sale_end ?? null),
        with_tax:
          withTax !== null
            ? withTax
            : Boolean(existingPricing?.with_tax ?? true),
        tax_reason_code:
          withTax === false ||
          (withTax === null && existingPricing?.with_tax === false)
            ? taxReason || existingPricing?.tax_reason_code || null
            : null,
      };

      const { error: pErr } = await sb
        .from("product_pricing")
        .upsert(upRow, { onConflict: "product_id" });

      if (pErr) throw new Error(pErr.message);
    }

    const existingStock = firstRow<any>(existing?.product_stock);
    const qtyNum = metaQtyNum;
    const maxQtyNum =
      body.maxQtyPerOrder === null ? null : toNumOrNull(body.maxQtyPerOrder);
    const hideQtyBool = toBoolOrNull(body.hideQuantity);
    const unlimitedQtyBool = toBoolOrNull(body.qtyUnlimited);

    if (
      qtyNum !== null ||
      body.maxQtyPerOrder !== undefined ||
      hideQtyBool !== null ||
      unlimitedQtyBool !== null
    ) {
      const upRow: any = {
        product_id: id,
        quantity:
          qtyNum !== null
            ? Math.max(0, Math.floor(qtyNum))
            : Number(existingStock?.quantity ?? 0),
        unlimited_quantity:
          unlimitedQtyBool !== null
            ? unlimitedQtyBool
            : Boolean(existingStock?.unlimited_quantity ?? false),
        hide_quantity:
          hideQtyBool !== null
            ? hideQtyBool
            : Boolean(existingStock?.hide_quantity ?? false),
        maximum_quantity_per_order:
          body.maxQtyPerOrder === undefined
            ? (existingStock?.maximum_quantity_per_order ?? null)
            : maxQtyNum,
      };

      const { error: sErr } = await sb
        .from("product_stock")
        .upsert(upRow, { onConflict: "product_id" });

      if (sErr) throw new Error(sErr.message);
    }

    const weightNum = toNumOrNull(body.weight);
    const weightUnit =
      typeof body.weightUnit === "string" ? body.weightUnit : undefined;

    if (weightNum !== null || weightUnit !== undefined) {
      const existingShip = firstRow<any>(existing?.product_shipping);

      const upRow: any = {
        product_id: id,
        weight:
          weightNum !== null ? weightNum : Number(existingShip?.weight ?? 0),
        weight_unit:
          weightUnit !== undefined
            ? weightUnit
            : (existingShip?.weight_unit ?? "kg"),
      };

      const { error: shErr } = await sb
        .from("product_shipping")
        .upsert(upRow, { onConflict: "product_id" });

      if (shErr) throw new Error(shErr.message);
    }

    if (
      typeof body.seoTitleTpl === "string" ||
      typeof body.seoDescTpl === "string" ||
      typeof body.seoSlugTpl === "string"
    ) {
      const existingSeo = firstRow<any>(existing?.product_metadata);

      const upRow: any = {
        product_id: id,
        title:
          typeof body.seoTitleTpl === "string"
            ? body.seoTitleTpl.trim()
            : (existingSeo?.title ?? null),
        description:
          typeof body.seoDescTpl === "string"
            ? body.seoDescTpl.trim()
            : (existingSeo?.description ?? null),
        url:
          typeof body.seoSlugTpl === "string"
            ? body.seoSlugTpl.trim()
            : (existingSeo?.url ?? null),
      };

      const { error: seoErr } = await sb
        .from("product_metadata")
        .upsert(upRow, { onConflict: "product_id" });

      if (seoErr) throw new Error(seoErr.message);
    }

    if (Array.isArray(body.images)) {
      const raw = body.images as any[];

      const cleaned = raw
        .map((x, idx) => ({
          url: cleanText(x?.url),
          alt: cleanAlt(x?.alt),
          is_primary: Boolean(x?.is_primary ?? false),
          sort_order: Number.isFinite(Number(x?.sort_order))
            ? Number(x.sort_order)
            : idx,
        }))
        .filter((x) => x.url);

      cleaned.sort((a, b) => a.sort_order - b.sort_order);

      if (cleaned.length && !cleaned.some((x) => x.is_primary)) {
        cleaned[0].is_primary = true;
      }

      if (cleaned.length) {
        let seen = false;

        for (const it of cleaned) {
          if (!it.is_primary) continue;

          if (!seen) {
            seen = true;
          } else {
            it.is_primary = false;
          }
        }
      }

      const { error: delErr } = await sb
        .from("product_media")
        .delete()
        .eq("store_id", storeId)
        .eq("product_id", id);

      if (delErr) throw new Error(delErr.message);

      if (cleaned.length) {
        const rows = cleaned.map((img, idx) => ({
          store_id: storeId,
          product_id: id,
          media_kind: "image",
          original_url: img.url,
          thumbnail_url: null,
          alt: img.alt || productAltText,
          video_url: null,
          is_default: img.is_primary,
          sort_order: idx,
        }));

        const { error: insErr } = await sb.from("product_media").insert(rows);

        if (insErr) throw new Error(insErr.message);
      }
    }

    if (typeof body.imageUrl === "string" && !Array.isArray(body.images)) {
      const url = cleanText(body.imageUrl);

      const { error: unsetErr } = await sb
        .from("product_media")
        .update({ is_default: false })
        .eq("store_id", storeId)
        .eq("product_id", id);

      if (unsetErr) throw new Error(unsetErr.message);

      if (url) {
        const { error: insErr } = await sb.from("product_media").insert({
          store_id: storeId,
          product_id: id,
          media_kind: "image",
          original_url: url,
          thumbnail_url: null,
          alt: productAltText,
          video_url: null,
          is_default: true,
          sort_order: 0,
        });

        if (insErr) throw new Error(insErr.message);
      }
    }

    if (Array.isArray(body.taxonIds)) {
      const nextIds: string[] = Array.from(
        new Set(
          (body.taxonIds as unknown[])
            .map((x) => String(x))
            .filter((x) => x && x !== "null" && x !== "undefined"),
        ),
      );

      const { error: delErr } = await sb
        .from("product_categories")
        .delete()
        .eq("product_id", id);

      if (delErr) throw new Error(delErr.message);

      if (nextIds.length) {
        const rows = nextIds.map((category_id: string, idx: number) => ({
          product_id: id,
          category_id,
          is_primary: idx === 0,
        }));

        const { error: insErr } = await sb
          .from("product_categories")
          .insert(rows);

        if (insErr) throw new Error(insErr.message);
      }
    }

    if (Array.isArray(body.tags)) {
      await setProductTags(sb, storeId, id, body.tags);
    }

    const full = await readFull(sb, storeId, id);

    return NextResponse.json({
      data: normalizeProductRow(full),
    });
  } catch (e: any) {
    const msg = e?.message ?? "Unknown error";

    return NextResponse.json(
      { error: msg },
      { status: msg === "UNAUTHENTICATED" ? 401 : 500 },
    );
  }
}

export async function DELETE(
  _: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const storeId = await getStoreIdFromSession();
    const sb = supabaseAdmin();

    const variants = await sb
      .from("product_variants")
      .select("id")
      .eq("product_id", id);

    const variantIds = variants.data?.map((r: any) => r.id).filter(Boolean) ?? [];

    if (variantIds.length) {
      await sb
        .from("variant_option_values")
        .delete()
        .in("variant_id", variantIds);
    }

    const options = await sb
      .from("product_options")
      .select("id")
      .eq("product_id", id);

    const optionIds = options.data?.map((r: any) => r.id).filter(Boolean) ?? [];

    if (optionIds.length) {
      await sb
        .from("product_option_values")
        .delete()
        .in("option_id", optionIds);
    }

    await sb.from("product_options").delete().eq("product_id", id);
    await sb.from("product_variants").delete().eq("product_id", id);

    await sb
      .from("product_media")
      .delete()
      .eq("store_id", storeId)
      .eq("product_id", id);

    await sb.from("product_categories").delete().eq("product_id", id);
    await sb.from("product_channels").delete().eq("product_id", id);

    await sb.from("product_tag_links").delete().eq("product_id", id);
    await sb.from("product_shipping").delete().eq("product_id", id);

    await sb.from("product_metadata").delete().eq("product_id", id);
    await sb.from("product_translations").delete().eq("product_id", id);

    await sb.from("product_scoped_prices").delete().eq("product_id", id);
    await sb.from("product_stock").delete().eq("product_id", id);
    await sb.from("product_pricing").delete().eq("product_id", id);

    const { error } = await sb
      .from("products")
      .delete()
      .eq("store_id", storeId)
      .eq("id", id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message ?? "Unknown error";

    return NextResponse.json(
      { error: msg },
      { status: msg === "UNAUTHENTICATED" ? 401 : 500 },
    );
  }
}