// FILE: apps/merchant/src/app/api/themes/[themeId]/theme-options/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type ThemeComponentFieldRow = {
  id: string;
  component_id: string;
  key: string;
  label: string;
  field_type: string;
  description: string | null;
  placeholder: string | null;
  is_required: boolean;
  is_translatable: boolean;
  is_active: boolean;
  sort_order: number;
  default_value: any;
  options: any;
  validation: any;
  ui_props: any;
  width: string | null;
};

type StoreReferenceOption = {
  value: string;
  label: string;
  image_url?: string | null;
};

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
}

function s(v: unknown) {
  return String(v ?? "").trim();
}

function n(v: unknown, fallback: number) {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? x : fallback;
}

async function extractThemeId(
  req: Request,
  ctx?: { params?: Promise<{ themeId?: string }> | { themeId?: string } },
) {
  const rawParams = ctx?.params ? await Promise.resolve(ctx.params) : undefined;
  const fromParams = rawParams?.themeId;
  if (fromParams) return String(fromParams).trim();

  const url = new URL(req.url);
  const m = url.pathname.match(/\/api\/themes\/([^/]+)\/theme-options\/?$/);
  return m?.[1] ? String(m[1]).trim() : "";
}

function slugFor(versionId: string) {
  return `theme_version:${versionId}:theme_options`;
}

function safeJson(value: unknown) {
  if (!value) return {};
  if (typeof value === "object") return value as Record<string, any>;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return {};
}

function pickImageUrl(row: any) {
  return (
    s(row?.thumbnail_url) ||
    s(row?.original_url) ||
    s(row?.image_url) ||
    s(row?.featured_image_url) ||
    s(row?.cover_image_url) ||
    s(row?.photo_url) ||
    s(row?.url) ||
    null
  );
}

async function getStoreIdFromVersionOrThrow(versionId: string) {
  const sb = supabaseAdmin();

  const { data: vRow, error: vErr } = await sb
    .from("store_theme_versions")
    .select("id, store_id")
    .eq("id", versionId)
    .maybeSingle();

  if (vErr) throw vErr;
  if (!vRow?.id) throw new Error("VERSION_NOT_FOUND");
  if (!vRow.store_id) throw new Error("STORE_NOT_FOUND_FOR_VERSION");

  return String(vRow.store_id);
}

