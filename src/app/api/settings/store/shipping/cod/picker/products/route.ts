// FILE: apps/merchant/src/app/api/settings/store/shipping/cod/picker/products/route.ts

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function s(value: unknown) {
  return String(value ?? "").trim();
}

function n(value: unknown, fallback = 0) {
  const num = Number(value ?? fallback);
  return Number.isFinite(num) ? num : fallback;
}

function ok(value: any) {
  return NextResponse.json(
    { ok: true, value },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function fail(error: string, status = 500) {
  return NextResponse.json(
    { ok: false, error },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

async function resolveStoreId() {
  const sb = await supabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user?.id) return null;

  const { data } = await sb
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", user.id)
    .single();

  return data?.store_id ? String(data.store_id) : null;
}

export async function GET(req: Request) {
  try {
    const storeId = await resolveStoreId();

    if (!storeId) {
      return fail("UNAUTHENTICATED", 401);
    }

    const url = new URL(req.url);

    const q = s(url.searchParams.get("q"));
    const page = Math.max(1, Math.floor(n(url.searchParams.get("page"), 1)));
    const limit = Math.max(
      1,
      Math.min(50, Math.floor(n(url.searchParams.get("limit"), 24))),
    );

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const admin = supabaseAdmin();

    let query = admin
      .from("products")
      .select("id,name,status,public_no,updated_at", { count: "exact" })
      .eq("store_id", storeId)
      .order("updated_at", { ascending: false })
      .range(from, to);

    if (q) {
      const maybeNo = Number(q);
      const publicNo = Number.isFinite(maybeNo) ? maybeNo : -1;

      query = query.or(`name.ilike.%${q}%,public_no.eq.${publicNo}`);
    }

    const { data, error, count } = await query;

    if (error) throw new Error(error.message);

    const items = (Array.isArray(data) ? data : []).map((row: any) => ({
      id: String(row.id),
      label: s(row.name) || "منتج",
      meta: row.public_no ? `#${row.public_no}` : s(row.status),
    }));

    const total = count ?? 0;

    return ok({
      items,
      total,
      page,
      limit,
      has_more: page * limit < total,
    });
  } catch (e: any) {
    return fail(e?.message || "FAILED_TO_LOAD_PRODUCTS", 500);
  }
}