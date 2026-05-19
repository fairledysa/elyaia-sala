// FILE: apps/merchant/src/app/api/settings/store/shipping/free-shipping/options/route.ts

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function s(value: unknown) {
  return String(value ?? "").trim();
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

function chunkList<T>(items: T[], size = 400) {
  const out: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }

  return out;
}

async function loadRuleLinks(
  admin: any,
  table: string,
  column: string,
  ruleIds: string[],
) {
  const map = new Map<string, string[]>();

  if (!ruleIds.length) return map;

  const { data, error } = await admin
    .from(table)
    .select(`rule_id,${column}`)
    .in("rule_id", ruleIds);

  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    const ruleId = s(row.rule_id);
    const value = s(row[column]);

    if (!ruleId || !value) continue;

    if (!map.has(ruleId)) map.set(ruleId, []);
    map.get(ruleId)!.push(value);
  }

  return map;
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

async function loadCustomerGroupCounts(admin: any, groupIds: string[]) {
  const map = new Map<string, number>();

  await Promise.all(
    groupIds.map(async (groupId) => {
      const { count, error } = await admin
        .from("customer_group_members")
        .select("customer_id", { count: "exact", head: true })
        .eq("group_id", groupId);

      if (!error) {
        map.set(groupId, count ?? 0);
      }
    }),
  );

  return map;
}

