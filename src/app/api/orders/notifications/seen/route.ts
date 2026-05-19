// FILE: apps/merchant/src/app/api/orders/notifications/seen/route.ts

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type StoreUserRow = {
  id: string;
  store_id: string;
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
    .select("id, store_id")
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
      .select("id, store_id")
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

export async function POST() {
  try {
    const storeUser = await resolveStoreUser();
    const admin = supabaseAdmin();
    const seenAt = new Date().toISOString();

    const { error } = await admin
      .from("store_users")
      .update({
        orders_seen_at: seenAt,
      })
      .eq("id", storeUser.id)
      .eq("store_id", storeUser.store_id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      ok: true,
      seenAt,
    });
  } catch (error: any) {
    const msg = error?.message || "FAILED_TO_MARK_ORDER_NOTIFICATIONS_SEEN";

    return NextResponse.json(
      {
        ok: false,
        error: msg,
      },
      {
        status: msg === "UNAUTHENTICATED" ? 401 : 500,
      },
    );
  }
}