// FILE: apps/merchant/src/app/api/customers/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function s(x: any) {
  return String(x ?? "").trim();
}

async function resolveStoreContext() {
  const authSb = await supabaseServer();

  const {
    data: { user },
  } = await authSb.auth.getUser();

  if (!user?.id) {
    return { storeId: null, error: "Unauthorized", status: 401 };
  }

  const admin = supabaseAdmin();

  const { data: storeUser, error } = await admin
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", user.id)
    .single();

  if (error || !storeUser?.store_id) {
    return { storeId: null, error: "No store", status: 400 };
  }

  return {
    storeId: String(storeUser.store_id),
    error: null,
    status: 200,
  };
}

async function resolveCustomerAccess(args: {
  admin: any;
  storeId: string;
  customerId: string;
}) {
  const { admin, storeId, customerId } = args;

  const linkR = await admin
    .from("store_customers")
    .select("store_id,first_seen_at,last_seen_at")
    .eq("store_id", storeId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (linkR.error && linkR.error.code !== "PGRST116") {
    throw new Error(linkR.error.message);
  }

  if (linkR.data?.store_id) {
    return {
      allowed: true,
      storeCustomer: {
        store_id: String(linkR.data.store_id),
        first_seen_at: linkR.data.first_seen_at ?? null,
        last_seen_at: linkR.data.last_seen_at ?? null,
      },
    };
  }

  const ordersR = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("customer_id", customerId);

  if (ordersR.error) {
    throw new Error(ordersR.error.message);
  }

  const hasOrders = Number(ordersR.count ?? 0) > 0;

  return {
    allowed: hasOrders,
    storeCustomer: null,
  };
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const customerId = s(id);

    if (!customerId) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? 10);
    const offsetRaw = Number(req.nextUrl.searchParams.get("offset") ?? 0);

    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 50) : 10;

    const offset =
      Number.isFinite(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0;

    const auth = await resolveStoreContext();

    if (!auth.storeId) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const storeId = auth.storeId;
    const admin = supabaseAdmin();

    const access = await resolveCustomerAccess({
      admin,
      storeId,
      customerId,
    });

    if (!access.allowed) {
      return NextResponse.json(
        {
          error: "Customer not found",
          reason: "NO_STORE_CUSTOMER_LINK_OR_ORDERS_FOR_THIS_STORE",
        },
        { status: 404 },
      );
    }

    const customerR = await admin
      .from("customers")
      .select(
        `
        id,
        full_name,
        email,
        phone_e164,
        gender,
        birth_date,
        city_id,
        created_at,
        total_orders,
        total_spent,
        last_order_at
      `,
      )
      .eq("id", customerId)
      .maybeSingle();

    if (customerR.error) {
      return NextResponse.json(
        { error: customerR.error.message },
        { status: 500 },
      );
    }

    if (!customerR.data?.id) {
      return NextResponse.json(
        {
          error: "Customer not found",
          reason: "CUSTOMER_ROW_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    const ordersR = await admin
      .from("orders")
      .select(
        `
        id,
        order_number,
        total_amount,
        status,
        created_at,
        shipping_address,
        address_id
      `,
        { count: "exact" },
      )
      .eq("store_id", storeId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (ordersR.error) {
      return NextResponse.json(
        { error: ordersR.error.message },
        { status: 500 },
      );
    }

    const orders = Array.isArray(ordersR.data) ? ordersR.data : [];

    const addressIds = Array.from(
      new Set(
        orders
          .map((order: any) => order.address_id)
          .filter((value: any) => typeof value === "string" && value),
      ),
    );

    let addressesMap = new Map<string, string>();

    if (addressIds.length > 0) {
      const addressesR = await admin
        .from("customer_addresses")
        .select(
          `
          id,
          address_line1,
          address_line2,
          postal_code,
          notes,
          city:ref_cities(name_ar),
          district:ref_districts(name_ar),
          country:ref_countries(name_ar)
        `,
        )
        .in("id", addressIds);

      if (!addressesR.error) {
        addressesMap = new Map(
          (addressesR.data ?? []).map((address: any) => {
            const parts = [
              address?.address_line1,
              address?.address_line2,
              address?.district?.name_ar,
              address?.city?.name_ar,
              address?.country?.name_ar,
              address?.postal_code,
            ]
              .map((value: any) => s(value))
              .filter(Boolean);

            return [String(address.id), parts.join("، ")];
          }),
        );
      }
    }

    const normalizedOrders = orders.map((order: any) => ({
      ...order,
      address_text: order.address_id
        ? addressesMap.get(order.address_id) ?? null
        : null,
    }));

    return NextResponse.json(
      {
        customer: {
          ...customerR.data,
          store_customers: access.storeCustomer ? [access.storeCustomer] : [],
        },
        orders: normalizedOrders,
        ordersCount: ordersR.count ?? 0,
        hasMoreOrders: offset + normalizedOrders.length < (ordersR.count ?? 0),
        nextOffset: offset + normalizedOrders.length,
      },
      { status: 200 },
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "FAILED_TO_LOAD_CUSTOMER" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const customerId = s(id);

    if (!customerId) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const auth = await resolveStoreContext();

    if (!auth.storeId) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const storeId = auth.storeId;
    const admin = supabaseAdmin();

    const access = await resolveCustomerAccess({
      admin,
      storeId,
      customerId,
    });

    if (!access.allowed) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));

    const full_name = s(body?.full_name);
    const phone_e164 = s(body?.phone_e164);
    const gender = s(body?.gender).toLowerCase();
    const birth_date = s(body?.birth_date);
    const city_id = s(body?.city_id);

    if (!full_name) {
      return NextResponse.json(
        { error: "NAME_REQUIRED", message_ar: "الاسم مطلوب." },
        { status: 400 },
      );
    }

    if (!birth_date || !gender || !city_id) {
      return NextResponse.json(
        {
          error: "MISSING_FIELDS",
          message_ar: "أكمل الاسم وتاريخ الميلاد والجنس والمدينة.",
        },
        { status: 400 },
      );
    }

    if (gender !== "male" && gender !== "female") {
      return NextResponse.json(
        { error: "INVALID_GENDER", message_ar: "قيمة الجنس غير صحيحة." },
        { status: 400 },
      );
    }

    const updatedR = await admin
      .from("customers")
      .update({
        full_name,
        phone_e164: phone_e164 || null,
        gender,
        birth_date,
        city_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", customerId)
      .select(
        `
        id,
        full_name,
        email,
        phone_e164,
        gender,
        birth_date,
        city_id,
        created_at,
        total_orders,
        total_spent,
        last_order_at
      `,
      )
      .single();

    if (updatedR.error) {
      return NextResponse.json(
        {
          error: updatedR.error.message,
          message_ar: "تعذر تحديث بيانات العميل.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        customer: {
          ...updatedR.data,
          store_customers: access.storeCustomer ? [access.storeCustomer] : [],
        },
      },
      { status: 200 },
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "FAILED_TO_UPDATE_CUSTOMER" },
      { status: 500 },
    );
  }
}