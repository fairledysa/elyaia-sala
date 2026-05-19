// FILE: apps/merchant/src/app/api/themes/versions/[versionId]/duplicate/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function getStoreIdOrThrow(req: NextRequest) {
  const storeId = req.headers.get("x-store-id");
  if (!storeId) throw new Error("STORE_ID_MISSING");
  return storeId;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ versionId: string }> },
) {
  try {
    const { versionId } = await ctx.params;

    if (!versionId) {
      return NextResponse.json(
        { error: "VERSION_ID_MISSING" },
        { status: 400 },
      );
    }

    const storeId = getStoreIdOrThrow(req);
    const sb = supabaseAdmin();

    const { data: src, error: e1 } = await sb
      .from("store_theme_versions")
      .select("id, store_id, theme_id, title")
      .eq("id", versionId)
      .eq("store_id", storeId)
      .single();

    if (e1 || !src) {
      return NextResponse.json({ error: "VERSION_NOT_FOUND" }, { status: 404 });
    }

    const { data: maxRow, error: e2 } = await sb
      .from("store_theme_versions")
      .select("version_no")
      .eq("store_id", storeId)
      .eq("theme_id", src.theme_id)
      .order("version_no", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (e2) throw e2;

    const nextNo = Number(maxRow?.version_no ?? 0) + 1;

    const { data: created, error: e3 } = await sb
      .from("store_theme_versions")
      .insert({
        store_id: storeId,
        theme_id: src.theme_id,
        title: `نسخة من ${src.title}`,
        status: "draft",
        is_default: false,
        version_no: nextNo,
        last_updated_at: new Date().toISOString(),
      })
      .select(
        "id, title, status, is_default, version_no, last_updated_at, theme_id",
      )
      .single();

    if (e3) {
      if ((e3 as any).message?.includes("MAX_3_VERSIONS_PER_THEME")) {
        return NextResponse.json({ error: "MAX_3_VERSIONS" }, { status: 409 });
      }

      throw e3;
    }

    return NextResponse.json({
      ok: true,
      item: created,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "UNKNOWN_ERROR" },
      { status: 400 },
    );
  }
}