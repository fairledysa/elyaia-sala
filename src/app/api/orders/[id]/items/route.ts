// FILE: apps/merchant/src/app/api/orders/[id]/items/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  getOrderTotalsSnapshot,
  loadOrderMoneyContext,
  recalcOrderTotalsForAdmin,
  roundMoney,
} from "@/app/api/orders/_lib/order-money";

function s(x: any) {
  return String(x ?? "").trim();
}

function n(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function uniqStr(arr: any[]) {
  return Array.from(
    new Set((Array.isArray(arr) ? arr : []).map((v) => s(v)).filter(Boolean)),
  );
}

function normalizeSelectedOptionValueIds(x: any): string[] {
  if (!Array.isArray(x)) return [];
  return uniqStr(x);
}

function normalizeSelectedOptions(x: any) {
  if (!Array.isArray(x)) return [];
  return x
    .map((row) => ({
      name: s(row?.name),
      value: s(row?.value),
    }))
    .filter((row) => row.name && row.value);
}

async function resolveStoreUser() {
  const sb = await supabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) return null;

  const { data: storeUser } = await sb
    .from("store_users")
    .select("id, store_id, auth_user_id, name, email")
    .eq("auth_user_id", user.id)
    .single();

  return storeUser ?? null;
}

async function buildSelectedOptionsFromDb(
  admin: ReturnType<typeof supabaseAdmin>,
  optionValueIds: string[],
) {
  const ids = uniqStr(optionValueIds);
  if (!ids.length) return [];

  const { data: povRows, error: povError } = await admin
    .from("product_option_values")
    .select("id, option_id, name, display_value")
    .in("id", ids);

  if (povError) {
    throw new Error(povError.message);
  }

  const valueRows = Array.isArray(povRows) ? povRows : [];
  if (!valueRows.length) return [];

  const optionIds = uniqStr(valueRows.map((row: any) => row?.option_id));

  const optionNameMap = new Map<string, string>();
  if (optionIds.length) {
    const { data: optionRows, error: optionError } = await admin
      .from("product_options")
      .select("id, name")
      .in("id", optionIds);

    if (optionError) {
      throw new Error(optionError.message);
    }

    for (const row of optionRows ?? []) {
      const id = s((row as any)?.id);
      const name = s((row as any)?.name);
      if (id && name) optionNameMap.set(id, name);
    }
  }

  const valueMap = new Map<string, any>();
  for (const row of valueRows) {
    valueMap.set(s((row as any)?.id), row);
  }

  const out: Array<{ name: string; value: string }> = [];
  for (const id of ids) {
    const row = valueMap.get(id);
    if (!row) continue;

    const optionName = optionNameMap.get(s(row?.option_id)) || "خيار";
    const valueLabel = s(row?.display_value) || s(row?.name);
    if (!valueLabel) continue;

    out.push({
      name: optionName,
      value: valueLabel,
    });
  }

  return out;
}

function buildSelectedOptionsFromMetadata(metadata: any, optionValueIds: string[]) {
  const ids = uniqStr(optionValueIds);
  if (!ids.length) return [];

  const out: Array<{ name: string; value: string }> = [];
  const options = Array.isArray(metadata?.options) ? metadata.options : [];

  const map = new Map<string, { optionName: string; valueLabel: string }>();

  for (const option of options) {
    const optionName = s(option?.name) || "خيار";
    const values = Array.isArray(option?.values) ? option.values : [];

    for (const value of values) {
      const valueId = s(value?.id);
      if (!valueId) continue;

      const valueLabel =
        s(value?.display_value) || s(value?.displayValue) || s(value?.name);

      if (!valueLabel) continue;

      map.set(valueId, {
        optionName,
        valueLabel,
      });
    }
  }

  for (const id of ids) {
    const hit = map.get(id);
    if (!hit) continue;

    out.push({
      name: hit.optionName,
      value: hit.valueLabel,
    });
  }

  return out;
}

function normalizeMetaVariantOptionValueIds(variant: any): string[] {
  if (Array.isArray(variant?.option_value_ids)) {
    return uniqStr(variant.option_value_ids);
  }

  if (Array.isArray(variant?.values)) {
    return uniqStr(
      variant.values.map((row: any) => row?.value_id).filter(Boolean),
    );
  }

  if (Array.isArray(variant?.selections)) {
    return uniqStr(
      variant.selections
        .map((row: any) => row?.valueId ?? row?.id)
        .filter(Boolean),
    );
  }

  return [];
}

