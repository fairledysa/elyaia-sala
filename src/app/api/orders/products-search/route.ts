import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function s(x: any) {
  return String(x ?? "").trim();
}

function n(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function firstRow<T>(x: T | T[] | null | undefined): T | null {
  if (!x) return null;
  return Array.isArray(x) ? (x[0] ?? null) : x;
}

async function resolveStoreId() {
  const sb = await supabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) return null;

  const { data: storeUser } = await sb
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", user.id)
    .single();

  return storeUser?.store_id ?? null;
}

function normalizeOptionValues(values: any[]) {
  return (Array.isArray(values) ? values : []).map((value: any) => ({
    id: s(value?.id) || null,
    name: s(value?.name) || null,
    extra_price: value?.extra_price != null ? n(value.extra_price) : 0,
    quantity: value?.quantity != null ? n(value.quantity) : 0,
    is_default: Boolean(value?.is_default),
    image_url: s(value?.image_url) || null,
    display_value:
      s(value?.display_value) || s(value?.displayValue) || null,
  }));
}

function normalizeOptions(options: any[]) {
  return (Array.isArray(options) ? options : []).map((option: any) => ({
    id: s(option?.id) || null,
    name: s(option?.name) || null,
    is_required: Boolean(option?.is_required),
    option_field_type: s(option?.option_field_type) || null,
    display_type: s(option?.display_type) || null,
    values: normalizeOptionValues(option?.values),
  }));
}

function buildVariantValuesFromSelections(selections: any[]) {
  return (Array.isArray(selections) ? selections : [])
    .map((row: any) => ({
      option_id: s(row?.optionId || row?.option_id) || null,
      option_name:
        s(row?.optionName || row?.option_name || row?.name) || null,
      value_id: s(row?.valueId || row?.value_id || row?.id) || null,
      value_name:
        s(
          row?.value ||
            row?.value_name ||
            row?.display_value ||
            row?.displayValue ||
            row?.label
        ) || null,
    }))
    .filter(
      (row: any) =>
        row.option_id || row.option_name || row.value_id || row.value_name
    );
}

function buildVariantValuesFromOptions(optionValueIds: string[], options: any[]) {
  const rows: any[] = [];

  for (const option of Array.isArray(options) ? options : []) {
    const optionId = s(option?.id);
    const optionName = s(option?.name);
    const values = Array.isArray(option?.values) ? option.values : [];

    for (const value of values) {
      const valueId = s(value?.id);
      if (!valueId) continue;
      if (!optionValueIds.includes(valueId)) continue;

      rows.push({
        option_id: optionId || null,
        option_name: optionName || null,
        value_id: valueId,
        value_name:
          s(value?.name) ||
          s(value?.display_value) ||
          s(value?.displayValue) ||
          null,
      });
    }
  }

  return rows;
}

function normalizeMetaVariant(variant: any, index: number, options: any[]) {
  const optionValueIds = Array.isArray(variant?.option_value_ids)
    ? variant.option_value_ids.map((x: any) => s(x)).filter(Boolean)
    : [];

  const selectionsValues = buildVariantValuesFromSelections(variant?.selections);

  let values = Array.isArray(variant?.values)
    ? variant.values
        .map((row: any) => ({
          option_id: s(row?.option_id || row?.optionId) || null,
          option_name: s(row?.option_name || row?.optionName) || null,
          value_id: s(row?.value_id || row?.valueId) || null,
          value_name:
            s(
              row?.value_name ||
                row?.value ||
                row?.display_value ||
                row?.displayValue
            ) || null,
        }))
        .filter((row: any) => row.value_id || row.value_name)
    : [];

  if (values.length === 0 && selectionsValues.length > 0) {
    values = selectionsValues;
  }

  if (values.length === 0 && optionValueIds.length > 0) {
    values = buildVariantValuesFromOptions(optionValueIds, options);
  }

  const optionValueNames =
    Array.isArray(variant?.option_value_names) &&
    variant.option_value_names.length > 0
      ? variant.option_value_names.map((x: any) => s(x)).filter(Boolean)
      : values.map((row: any) => s(row?.value_name)).filter(Boolean);

  const inferredOptionValueIds =
    optionValueIds.length > 0
      ? optionValueIds
      : values.map((row: any) => s(row?.value_id)).filter(Boolean);

  return {
    id: s(variant?.id) || null,
    sku: s(variant?.sku) || "",
    barcode: s(variant?.barcode) || "",
    price: n(variant?.price),
    sale_price: n(variant?.sale_price),
    qty: variant?.qty != null ? n(variant?.qty) : 0,
    qtyUnlimited: Boolean(
      variant?.qtyUnlimited ?? variant?.unlimited_quantity ?? false
    ),
    weight: variant?.weight != null ? n(variant?.weight) : null,
    weightUnit: s(variant?.weightUnit || variant?.weight_unit || ""),
    option_value_ids: inferredOptionValueIds,
    option_value_names: optionValueNames,
    values,
    is_default: Boolean(variant?.is_default ?? index === 0),
  };
}