export async function GET() {
  try {
    const storeId = await resolveStoreId();

    if (!storeId) {
      return fail("UNAUTHENTICATED", 401);
    }

    const admin = supabaseAdmin();

    const [
      storeR,
      rulesR,
      countriesR,
      citiesR,
      categoriesR,
      carriersR,
      groupsR,
    ] = await Promise.all([
      admin
        .from("stores")
        .select("id,default_currency")
        .eq("id", storeId)
        .maybeSingle(),

      admin
        .from("store_free_shipping_rules")
        .select(
          [
            "id",
            "store_id",
            "name",
            "enabled",
            "minimum_subtotal",
            "countries_mode",
            "cities_mode",
            "products_mode",
            "categories_mode",
            "carriers_mode",
            "customer_groups_mode",
            "starts_at",
            "ends_at",
            "priority",
            "metadata",
            "created_at",
            "updated_at",
          ].join(","),
        )
        .eq("store_id", storeId)
        .order("priority", { ascending: true })
        .order("created_at", { ascending: false }),

      admin
        .from("ref_countries")
        .select("id,iso2,name_ar,name_en,status")
        .eq("status", "active")
        .order("name_ar", { ascending: true }),

      admin
        .from("ref_cities")
        .select("id,country_id,name_ar,name_en,status")
        .eq("status", "active")
        .order("name_ar", { ascending: true }),

      admin
        .from("categories")
        .select("id,name,slug,status,sort_order")
        .eq("store_id", storeId)
        .eq("status", "active")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),

      admin
        .from("store_shipping_carriers")
        .select("id,type,display_name,enabled,is_enabled,status,created_at")
        .eq("store_id", storeId)
        .eq("status", "active")
        .order("created_at", { ascending: false }),

      admin
        .from("customer_groups")
        .select("id,name,icon,created_at")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false }),
    ]);

    const firstError =
      storeR.error ||
      rulesR.error ||
      countriesR.error ||
      citiesR.error ||
      categoriesR.error ||
      carriersR.error ||
      groupsR.error;

    if (firstError) throw new Error(firstError.message);

    const currencyCode = s(storeR.data?.default_currency) || "SAR";

    const rulesRaw = Array.isArray(rulesR.data) ? rulesR.data : [];
    const ruleIds = rulesRaw.map((row: any) => s(row.id)).filter(Boolean);

    const [
      countryLinks,
      cityLinks,
      productLinks,
      categoryLinks,
      carrierLinks,
      groupLinks,
    ] = await Promise.all([
      loadRuleLinks(
        admin,
        "store_free_shipping_rule_countries",
        "country_id",
        ruleIds,
      ),
      loadRuleLinks(admin, "store_free_shipping_rule_cities", "city_id", ruleIds),
      loadRuleLinks(
        admin,
        "store_free_shipping_rule_products",
        "product_id",
        ruleIds,
      ),
      loadRuleLinks(
        admin,
        "store_free_shipping_rule_categories",
        "category_id",
        ruleIds,
      ),
      loadRuleLinks(
        admin,
        "store_free_shipping_rule_carriers",
        "store_shipping_carrier_id",
        ruleIds,
      ),
      loadRuleLinks(
        admin,
        "store_free_shipping_rule_customer_groups",
        "customer_group_id",
        ruleIds,
      ),
    ]);

    const allSelectedProductIds = Array.from(
      new Set(
        Array.from(productLinks.values())
          .flat()
          .map(String)
          .filter(Boolean),
      ),
    );

    const selectedProducts = await loadSelectedProducts(
      admin,
      storeId,
      allSelectedProductIds,
    );

    const groupsRaw = Array.isArray(groupsR.data) ? groupsR.data : [];
    const groupIds = groupsRaw.map((row: any) => s(row.id)).filter(Boolean);
    const groupCounts = await loadCustomerGroupCounts(admin, groupIds);

    const rules = rulesRaw.map((row: any) => {
      const id = s(row.id);

      return {
        id,
        name: s(row.name),
        enabled: row.enabled !== false,
        minimum_subtotal: Number(row.minimum_subtotal ?? 0),

        countries_mode: row.countries_mode === "include" ? "include" : "all",
        cities_mode: row.cities_mode === "include" ? "include" : "all",
        products_mode: row.products_mode === "include" ? "include" : "all",
        categories_mode: row.categories_mode === "include" ? "include" : "all",
        carriers_mode: row.carriers_mode === "include" ? "include" : "all",
        customer_groups_mode:
          row.customer_groups_mode === "include" ? "include" : "all",

        starts_at: row.starts_at ?? null,
        ends_at: row.ends_at ?? null,
        priority: Number(row.priority ?? 0),

        country_ids: countryLinks.get(id) ?? [],
        city_ids: cityLinks.get(id) ?? [],
        product_ids: productLinks.get(id) ?? [],
        category_ids: categoryLinks.get(id) ?? [],
        carrier_ids: carrierLinks.get(id) ?? [],
        customer_group_ids: groupLinks.get(id) ?? [],
      };
    });

    return ok({
      currency_code: currencyCode,

      rules,

      countries: (countriesR.data ?? []).map((row: any) => ({
        id: String(row.id),
        label: s(row.name_ar) || s(row.name_en) || s(row.iso2),
        meta: s(row.iso2),
      })),

      cities: (citiesR.data ?? []).map((row: any) => ({
        id: String(row.id),
        country_id: row.country_id ? String(row.country_id) : null,
        label: s(row.name_ar) || s(row.name_en),
        meta: s(row.name_en),
      })),

      categories: (categoriesR.data ?? []).map((row: any) => ({
        id: String(row.id),
        label: s(row.name),
        meta: s(row.slug),
      })),

      products: selectedProducts.map((row: any) => ({
        id: String(row.id),
        label: s(row.name),
        meta: row.public_no ? `#${row.public_no}` : s(row.status),
      })),

      carriers: (carriersR.data ?? []).map((row: any) => ({
        id: String(row.id),
        label: s(row.display_name) || "طريقة شحن",
        meta:
          row.type === "platform"
            ? "شركة منصة"
            : row.type === "courier"
              ? "موصل خاص"
              : "استلام من الفرع",
        enabled:
          row.enabled === true || row.is_enabled === true || row.enabled === 1,
      })),

      customer_groups: groupsRaw.map((row: any) => {
        const id = String(row.id);
        const count = groupCounts.get(id) ?? 0;

        return {
          id,
          label: s(row.name),
          meta: `${count} عميل`,
          count,
          icon: s(row.icon),
        };
      }),
    });
  } catch (e: any) {
    return fail(e?.message || "FAILED_TO_LOAD_FREE_SHIPPING_OPTIONS", 500);
  }
}