// app/api/orders/list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type BaseStatusRow = {
  key: string;
  name_ar: string;
};

type StoreStatusRow = {
  id: string;
  base_status_key: string;
  name: string;
};

type OrderDbRow = {
  id: string;
  store_id: string;
  customer_id?: string | null;
  order_number?: number | null;
  currency?: string | null;
  total_amount?: number | null;
  created_at?: string | null;
  status?: string | null;
  base_status_key?: string | null;
  store_status_id?: string | null;
  shipping_address?: any;
};

type CustomerRow = {
  id: string;
  full_name?: string | null;
};

function s(x: any) {
  return String(x ?? "").trim();
}

function n(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function extractCityName(shippingAddress: any) {
  if (!shippingAddress || typeof shippingAddress !== "object") return "-";

  const candidates = [
    shippingAddress.city_name,
    shippingAddress.city,
    shippingAddress.cityName,
    shippingAddress.town,
    shippingAddress.state,
    shippingAddress.region,
  ];

  for (const item of candidates) {
    const value = s(item);
    if (value) return value;
  }

  return "-";
}

function detectChannel(order: OrderDbRow) {
  const addr = order.shipping_address;
  const raw = s(
    addr?.channel ||
      addr?.source ||
      addr?.device ||
      addr?.platform ||
      addr?.sales_channel
  ).toLowerCase();

  if (!raw) return "المتجر";

  if (raw.includes("mobile app") || raw.includes("app")) return "تطبيق جوال";
  if (
    raw.includes("mobile") ||
    raw.includes("iphone") ||
    raw.includes("android")
  ) {
    return "متصفح جوال";
  }
  if (
    raw.includes("web") ||
    raw.includes("desktop") ||
    raw.includes("browser")
  ) {
    return "متصفح";
  }

  return "المتجر";
}

async function resolveStoreId() {
  const sb = await supabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) return null;

  const { data: storeUser } = await sb
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", user.id)
    .single();

  return storeUser?.store_id ?? null;
}

function applyStatusFilter(query: any, statusType: string, statusValue: string) {
  if (!statusType || !statusValue) return query;

  if (statusType === "store") {
    return query.eq("store_status_id", statusValue);
  }

  if (statusType === "base") {
    return query.eq("base_status_key", statusValue).is("store_status_id", null);
  }

  return query;
}

function isDraftOrder(order: {
  status?: string | null;
  base_status_key?: string | null;
  store_status_id?: string | null;
}) {
  return (
    s(order.status).toLowerCase() === "draft" ||
    (!s(order.base_status_key) && !s(order.store_status_id))
  );
}

export async function GET(req: NextRequest) {
  try {
    const storeId = await resolveStoreId();

    if (!storeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const search = s(req.nextUrl.searchParams.get("q"));
    const statusType = s(req.nextUrl.searchParams.get("status_type"));
    const statusValue = s(req.nextUrl.searchParams.get("status_value"));

    const offsetRaw = Number(req.nextUrl.searchParams.get("offset") ?? 0);
    const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? 15);

    const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0;
    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 15;

    const admin = supabaseAdmin();

    const [
      { data: baseStatusesRaw, error: baseError },
      { data: storeStatusesRaw, error: storeStatusesError },
    ] = await Promise.all([
      admin.from("order_status_bases").select("key, name_ar"),
      admin
        .from("store_order_statuses")
        .select("id, base_status_key, name")
        .eq("store_id", storeId),
    ]);

    if (baseError) {
      return NextResponse.json({ error: baseError.message }, { status: 500 });
    }

    if (storeStatusesError) {
      return NextResponse.json(
        { error: storeStatusesError.message },
        { status: 500 }
      );
    }

    let ordersQuery = admin
      .from("orders")
      .select(
        `
          id,
          store_id,
          customer_id,
          order_number,
          currency,
          total_amount,
          created_at,
          status,
          base_status_key,
          store_status_id,
          shipping_address
        `,
        { count: "exact" }
      )
      .eq("store_id", storeId);

    ordersQuery = applyStatusFilter(ordersQuery, statusType, statusValue);

    const {
      data: ordersRaw,
      error: ordersError,
      count: totalCount,
    } = await ordersQuery
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (ordersError) {
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    const orders = (ordersRaw ?? []) as OrderDbRow[];

    const customerIds = Array.from(
      new Set(orders.map((x) => s(x.customer_id)).filter(Boolean))
    );

    let customersMap = new Map<string, CustomerRow>();

    if (customerIds.length > 0) {
      const { data: customersRaw, error: customersError } = await admin
        .from("customers")
        .select("id, full_name")
        .in("id", customerIds);

      if (customersError) {
        return NextResponse.json(
          { error: customersError.message },
          { status: 500 }
        );
      }

      customersMap = new Map(
        ((customersRaw ?? []) as CustomerRow[]).map((item) => [item.id, item])
      );
    }

    const baseMap = new Map(
      ((baseStatusesRaw ?? []) as BaseStatusRow[]).map((item) => [item.key, item])
    );

    const storeStatusMap = new Map(
      ((storeStatusesRaw ?? []) as StoreStatusRow[]).map((item) => [item.id, item])
    );

    let rows = orders.map((order) => {
      const customer = order.customer_id
        ? customersMap.get(String(order.customer_id))
        : null;

      const storeStatus = order.store_status_id
        ? storeStatusMap.get(String(order.store_status_id))
        : null;

      const draft = isDraftOrder(order);

      const baseStatusKey = draft
        ? ""
        : s(order.base_status_key) || s(storeStatus?.base_status_key) || "";

      const baseStatus = baseStatusKey ? baseMap.get(baseStatusKey) : null;

      return {
        id: order.id,
        order_number: s(order.order_number),
        customer_name: s(customer?.full_name) || "عميل بدون اسم",
        amount: n(order.total_amount),
        currency: s(order.currency) || "SAR",
        city: extractCityName(order.shipping_address),
        channel: detectChannel(order),
        created_at: order.created_at || null,
        status: s(order.status) || null,
        is_draft: draft,
        base_status_key: baseStatusKey,
        base_status: draft ? "مسودة" : s(baseStatus?.name_ar) || "",
        store_status_id: draft ? null : s(order.store_status_id) || null,
        sub_status: draft ? null : s(storeStatus?.name) || null,
      };
    });

    if (search) {
      rows = rows.filter((row) => {
        const haystack = [
          row.order_number,
          row.customer_name,
          row.city,
          row.channel,
          row.base_status,
          row.sub_status,
          row.status,
        ]
          .map((x) => s(x).toLowerCase())
          .join(" ");

        return haystack.includes(search.toLowerCase());
      });
    }

    const hasMore = offset + limit < (totalCount ?? 0);

    return NextResponse.json(
      {
        rows,
        total: totalCount ?? 0,
        hasMore,
        nextOffset: hasMore ? offset + limit : null,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load orders list" },
      { status: 500 }
    );
  }
}