export async function GET(req: NextRequest) {
  try {
    const storeId = await resolveStoreId();

    if (!storeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const q = s(req.nextUrl.searchParams.get("q"));
    const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? 20);
    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 50) : 20;

    if (!q || q.length < 2) {
      return NextResponse.json({ rows: [] }, { status: 200 });
    }

    const admin = supabaseAdmin();

    const { data: productsRaw, error: productsError } = await admin
      .from("products")
      .select(
        `
        id,
        store_id,
        name,
        status,
        metadata,
        created_at,
        updated_at,
        product_pricing ( price, sale_price, cost_price ),
        product_stock ( quantity, unlimited_quantity, hide_quantity, maximum_quantity_per_order ),
        product_shipping ( weight, weight_unit )
      `
      )
      .eq("store_id", storeId)
      .neq("status", "deleted")
      .order("created_at", { ascending: false })
      .limit(limit * 3);

    if (productsError) {
      return NextResponse.json(
        { error: productsError.message },
        { status: 500 }
      );
    }

    const products = Array.isArray(productsRaw) ? productsRaw : [];
    const productIds = products.map((p) => p.id).filter(Boolean);

    if (productIds.length === 0) {
      return NextResponse.json({ rows: [] }, { status: 200 });
    }

    const [
      { data: variantsRaw, error: variantsError },
      { data: mediaRaw, error: mediaError },
    ] = await Promise.all([
      admin
        .from("product_variants")
        .select(
          `
          id,
          product_id,
          sku,
          barcode,
          price,
          sale_price,
          stock_quantity,
          unlimited_quantity,
          weight,
          weight_unit,
          is_default,
          created_at,
          updated_at
        `
        )
        .in("product_id", productIds)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true }),

      admin
        .from("product_media")
        .select(
          `
          id,
          product_id,
          original_url,
          thumbnail_url,
          is_default,
          sort_order
        `
        )
        .eq("store_id", storeId)
        .in("product_id", productIds)
        .order("is_default", { ascending: false })
        .order("sort_order", { ascending: true }),
    ]);

    if (variantsError) {
      return NextResponse.json(
        { error: variantsError.message },
        { status: 500 }
      );
    }

    if (mediaError) {
      return NextResponse.json(
        { error: mediaError.message },
        { status: 500 }
      );
    }

    const variants = Array.isArray(variantsRaw) ? variantsRaw : [];
    const media = Array.isArray(mediaRaw) ? mediaRaw : [];

    const variantsByProduct = new Map<string, any[]>();
    for (const variant of variants) {
      const productId = s(variant?.product_id);
      if (!productId) continue;

      const bucket = variantsByProduct.get(productId) ?? [];
      bucket.push(variant);
      variantsByProduct.set(productId, bucket);
    }

    const firstMediaByProduct = new Map<string, any>();
    for (const item of media) {
      const productId = s(item?.product_id);
      if (!productId) continue;

      if (!firstMediaByProduct.has(productId)) {
        firstMediaByProduct.set(productId, item);
      }
    }

    const lowerQ = q.toLowerCase();

    const rows = products
      .map((product) => {
        const productId = s(product?.id);
        const meta = (product?.metadata ?? {}) as any;

        const pricing = firstRow<any>(product?.product_pricing);
        const stock = firstRow<any>(product?.product_stock);
        const shipping = firstRow<any>(product?.product_shipping);

        const productVariantsDb = variantsByProduct.get(productId) ?? [];
        const metaVariants = Array.isArray(meta?.variants) ? meta.variants : [];

        const defaultVariantDb =
          productVariantsDb.find((v) => v?.is_default === true) ??
          productVariantsDb[0] ??
          null;

        const image = firstMediaByProduct.get(productId) ?? null;

        const optionsEnabled = Boolean(meta?.optionsEnabled ?? false);
        const options = normalizeOptions(meta?.options);

        const qtyUnlimited =
          Boolean(meta?.qtyUnlimited ?? false) ||
          Boolean(stock?.unlimited_quantity ?? false);

        const basePriceFallback =
          typeof meta?.base_price_fallback === "number"
            ? meta.base_price_fallback
            : n(pricing?.price);

        const baseQtyFallback =
          typeof meta?.base_qty_fallback === "number"
            ? meta.base_qty_fallback
            : n(stock?.quantity);

        const price =
          n(defaultVariantDb?.sale_price) > 0
            ? n(defaultVariantDb?.sale_price)
            : n(defaultVariantDb?.price) > 0
            ? n(defaultVariantDb?.price)
            : typeof meta?.variants_price_min === "number"
            ? n(meta?.variants_price_min)
            : n(pricing?.sale_price) > 0
            ? n(pricing?.sale_price)
            : n(pricing?.price);

        const salePrice =
          n(defaultVariantDb?.sale_price) > 0
            ? n(defaultVariantDb?.sale_price)
            : n(pricing?.sale_price);

        const normalizedVariants =
          metaVariants.length > 0
            ? metaVariants.map((variant: any, index: number) =>
                normalizeMetaVariant(variant, index, options)
              )
            : productVariantsDb.map((variant: any) => ({
                id: s(variant?.id) || null,
                sku: s(variant?.sku) || "",
                barcode: s(variant?.barcode) || "",
                price: n(variant?.price),
                sale_price: n(variant?.sale_price),
                qty:
                  variant?.stock_quantity != null
                    ? n(variant?.stock_quantity)
                    : 0,
                qtyUnlimited: Boolean(variant?.unlimited_quantity),
                weight: variant?.weight != null ? n(variant?.weight) : null,
                weightUnit: s(variant?.weight_unit),
                option_value_ids: [],
                option_value_names: [],
                values: [],
                is_default: Boolean(variant?.is_default),
              }));

        return {
          id: productId,
          name: s(product?.name) || "منتج",
          sku: s(defaultVariantDb?.sku) || s(meta?.sku) || "",
          image_url: s(image?.thumbnail_url) || s(image?.original_url) || null,

          optionsEnabled,
          options,
          variants: normalizedVariants,

          qtyUnlimited,
          qty: n(stock?.quantity),
          hideQuantity: Boolean(stock?.hide_quantity ?? false),
          maximum_quantity_per_order:
            stock?.maximum_quantity_per_order != null
              ? n(stock?.maximum_quantity_per_order)
              : null,

          price,
          sale_price: salePrice,
          base_price_fallback: basePriceFallback,
          base_qty_fallback: baseQtyFallback,

          weight: shipping?.weight != null ? n(shipping?.weight) : 0,
          weightUnit: s(shipping?.weight_unit) || "kg",
        };
      })
      .filter((row) => {
        if (row.name.toLowerCase().includes(lowerQ)) return true;
        if (row.sku.toLowerCase().includes(lowerQ)) return true;

        if (
          Array.isArray(row.variants) &&
          row.variants.some(
            (v) =>
              s(v?.sku).toLowerCase().includes(lowerQ) ||
              s(v?.barcode).toLowerCase().includes(lowerQ) ||
              (Array.isArray(v?.option_value_names) &&
                v.option_value_names.some((name: any) =>
                  s(name).toLowerCase().includes(lowerQ)
                )) ||
              (Array.isArray(v?.values) &&
                v.values.some(
                  (val: any) =>
                    s(val?.option_name).toLowerCase().includes(lowerQ) ||
                    s(val?.value_name).toLowerCase().includes(lowerQ)
                ))
          )
        ) {
          return true;
        }

        if (
          Array.isArray(row.options) &&
          row.options.some((opt: any) => {
            const optionName = s(opt?.name).toLowerCase();
            if (optionName.includes(lowerQ)) return true;

            const values = Array.isArray(opt?.values) ? opt.values : [];
            return values.some((val: any) =>
              s(val?.name || val?.display_value).toLowerCase().includes(lowerQ)
            );
          })
        ) {
          return true;
        }

        return false;
      })
      .slice(0, limit);

    return NextResponse.json({ rows }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to search products" },
      { status: 500 }
    );
  }
}