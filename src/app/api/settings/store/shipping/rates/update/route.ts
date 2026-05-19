// FILE: apps/merchant/src/app/api/settings/store/shipping/rates/update/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function resJson(ok: boolean, value: any, extra?: Record<string, any>) {
  return NextResponse.json(
    { ok, value, ...(extra || {}) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

async function resolveStoreId(
  supabase: any,
  authUserId: string,
  email?: string | null,
) {
  const r1 = await supabase
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", authUserId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (r1.data?.store_id) return r1.data.store_id as string;

  const e = String(email || "").toLowerCase().trim();
  if (!e) return null;

  const r2 = await supabase
    .from("store_users")
    .select("store_id")
    .ilike("email", e)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return r2.data?.store_id || null;
}

function toMoney(x: unknown) {
  const n = Number(x ?? 0);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export async function POST(req: Request) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );

  const { data: auth, error: authErr } = await supabase.auth.getUser();

  if (authErr || !auth?.user) {
    return resJson(false, null, { error: "UNAUTHENTICATED" });
  }

  const storeId = await resolveStoreId(
    supabase,
    auth.user.id,
    auth.user.email,
  );

  if (!storeId) {
    return resJson(false, null, { error: "STORE_NOT_FOUND" });
  }

  const body = await req.json().catch(() => ({}));
  const rate_id = String(body.rate_id || "").trim();

  if (!rate_id) {
    return resJson(false, null, { error: "rate_id_required" });
  }

  const { data: row, error: rowError } = await supabase
    .from("store_shipping_rates")
    .select("id, store_id")
    .eq("id", rate_id)
    .eq("store_id", storeId)
    .maybeSingle();

  if (rowError) {
    return resJson(false, null, { error: rowError.message });
  }

  if (!row?.id) {
    return resJson(false, null, { error: "not_found" });
  }

  const update: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (body.customer_price !== undefined) {
    update.customer_price = toMoney(body.customer_price);
  }

  if (body.eta_text !== undefined) {
    update.eta_text = String(body.eta_text || "").trim() || null;
  }

  if (body.cod_enabled !== undefined) {
    update.cod_enabled = Boolean(body.cod_enabled);
  }

  if (body.cod_fee_customer !== undefined) {
    update.cod_fee_customer = toMoney(body.cod_fee_customer);
  }

  if (body.cod_fee_include_tax !== undefined) {
    update.cod_fee_include_tax = Boolean(body.cod_fee_include_tax);
  }

  if (body.cod_enabled !== undefined && !Boolean(body.cod_enabled)) {
    update.cod_fee_customer = 0;
    update.cod_fee_include_tax = false;
  }

  const { data: updated, error: updateError } = await supabase
    .from("store_shipping_rates")
    .update(update)
    .eq("id", rate_id)
    .eq("store_id", storeId)
    .select("*")
    .maybeSingle();

  if (updateError) {
    return resJson(false, null, { error: updateError.message });
  }

  return resJson(true, updated);
}