// FILE: apps/merchant/src/app/api/themes/route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function getStoreIdOrThrow(req: Request) {
  const storeId = req.headers.get("x-store-id");

  if (!storeId) {
    throw new Error("STORE_ID_MISSING");
  }

  return storeId;
}

function toIso(value: any) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatDate(value: any) {
  const iso = toIso(value);
  if (!iso) return null;

  return new Date(iso).toLocaleDateString("ar-SA");
}

function formatTime(value: any) {
  const iso = toIso(value);
  if (!iso) return null;

  return new Date(iso).toLocaleTimeString("ar-SA");
}

export async function GET(req: Request) {
  try {
    const storeId = getStoreIdOrThrow(req);
    const sb = supabaseAdmin();

    const { data: ownedRows, error: ownedError } = await sb
      .from("store_theme_versions")
      .select(
        `
        id,
        store_id,
        theme_id,
        title,
        status,
        is_default,
        version_no,
        last_updated_at,
        created_at,
        themes_catalog:theme_id (
          id,
          key,
          name,
          slug,
          description,
          vendor,
          is_free,
          thumb_url,
          marketplace_id,
          status,
          is_active
        )
      `,
      )
      .eq("store_id", storeId)
      .order("last_updated_at", { ascending: false });

    if (ownedError) throw ownedError;

    const installedCounts = (ownedRows || []).reduce(
      (map: Record<string, number>, row: any) => {
        const themeId = String(row.theme_id || "");

        if (!themeId) return map;

        map[themeId] = (map[themeId] || 0) + 1;
        return map;
      },
      {},
    );

    const items = (ownedRows || []).map((row: any) => {
      const theme = row.themes_catalog || {};
      const dateSource = row.last_updated_at || row.created_at;

      return {
        id: row.id,
        title: row.title || theme.name || "ثيم",
        status: row.status,
        is_default: Boolean(row.is_default),
        isDefault: Boolean(row.is_default),
        version_no: row.version_no ?? 1,
        versionNo: row.version_no ?? 1,
        last_updated_at: row.last_updated_at,
        lastUpdatedAt: formatDate(dateSource),
        lastUpdatedTime: formatTime(dateSource),

        theme_id: row.theme_id,
        themeId: row.theme_id,
        theme_key: theme.key ?? null,
        themeKey: theme.key ?? null,
        themeName: theme.name ?? "ثيم",

        isFree: Boolean(theme.is_free),
        thumbUrl: theme.thumb_url ?? null,
        marketplaceId: theme.marketplace_id ?? null,

        theme: {
          key: theme.key ?? null,
          name: theme.name ?? null,
          is_free: Boolean(theme.is_free),
          thumb_url: theme.thumb_url ?? null,
          marketplace_id: theme.marketplace_id ?? null,
        },

        customizeHref: `/themes/${row.id}/customize`,
        previewHref: `/themes/${row.id}/preview`,
      };
    });

    const { data: catalogRows, error: catalogError } = await sb
      .from("themes_catalog")
      .select(
        `
        id,
        key,
        name,
        slug,
        description,
        vendor,
        is_free,
        thumb_url,
        marketplace_id,
        status,
        is_active,
        updated_at,
        created_at
      `,
      )
      .eq("is_active", true)
      .eq("status", "active")
      .order("created_at", { ascending: true });

    if (catalogError) throw catalogError;

    const marketplaceItems = (catalogRows || []).map((theme: any) => {
      const count = installedCounts[String(theme.id)] || 0;

      return {
        id: theme.id,
        key: theme.key,
        name: theme.name,
        slug: theme.slug ?? null,
        description: theme.description ?? null,
        vendor: theme.vendor ?? null,
        is_free: Boolean(theme.is_free),
        thumb_url: theme.thumb_url ?? null,
        marketplace_id: theme.marketplace_id ?? null,
        status: theme.status ?? null,
        is_active: theme.is_active !== false,
        installedVersionsCount: count,
        isInstalled: count > 0,
        reachedMax: count >= 3,
        previewHref: theme.marketplace_id
          ? `/themes/marketplace/${theme.marketplace_id}`
          : "",
      };
    });

    return NextResponse.json({
      items,
      marketplaceItems,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: e?.message || "UNKNOWN_ERROR",
        items: [],
        marketplaceItems: [],
      },
      { status: 500 },
    );
  }
}