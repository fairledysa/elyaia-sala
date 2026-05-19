// FILE: apps/merchant/src/app/api/themes/duplicate/route.ts
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
    const title = (body?.title as string)?.trim() || "نسخة جديدة";

    if (!versionId)
      return NextResponse.json(
        { error: "VERSION_ID_REQUIRED" },
        { status: 400 },
      );
    if (title.length > 80)
      return NextResponse.json({ error: "TITLE_TOO_LONG" }, { status: 400 });

    const sb = supabaseAdmin();

    // ✅ النسخة الأصلية
    const { data: src, error: srcErr } = await sb
      .from("store_theme_versions")
      .select("id, store_id, theme_id, version_no")
      .eq("id", versionId)
      .single();

    if (srcErr || !src)
      return NextResponse.json({ error: "VERSION_NOT_FOUND" }, { status: 404 });
    if (src.store_id !== storeId)
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

    // ✅ حد 3 نسخ لنفس الثيم داخل المتجر
    const { count, error: countErr } = await sb
      .from("store_theme_versions")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("theme_id", src.theme_id);

    if (countErr) throw countErr;
    if ((count || 0) >= 3) {
      return NextResponse.json(
        { error: "MAX_3_VERSIONS_PER_THEME" },
        { status: 400 },
      );
    }

    // ✅ version_no جديد = max + 1 داخل نفس theme_id
    const { data: maxRow, error: maxErr } = await sb
      .from("store_theme_versions")
      .select("version_no")
      .eq("store_id", storeId)
      .eq("theme_id", src.theme_id)
      .order("version_no", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxErr) throw maxErr;

    const nextNo = (maxRow?.version_no ?? 0) + 1;

    const { data: created, error: insErr } = await sb
      .from("store_theme_versions")
      .insert({
        store_id: storeId,
        theme_id: src.theme_id,
        title,
        status: "draft",
        is_default: false,
        version_no: nextNo,
        last_updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insErr) throw insErr;

    return NextResponse.json({ ok: true, id: created?.id });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "UNKNOWN_ERROR" },
      { status: 500 },
    );
  }
}