function sameIds(a: string[], b: string[]) {
  const aa = uniqStr(a).sort();
  const bb = uniqStr(b).sort();

  if (aa.length !== bb.length) return false;

  for (let i = 0; i < aa.length; i += 1) {
    if (aa[i] !== bb[i]) return false;
  }

  return true;
}

function findMetaVariantBySelectedOptionValueIds(
  metadata: any,
  optionValueIds: string[],
) {
  const ids = uniqStr(optionValueIds);
  if (!ids.length) return null;

  const variants = Array.isArray(metadata?.variants) ? metadata.variants : [];

  return (
    variants.find((variant: any) => {
      const variantIds = normalizeMetaVariantOptionValueIds(variant);
      return sameIds(ids, variantIds);
    }) ?? null
  );
}

async function resolveVariantIdFromOptions(
  admin: ReturnType<typeof supabaseAdmin>,
  args: { product_id: string; selected_option_value_ids: string[] },
): Promise<string | null> {
  const selected = uniqStr(args.selected_option_value_ids);
  if (!selected.length) return null;

  const { data: product, error: productError } = await admin
    .from("products")
    .select("id, metadata")
    .eq("id", args.product_id)
    .maybeSingle();

  if (productError) {
    throw new Error(productError.message);
  }

  const metadata = product?.metadata ?? {};

  const { data: variants, error: variantsError } = await admin
    .from("product_variants")
    .select("id")
    .eq("product_id", args.product_id);

  if (variantsError) {
    throw new Error(variantsError.message);
  }

  const variantIds = (variants ?? []).map((v: any) => s(v?.id)).filter(Boolean);

  if (variantIds.length) {
    const { data: links, error: linksError } = await admin
      .from("variant_option_values")
      .select("variant_id, option_value_id")
      .in("variant_id", variantIds);

    if (linksError) {
      throw new Error(linksError.message);
    }

    const map = new Map<string, Set<string>>();
    for (const row of links ?? []) {
      const variantId = s((row as any)?.variant_id);
      const optionValueId = s((row as any)?.option_value_id);
      if (!variantId || !optionValueId) continue;

      if (!map.has(variantId)) {
        map.set(variantId, new Set<string>());
      }
      map.get(variantId)!.add(optionValueId);
    }

    const selectedSet = new Set(selected);

    for (const variantId of variantIds) {
      const set = map.get(variantId) ?? new Set<string>();
      if (set.size !== selectedSet.size) continue;

      let ok = true;
      for (const valueId of selectedSet) {
        if (!set.has(valueId)) {
          ok = false;
          break;
        }
      }

      if (ok) return variantId;
    }
  }

  const metaVariant = findMetaVariantBySelectedOptionValueIds(metadata, selected);

  if (metaVariant?.id) {
    return s(metaVariant.id);
  }

  return null;
}

