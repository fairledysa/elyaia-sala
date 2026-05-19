// app/api/orders/route.ts

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function s(x: any) {
  return String(x ?? "").trim();
}

function n(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? v : 0;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isUniqueConflict(error: any) {
  const msg = s(error?.message).toLowerCase();
  const code = s(error?.code);

  return (
    code === "23505" ||
    msg.includes("duplicate key") ||
    msg.includes("unique constraint") ||
    msg.includes("orders_store_order_number_uq") ||
    msg.includes("orders_store_public_no_uq") ||
    msg.includes("orders_store_invoice_no_uq")
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
    .select("id, store_id, auth_user_id, name, email")
    .eq("auth_user_id", user.id)
    .single();

  return storeUser ?? null;
}

async function getNextNumericValue(
  admin: ReturnType<typeof supabaseAdmin>,
  storeId: string,
  column: "order_number" | "public_no" | "invoice_no"
) {
  const { data, error } = await admin
    .from("orders")
    .select(column)
    .eq("store_id", storeId)
    .not(column, "is", null)
    .order(column, { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const row = (data ?? {}) as Partial<
    Record<"order_number" | "public_no" | "invoice_no", number | null>
  >;

  return Math.max(1, n(row[column]) + 1);
}

async function buildInsertPayload(
  admin: ReturnType<typeof supabaseAdmin>,
  storeId: string,
  mode: string
) {
  const [nextOrderNumber, nextPublicNo, nextInvoiceNo] = await Promise.all([
    getNextNumericValue(admin, storeId, "order_number"),
    getNextNumericValue(admin, storeId, "public_no"),
    getNextNumericValue(admin, storeId, "invoice_no"),
  ]);

  const nowIso = new Date().toISOString();

  return {
    store_id: storeId,

    customer_id: null,
    cart_id: null,
    address_id: null,

    order_number: nextOrderNumber,
    public_no: nextPublicNo,
    invoice_no: nextInvoiceNo,
    public_token: randomUUID().replace(/-/g, ""),

    // ✅ الصحيح: الطلب يبدأ كمسودة
    status: "draft",
    base_status_key: "draft",
    store_status_id: null,
    status_updated_at: nowIso,
    status_note:
      mode === "draft" ? "تم إنشاء الطلب كمسودة" : "تم إنشاء الطلب كمسودة",

    currency: "SAR",
    subtotal: 0,
    shipping_amount: 0,
    tax_amount: 0,
    discount_amount: 0,
    total_amount: 0,

    payment_method: null,
    payment_status: "unpaid",

    shipping_id: null,
    shipping_carrier_id: null,
    shipping_address: null,
    shipping_snapshot: {
      requires_shipping: false,
      free_shipping: false,
      customer_price: 0,
      cod_fee_customer: 0,
    },

    updated_at: nowIso,
  };
}

export async function POST(req: NextRequest) {
  try {
    const storeUser = await resolveStoreUser();

    if (!storeUser?.store_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const mode = s(body?.mode).toLowerCase();

    const admin = supabaseAdmin();
    const storeId = s(storeUser.store_id);

    let lastError: any = null;

    for (let attempt = 1; attempt <= 6; attempt += 1) {
      try {
        const insertPayload = await buildInsertPayload(admin, storeId, mode);

        const { data: order, error } = await admin
          .from("orders")
          .insert(insertPayload)
          .select("id, order_number, public_no, invoice_no")
          .single();

        if (error) {
          if (isUniqueConflict(error)) {
            lastError = error;
            await sleep(120 * attempt);
            continue;
          }

          return NextResponse.json(
            { error: error.message || "تعذر إنشاء الطلب" },
            { status: 400 }
          );
        }

        if (!order?.id) {
          return NextResponse.json(
            { error: "تعذر إنشاء الطلب" },
            { status: 400 }
          );
        }

        return NextResponse.json(
          {
            ok: true,
            id: s(order.id),
            order_number: n(order.order_number),
            public_no: n(order.public_no),
            invoice_no: n(order.invoice_no),
            edit_url: `/orders/${s(order.id)}/new`,
          },
          { status: 200 }
        );
      } catch (error: any) {
        if (isUniqueConflict(error)) {
          lastError = error;
          await sleep(120 * attempt);
          continue;
        }

        throw error;
      }
    }

    return NextResponse.json(
      {
        error: "تعذر إنشاء الطلب بسبب تعارض الأرقام، حاول مرة أخرى",
        details: s(lastError?.message) || null,
      },
      { status: 409 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to create order" },
      { status: 500 }
    );
  }
}