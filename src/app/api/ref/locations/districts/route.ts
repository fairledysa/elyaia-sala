import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type DistrictRow = {
  id: string;
  city_id: string;
  name_ar: string;
  name_en: string | null;
  status: string;
};

function res(ok: boolean, value: any, extra?: Record<string, any>) {
  return NextResponse.json(
    { ok, value, ...(extra || {}) },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const url = new URL(req.url);
  const cityId = (url.searchParams.get("city_id") || "").trim();
  const q = (url.searchParams.get("q") || "").trim();
  const limitRaw = Number(url.searchParams.get("limit") || 1000);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 2000) : 1000;

  if (!cityId) return res(false, [], { error: "city_id is required" });

  let query = supabase
    .from("ref_districts")
    .select("id, city_id, name_ar, name_en, status")
    .eq("city_id", cityId)
    .eq("status", "active")
    .order("name_ar", { ascending: true })
    .limit(limit);

  if (q) query = query.or(`name_ar.ilike.%${q}%,name_en.ilike.%${q}%`);

  const { data, error } = await query.returns<DistrictRow[]>();
  if (error) return res(false, null, { error: error.message });

  const value = (data || []).map((d) => ({
    id: d.id,
    city_id: d.city_id,
    name_ar: d.name_ar,
    name_en: d.name_en || "",
    label: d.name_ar || d.name_en || "",
  }));

  return res(true, value);
}
