// FILE: apps/merchant/src/app/api/themes/[themeId]/main-info/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(
    v,
  );
}

function extractThemeId(req: NextRequest, params?: { themeId?: string }) {
  const fromParams = params?.themeId;
  if (fromParams) return fromParams;

  const url = new URL(req.url);
  const m = url.pathname.match(/\/api\/themes\/([^/]+)\/main-info\/?$/);
  return m?.[1];
}

function slugFor(versionId: string) {
  return `theme_version:${versionId}:main_info`;
}

function safeJson(value: unknown) {
  if (!value) return {};

  if (typeof value === "object") {
    return value as Record<string, any>;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }

  return {};
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

  return vRow.store_id as string;
}

async function getMainInfoRow(
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

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ themeId: string }> },
) {
  try {
    const params = await ctx.params;
    const themeId = extractThemeId(req, params);

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

    const sb = supabaseAdmin();

    const { data: store, error: sErr } = await sb
      .from("stores")
      .select("id, name, description, logo_url, favicon_url")
      .eq("id", storeId)
      .single();

    if (sErr || !store) throw sErr;

    const slug = slugFor(versionId);
    const setRow = await getMainInfoRow(sb, storeId, slug);
    const mainInfo = safeJson(setRow?.value);

    return NextResponse.json({
      store: {
        name: store.name ?? "",
        description: store.description ?? "",
        logo_url: store.logo_url ?? "",
        favicon_url: store.favicon_url ?? "",
      },
      main_info: {
        primary_color: mainInfo.primary_color ?? "#00a98f",
        font: mainInfo.font ?? "tajawal",
      },
      meta: {
        slug,
        setting_id: setRow?.id ?? null,
        updated_at: setRow?.updated_at ?? null,
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
  req: NextRequest,
  ctx: { params: Promise<{ themeId: string }> },
) {
  try {
    const params = await ctx.params;
    const themeId = extractThemeId(req, params);

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

    const body = await req.json().catch(() => ({}));
    const sb = supabaseAdmin();

    const storePatch: any = {};

    if (typeof body?.store?.name === "string") {
      storePatch.name = body.store.name;
    }

    if (typeof body?.store?.description === "string") {
      storePatch.description = body.store.description;
    }

    if (typeof body?.store?.logo_url === "string") {
      storePatch.logo_url = body.store.logo_url;
    }

    if (typeof body?.store?.favicon_url === "string") {
      storePatch.favicon_url = body.store.favicon_url;
    }

    if (Object.keys(storePatch).length) {
      const { error: upStoreErr } = await sb
        .from("stores")
        .update({
          ...storePatch,
          updated_at: new Date().toISOString(),
        })
        .eq("id", storeId);

      if (upStoreErr) throw upStoreErr;
    }

    const mainInfo = body?.main_info || {};

    const value = {
      primary_color:
        typeof mainInfo.primary_color === "string"
          ? mainInfo.primary_color
          : "#00a98f",
      font: typeof mainInfo.font === "string" ? mainInfo.font : "tajawal",
    };

    const slug = slugFor(versionId);
    const existing = await getMainInfoRow(sb, storeId, slug);

    if (existing?.id) {
      const { error: upErr } = await sb
        .from("store_settings")
        .update({
          value,
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
        value,
      });

      if (insErr) throw insErr;
    }

    const saved = await getMainInfoRow(sb, storeId, slug);
    const savedValue = safeJson(saved?.value);

    return NextResponse.json({
      ok: true,
      main_info: {
        primary_color: savedValue.primary_color ?? value.primary_color,
        font: savedValue.font ?? value.font,
      },
      meta: {
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