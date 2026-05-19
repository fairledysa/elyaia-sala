// app/api/customers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const sb = await supabaseServer();

    const {
      data: { user },
    } = await sb.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: storeUser, error: storeUserError } = await sb
      .from("store_users")
      .select("store_id")
      .eq("auth_user_id", user.id)
      .single();

    if (storeUserError) {
      return NextResponse.json(
        { error: storeUserError.message },
        { status: 500 }
      );
    }

    if (!storeUser?.store_id) {
      return NextResponse.json({ error: "No store" }, { status: 400 });
    }

    const storeId = storeUser.store_id;

    const searchParams = req.nextUrl.searchParams;
    const limitRaw = Number(searchParams.get("limit") ?? 20);
    const offsetRaw = Number(searchParams.get("offset") ?? 0);

    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 20;
    const offset =
      Number.isFinite(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0;

    const admin = supabaseAdmin();

    const { data, error, count } = await admin
      .from("store_customers")
      .select(
        `
        first_seen_at,
        last_seen_at,
        customer:customers (
          id,
          full_name,
          email,
          phone_e164,
          gender,
          birth_date,
          created_at,
          total_orders,
          total_spent,
          last_order_at
        )
      `,
        { count: "exact" }
      )
      .eq("store_id", storeId)
      .order("first_seen_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items = (data ?? [])
      .map((row: any) => {
        const c = row?.customer;
        if (!c) return null;

        return {
          id: c.id,
          full_name: c.full_name,
          email: c.email,
          phone_e164: c.phone_e164,
          gender: c.gender,
          birth_date: c.birth_date,
          created_at: c.created_at,
          total_orders: c.total_orders ?? 0,
          total_spent: c.total_spent ?? 0,
          last_order_at: c.last_order_at,
          first_seen_at: row.first_seen_at,
          last_seen_at: row.last_seen_at,
        };
      })
      .filter(Boolean);

    return NextResponse.json(
      {
        items,
        total: count ?? 0,
        limit,
        offset,
        hasMore: offset + items.length < (count ?? 0),
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load customers" },
      { status: 500 }
    );
  }
}