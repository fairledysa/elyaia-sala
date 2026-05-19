// FILE: apps/merchant/src/app/api/themes/try/route.ts

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

function s(value: unknown) {
  return String(value ?? "").trim();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function getCatalogTheme(sb: any, rawThemeId: string) {
  const value = s(rawThemeId);

  if (!value) return null;

  if (isUuid(value)) {
    const { data, error } = await sb
      .from("themes_catalog")
      .select(
        "id, key, name, slug, description, vendor, is_free, thumb_url, marketplace_id, status, is_active",
      )
      .eq("id", value)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  const { data, error } = await sb
    .from("themes_catalog")
    .select(
      "id, key, name, slug, description, vendor, is_free, thumb_url, marketplace_id, status, is_active",
    )
    .eq("key", value)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function POST(req: Request) {
  try {
    const storeId = getStoreIdOrThrow(req);
    const body = await req.json().catch(() => ({}));

    const themeCatalogId = s(
      body?.themeCatalogId || body?.theme_id || body?.themeId || body?.key,
    );

    if (!themeCatalogId) {
      return NextResponse.json(
        { error: "THEME_CATALOG_ID_REQUIRED" },
        { status: 400 },
      );
    }

    const sb = supabaseAdmin();
    const catalog = await getCatalogTheme(sb, themeCatalogId);

    if (!catalog?.id) {
      return NextResponse.json({ error: "THEME_NOT_FOUND" }, { status: 404 });
    }

    if (catalog.is_active === false || catalog.status !== "active") {
      return NextResponse.json(
        { error: "THEME_NOT_AVAILABLE" },
        { status: 400 },
      );
    }

    const { count, error: countError } = await sb
      .from("store_theme_versions")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("theme_id", catalog.id);

    if (countError) throw countError;

    if (Number(count ?? 0) >= 3) {
      return NextResponse.json(
        { error: "MAX_3_VERSIONS_PER_THEME" },
        { status: 409 },
      );
    }

    const { data: maxRow, error: maxError } = await sb
      .from("store_theme_versions")
      .select("version_no")
      .eq("store_id", storeId)
      .eq("theme_id", catalog.id)
      .order("version_no", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxError) throw maxError;

    const nextVersionNo = Number(maxRow?.version_no ?? 0) + 1;
    const title =
      s(body?.title) ||
      (nextVersionNo > 1
        ? `${catalog.name} - نسخة ${nextVersionNo}`
        : `${catalog.name} - تجربة`);

    const now = new Date().toISOString();

    const { data: created, error: insertError } = await sb
      .from("store_theme_versions")
      .insert({
        store_id: storeId,
        theme_id: catalog.id,
        title,
        status: "draft",
        is_default: false,
        version_no: nextVersionNo,
        last_updated_at: now,
      })
      .select("id, title, status, is_default, version_no, last_updated_at, theme_id")
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({
      ok: true,
      item: created,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "UNKNOWN_ERROR" },
      { status: 500 },
    );
  }
}