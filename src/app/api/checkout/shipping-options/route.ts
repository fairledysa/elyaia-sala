// FILE: apps/merchant/src/app/api/checkout/shipping-options/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type ShippingOption =
  | {
      id: string; // store_shipping_carriers.id
      type: "platform" | "courier";
      display_name: string;
      service: { eta_text?: string | null; notes?: string | null };
      pricing: {
        currency: string;
        shipping_fee_customer: number; // customer_price
        cod_available: boolean;
        cod_fee_customer: number; // from rate
        cod_fee_merchant: number; // platform only (from coverage)
        merchant_shipping_cost: number; // platform only (from coverage OR rate.merchant_cost if you want)
      };
      disabled_reason?: string | null;
      meta?: Record<string, any>;
    }
  | {
      id: string; // store_shipping_carriers.id
      type: "pickup";
      display_name: string;
      pricing: {
        currency: string;
        shipping_fee_customer: 0;
        cod_available: false;
        cod_fee_customer: 0;
        cod_fee_merchant: 0;
        merchant_shipping_cost: 0;
      };
      pickup_points: Array<{
        id: string;
        city_id: string;
        title: string;
        address: string;
        map_url: string;
        lat?: number | null;
        lng?: number | null;
        phone?: string | null;
        notes?: string | null;
        status?: string | null;
      }>;
      disabled_reason?: string | null;
    };

function n(x: any, fallback = 0) {
  const v = Number(x);
  return Number.isFinite(v) ? v : fallback;
}
function truthy(x: any) {
  return x === true || x === "true" || x === 1 || x === "1";
}

async function resolveStoreId(supabase: any, authUserId: string, email?: string | null) {
  const r1 = await supabase
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", authUserId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (r1.data?.store_id) return r1.data.store_id as string;

  const e = String(email || "").toLowerCase().trim();
  if (!e) return null;

  const r2 = await supabase
    .from("store_users")
    .select("store_id")
    .ilike("email", e)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (r2.data?.store_id) return r2.data.store_id as string;

  return null;
}

function rateAppliesToCity(rate: any, cityId: string): boolean {
  const scope = String(rate.scope || "all_cities");
  const included: string[] = Array.isArray(rate.included_city_ids) ? rate.included_city_ids : [];
  const excluded: string[] = Array.isArray(rate.excluded_city_ids) ? rate.excluded_city_ids : [];

  if (scope === "include_cities") return included.includes(cityId);
  // all_cities
  return !excluded.includes(cityId);
}

/**
 * GET /api/checkout/shipping-options?city_id=<uuid>&cod=1
 */