async function resolveDefaultVariantId(
  admin: ReturnType<typeof supabaseAdmin>,
  productId: string,
) {
  const { data: variant, error } = await admin
    .from("product_variants")
    .select("id, is_default, created_at")
    .eq("product_id", productId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return variant?.id ? s(variant.id) : null;
}

type StockInfo =
  | {
      ok: true;
      unlimited: boolean;
      available_qty: number;
      max_per_order: number | null;
      sku: string | null;
    }
  | {
      ok: false;
      reason:
        | "PRODUCT_NOT_FOUND"
        | "VARIANT_NOT_FOUND"
        | "INVALID_VARIANT_FOR_PRODUCT";
    };

async function getStockInfo(
  admin: ReturnType<typeof supabaseAdmin>,
  args: {
    store_id: string;
    product_id: string;
    variant_id: string | null;
    selected_option_value_ids?: string[];
  },
): Promise<StockInfo> {
  const { data: product, error: productError } = await admin
    .from("products")
    .select("id, store_id, metadata")
    .eq("id", args.product_id)
    .eq("store_id", args.store_id)
    .maybeSingle();

  if (productError) {
    throw new Error(productError.message);
  }

  if (!product?.id) {
    return { ok: false, reason: "PRODUCT_NOT_FOUND" };
  }

  const metadata = product?.metadata ?? {};

  const { data: stockRow, error: stockError } = await admin
    .from("product_stock")
    .select("quantity, unlimited_quantity, maximum_quantity_per_order")
    .eq("product_id", args.product_id)
    .maybeSingle();

  if (stockError) {
    throw new Error(stockError.message);
  }

  const maxPerOrder =
    typeof stockRow?.maximum_quantity_per_order === "number"
      ? Math.max(1, Math.floor(stockRow.maximum_quantity_per_order))
      : null;

  if (args.variant_id) {
    const { data: variantRow, error: variantError } = await admin
      .from("product_variants")
      .select("id, product_id, sku, stock_quantity, unlimited_quantity")
      .eq("id", args.variant_id)
      .maybeSingle();

    if (variantError) {
      throw new Error(variantError.message);
    }

    if (variantRow?.id) {
      if (s(variantRow.product_id) !== s(args.product_id)) {
        return { ok: false, reason: "INVALID_VARIANT_FOR_PRODUCT" };
      }

      const fallbackMetaVariant = findMetaVariantBySelectedOptionValueIds(
        metadata,
        args.selected_option_value_ids ?? [],
      );

      const resolvedSku =
        s(variantRow.sku) ||
        s(fallbackMetaVariant?.sku) ||
        s((metadata as any)?.sku) ||
        null;

      const unlimited = Boolean(variantRow.unlimited_quantity ?? false);
      if (unlimited) {
        return {
          ok: true,
          unlimited: true,
          available_qty: 999999,
          max_per_order: maxPerOrder,
          sku: resolvedSku,
        };
      }

      return {
        ok: true,
        unlimited: false,
        available_qty: Math.max(0, n(variantRow.stock_quantity)),
        max_per_order: maxPerOrder,
        sku: resolvedSku,
      };
    }

    const metaVariant =
      findMetaVariantBySelectedOptionValueIds(
        metadata,
        args.selected_option_value_ids ?? [],
      ) ??
      (Array.isArray((metadata as any)?.variants)
        ? (metadata as any).variants.find(
            (row: any) => s(row?.id) === s(args.variant_id),
          ) ?? null
        : null);

    if (metaVariant) {
      const unlimited = Boolean(
        metaVariant?.qtyUnlimited ?? metaVariant?.unlimited_quantity ?? false,
      );

      const resolvedSku = s(metaVariant?.sku) || s((metadata as any)?.sku) || null;

      if (unlimited) {
        return {
          ok: true,
          unlimited: true,
          available_qty: 999999,
          max_per_order: maxPerOrder,
          sku: resolvedSku,
        };
      }

      return {
        ok: true,
        unlimited: false,
        available_qty: Math.max(0, n(metaVariant?.qty)),
        max_per_order: maxPerOrder,
        sku: resolvedSku,
      };
    }

    return { ok: false, reason: "VARIANT_NOT_FOUND" };
  }

  const unlimited =
    Boolean((metadata as any)?.qtyUnlimited ?? false) ||
    Boolean(stockRow?.unlimited_quantity ?? false);

  const productSku = s((metadata as any)?.sku) || null;

  if (unlimited) {
    return {
      ok: true,
      unlimited: true,
      available_qty: 999999,
      max_per_order: maxPerOrder,
      sku: productSku,
    };
  }

  return {
    ok: true,
    unlimited: false,
    available_qty: Math.max(0, n(stockRow?.quantity)),
    max_per_order: maxPerOrder,
    sku: productSku,
  };
}

function computeAllowedQty(args: {
  desiredQty: number;
  stock: Extract<StockInfo, { ok: true }>;
}) {
  const desired = Math.max(1, Math.floor(args.desiredQty));

  const maxByStock = args.stock.unlimited
    ? 999999
    : Math.max(0, args.stock.available_qty);

  const maxByPolicy =
    args.stock.max_per_order == null
      ? 999999
      : Math.max(1, args.stock.max_per_order);

  const hardMax = Math.max(0, Math.min(maxByStock, maxByPolicy));
  const finalQty = Math.max(1, Math.min(desired, hardMax));

  return {
    finalQty,
    hardMax,
    wasLimited: finalQty !== desired,
    available: args.stock.unlimited ? null : args.stock.available_qty,
    max_per_order: args.stock.max_per_order,
  };
}

async function createHiddenCustomProduct(
  admin: ReturnType<typeof supabaseAdmin>,
  args: {
    store_id: string;
    order_id: string;
    name: string;
    price: number;
    cost_price: number;
    weight: number;
    currency: string;
  },
) {
  const metadata = {
    custom_order_item: true,
    custom_order_item_order_id: args.order_id,
    custom_order_item_created_at: new Date().toISOString(),
    custom_order_item_currency: args.currency,
    qtyUnlimited: true,
    sku: null,
  };

  const { data: product, error: productError } = await admin
    .from("products")
    .insert({
      store_id: args.store_id,
      product_type: "product",
      name: args.name,
      status: "draft",
      require_shipping: args.weight > 0,
      metadata,
    })
    .select("id")
    .single();

  if (productError || !product?.id) {
    throw new Error(productError?.message || "Failed to create custom product");
  }

  const productId = s(product.id);

  const { error: pricingError } = await admin.from("product_pricing").upsert(
    {
      product_id: productId,
      currency: args.currency,
      price: args.price,
      sale_price: 0,
      cost_price: args.cost_price,
      with_tax: true,
      tax_reason_code: null,
    },
    { onConflict: "product_id" },
  );

  if (pricingError) {
    throw new Error(pricingError.message);
  }

  const { error: stockError } = await admin.from("product_stock").upsert(
    {
      product_id: productId,
      quantity: 999999,
      unlimited_quantity: true,
      hide_quantity: true,
      maximum_quantity_per_order: null,
    },
    { onConflict: "product_id" },
  );

  if (stockError) {
    throw new Error(stockError.message);
  }

  const { error: shippingError } = await admin.from("product_shipping").upsert(
    {
      product_id: productId,
      weight: args.weight > 0 ? args.weight : 0,
      weight_unit: "kg",
    },
    { onConflict: "product_id" },
  );

  if (shippingError) {
    throw new Error(shippingError.message);
  }

  return productId;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const storeUser = await resolveStoreUser();

    if (!storeUser?.store_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const orderId = s(id);

    if (!orderId) {
      return NextResponse.json(
        { error: "Order id is required" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const mode = s(body?.mode).toLowerCase();

    const admin = supabaseAdmin();

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id, store_id, currency")
      .eq("id", orderId)
      .eq("store_id", storeUser.store_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: orderError?.message || "Order not found" },
        { status: 404 },
      );
    }

    const moneyContext = await loadOrderMoneyContext({
      admin,
      storeId: s(storeUser.store_id),
      orderId: s(order.id),
      orderCurrency: s(order.currency),
    });

    const orderCurrency = moneyContext.orderCurrency;

    const beforeTotals = await getOrderTotalsSnapshot({
      admin,
      storeId: s(storeUser.store_id),
      orderId,
    });

    if (mode === "catalog") {
      const productId = s(body?.product_id);
      let variantId = s(body?.variant_id) || null;
      const qty = n(body?.qty);
      const rawUnitPrice = n(body?.unit_price);

      const selectedOptionValueIds = normalizeSelectedOptionValueIds(
        body?.selected_option_value_ids,
      );

      let selectedOptions = normalizeSelectedOptions(body?.selected_options);

      if (!productId) {
        return NextResponse.json(
          { error: "product_id is required" },
          { status: 400 },
        );
      }

      if (qty <= 0) {
        return NextResponse.json(
          { error: "الكمية يجب أن تكون أكبر من 0" },
          { status: 400 },
        );
      }

      if (rawUnitPrice < 0) {
        return NextResponse.json({ error: "السعر غير صحيح" }, { status: 400 });
      }

      const unitPrice = roundMoney(moneyContext, rawUnitPrice, orderCurrency);
      const totalPrice = roundMoney(moneyContext, qty * unitPrice, orderCurrency);

      const { data: product, error: productError } = await admin
        .from("products")
        .select("id, name, store_id, metadata")
        .eq("id", productId)
        .eq("store_id", storeUser.store_id)
        .single();

      if (productError || !product) {
        return NextResponse.json(
          { error: productError?.message || "Product not found" },
          { status: 404 },
        );
      }

      const productMeta = product?.metadata ?? {};

      const { count: variantsCount, error: variantsCountError } = await admin
        .from("product_variants")
        .select("id", { count: "exact", head: true })
        .eq("product_id", productId);

      if (variantsCountError) {
        throw new Error(variantsCountError.message);
      }

      const hasVariants = (variantsCount ?? 0) > 0;

      if (hasVariants) {
        if (!variantId && selectedOptionValueIds.length > 0) {
          variantId = await resolveVariantIdFromOptions(admin, {
            product_id: productId,
            selected_option_value_ids: selectedOptionValueIds,
          });

          if (!variantId) {
            return NextResponse.json(
              { error: "التركيبة المختارة غير موجودة" },
              { status: 400 },
            );
          }
        }

        if (!variantId && selectedOptionValueIds.length === 0) {
          variantId = await resolveDefaultVariantId(admin, productId);

          if (!variantId) {
            return NextResponse.json(
              { error: "اختر خيارات المنتج أولًا" },
              { status: 400 },
            );
          }
        }
      }

      if (selectedOptionValueIds.length > 0 && selectedOptions.length === 0) {
        const fromDb = await buildSelectedOptionsFromDb(
          admin,
          selectedOptionValueIds,
        );

        if (fromDb.length > 0) {
          selectedOptions = fromDb;
        } else {
          selectedOptions = buildSelectedOptionsFromMetadata(
            productMeta,
            selectedOptionValueIds,
          );
        }
      }

      const stock = await getStockInfo(admin, {
        store_id: storeUser.store_id,
        product_id: productId,
        variant_id: variantId,
        selected_option_value_ids: selectedOptionValueIds,
      });

      if (!stock.ok) {
        if (stock.reason === "PRODUCT_NOT_FOUND") {
          return NextResponse.json(
            { error: "المنتج غير موجود" },
            { status: 404 },
          );
        }

        if (stock.reason === "VARIANT_NOT_FOUND") {
          return NextResponse.json(
            { error: "التركيبة المختارة غير موجودة" },
            { status: 400 },
          );
        }

        return NextResponse.json(
          { error: "التركيبة لا تتبع هذا المنتج" },
          { status: 400 },
        );
      }

      const qtyCheck = computeAllowedQty({
        desiredQty: qty,
        stock,
      });

      if (qtyCheck.hardMax <= 0) {
        return NextResponse.json(
          {
            error: stock.unlimited
              ? "لا يمكن إضافة هذه الكمية"
              : "الكمية المطلوبة غير متاحة",
            available: qtyCheck.available,
            max_per_order: qtyCheck.max_per_order,
          },
          { status: 400 },
        );
      }

      if (qtyCheck.wasLimited) {
        return NextResponse.json(
          {
            error:
              qtyCheck.max_per_order && qty > qtyCheck.max_per_order
                ? `الحد الأقصى لهذا المنتج في الطلب هو ${qtyCheck.max_per_order}`
                : `الكمية المتاحة هي ${qtyCheck.available ?? qtyCheck.finalQty}`,
            available: qtyCheck.available,
            max_per_order: qtyCheck.max_per_order,
          },
          { status: 400 },
        );
      }

      const fallbackMetaVariant = findMetaVariantBySelectedOptionValueIds(
        productMeta,
        selectedOptionValueIds,
      );

      const finalSku =
        stock.sku ||
        s(fallbackMetaVariant?.sku) ||
        s((productMeta as any)?.sku) ||
        null;

      const insertPayload = {
        order_id: orderId,
        store_id: storeUser.store_id,
        product_id: productId,
        variant_id: variantId,
        name: s(product.name) || "منتج",
        sku: finalSku,
        qty,
        currency: orderCurrency,
        unit_price: unitPrice,
        total_price: totalPrice,
        selected_option_value_ids: selectedOptionValueIds,
        selected_options: selectedOptions,
      };

      const { data: insertedItem, error: insertError } = await admin
        .from("order_items")
        .insert(insertPayload)
        .select("id")
        .single();

      if (insertError || !insertedItem) {
        return NextResponse.json(
          { error: insertError?.message || "Failed to add item" },
          { status: 500 },
        );
      }

      const totals = await recalcOrderTotalsForAdmin({
        admin,
        storeId: s(storeUser.store_id),
        orderId,
        actorId: s(storeUser.id),
        auditAction: "order.item.added",
        auditBeforeData: {
          mode: "catalog",
          totals: beforeTotals,
        },
        auditAfterData: {
          mode: "catalog",
          item: {
            id: s(insertedItem.id),
            product_id: productId,
            variant_id: variantId,
            name: s(product.name) || "منتج",
            sku: finalSku,
            qty,
            currency: orderCurrency,
            unit_price: unitPrice,
            total_price: totalPrice,
            selected_option_value_ids: selectedOptionValueIds,
            selected_options: selectedOptions,
          },
        },
      });

      return NextResponse.json(
        {
          ok: true,
          item_id: insertedItem.id,
          currency: totals.currency,
          subtotal: totals.after.subtotal,
          total_amount: totals.after.total_amount,
        },
        { status: 200 },
      );
    }

    if (mode === "custom") {
      const name = s(body?.name);
      const qty = n(body?.qty);
      const weight = n(body?.weight);
      const rawUnitPrice = n(body?.unit_price);
      const rawCostPrice = n(body?.cost_price);

      if (!name) {
        return NextResponse.json(
          { error: "اسم المنتج مطلوب" },
          { status: 400 },
        );
      }

      if (qty <= 0) {
        return NextResponse.json(
          { error: "الكمية يجب أن تكون أكبر من 0" },
          { status: 400 },
        );
      }

      if (rawUnitPrice < 0) {
        return NextResponse.json({ error: "السعر غير صحيح" }, { status: 400 });
      }

      if (weight < 0) {
        return NextResponse.json({ error: "الوزن غير صحيح" }, { status: 400 });
      }

      if (rawCostPrice < 0) {
        return NextResponse.json(
          { error: "سعر التكلفة غير صحيح" },
          { status: 400 },
        );
      }

      const unitPrice = roundMoney(moneyContext, rawUnitPrice, orderCurrency);
      const costPrice = roundMoney(moneyContext, rawCostPrice, orderCurrency);
      const totalPrice = roundMoney(moneyContext, qty * unitPrice, orderCurrency);

      const selectedOptions =
        weight > 0 ? [{ name: "الوزن", value: String(weight) }] : [];

      const customProductId = await createHiddenCustomProduct(admin, {
        store_id: storeUser.store_id,
        order_id: orderId,
        name,
        price: unitPrice,
        cost_price: costPrice,
        weight,
        currency: orderCurrency,
      });

      const insertPayload = {
        order_id: orderId,
        store_id: storeUser.store_id,
        product_id: customProductId,
        variant_id: null,
        name,
        sku: null,
        qty,
        currency: orderCurrency,
        unit_price: unitPrice,
        total_price: totalPrice,
        selected_option_value_ids: [],
        selected_options: selectedOptions,
      };

      const { data: insertedItem, error: insertError } = await admin
        .from("order_items")
        .insert(insertPayload)
        .select("id")
        .single();

      if (insertError || !insertedItem) {
        return NextResponse.json(
          { error: insertError?.message || "Failed to add custom item" },
          { status: 500 },
        );
      }

      const totals = await recalcOrderTotalsForAdmin({
        admin,
        storeId: s(storeUser.store_id),
        orderId,
        actorId: s(storeUser.id),
        auditAction: "order.item.added",
        auditBeforeData: {
          mode: "custom",
          totals: beforeTotals,
        },
        auditAfterData: {
          mode: "custom",
          item: {
            id: s(insertedItem.id),
            product_id: customProductId,
            variant_id: null,
            name,
            sku: null,
            qty,
            currency: orderCurrency,
            unit_price: unitPrice,
            total_price: totalPrice,
            selected_option_value_ids: [],
            selected_options: selectedOptions,
            cost_price: costPrice,
            weight,
          },
        },
      });

      return NextResponse.json(
        {
          ok: true,
          item_id: insertedItem.id,
          currency: totals.currency,
          subtotal: totals.after.subtotal,
          total_amount: totals.after.total_amount,
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ error: "Unsupported mode" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to add order item" },
      { status: 500 },
    );
  }
}