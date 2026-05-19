// app/api/orders/customer-search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function s(x: any) {
  return String(x ?? "").trim();
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

export async function GET(req: NextRequest) {
  try {
    const storeId = await resolveStoreId();

    if (!storeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const q = s(req.nextUrl.searchParams.get("q"));
    if (!q) {
      return NextResponse.json({ rows: [] });
    }

    const admin = supabaseAdmin();

    const { data: linkedRows, error: linkError } = await admin
      .from("store_customers")
      .select("customer_id")
      .eq("store_id", storeId)
      .limit(200);

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 500 });
    }

    const customerIds = Array.from(
      new Set((linkedRows ?? []).map((x: any) => s(x.customer_id)).filter(Boolean))
    );

    if (customerIds.length === 0) {
      return NextResponse.json({ rows: [] });
    }

    const { data: customers, error } = await admin
      .from("customers")
      .select("id,full_name,email,phone_e164,birth_date,gender")
      .in("id", customerIds)
      .or(
        `full_name.ilike.%${q}%,phone_e164.ilike.%${q}%,email.ilike.%${q}%`
      )
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      rows: Array.isArray(customers) ? customers : [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to search customers" },
      { status: 500 }
    );
  }
}