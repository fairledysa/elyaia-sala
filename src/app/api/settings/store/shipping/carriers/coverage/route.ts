// FILE: apps/merchant/src/app/api/settings/store/shipping/carriers/coverage/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function resJson(ok: boolean, value: any, extra?: Record<string, any>) {
  return NextResponse.json({ ok, value, ...(extra || {}) }, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const url = new URL(req.url);
  const carrier_code = String(url.searchParams.get("carrier_code") || "").trim();
  if (!carrier_code) return resJson(false, null, { error: "carrier_code_required" });

  const { data: carrier, error: cErr } = await supabase
    .from("shipping_carriers")
    .select("id, code, status")
    .eq("code", carrier_code)
    .eq("status", "active")
    .maybeSingle();

  if (cErr) return resJson(false, null, { error: cErr.message });
  if (!carrier?.id) return resJson(false, null, { error: "carrier_not_found" });

  const { data, error } = await supabase
    .from("shipping_carrier_city_coverage")
    .select("city_id, status, cod_available, cod_fee, merchant_shipping_cost, currency, eta_text")
    .eq("carrier_id", carrier.id)
    .eq("status", "active")
    .order("city_id", { ascending: true });

  if (error) return resJson(false, null, { error: error.message });

  return resJson(true, {
    carrier_id: carrier.id,
    carrier_code,
    cities: data || [],
  });
}
