// FILE: apps/merchant/src/app/api/themes/rename/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function getStoreIdOrThrow(req: Request) {
  const storeId = req.headers.get("x-store-id");
  if (!storeId) throw new Error("STORE_ID_MISSING");
  return storeId;
}

export async function POST(req: Request) {
  try {
    const storeId = getStoreIdOrThrow(req);
    const body = await req.json().catch(() => ({}));

    const versionId = body?.versionId as string;
    const title = (body?.title as string)?.trim();

    if (!versionId)
      return NextResponse.json(
        { error: "VERSION_ID_REQUIRED" },
        { status: 400 },
      );
    if (!title)
      return NextResponse.json({ error: "TITLE_REQUIRED" }, { status: 400 });
    if (title.length > 80)
      return NextResponse.json({ error: "TITLE_TOO_LONG" }, { status: 400 });

    const sb = supabaseAdmin();

    const { error } = await sb
      .from("store_theme_versions")
      .update({ title, last_updated_at: new Date().toISOString() })
      .eq("id", versionId)
      .eq("store_id", storeId);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "UNKNOWN_ERROR" },
      { status: 500 },
    );
  }
}
