// FILE: apps/merchant/src/app/api/orders/notification-summary/route.ts

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

export async function GET() {
  try {
    const storeId = await resolveStoreId();

    if (!storeId) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          count: 0,
        },
        { status: 401 },
      );
    }

    const admin = supabaseAdmin();

    const { count, error } = await admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .neq("status", "draft")
      .neq("base_status_key", "draft")
      .eq("base_status_key", "pending_review");

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
          count: 0,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        count: count ?? 0,
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || "Failed to load order notifications",
        count: 0,
      },
      { status: 500 },
    );
  }
}