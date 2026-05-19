// app/api/orders/[id]/customer/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function s(x: any) {
  return String(x ?? "").trim();
}

function sameText(a: any, b: any) {
  return s(a) === s(b);
}

async function resolveStoreUser() {
  const sb = await supabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) return null;

  const { data: storeUser } = await sb
    .from("store_users")
    .select("id,store_id,auth_user_id,name,email")
    .eq("auth_user_id", user.id)
    .single();

  return storeUser ?? null;
}

async function writeOrderAuditLog(args: {
  admin: ReturnType<typeof supabaseAdmin>;
  storeId: string;
  actorId: string;
  orderId: string;
  beforeData: any;
  afterData: any;
}) {
  const { admin, storeId, actorId, orderId, beforeData, afterData } = args;

  const beforeCustomerId = s(beforeData?.customer_id);
  const afterCustomerId = s(afterData?.customer_id);

  const changed =
    beforeCustomerId !== afterCustomerId ||
    !sameText(beforeData?.customer?.full_name, afterData?.customer?.full_name) ||
    !sameText(beforeData?.customer?.email, afterData?.customer?.email) ||
    !sameText(beforeData?.customer?.phone_e164, afterData?.customer?.phone_e164);

  if (!changed) return;

  await admin.from("audit_logs").insert({
    store_id: storeId,
    actor_type: "store_user",
    actor_id: actorId,
    action: "order.customer.updated",
    entity_type: "order",
    entity_id: orderId,
    before_data: beforeData,
    after_data: afterData,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const storeUser = await resolveStoreUser();

    if (!storeUser?.store_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const orderId = s(id);
    const body = await req.json();

    const admin = supabaseAdmin();

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id,store_id,customer_id,shipping_address")
      .eq("id", orderId)
      .eq("store_id", storeUser.store_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    let beforeCustomer: any = null;

    if (order.customer_id) {
      const { data: oldCustomer } = await admin
        .from("customers")
        .select("id,full_name,email,phone_e164")
        .eq("id", order.customer_id)
        .maybeSingle();

      beforeCustomer = oldCustomer ?? null;
    }

    let customerId = s(body?.customer_id);

    if (!customerId) {
      const fullName = s(body?.customer?.full_name);
      const phone = s(body?.customer?.phone_e164);
      const email = s(body?.customer?.email) || null;
      const birthDate = s(body?.customer?.birth_date) || null;
      const gender = s(body?.customer?.gender) || null;

      if (!fullName) {
        return NextResponse.json({ error: "اسم العميل مطلوب" }, { status: 400 });
      }

      if (!phone) {
        return NextResponse.json({ error: "رقم الجوال مطلوب" }, { status: 400 });
      }

      const { data: newCustomer, error: createError } = await admin
        .from("customers")
        .insert({
          auth_user_id: null,
          full_name: fullName,
          phone_e164: phone,
          email,
          birth_date: birthDate,
          gender: gender || null,
        })
        .select("id")
        .single();

      if (createError || !newCustomer) {
        return NextResponse.json(
          { error: createError?.message || "فشل إنشاء العميل" },
          { status: 500 }
        );
      }

      customerId = s(newCustomer.id);

      const { error: storeCustomerError } = await admin.from("store_customers").upsert(
        {
          store_id: storeUser.store_id,
          customer_id: customerId,
        },
        {
          onConflict: "store_id,customer_id",
        }
      );

      if (storeCustomerError) {
        return NextResponse.json(
          { error: storeCustomerError.message || "فشل ربط العميل بالمتجر" },
          { status: 500 }
        );
      }
    }

    const { data: customer, error: customerError } = await admin
      .from("customers")
      .select("id,full_name,email,phone_e164")
      .eq("id", customerId)
      .maybeSingle();

    if (customerError || !customer) {
      return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });
    }

    const shippingAddress =
      order?.shipping_address && typeof order.shipping_address === "object"
        ? {
            ...order.shipping_address,
            customer: {
              ...(order.shipping_address?.customer ?? {}),
              full_name: s(customer.full_name) || null,
              email: s(customer.email) || null,
              phone: s(customer.phone_e164) || null,
            },
          }
        : order?.shipping_address ?? null;

    const { error: updateError } = await admin
      .from("orders")
      .update({
        customer_id: customerId,
        shipping_address: shippingAddress,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("store_id", storeUser.store_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await writeOrderAuditLog({
      admin,
      storeId: s(storeUser.store_id),
      actorId: s(storeUser.id),
      orderId,
      beforeData: {
        customer_id: s(order.customer_id) || null,
        customer: beforeCustomer
          ? {
              id: s(beforeCustomer.id) || null,
              full_name: s(beforeCustomer.full_name) || null,
              email: s(beforeCustomer.email) || null,
              phone_e164: s(beforeCustomer.phone_e164) || null,
            }
          : null,
      },
      afterData: {
        customer_id: s(customer.id) || null,
        customer: {
          id: s(customer.id) || null,
          full_name: s(customer.full_name) || null,
          email: s(customer.email) || null,
          phone_e164: s(customer.phone_e164) || null,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      customer_id: customerId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update customer" },
      { status: 500 }
    );
  }
}