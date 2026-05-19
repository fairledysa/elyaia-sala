// FILE: apps/merchant/src/app/api/settings/store/shipping/free-shipping/save/route.ts

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
    const v = value.trim().toLowerCase();

    if (["true", "1", "yes", "on"].includes(v)) return true;
    if (["false", "0", "no", "off"].includes(v)) return false;
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

function mode(value: unknown): "all" | "include" {
  return s(value) === "include" ? "include" : "all";
}

function dateOrNull(value: unknown) {
  const raw = s(value);
  if (!raw) return null;

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;

  return d.toISOString();
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
  ruleId: string;
  column: string;
  ids: string[];
}) {
  const { admin, table, storeId, ruleId, column, ids } = args;

  const del = await admin.from(table).delete().eq("rule_id", ruleId);

  if (del.error) throw new Error(del.error.message);

  const rows = ids.map((id) => ({
    store_id: storeId,
    rule_id: ruleId,
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
    const admin = supabaseAdmin();

    if (body?.action === "delete") {
      const id = s(body?.id);

      if (!isUuid(id)) {
        return fail("INVALID_RULE_ID", 400);
      }

      const { error } = await admin
        .from("store_free_shipping_rules")
        .delete()
        .eq("id", id)
        .eq("store_id", storeId);

      if (error) throw new Error(error.message);

      return ok({ deleted: true, id });
    }

    const rule = body?.rule ?? body ?? {};
    const id = s(rule?.id);

    const name = s(rule?.name);
    if (!name) return fail("RULE_NAME_REQUIRED", 400);

    const minimumSubtotal = Math.max(0, n(rule?.minimum_subtotal, 0));

    const row = {
      store_id: storeId,
      name,
      enabled: b(rule?.enabled, true),

      minimum_subtotal: minimumSubtotal,

      countries_mode: mode(rule?.countries_mode),
      cities_mode: mode(rule?.cities_mode),
      products_mode: mode(rule?.products_mode),
      categories_mode: mode(rule?.categories_mode),
      carriers_mode: mode(rule?.carriers_mode),
      customer_groups_mode: mode(rule?.customer_groups_mode),

      starts_at: dateOrNull(rule?.starts_at),
      ends_at: dateOrNull(rule?.ends_at),

      priority: Math.floor(n(rule?.priority, 0)),
      metadata:
        rule?.metadata && typeof rule.metadata === "object" ? rule.metadata : {},
      updated_at: new Date().toISOString(),
    };

    let savedId = id;

    if (savedId) {
      if (!isUuid(savedId)) return fail("INVALID_RULE_ID", 400);

      const own = await admin
        .from("store_free_shipping_rules")
        .select("id")
        .eq("id", savedId)
        .eq("store_id", storeId)
        .maybeSingle();

      if (own.error) throw new Error(own.error.message);
      if (!own.data?.id) return fail("RULE_NOT_FOUND", 404);

      const upd = await admin
        .from("store_free_shipping_rules")
        .update(row)
        .eq("id", savedId)
        .eq("store_id", storeId)
        .select("id")
        .single();

      if (upd.error) throw new Error(upd.error.message);
      savedId = String(upd.data.id);
    } else {
      const ins = await admin
        .from("store_free_shipping_rules")
        .insert(row)
        .select("id")
        .single();

      if (ins.error) throw new Error(ins.error.message);
      savedId = String(ins.data.id);
    }

    await Promise.all([
      replaceLinks({
        admin,
        table: "store_free_shipping_rule_countries",
        storeId,
        ruleId: savedId,
        column: "country_id",
        ids: row.countries_mode === "include" ? uniqUuidList(rule?.country_ids) : [],
      }),

      replaceLinks({
        admin,
        table: "store_free_shipping_rule_cities",
        storeId,
        ruleId: savedId,
        column: "city_id",
        ids: row.cities_mode === "include" ? uniqUuidList(rule?.city_ids) : [],
      }),

      replaceLinks({
        admin,
        table: "store_free_shipping_rule_products",
        storeId,
        ruleId: savedId,
        column: "product_id",
        ids: row.products_mode === "include" ? uniqUuidList(rule?.product_ids) : [],
      }),

      replaceLinks({
        admin,
        table: "store_free_shipping_rule_categories",
        storeId,
        ruleId: savedId,
        column: "category_id",
        ids:
          row.categories_mode === "include"
            ? uniqUuidList(rule?.category_ids)
            : [],
      }),

      replaceLinks({
        admin,
        table: "store_free_shipping_rule_carriers",
        storeId,
        ruleId: savedId,
        column: "store_shipping_carrier_id",
        ids: row.carriers_mode === "include" ? uniqUuidList(rule?.carrier_ids) : [],
      }),

      replaceLinks({
        admin,
        table: "store_free_shipping_rule_customer_groups",
        storeId,
        ruleId: savedId,
        column: "customer_group_id",
        ids:
          row.customer_groups_mode === "include"
            ? uniqUuidList(rule?.customer_group_ids)
            : [],
      }),
    ]);

    return ok({ id: savedId });
  } catch (e: any) {
    return fail(e?.message || "FAILED_TO_SAVE_FREE_SHIPPING_RULE", 500);
  }
}