async function getRuntimeThemeMetaFromVersion(versionId: string) {
  const sb = supabaseAdmin();

  const { data: versionRow, error: versionErr } = await sb
    .from("store_theme_versions")
    .select("id, theme_id")
    .eq("id", versionId)
    .maybeSingle();

  if (versionErr) throw versionErr;
  if (!versionRow?.theme_id) {
    throw new Error("STORE_THEME_VERSION_NOT_FOUND");
  }

  const catalogThemeId = String(versionRow.theme_id);

  const { data: runtimeRow, error: runtimeErr } = await sb
    .from("themes")
    .select("id, code, name, version, settings_schema, default_settings")
    .eq("catalog_theme_id", catalogThemeId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (runtimeErr) throw runtimeErr;

  return {
    catalog_theme_id: catalogThemeId,
    runtime_theme_id: runtimeRow?.id ? String(runtimeRow.id) : null,
    runtime_theme_code: runtimeRow?.code ? String(runtimeRow.code) : null,
    settings_schema: safeJson(runtimeRow?.settings_schema),
    default_settings: safeJson(runtimeRow?.default_settings),
  };
}

async function getSettingRow(
  sb: ReturnType<typeof supabaseAdmin>,
  storeId: string,
  slug: string,
) {
  const { data, error } = await sb
    .from("store_settings")
    .select("id, value, updated_at")
    .eq("store_id", storeId)
    .eq("slug", slug)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

function normalizeFieldRow(row: any): ThemeComponentFieldRow {
  return {
    id: s(row?.id),
    component_id: s(row?.component_id),
    key: s(row?.key),
    label: s(row?.label),
    field_type: s(row?.field_type) || "text",
    description: row?.description ?? null,
    placeholder: row?.placeholder ?? null,
    is_required: Boolean(row?.is_required),
    is_translatable: Boolean(row?.is_translatable),
    is_active: Boolean(row?.is_active),
    sort_order: Number(row?.sort_order ?? 0),
    default_value: row?.default_value ?? null,
    options: row?.options ?? [],
    validation: row?.validation ?? {},
    ui_props: row?.ui_props ?? {},
    width: row?.width ?? "full",
  };
}

async function getAvailableHomepageComponents(versionId: string) {
  const sb = supabaseAdmin();

  const { data: versionRow, error: versionErr } = await sb
    .from("store_theme_versions")
    .select("id, theme_id")
    .eq("id", versionId)
    .maybeSingle();

  if (versionErr) throw versionErr;
  if (!versionRow?.theme_id) return [];

  const catalogThemeId = String(versionRow.theme_id);

  const { data: links, error: linksError } = await sb
    .from("theme_component_theme_links")
    .select("component_id, theme_catalog_id, is_enabled, sort_order")
    .eq("theme_catalog_id", catalogThemeId)
    .eq("is_enabled", true)
    .order("sort_order", { ascending: true });

  if (linksError) throw linksError;

  const componentIds = Array.from(
    new Set((links ?? []).map((x: any) => s(x.component_id)).filter(Boolean)),
  );

  if (!componentIds.length) return [];

  const [
    { data: components, error: componentsError },
    { data: fields, error: fieldsError },
  ] = await Promise.all([
    sb
      .from("theme_components")
      .select("*")
      .in("id", componentIds)
      .eq("page_key", "homepage")
      .eq("is_active", true),

    sb
      .from("theme_component_fields")
      .select("*")
      .in("component_id", componentIds)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (componentsError) throw componentsError;
  if (fieldsError) throw fieldsError;

  const fieldMap = new Map<string, ThemeComponentFieldRow[]>();
  for (const field of fields ?? []) {
    const item = normalizeFieldRow(field);
    const arr = fieldMap.get(item.component_id) || [];
    arr.push(item);
    fieldMap.set(item.component_id, arr);
  }

  const sortMap = new Map<string, number>();
  for (const link of links ?? []) {
    const componentId = s((link as any)?.component_id);
    if (!componentId) continue;
    sortMap.set(componentId, Number((link as any)?.sort_order ?? 0));
  }

  return (components ?? [])
    .map((component: any) => ({
      id: s(component?.id),
      key: s(component?.key),
      name: s(component?.name),
      slug: s(component?.slug),
      description: component?.description ?? null,
      preview_image_url: component?.preview_image_url ?? null,
      icon: component?.icon ?? null,
      page_key: s(component?.page_key) || "homepage",
      category: component?.category ?? null,
      component_kind:
        component?.component_kind === "widget" ||
        component?.component_kind === "banner" ||
        component?.component_kind === "block"
          ? component.component_kind
          : "section",
      is_active: Boolean(component?.is_active),
      is_builtin: Boolean(component?.is_builtin),
      supports_multiple: Boolean(component?.supports_multiple),
      default_enabled: Boolean(component?.default_enabled),
      default_sort_order: Number(component?.default_sort_order ?? 0),
      settings_schema: safeJson(component?.settings_schema),
      default_values: safeJson(component?.default_values),
      metadata: safeJson(component?.metadata),
      fields: fieldMap.get(s(component?.id)) || [],
      _theme_sort_order: sortMap.get(s(component?.id)) ?? 0,
    }))
    .sort((a, b) => {
      const linkSort =
        Number(a._theme_sort_order ?? 0) - Number(b._theme_sort_order ?? 0);
      if (linkSort !== 0) return linkSort;

      const defaultSort =
        Number(a.default_sort_order ?? 0) - Number(b.default_sort_order ?? 0);
      if (defaultSort !== 0) return defaultSort;

      return a.name.localeCompare(b.name, "ar");
    })
    .map(({ _theme_sort_order, ...rest }) => rest);
}

async function getStoreProducts(args: {
  storeId: string;
  query?: string;
  limit?: number;
}): Promise<StoreReferenceOption[]> {
  const sb = supabaseAdmin();
  const q = s(args.query);
  const limit = Math.min(n(args.limit, 20), 50);

  const { data: products, error: productsError } = await sb
    .from("products")
    .select("id, name, metadata, status")
    .eq("store_id", args.storeId)
    .in("status", ["active", "draft"])
    .or(
      q
        ? [
            `name.ilike.%${q}%`,
            `description.ilike.%${q}%`,
          ].join(",")
        : "id.not.is.null",
    )
    .limit(limit);

  if (productsError) {
    return [];
  }

  const productRows = Array.isArray(products) ? products : [];
  if (!productRows.length) return [];

  const productIds = productRows.map((row: any) => s(row.id)).filter(Boolean);

  const { data: mediaRows } = await sb
    .from("product_media")
    .select("product_id, thumbnail_url, original_url")
    .eq("store_id", args.storeId)
    .in("product_id", productIds);

  const mediaMap = new Map<string, string | null>();

  for (const media of mediaRows ?? []) {
    const productId = s((media as any)?.product_id);
    if (!productId || mediaMap.has(productId)) continue;

    mediaMap.set(productId, pickImageUrl(media));
  }

  return productRows.map((row: any) => {
    const id = s(row?.id);
    const metadata = safeJson(row?.metadata);

    const metaImage =
      s(metadata?.image_url) ||
      s(metadata?.thumbnail_url) ||
      s(metadata?.original_url) ||
      s(metadata?.featured_image_url) ||
      s(metadata?.cover_image_url) ||
      s(metadata?.photo_url) ||
      s(metadata?.image?.url) ||
      s(metadata?.image?.src) ||
      s(metadata?.images?.[0]?.url) ||
      s(metadata?.images?.[0]?.src) ||
      s(metadata?.gallery?.[0]?.url) ||
      s(metadata?.gallery?.[0]?.src) ||
      null;

    return {
      value: id,
      label: s(row?.name || id),
      image_url: mediaMap.get(id) || metaImage || null,
    };
  });
}

async function getStoreCategories(args: {
  storeId: string;
  query?: string;
  limit?: number;
}): Promise<StoreReferenceOption[]> {
  const sb = supabaseAdmin();
  const q = s(args.query);
  const limit = Math.min(n(args.limit, 20), 50);

  const candidates = [
    { table: "categories", nameCol: "name" },
    { table: "store_categories", nameCol: "name" },
  ] as const;

  for (const candidate of candidates) {
    let queryBuilder = sb
      .from(candidate.table)
      .select(`id, ${candidate.nameCol}`)
      .eq("store_id", args.storeId)
      .limit(limit);

    if (q) {
      queryBuilder = queryBuilder.ilike(candidate.nameCol, `%${q}%`);
    }

    const { data, error } = await queryBuilder;

    if (!error && Array.isArray(data)) {
      return data.map((row: any) => ({
        value: s(row?.id),
        label: s(row?.[candidate.nameCol] || row?.id),
      }));
    }
  }

  return [];
}

export async function GET(
  req: Request,
  ctx?: { params?: Promise<{ themeId?: string }> | { themeId?: string } },
) {
  try {
    const themeId = await extractThemeId(req, ctx);

    if (!themeId) {
      return NextResponse.json({ error: "THEME_ID_MISSING" }, { status: 400 });
    }

    if (!isUuid(themeId)) {
      return NextResponse.json(
        { error: "THEME_ID_INVALID_UUID" },
        { status: 400 },
      );
    }

    const url = new URL(req.url);
    const refsOnly = s(url.searchParams.get("refs_only")) === "1";
    const refType = s(url.searchParams.get("ref_type"));
    const refQuery = s(url.searchParams.get("q"));
    const refLimit = n(url.searchParams.get("limit"), 20);

    const versionId = themeId;
    const storeId = await getStoreIdFromVersionOrThrow(versionId);

    if (refsOnly) {
      if (refType === "product") {
        const items = await getStoreProducts({
          storeId,
          query: refQuery,
          limit: refLimit,
        });
        return NextResponse.json({ ok: true, items });
      }

      if (refType === "category") {
        const items = await getStoreCategories({
          storeId,
          query: refQuery,
          limit: refLimit,
        });
        return NextResponse.json({ ok: true, items });
      }

      return NextResponse.json({ ok: true, items: [] });
    }

    const themeMeta = await getRuntimeThemeMetaFromVersion(versionId);
    const sb = supabaseAdmin();

    const slug = slugFor(versionId);
    const row = await getSettingRow(sb, storeId, slug);
    const value = safeJson(row?.value);

    const [availableComponents, storeProducts, storeCategories] =
      await Promise.all([
        getAvailableHomepageComponents(versionId),
        getStoreProducts({ storeId, limit: 20 }),
        getStoreCategories({ storeId, limit: 20 }),
      ]);

    return NextResponse.json({
      ok: true,
      theme_options: value,
      available_components: availableComponents,
      store_products: storeProducts,
      store_categories: storeCategories,
      theme_schema: themeMeta.settings_schema,
      theme_default_settings: themeMeta.default_settings,
      meta: {
        store_id: storeId,
        version_id: versionId,
        catalog_theme_id: themeMeta.catalog_theme_id,
        runtime_theme_id: themeMeta.runtime_theme_id,
        runtime_theme_code: themeMeta.runtime_theme_code,
        slug,
        setting_id: row?.id ?? null,
        updated_at: row?.updated_at ?? null,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "UNKNOWN_ERROR" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: Request,
  ctx?: { params?: Promise<{ themeId?: string }> | { themeId?: string } },
) {
  try {
    const themeId = await extractThemeId(req, ctx);

    if (!themeId) {
      return NextResponse.json({ error: "THEME_ID_MISSING" }, { status: 400 });
    }

    if (!isUuid(themeId)) {
      return NextResponse.json(
        { error: "THEME_ID_INVALID_UUID" },
        { status: 400 },
      );
    }

    const versionId = themeId;
    const storeId = await getStoreIdFromVersionOrThrow(versionId);
    const themeMeta = await getRuntimeThemeMetaFromVersion(versionId);
    const sb = supabaseAdmin();

    const body = await req.json().catch(() => ({}));
    const themeOptions = body?.theme_options ?? body ?? {};
    const slug = slugFor(versionId);

    const existing = await getSettingRow(sb, storeId, slug);

    if (existing?.id) {
      const { error: upErr } = await sb
        .from("store_settings")
        .update({
          value: themeOptions,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .eq("store_id", storeId);

      if (upErr) throw upErr;
    } else {
      const { error: insErr } = await sb.from("store_settings").insert({
        store_id: storeId,
        slug,
        type: "json",
        value: themeOptions,
      });

      if (insErr) throw insErr;
    }

    const saved = await getSettingRow(sb, storeId, slug);
    const savedValue = safeJson(saved?.value);

    const [availableComponents, storeProducts, storeCategories] =
      await Promise.all([
        getAvailableHomepageComponents(versionId),
        getStoreProducts({ storeId, limit: 20 }),
        getStoreCategories({ storeId, limit: 20 }),
      ]);

    return NextResponse.json({
      ok: true,
      theme_options: savedValue,
      available_components: availableComponents,
      store_products: storeProducts,
      store_categories: storeCategories,
      theme_schema: themeMeta.settings_schema,
      theme_default_settings: themeMeta.default_settings,
      meta: {
        store_id: storeId,
        version_id: versionId,
        catalog_theme_id: themeMeta.catalog_theme_id,
        runtime_theme_id: themeMeta.runtime_theme_id,
        runtime_theme_code: themeMeta.runtime_theme_code,
        slug,
        setting_id: saved?.id ?? null,
        updated_at: saved?.updated_at ?? null,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "UNKNOWN_ERROR" },
      { status: 500 },
    );
  }
}