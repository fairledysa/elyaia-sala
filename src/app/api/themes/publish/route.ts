// FILE: apps/merchant/src/app/api/themes/publish/route.ts

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

async function resolveRuntimeTheme(sb: any, catalogThemeId: string) {
  const byCatalog = await sb
    .from("themes")
    .select("id, code, name, default_settings, catalog_theme_id, status")
    .eq("catalog_theme_id", catalogThemeId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (byCatalog.error) throw byCatalog.error;
  if (byCatalog.data?.id) return byCatalog.data;

  const catalog = await sb
    .from("themes_catalog")
    .select("id, key")
    .eq("id", catalogThemeId)
    .maybeSingle();

  if (catalog.error) throw catalog.error;

  const key = catalog.data?.key;

  if (!key) return null;

  const byCode = await sb
    .from("themes")
    .select("id, code, name, default_settings, catalog_theme_id, status")
    .eq("code", key)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (byCode.error) throw byCode.error;

  return byCode.data ?? null;
}

export async function POST(req: Request) {
  try {
    const storeId = getStoreIdOrThrow(req);
    const body = await req.json().catch(() => ({}));
    const versionId = String(body?.versionId || "").trim();

    if (!versionId) {
      return NextResponse.json(
        { error: "VERSION_ID_REQUIRED" },
        { status: 400 },
      );
    }

    const sb = supabaseAdmin();

    const { data: version, error: versionError } = await sb
      .from("store_theme_versions")
      .select("id, store_id, theme_id, title")
      .eq("id", versionId)
      .single();

    if (versionError || !version) {
      return NextResponse.json({ error: "VERSION_NOT_FOUND" }, { status: 404 });
    }

    if (version.store_id !== storeId) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const runtimeTheme = await resolveRuntimeTheme(sb, version.theme_id);

    if (!runtimeTheme?.id) {
      return NextResponse.json(
        {
          error:
            "THEME_RUNTIME_NOT_FOUND: الثيم موجود في themes_catalog لكن لا يوجد له سجل مطابق في themes لتشغيله على المتجر.",
        },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();

    const { error: resetVersionsError } = await sb
      .from("store_theme_versions")
      .update({
        status: "draft",
        is_default: false,
        last_updated_at: now,
      })
      .eq("store_id", storeId);

    if (resetVersionsError) throw resetVersionsError;

    const { error: publishVersionError } = await sb
      .from("store_theme_versions")
      .update({
        status: "published",
        is_default: true,
        last_updated_at: now,
      })
      .eq("id", versionId)
      .eq("store_id", storeId);

    if (publishVersionError) throw publishVersionError;

    await sb
      .from("store_themes")
      .update({
        status: "draft",
        updated_at: now,
      })
      .eq("store_id", storeId);

    const { data: existingStoreTheme, error: existingError } = await sb
      .from("store_themes")
      .select("id")
      .eq("store_id", storeId)
      .eq("theme_id", runtimeTheme.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existingStoreTheme?.id) {
      const { error: updateStoreThemeError } = await sb
        .from("store_themes")
        .update({
          status: "published",
          updated_at: now,
        })
        .eq("id", existingStoreTheme.id)
        .eq("store_id", storeId);

      if (updateStoreThemeError) throw updateStoreThemeError;
    } else {
      const { error: insertStoreThemeError } = await sb
        .from("store_themes")
        .insert({
          store_id: storeId,
          theme_id: runtimeTheme.id,
          status: "published",
          settings: runtimeTheme.default_settings || {},
          created_at: now,
          updated_at: now,
        });

      if (insertStoreThemeError) throw insertStoreThemeError;
    }

    return NextResponse.json({
      ok: true,
      publishedVersionId: versionId,
      runtimeThemeId: runtimeTheme.id,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "UNKNOWN_ERROR" },
      { status: 500 },
    );
  }
}