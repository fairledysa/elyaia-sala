// FILE: apps/merchant/src/app/api/themes/versions/[versionId]/rename/route.ts

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

    const body = await req.json().catch(() => ({}));
    const title = String(body?.title || "").trim();

    if (!title) {
      return NextResponse.json({ error: "TITLE_REQUIRED" }, { status: 400 });
    }

    const sb = supabaseAdmin();

    const { data: updated, error } = await sb
      .from("store_theme_versions")
      .update({
        title,
        last_updated_at: new Date().toISOString(),
      })
      .eq("id", versionId)
      .eq("store_id", storeId)
      .select(
        "id, title, status, is_default, version_no, last_updated_at, theme_id",
      )
      .single();

    if (error) throw error;

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