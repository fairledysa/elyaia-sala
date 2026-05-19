// FILE: apps/merchant/src/app/api/settings/store/shipping/cod/save/route.ts

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

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

    if (["true", "1", "yes", "on"].includes(text)) return true;
    if (["false", "0", "no", "off"].includes(text)) return false;
  }

  return fallback;
}

function isUuid(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s(value),
  );
}

function uniqUuidList(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(value.map((item) => s(item)).filter((item) => isUuid(item))),
  );
}

function nullablePositiveNumber(value: unknown) {
  const raw = s(value);
  if (!raw) return null;

  const num = Number(raw);

  if (!Number.isFinite(num)) return null;
  if (num <= 0) return null;

  return num;
}

function nullableNonNegativeNumber(value: unknown) {
  const raw = s(value);
  if (!raw) return null;

  const num = Number(raw);

  if (!Number.isFinite(num)) return null;
  if (num < 0) return null;

  return num;
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

async function replaceLinks(args: {
  admin: any;
  table: string;
  storeId: string;
  column: string;
  ids: string[];
}) {
  const { admin, table, storeId, column, ids } = args;

  const del = await admin.from(table).delete().eq("store_id", storeId);

  if (del.error) throw new Error(del.error.message);

  const rows = ids.map((id) => ({
    store_id: storeId,
    [column]: id,
  }));

  if (!rows.length) return;

  const ins = await admin.from(table).insert(rows);

  if (ins.error) throw new Error(ins.error.message);
}

export async function POST(req: Request) {
  try {
    const storeId = await resolveStoreId();

    if (!storeId) {
      return fail("UNAUTHENTICATED", 401);
    }

    const body = await req.json().catch(() => ({}));
    const value = body?.restrictions ?? body ?? {};

    const minimumSubtotal = Math.max(0, n(value?.minimum_subtotal, 0));
    const maximumSubtotal = nullableNonNegativeNumber(value?.maximum_subtotal);

    if (maximumSubtotal !== null && maximumSubtotal < minimumSubtotal) {
      return fail("MAXIMUM_SUBTOTAL_LESS_THAN_MINIMUM", 400);
    }

    const maximumWeightKg = nullablePositiveNumber(value?.maximum_weight_kg);

    const excludedProductIds = uniqUuidList(value?.excluded_product_ids);
    const excludedCategoryIds = uniqUuidList(value?.excluded_category_ids);

    const admin = supabaseAdmin();

    const row = {
      store_id: storeId,
      minimum_subtotal: minimumSubtotal,
      maximum_subtotal: maximumSubtotal,
      maximum_weight_kg: maximumWeightKg,
      block_untrusted_customers: b(value?.block_untrusted_customers, false),
      metadata:
        value?.metadata && typeof value.metadata === "object"
          ? value.metadata
          : {},
      updated_at: new Date().toISOString(),
    };

    const upsert = await admin
      .from("store_cod_restrictions")
      .upsert(row, { onConflict: "store_id" })
      .select("store_id")
      .single();

    if (upsert.error) throw new Error(upsert.error.message);

    await Promise.all([
      replaceLinks({
        admin,
        table: "store_cod_restriction_excluded_products",
        storeId,
        column: "product_id",
        ids: excludedProductIds,
      }),

      replaceLinks({
        admin,
        table: "store_cod_restriction_excluded_categories",
        storeId,
        column: "category_id",
        ids: excludedCategoryIds,
      }),
    ]);

    return ok({ saved: true, store_id: storeId });
  } catch (e: any) {
    return fail(e?.message || "FAILED_TO_SAVE_COD_RESTRICTIONS", 500);
  }
}