// FILE: apps/merchant/src/app/api/orders/notifications/route.ts

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type StoreUserRow = {
  id: string;
  store_id: string;
  orders_seen_at: string | null;
};

function s(value: unknown) {
  return String(value ?? "").trim();
}

async function resolveStoreUser(): Promise<StoreUserRow> {
  const sb = await supabaseServer();

  const {
    data: { user },
    error: authError,
  } = await sb.auth.getUser();

  if (authError || !user?.id) {
    throw new Error("UNAUTHENTICATED");
  }

  const admin = supabaseAdmin();

  const byAuth = await admin
    .from("store_users")
    .select("id, store_id, orders_seen_at")
    .eq("auth_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (byAuth.error) {
    throw new Error(byAuth.error.message);
  }

  if (byAuth.data?.id && byAuth.data?.store_id) {
    return byAuth.data as StoreUserRow;
  }

  const email = s(user.email).toLowerCase();

  if (email) {
    const byEmail = await admin
      .from("store_users")
      .select("id, store_id, orders_seen_at")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (byEmail.error) {
      throw new Error(byEmail.error.message);
    }

    if (byEmail.data?.id && byEmail.data?.store_id) {
      return byEmail.data as StoreUserRow;
    }
  }

  throw new Error("STORE_NOT_FOUND");
}

export async function GET() {
  try {
    const storeUser = await resolveStoreUser();
    const admin = supabaseAdmin();

    let query: any = admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeUser.store_id)
      .neq("status", "draft");

    if (storeUser.orders_seen_at) {
      query = query.gt("created_at", storeUser.orders_seen_at);
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      count: count ?? 0,
      seenAt: storeUser.orders_seen_at ?? null,
    });
  } catch (error: any) {
    const msg = error?.message || "FAILED_TO_LOAD_ORDER_NOTIFICATIONS";

    return NextResponse.json(
      {
        error: msg,
        count: 0,
        seenAt: null,
      },
      {
        status: msg === "UNAUTHENTICATED" ? 401 : 500,
      },
    );
  }
}