export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );

  const auth = await supabase.auth.getUser();
  const user = auth.data?.user;
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const url = new URL(req.url);
  const city_id = url.searchParams.get("city_id")?.trim() || "";
  const wantCod = truthy(url.searchParams.get("cod"));

  if (!city_id) return NextResponse.json({ error: "city_id is required" }, { status: 400 });

  const storeId = await resolveStoreId(supabase, user.id, user.email);
  if (!storeId) return NextResponse.json({ error: "STORE_NOT_FOUND" }, { status: 404 });

  // ✅ base currency from store (because ref_countries has no currency column in your schema)
  const storeRes = await supabase.from("stores").select("id,default_currency").eq("id", storeId).maybeSingle();
  if (storeRes.error) return NextResponse.json({ error: storeRes.error.message }, { status: 500 });
  const baseCurrency = String(storeRes.data?.default_currency || "YER");

  // ✅ carriers enabled
  const carriersRes = await supabase
    .from("store_shipping_carriers")
    .select("id,type,display_name,enabled,status,carrier_id")
    .eq("store_id", storeId)
    .eq("enabled", true);

  if (carriersRes.error) return NextResponse.json({ error: carriersRes.error.message }, { status: 500 });

  const carriers = (carriersRes.data || [])
    .filter((c: any) => String(c.status || "active").toLowerCase() === "active")
    .map((c: any) => ({
      id: String(c.id),
      type: c.type as "platform" | "courier" | "pickup",
      display_name: String(c.display_name || ""),
      carrier_id: c.carrier_id ? String(c.carrier_id) : null, // for platform -> shipping_carriers.id
    }));

  const carrierIds = carriers.map((c) => c.id);

  // ✅ rates for these carriers (NO city_id column; we filter by scope arrays)
  const ratesRes =
    carrierIds.length > 0
      ? await supabase
          .from("store_shipping_rates")
          .select(
            "id,store_shipping_carrier_id,scope,excluded_city_ids,included_city_ids,customer_price,merchant_cost,eta_text,cod_enabled,cod_fee_customer,currency,enabled,status"
          )
          .eq("store_id", storeId)
          .in("store_shipping_carrier_id", carrierIds)
          .eq("enabled", true)
      : { data: [], error: null };

  if ((ratesRes as any).error) return NextResponse.json({ error: (ratesRes as any).error.message }, { status: 500 });

  const rates = ((ratesRes as any).data || []).filter(
    (r: any) => String(r.status || "active").toLowerCase() === "active"
  );

  // ✅ pickup points for this city
  const pickupCarrierIds = carriers.filter((c) => c.type === "pickup").map((c) => c.id);
  const pickupPointsRes =
    pickupCarrierIds.length > 0
      ? await supabase
          .from("store_pickup_points")
          .select("id,store_shipping_carrier_id,city_id,title,address,map_url,lat,lng,phone,notes,status")
          .eq("store_id", storeId)
          .eq("city_id", city_id)
          .in("store_shipping_carrier_id", pickupCarrierIds)
      : { data: [], error: null };

  if ((pickupPointsRes as any).error) {
    return NextResponse.json({ error: (pickupPointsRes as any).error.message }, { status: 500 });
  }

  const pickupPoints = (((pickupPointsRes as any).data || []) as any[]).filter(
    (p) => String(p.status || "active").toLowerCase() === "active"
  );

  // ✅ coverage for platform carriers (shipping_carrier_city_coverage has carrier_id + city_id)
  const platformCarriers = carriers.filter((c) => c.type === "platform" && c.carrier_id);
  const platformCarrierIds = platformCarriers.map((c) => c.carrier_id!) as string[];

  const covRes =
    platformCarrierIds.length > 0
      ? await supabase
          .from("shipping_carrier_city_coverage")
          .select("carrier_id,city_id,status,cod_available,cod_fee,eta_text,merchant_shipping_cost,currency")
          .eq("city_id", city_id)
          .in("carrier_id", platformCarrierIds)
      : { data: [], error: null };

  if ((covRes as any).error) return NextResponse.json({ error: (covRes as any).error.message }, { status: 500 });

  const coverages = (((covRes as any).data || []) as any[]).filter(
    (c) => String(c.status || "active").toLowerCase() === "active"
  );

  const coverageByCarrierId = new Map<string, any>();
  for (const c of coverages) coverageByCarrierId.set(String(c.carrier_id), c);

  // ✅ build options
  const options: ShippingOption[] = [];

  for (const c of carriers) {
    const display = c.display_name || (c.type === "pickup" ? "استلام من الفرع" : c.type === "courier" ? "موصل" : "شركة منصة");

    if (c.type === "pickup") {
      const pts = pickupPoints
        .filter((p) => String(p.store_shipping_carrier_id) === c.id)
        .map((p) => ({
          id: String(p.id),
          city_id: String(p.city_id),
          title: String(p.title || "فرع"),
          address: String(p.address || ""),
          map_url: String(p.map_url || ""),
          lat: p.lat ?? null,
          lng: p.lng ?? null,
          phone: p.phone ?? null,
          notes: p.notes ?? null,
          status: p.status ?? null,
        }))
        .filter((p) => p.address && p.map_url);

      options.push({
        id: c.id,
        type: "pickup",
        display_name: display,
        pricing: {
          currency: baseCurrency,
          shipping_fee_customer: 0,
          cod_available: false,
          cod_fee_customer: 0,
          cod_fee_merchant: 0,
          merchant_shipping_cost: 0,
        },
        pickup_points: pts,
        disabled_reason: pts.length ? null : "لا توجد فروع استلام لهذه المدينة",
      });

      continue;
    }

    // find first applicable rate for this carrier and city
    const applicableRates = rates
      .filter((r: any) => String(r.store_shipping_carrier_id) === c.id)
      .filter((r: any) => rateAppliesToCity(r, city_id));

    const r = applicableRates[0] || null;

    if (c.type === "courier") {
      const shipping_fee_customer = n(r?.customer_price, 0);
      const cod_available = !!r?.cod_enabled;
      const cod_fee_customer = n(r?.cod_fee_customer, 0);
      const currency = String(r?.currency || baseCurrency);

      options.push({
        id: c.id,
        type: "courier",
        display_name: display,
        service: { eta_text: r?.eta_text || null, notes: null },
        pricing: {
          currency,
          shipping_fee_customer,
          cod_available,
          cod_fee_customer: wantCod && cod_available ? cod_fee_customer : 0,
          cod_fee_merchant: 0,
          merchant_shipping_cost: 0,
        },
        disabled_reason: r ? null : "لا توجد تسعيرة لهذا الموصل تطبق على هذه المدينة",
      });

      continue;
    }

    // platform
    if (c.type === "platform") {
      const cov = c.carrier_id ? coverageByCarrierId.get(c.carrier_id) : null;

      const shipping_fee_customer = n(r?.customer_price, 0);
      const cod_enabled_by_store = !!r?.cod_enabled;
      const cod_fee_customer = n(r?.cod_fee_customer, 0);
      const currency = String(cov?.currency || r?.currency || baseCurrency);

      const company_cod_available = !!cov?.cod_available;
      const cod_fee_merchant = n(cov?.cod_fee, 0);
      const merchant_shipping_cost = n(cov?.merchant_shipping_cost, 0);
      const eta_text = (r?.eta_text || cov?.eta_text || null) as string | null;

      const cod_available = company_cod_available && cod_enabled_by_store;

      options.push({
        id: c.id,
        type: "platform",
        display_name: display,
        service: { eta_text, notes: null },
        pricing: {
          currency,
          shipping_fee_customer,
          cod_available,
          cod_fee_customer: wantCod && cod_available ? cod_fee_customer : 0,
          cod_fee_merchant: wantCod && cod_available ? cod_fee_merchant : 0,
          merchant_shipping_cost,
        },
        meta: {
          carrier_id: c.carrier_id,
          company_cod_available,
        },
        disabled_reason: !cov
          ? "المدينة غير مدعومة لدى شركة الشحن"
          : !r
          ? "لا توجد تسعيرة للعميل تطبق على هذه المدينة"
          : null,
      });

      continue;
    }
  }

  return NextResponse.json({
    currency: baseCurrency,
    address: { city_id },
    cod: wantCod,
    options,
  });
}
