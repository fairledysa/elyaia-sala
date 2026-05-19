// FILE: apps/merchant/src/app/api/orders/[id]/shipping/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  convertToOrderCurrency,
  loadOrderMoneyContext,
  recalcOrderTotalsForAdmin,
  roundMoney,
} from "@/app/api/orders/_lib/order-money";

function s(x: any) {
  return String(x ?? "").trim();
}

function n(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function uniqStr(arr: any[]) {
  return Array.from(
    new Set((Array.isArray(arr) ? arr : []).map((v) => s(v)).filter(Boolean)),
  );
}

async function resolveStoreUser() {
  const sb = await supabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) return null;

  const { data: storeUser } = await sb
    .from("store_users")
    .select("id,store_id,auth_user_id")
    .eq("auth_user_id", user.id)
    .single();

  return storeUser ?? null;
}

function pickByCityScope(rate: any, cityId: string) {
  const scope = s(rate?.scope);
  const included: string[] = Array.isArray(rate?.included_city_ids)
    ? rate.included_city_ids.map((x: any) => String(x))
    : [];
  const excluded: string[] = Array.isArray(rate?.excluded_city_ids)
    ? rate.excluded_city_ids.map((x: any) => String(x))
    : [];

  if (!cityId) return false;
  if (excluded.includes(cityId)) return false;
  if (scope === "include_cities") return included.includes(cityId);
  return true;
}

function buildAddressText(args: {
  address_line1?: string | null;
  address_line2?: string | null;
  district_name?: string | null;
  city_name?: string | null;
  postal_code?: string | null;
}) {
  return [
    s(args.address_line1),
    s(args.address_line2),
    s(args.district_name),
    s(args.city_name),
    s(args.postal_code) ? `الرمز البريدي ${s(args.postal_code)}` : "",
  ]
    .filter(Boolean)
    .join("، ");
}

async function getShippingOptions(args: {
  admin: ReturnType<typeof supabaseAdmin>;
  store_id: string;
  city_id: string | null;
  moneyContext: Awaited<ReturnType<typeof loadOrderMoneyContext>>;
}) {
  const { admin, store_id, city_id, moneyContext } = args;

  const carriersR = await admin
    .from("store_shipping_carriers")
    .select("id,type,display_name,enabled,is_enabled,status,carrier_id")
    .eq("store_id", store_id);

  if (carriersR.error) {
    throw new Error(carriersR.error.message);
  }

  const carriers = Array.isArray(carriersR.data) ? carriersR.data : [];
  const enabledCarriers = carriers.filter((carrier: any) => {
    const enabled =
      carrier?.enabled === true ||
      carrier?.is_enabled === true ||
      carrier?.enabled === 1;

    return enabled && s(carrier?.status) === "active";
  });

  const carrierIds = uniqStr(enabledCarriers.map((x: any) => x?.id));
  if (!carrierIds.length || !city_id) return [];

  const ratesR = await admin
    .from("store_shipping_rates")
    .select(
      `
      id,
      store_shipping_carrier_id,
      customer_price,
      cod_enabled,
      cod_fee_customer,
      currency,
      eta_text,
      scope,
      included_city_ids,
      excluded_city_ids,
      enabled,
      status
      `,
    )
    .eq("store_id", store_id)
    .in("store_shipping_carrier_id", carrierIds);

  if (ratesR.error) {
    throw new Error(ratesR.error.message);
  }

  const rates = (Array.isArray(ratesR.data) ? ratesR.data : []).filter(
    (rate: any) => {
      const enabled = rate?.enabled === true || rate?.enabled === 1;
      if (!enabled || s(rate?.status) !== "active") return false;
      return pickByCityScope(rate, city_id);
    },
  );

  const carrierMap = new Map<string, any>();
  for (const carrier of enabledCarriers) {
    carrierMap.set(s(carrier.id), carrier);
  }

  return rates.map((rate: any) => {
    const carrier = carrierMap.get(s(rate.store_shipping_carrier_id));
    const sourceCurrency = s(rate.currency) || moneyContext.defaultCurrency;

    const customerPriceSource = n(rate.customer_price);
    const customerPriceConversion = convertToOrderCurrency(
      moneyContext,
      customerPriceSource,
      sourceCurrency,
    );

    const codFeeSource =
      rate?.cod_fee_customer == null ? null : n(rate.cod_fee_customer);

    const codFeeConversion =
      codFeeSource == null
        ? null
        : convertToOrderCurrency(moneyContext, codFeeSource, sourceCurrency);

    return {
      id: s(rate.id),
      store_shipping_carrier_id: s(rate.store_shipping_carrier_id) || null,
      shipping_carrier_id: s(carrier?.carrier_id) || null,
      carrier_name: s(carrier?.display_name) || "شركة شحن",
      carrier_type: s(carrier?.type) || null,
      eta_text: s(rate.eta_text) || null,

      customer_price: customerPriceConversion.amount_after_conversion,
      customer_price_source: customerPriceSource,

      cod_enabled: Boolean(rate.cod_enabled),
      cod_fee_customer:
        codFeeConversion == null ? null : codFeeConversion.amount_after_conversion,
      cod_fee_customer_source: codFeeSource,

      currency: moneyContext.orderCurrency,
      source_currency: sourceCurrency,
      customer_price_conversion:
        sourceCurrency === moneyContext.orderCurrency
          ? null
          : customerPriceConversion,
      cod_fee_conversion:
        !codFeeConversion || sourceCurrency === moneyContext.orderCurrency
          ? null
          : codFeeConversion,
    };
  });
}

