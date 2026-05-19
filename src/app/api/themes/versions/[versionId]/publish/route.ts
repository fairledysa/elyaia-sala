// FILE: apps/merchant/src/app/api/themes/versions/[versionId]/publish/route.ts

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

    // 1) نجيب النسخة ونطلع theme_id
    const { data: row, error: e1 } = await sb
      .from("store_theme_versions")
      .select("id, store_id, theme_id")
      .eq("id", versionId)
      .eq("store_id", storeId)
      .single();

    if (e1 || !row) {
      return NextResponse.json({ error: "VERSION_NOT_FOUND" }, { status: 404 });
    }

    // 2) نخلي كل نسخ نفس الثيم Draft + not default
    const { error: e2 } = await sb
      .from("store_theme_versions")
      .update({
        status: "draft",
        is_default: false,
      })
      .eq("store_id", storeId)
      .eq("theme_id", row.theme_id);

    if (e2) throw e2;

    // 3) ننشر النسخة المطلوبة ونخليها default
    const { data: updated, error: e3 } = await sb
      .from("store_theme_versions")
      .update({
        status: "published",
        is_default: true,
        last_updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("store_id", storeId)
      .select(
        "id, title, status, is_default, version_no, last_updated_at, theme_id",
      )
      .single();

    if (e3) throw e3;

    return NextResponse.json({
      ok: true,
      item: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "UNKNOWN_ERROR" },
      { status: 400 },
    );
  }
}