// FILE: apps/merchant/src/app/api/settings/store/shipping/cod/options/route.ts

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type CodRestrictionsRow = {
  store_id?: string | null;
  minimum_subtotal?: number | string | null;
  maximum_subtotal?: number | string | null;
  maximum_weight_kg?: number | string | null;
  block_untrusted_customers?: boolean | number | string | null;
  metadata?: Record<string, any> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function s(value: unknown) {
  return String(value ?? "").trim();
}

function n(value: unknown, fallback = 0) {
  const num = Number(value ?? fallback);
  return Number.isFinite(num) ? num : fallback;
}

function b(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const text = value.trim().toLowerCase();

    if (["true", "1", "yes", "on", "enabled", "active"].includes(text)) {
      return true;
    }

    if (["false", "0", "no", "off", "disabled", "inactive"].includes(text)) {
      return false;
    }
  }

  return fallback;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function ok(value: any) {
  return NextResponse.json(
    { ok: true, value },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function fail(error: string, status = 500) {
  return NextResponse.json(
    { ok: false, error },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

async function resolveStoreId() {
  const sb = await supabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user?.id) return null;

  const { data } = await sb
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", user.id)
    .single();

  return data?.store_id ? String(data.store_id) : null;
}

function defaultRestrictions() {
  return {
    minimum_subtotal: 0,
    maximum_subtotal: null as number | null,
    maximum_weight_kg: null as number | null,
    block_untrusted_customers: false,
    excluded_product_ids: [] as string[],
    excluded_category_ids: [] as string[],
  };
}

async function loadIds(
  admin: any,
  table: string,
  column: string,
  storeId: string,
) {
  const { data, error } = await admin
    .from(table)
    .select(column)
    .eq("store_id", storeId);

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row: any) => String(row?.[column] ?? "").trim())
    .filter(Boolean);
}

function chunkList<T>(items: T[], size = 400) {
  const out: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }

  return out;
}

async function loadSelectedProducts(admin: any, storeId: string, ids: string[]) {
  const cleanIds = Array.from(new Set(ids.map(String).filter(Boolean)));

  if (!cleanIds.length) return [];

  const rows: any[] = [];

  for (const part of chunkList(cleanIds, 400)) {
    const { data, error } = await admin
      .from("products")
      .select("id,name,status,public_no,updated_at")
      .eq("store_id", storeId)
      .in("id", part);

    if (error) throw new Error(error.message);

    rows.push(...(Array.isArray(data) ? data : []));
  }

  return rows;
}

export async function GET() {
  try {
    const storeId = await resolveStoreId();

    if (!storeId) {
      return fail("UNAUTHENTICATED", 401);
    }

    const admin = supabaseAdmin();

    const [storeR, restrictionsR, categoriesR] = await Promise.all([
      admin
        .from("stores")
        .select("id,default_currency")
        .eq("id", storeId)
        .maybeSingle(),

      admin
        .from("store_cod_restrictions")
        .select(
          [
            "store_id",
            "minimum_subtotal",
            "maximum_subtotal",
            "maximum_weight_kg",
            "block_untrusted_customers",
            "metadata",
            "created_at",
            "updated_at",
          ].join(","),
        )
        .eq("store_id", storeId)
        .maybeSingle(),

      admin
        .from("categories")
        .select("id,name,slug,status,sort_order")
        .eq("store_id", storeId)
        .eq("status", "active")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
    ]);

    if (storeR.error) throw new Error(storeR.error.message);
    if (categoriesR.error) throw new Error(categoriesR.error.message);

    if (restrictionsR.error && restrictionsR.error.code !== "PGRST116") {
      throw new Error(restrictionsR.error.message);
    }

    const excludedProductIds = await loadIds(
      admin,
      "store_cod_restriction_excluded_products",
      "product_id",
      storeId,
    );

    const excludedCategoryIds = await loadIds(
      admin,
      "store_cod_restriction_excluded_categories",
      "category_id",
      storeId,
    );

    const selectedProducts = await loadSelectedProducts(
      admin,
      storeId,
      excludedProductIds,
    );

    const currencyCode = s(storeR.data?.default_currency) || "SAR";
    const row = (restrictionsR.data ?? null) as CodRestrictionsRow | null;

    return ok({
      currency_code: currencyCode,

      restrictions: {
        ...defaultRestrictions(),

        minimum_subtotal: Math.max(0, n(row?.minimum_subtotal, 0)),

        maximum_subtotal: nullableNumber(row?.maximum_subtotal),

        maximum_weight_kg: nullableNumber(row?.maximum_weight_kg),

        block_untrusted_customers: b(row?.block_untrusted_customers, false),

        excluded_product_ids: excludedProductIds,
        excluded_category_ids: excludedCategoryIds,
      },

      products: selectedProducts.map((item: any) => ({
        id: String(item.id),
        label: s(item.name),
        meta: item.public_no ? `#${item.public_no}` : s(item.status),
      })),

      categories: (categoriesR.data ?? []).map((item: any) => ({
        id: String(item.id),
        label: s(item.name),
        meta: s(item.slug),
      })),
    });
  } catch (e: any) {
    return fail(e?.message || "FAILED_TO_LOAD_COD_RESTRICTIONS", 500);
  }
}