function shippingSnapshotRequiresShipping(snapshot: any, shippingId: any) {
  if (snapshot?.requires_shipping === false) return false;
  if (snapshot?.requires_shipping === true) return true;
  return Boolean(s(shippingId));
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const storeUser = await resolveStoreUser();

    if (!storeUser?.store_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const orderId = s(id);
    const cityIdFromQuery = s(new URL(req.url).searchParams.get("city_id"));

    const admin = supabaseAdmin();

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select(
        `
        id,
        store_id,
        customer_id,
        currency,
        shipping_id,
        shipping_amount,
        shipping_snapshot,
        address_id,
        shipping_address,
        order_items (
          id,
          product_id
        )
      `,
      )
      .eq("id", orderId)
      .eq("store_id", storeUser.store_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    const moneyContext = await loadOrderMoneyContext({
      admin,
      storeId: s(storeUser.store_id),
      orderId: s(order.id),
      orderCurrency: s(order.currency),
    });

    const itemProductIds = uniqStr(
      (Array.isArray(order.order_items) ? order.order_items : []).map(
        (item: any) => item?.product_id,
      ),
    );

    let requiresShippingByItems = false;

    if (itemProductIds.length) {
      const { data: products, error: productsError } = await admin
        .from("products")
        .select("id, require_shipping")
        .in("id", itemProductIds)
        .eq("store_id", storeUser.store_id);

      if (productsError) {
        throw new Error(productsError.message);
      }

      requiresShippingByItems = (products ?? []).some(
        (product: any) => product?.require_shipping === true,
      );
    }

    const shippingAddress =
      order?.shipping_address && typeof order.shipping_address === "object"
        ? (order.shipping_address as any)
        : null;

    let addressRow: any = null;
    if (order.address_id) {
      const { data } = await admin
        .from("customer_addresses")
        .select(
          `
          id,
          city_id,
          district_id,
          address_line1,
          address_line2,
          postal_code
        `,
        )
        .eq("id", order.address_id)
        .maybeSingle();

      addressRow = data ?? null;
    }

    const effectiveCityId =
      cityIdFromQuery ||
      s(addressRow?.city_id) ||
      s(shippingAddress?.city_id) ||
      "";

    const citiesR = await admin
      .from("ref_cities")
      .select("id,name_ar,name_en")
      .eq("status", "active")
      .order("name_ar", { ascending: true });

    if (citiesR.error) {
      throw new Error(citiesR.error.message);
    }

    const districtsR = effectiveCityId
      ? await admin
          .from("ref_districts")
          .select("id,city_id,name_ar,name_en")
          .eq("city_id", effectiveCityId)
          .eq("status", "active")
          .order("name_ar", { ascending: true })
      : { data: [], error: null as any };

    if (districtsR.error) {
      throw new Error(districtsR.error.message);
    }

    const shippingOptions = await getShippingOptions({
      admin,
      store_id: storeUser.store_id,
      city_id: effectiveCityId || null,
      moneyContext,
    });

    const currentRateId = s(order.shipping_id);
    const hasCurrentRate = shippingOptions.some(
      (option: any) => s(option.id) === currentRateId,
    );

    return NextResponse.json({
      ok: true,
      currency: moneyContext.orderCurrency,
      form: {
        requires_shipping: shippingSnapshotRequiresShipping(
          order.shipping_snapshot,
          order.shipping_id,
        ),
        requires_shipping_by_items: requiresShippingByItems,
        free_shipping: n(order.shipping_amount) <= 0 && !!order.shipping_id,
        shipping_rate_id: hasCurrentRate ? currentRateId : null,
        shipping_amount: roundMoney(
          moneyContext,
          n(order.shipping_amount),
          moneyContext.orderCurrency,
        ),

        city_id: effectiveCityId || null,
        district_id:
          s(addressRow?.district_id) || s(shippingAddress?.district_id) || null,
        address_line1:
          s(addressRow?.address_line1) ||
          s(shippingAddress?.address_line1) ||
          null,
        address_line2:
          s(addressRow?.address_line2) ||
          s(shippingAddress?.address_line2) ||
          null,
        postal_code:
          s(addressRow?.postal_code) || s(shippingAddress?.postal_code) || null,
      },
      cities: citiesR.data ?? [],
      districts: districtsR.data ?? [],
      shipping_options: shippingOptions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load shipping form" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const storeUser = await resolveStoreUser();

    if (!storeUser?.store_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const orderId = s(id);
    const body = await req.json();

    const requiresShipping = body?.requires_shipping === true;
    const freeShipping = body?.free_shipping === true;

    const shippingRateId = s(body?.shipping_rate_id) || null;
    const cityId = s(body?.city_id) || null;
    const districtId = s(body?.district_id) || null;
    const addressLine1 = s(body?.address_line1) || null;
    const addressLine2 = s(body?.address_line2) || null;
    const postalCode = s(body?.postal_code) || null;

    const admin = supabaseAdmin();

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select(
        `
        id,
        store_id,
        customer_id,
        currency,
        address_id,
        shipping_id,
        shipping_amount,
        shipping_carrier_id,
        shipping_address,
        shipping_snapshot
      `,
      )
      .eq("id", orderId)
      .eq("store_id", storeUser.store_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    const moneyContext = await loadOrderMoneyContext({
      admin,
      storeId: s(storeUser.store_id),
      orderId: s(order.id),
      orderCurrency: s(order.currency),
    });

    const beforeState = {
      requires_shipping: shippingSnapshotRequiresShipping(
        order.shipping_snapshot,
        order.shipping_id,
      ),
      currency: moneyContext.orderCurrency,
      address_id: s(order.address_id) || null,
      shipping_id: s(order.shipping_id) || null,
      shipping_carrier_id: s(order.shipping_carrier_id) || null,
      shipping_amount: roundMoney(
        moneyContext,
        n(order.shipping_amount),
        moneyContext.orderCurrency,
      ),
      shipping_address:
        order.shipping_address && typeof order.shipping_address === "object"
          ? order.shipping_address
          : null,
      shipping_snapshot:
        order.shipping_snapshot && typeof order.shipping_snapshot === "object"
          ? order.shipping_snapshot
          : null,
    };

    if (!requiresShipping) {
      const shippingSnapshot = {
        requires_shipping: false,
        free_shipping: false,
        carrier_name: null,
        store_shipping_carrier_name: null,
        eta_text: null,
        customer_price: 0,
        shipping_amount: 0,
        currency: moneyContext.orderCurrency,
        city_id: null,
        district_id: null,
        address_line1: null,
        address_line2: null,
        postal_code: null,
        text: null,
      };

      const nowIso = new Date().toISOString();

      const { error: updateError } = await admin
        .from("orders")
        .update({
          address_id: null,
          shipping_id: null,
          shipping_carrier_id: null,
          shipping_amount: 0,
          shipping_address: null,
          shipping_snapshot: shippingSnapshot,
          updated_at: nowIso,
        })
        .eq("id", orderId)
        .eq("store_id", storeUser.store_id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      const afterState = {
        requires_shipping: false,
        currency: moneyContext.orderCurrency,
        address_id: null,
        shipping_id: null,
        shipping_carrier_id: null,
        shipping_amount: 0,
        shipping_address: null,
        shipping_snapshot: shippingSnapshot,
      };

      const totals = await recalcOrderTotalsForAdmin({
        admin,
        storeId: s(storeUser.store_id),
        orderId,
        actorId: s(storeUser.id),
        auditAction: "order.shipping.updated",
        auditBeforeData: beforeState,
        auditAfterData: afterState,
      });

      return NextResponse.json({
        ok: true,
        currency: totals.currency,
        shipping_amount: totals.after.shipping_amount,
        total_amount: totals.after.total_amount,
      });
    }

    if (!cityId) {
      return NextResponse.json({ error: "اختر المدينة" }, { status: 400 });
    }

    if (!addressLine1) {
      return NextResponse.json({ error: "العنوان مطلوب" }, { status: 400 });
    }

    if (!shippingRateId) {
      return NextResponse.json({ error: "اختر شركة الشحن" }, { status: 400 });
    }

    const cityCheck = await admin
      .from("ref_cities")
      .select("id,name_ar,name_en")
      .eq("id", cityId)
      .maybeSingle();

    if (cityCheck.error || !cityCheck.data?.id) {
      return NextResponse.json({ error: "المدينة غير موجودة" }, { status: 400 });
    }

    let districtCheck: any = null;
    if (districtId) {
      const districtRes = await admin
        .from("ref_districts")
        .select("id,city_id,name_ar,name_en")
        .eq("id", districtId)
        .maybeSingle();

      if (districtRes.error || !districtRes.data?.id) {
        return NextResponse.json({ error: "الحي غير موجود" }, { status: 400 });
      }

      if (s(districtRes.data.city_id) !== cityId) {
        return NextResponse.json(
          { error: "الحي لا يتبع المدينة المختارة" },
          { status: 400 },
        );
      }

      districtCheck = districtRes.data;
    }

    const shippingOptions = await getShippingOptions({
      admin,
      store_id: storeUser.store_id,
      city_id: cityId,
      moneyContext,
    });

    const pickedRate =
      shippingOptions.find((option: any) => s(option.id) === shippingRateId) ||
      null;

    if (!pickedRate) {
      return NextResponse.json(
        { error: "شركة الشحن غير متاحة لهذه المدينة" },
        { status: 400 },
      );
    }

    let addressId = s(order.address_id) || null;

    if (order.customer_id) {
      if (addressId) {
        const { error: addressUpdateError } = await admin
          .from("customer_addresses")
          .update({
            city_id: cityId,
            district_id: districtId,
            address_line1: addressLine1,
            address_line2: addressLine2,
            postal_code: postalCode,
            updated_at: new Date().toISOString(),
          })
          .eq("id", addressId)
          .eq("customer_id", order.customer_id);

        if (addressUpdateError) {
          return NextResponse.json(
            { error: addressUpdateError.message },
            { status: 500 },
          );
        }
      } else {
        const { data: newAddress, error: createAddressError } = await admin
          .from("customer_addresses")
          .insert({
            customer_id: order.customer_id,
            city_id: cityId,
            district_id: districtId,
            address_line1: addressLine1,
            address_line2: addressLine2,
            postal_code: postalCode,
            label: null,
            is_default: false,
          })
          .select("id")
          .single();

        if (createAddressError || !newAddress?.id) {
          return NextResponse.json(
            { error: createAddressError?.message || "فشل حفظ العنوان" },
            { status: 500 },
          );
        }

        addressId = s(newAddress.id);
      }
    }

    const districtName =
      s(districtCheck?.name_ar) || s(districtCheck?.name_en) || null;
    const cityName =
      s(cityCheck.data?.name_ar) || s(cityCheck.data?.name_en) || null;

    const shippingAddress = {
      city_id: cityId,
      district_id: districtId,
      address_line1: addressLine1,
      address_line2: addressLine2,
      postal_code: postalCode,
      district_name: districtName,
      city_name: cityName,
      text: buildAddressText({
        address_line1: addressLine1,
        address_line2: addressLine2,
        district_name: districtName,
        city_name: cityName,
        postal_code: postalCode,
      }),
    };

    const shippingAmount = freeShipping ? 0 : n(pickedRate.customer_price);
    const codFee =
      pickedRate.cod_fee_customer == null ? null : n(pickedRate.cod_fee_customer);

    const shippingSnapshot = {
      requires_shipping: true,
      free_shipping: freeShipping,
      shipping_rate_id: shippingRateId,
      store_shipping_carrier_id: pickedRate.store_shipping_carrier_id || null,
      shipping_carrier_id: pickedRate.shipping_carrier_id || null,
      store_shipping_carrier_name: pickedRate.carrier_name || null,
      carrier_name: pickedRate.carrier_name || null,
      carrier_type: pickedRate.carrier_type || null,
      eta_text: pickedRate.eta_text || null,

      customer_price: shippingAmount,
      shipping_amount: shippingAmount,
      currency: moneyContext.orderCurrency,

      source_currency:
        pickedRate.source_currency === moneyContext.orderCurrency
          ? null
          : pickedRate.source_currency || null,
      customer_price_before_conversion:
        pickedRate.customer_price_conversion == null
          ? null
          : pickedRate.customer_price_conversion.amount_before_conversion,
      customer_price_after_conversion:
        pickedRate.customer_price_conversion == null
          ? null
          : pickedRate.customer_price_conversion.amount_after_conversion,
      customer_price_exchange_rate:
        pickedRate.customer_price_conversion == null
          ? null
          : pickedRate.customer_price_conversion.exchange_rate,

      cod_enabled: Boolean(pickedRate.cod_enabled),
      cod_fee_customer: codFee,
      cod_fee: codFee,
      payment_fee: codFee,
      cod_fee_currency:
        codFee == null ? null : moneyContext.orderCurrency,
      cod_fee_source_currency:
        pickedRate.cod_fee_conversion == null
          ? null
          : pickedRate.cod_fee_conversion.source_currency,
      cod_fee_before_conversion:
        pickedRate.cod_fee_conversion == null
          ? null
          : pickedRate.cod_fee_conversion.amount_before_conversion,
      cod_fee_after_conversion:
        pickedRate.cod_fee_conversion == null
          ? null
          : pickedRate.cod_fee_conversion.amount_after_conversion,
      cod_fee_exchange_rate:
        pickedRate.cod_fee_conversion == null
          ? null
          : pickedRate.cod_fee_conversion.exchange_rate,

      city_id: cityId,
      district_id: districtId,
      address_line1: addressLine1,
      address_line2: addressLine2,
      postal_code: postalCode,
      district_name: districtName,
      city_name: cityName,
      text: shippingAddress.text,
    };

    const nowIso = new Date().toISOString();

    const { error: updateOrderError } = await admin
      .from("orders")
      .update({
        address_id: addressId,
        shipping_id: shippingRateId,
        shipping_carrier_id: pickedRate.shipping_carrier_id || null,
        shipping_amount: shippingAmount,
        shipping_address: shippingAddress,
        shipping_snapshot: shippingSnapshot,
        updated_at: nowIso,
      })
      .eq("id", orderId)
      .eq("store_id", storeUser.store_id);

    if (updateOrderError) {
      return NextResponse.json(
        { error: updateOrderError.message },
        { status: 500 },
      );
    }

    const afterState = {
      requires_shipping: true,
      currency: moneyContext.orderCurrency,
      address_id: addressId,
      shipping_id: shippingRateId,
      shipping_carrier_id: pickedRate.shipping_carrier_id || null,
      shipping_amount: shippingAmount,
      shipping_address: shippingAddress,
      shipping_snapshot: shippingSnapshot,
      conversion: {
        shipping: pickedRate.customer_price_conversion,
        cod_fee: pickedRate.cod_fee_conversion,
      },
    };

    const totals = await recalcOrderTotalsForAdmin({
      admin,
      storeId: s(storeUser.store_id),
      orderId,
      actorId: s(storeUser.id),
      auditAction: "order.shipping.updated",
      auditBeforeData: beforeState,
      auditAfterData: afterState,
    });

    return NextResponse.json({
      ok: true,
      currency: totals.currency,
      shipping_amount: totals.after.shipping_amount,
      payment_fee: totals.after.payment_fee,
      tax_amount: totals.after.tax_amount,
      total_amount: totals.after.total_amount,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update shipping" },
      { status: 500 },
    );
  }
}