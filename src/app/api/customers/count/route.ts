//app/api/customers/count/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const sb = await supabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    return NextResponse.json({ count: 0 }, { status: 200 });
  }

  const { data: storeUser, error: storeUserError } = await sb
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", user.id)
    .single();

  if (storeUserError || !storeUser?.store_id) {
    return NextResponse.json({ count: 0 }, { status: 200 });
  }

  const { count, error } = await sb
    .from("store_customers")
    .select("*", { count: "exact", head: true })
    .eq("store_id", storeUser.store_id);

  if (error) {
    return NextResponse.json({ count: 0 }, { status: 200 });
  }

  return NextResponse.json({ count: count || 0 }, { status: 200 });
}