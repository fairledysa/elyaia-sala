// FILE: apps/merchant/src/app/api/settings/store/payments/get/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function resolveStoreId(
  supabase: any,
  authUserId: string,
  email?: string | null
) {
  // 1) auth_user_id
  const r1 = await supabase
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", authUserId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (r1.data?.store_id) return r1.data.store_id as string;

  // 2) fallback email
  const e = String(email || "")
    .toLowerCase()
    .trim();
  if (!e) return null;

  const r2 = await supabase
    .from("store_users")
    .select("store_id")
    .ilike("email", e)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (r2.data?.store_id as string) || null;
}

export async function GET() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user)
    return NextResponse.json(
      { ok: false, error: "UNAUTHENTICATED" },
      { status: 401 }
    );

  const store_id = await resolveStoreId(supabase, user.id, user.email);
  if (!store_id)
    return NextResponse.json({ ok: false, error: "NO_STORE" }, { status: 403 });

  const [methods, banks, checkout] = await Promise.all([
    supabase
      .from("store_payment_methods")
      .select("id,provider_code,enabled,status,config,sort_order,updated_at")
      .eq("store_id", store_id)
      .order("sort_order", { ascending: true }),

    supabase
      .from("store_bank_accounts")
      .select("id,bank_name,account_holder,iban,is_primary,status,updated_at")
      .eq("store_id", store_id)
      .order("is_primary", { ascending: false })
      .order("updated_at", { ascending: false }),

    supabase
      .from("store_checkout_settings")
      .select("prefill_from_last_order,company_purchase_enabled,updated_at")
      .eq("store_id", store_id)
      .maybeSingle(),
  ]);

  if (methods.error)
    return NextResponse.json(
      { ok: false, error: methods.error.message },
      { status: 500 }
    );
  if (banks.error)
    return NextResponse.json(
      { ok: false, error: banks.error.message },
      { status: 500 }
    );
  if (checkout.error)
    return NextResponse.json(
      { ok: false, error: checkout.error.message },
      { status: 500 }
    );

  return NextResponse.json({
    ok: true,
    store_id,
    payment_methods: methods.data || [],
    bank_accounts: banks.data || [],
    checkout: checkout.data || {
      prefill_from_last_order: true,
      company_purchase_enabled: false,
    },
  });
}
