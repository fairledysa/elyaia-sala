// FILE: apps/merchant/src/app/api/coupons/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function getStoreIdFromSession() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
      },
    },
  );

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("UNAUTHENTICATED");

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", auth.user.id)
    .limit(1);

  if (error) throw error;
  const storeId = data?.[0]?.store_id;
  if (!storeId) throw new Error("STORE_NOT_FOUND");

  return storeId as string;
}

export async function GET() {
  try {
    const store_id = await getStoreIdFromSession();
    const sb = supabaseAdmin();

    const { data, error } = await sb
      .from("coupons")
      .select("*")
      .eq("store_id", store_id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ data: data ?? [] });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "FAILED" },
      { status: 400 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const store_id = await getStoreIdFromSession();
    const body = await req.json().catch(() => ({}));
    if (!body?.code) throw new Error("CODE_REQUIRED");

    const sb = supabaseAdmin();
    const payload = {
      ...body,
      store_id,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await sb
      .from("coupons")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "FAILED" },
      { status: 400 },
    );
  }
}
