// app/api/customers/stats/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const sb = await supabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: storeUser } = await sb
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", user.id)
    .single();

  const storeId = storeUser?.store_id;

  const { count } = await sb
    .from("store_customers")
    .select("*", { count: "exact", head: true })
    .eq("store_id", storeId);

  return NextResponse.json({
    total: count || 0,
  });
}