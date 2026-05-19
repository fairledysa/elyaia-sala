//app/api/ref/locations/cities/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type CountryRow = { id: string; iso2: string; status: string };
type CityRow = { id: string; country_id: string; name_ar: string; name_en: string; status: string };

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
  const q = (url.searchParams.get("q") || "").trim();
  const iso2 = (url.searchParams.get("country") || "YE").toUpperCase();
  const limitRaw = Number(url.searchParams.get("limit") || 500);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 1000) : 500;

  // resolve country
  const { data: country, error: countryErr } = await supabase
    .from("ref_countries")
    .select("id, iso2, status")
    .eq("iso2", iso2)
    .eq("status", "active")
    .maybeSingle<CountryRow>();

  if (countryErr) return res(false, null, { error: countryErr.message });
  if (!country?.id) return res(true, []);

  let query = supabase
    .from("ref_cities")
    .select("id, country_id, name_ar, name_en, status")
    .eq("country_id", country.id)
    .eq("status", "active")
    .order("name_ar", { ascending: true })
    .limit(limit);

  if (q) query = query.or(`name_ar.ilike.%${q}%,name_en.ilike.%${q}%`);

  const { data, error } = await query.returns<CityRow[]>();
  if (error) return res(false, null, { error: error.message });

  const value = (data || []).map((c) => ({
    id: c.id,
    country_id: c.country_id,
    name_ar: c.name_ar,
    name_en: c.name_en,
    label: c.name_ar || c.name_en,
  }));

  return res(true, value);
}
