// FILE: apps/merchant/src/app/api/settings/store/payments/update/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function resolveStoreId(supabase: any, authUserId: string, email?: string | null) {
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

  return (r2.data?.store_id as string) || null;
}

type Op =
  | { op: "toggle_provider"; provider_code: string; enabled: boolean }
  | {
      op: "update_provider_config";
      provider_code: string;
      config: Record<string, any>;
      status?: "inactive" | "needs_setup" | "active" | "disabled_by_platform";
    }
  | {
      op: "bank_add";
      bank_name: string;
      account_holder: string;
      iban: string;
      is_primary?: boolean;
    }
  | {
      op: "bank_update";
      id: string;
      patch: Partial<{
        bank_name: string;
        account_holder: string;
        iban: string;
        is_primary: boolean;
        status: "active" | "disabled";
      }>;
    }
  | { op: "bank_delete"; id: string }
  | {
      op: "checkout_update";
      patch: Partial<{
        prefill_from_last_order: boolean;
        company_purchase_enabled: boolean;
      }>;
    };

function cleanIban(iban: string) {
  return String(iban || "").toUpperCase().replace(/\s+/g, "");
}

// ✅ ضمان وجود صف للمزوّد
async function ensureProviderRow(supabase: any, store_id: string, provider_code: string) {
  const ex = await supabase
    .from("store_payment_methods")
    .select("id")
    .eq("store_id", store_id)
    .eq("provider_code", provider_code)
    .limit(1)
    .maybeSingle();

  if (ex.data?.id) return ex.data.id as string;

  const ins = await supabase
    .from("store_payment_methods")
    .insert({
      store_id,
      provider_code,
      enabled: false,
      status: "inactive",
      config: {},
      sort_order: 0,
    })
    .select("id")
    .single();

  if (ins.error) throw ins.error;
  return ins.data.id as string;
}

export async function POST(req: Request) {
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
    return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });

  const store_id = await resolveStoreId(supabase, user.id, user.email);
  if (!store_id)
    return NextResponse.json({ ok: false, error: "NO_STORE" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as Op | null;
  if (!body || typeof (body as any).op !== "string") {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  // =========================
  // Providers
  // =========================
  if (body.op === "toggle_provider") {
    const status = body.enabled ? "needs_setup" : "inactive";

    // ✅ تأكد الصف موجود
    await ensureProviderRow(supabase, store_id, body.provider_code);

    const { error } = await supabase
      .from("store_payment_methods")
      .update({ enabled: body.enabled, status })
      .eq("store_id", store_id)
      .eq("provider_code", body.provider_code);

    if (error)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    await supabase.from("audit_logs").insert({
      store_id,
      actor_type: "merchant_user",
      actor_id: user.id,
      action: "store.payments.toggle_provider",
      entity_type: "store_payment_methods",
      entity_id: null,
      after_data: { provider_code: body.provider_code, enabled: body.enabled, status },
    });

    return NextResponse.json({ ok: true });
  }

  if (body.op === "update_provider_config") {
    const nextStatus = body.status || "active";

    // ✅ تأكد الصف موجود
    await ensureProviderRow(supabase, store_id, body.provider_code);

    // ✅ إذا صار active خلّ enabled=true
    const patch: any = { config: body.config, status: nextStatus };
    if (nextStatus === "active") patch.enabled = true;

    const { error } = await supabase
      .from("store_payment_methods")
      .update(patch)
      .eq("store_id", store_id)
      .eq("provider_code", body.provider_code);

    if (error)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    await supabase.from("audit_logs").insert({
      store_id,
      actor_type: "merchant_user",
      actor_id: user.id,
      action: "store.payments.update_provider_config",
      entity_type: "store_payment_methods",
      entity_id: null,
      after_data: { provider_code: body.provider_code, status: nextStatus },
    });

    return NextResponse.json({ ok: true });
  }

  // =========================
  // Bank accounts
  // =========================
  if (body.op === "bank_add") {
    const iban = cleanIban(body.iban);

    if (body.is_primary) {
      await supabase.from("store_bank_accounts").update({ is_primary: false }).eq("store_id", store_id);
    }

    const { data, error } = await supabase
      .from("store_bank_accounts")
      .insert({
        store_id,
        bank_name: String(body.bank_name || "").trim(),
        account_holder: String(body.account_holder || "").trim(),
        iban,
        is_primary: !!body.is_primary,
        status: "active",
      })
      .select("id")
      .single();

    if (error)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    await supabase.from("audit_logs").insert({
      store_id,
      actor_type: "merchant_user",
      actor_id: user.id,
      action: "store.payments.bank_add",
      entity_type: "store_bank_accounts",
      entity_id: data.id,
      after_data: {
        bank_name: body.bank_name,
        account_holder: body.account_holder,
        iban,
        is_primary: !!body.is_primary,
      },
    });

    return NextResponse.json({ ok: true, id: data.id });
  }

  if (body.op === "bank_update") {
    const patch: any = { ...body.patch };
    if (typeof patch.iban === "string") patch.iban = cleanIban(patch.iban);

    if (patch.is_primary) {
      await supabase.from("store_bank_accounts").update({ is_primary: false }).eq("store_id", store_id);
    }

    const { error } = await supabase
      .from("store_bank_accounts")
      .update(patch)
      .eq("store_id", store_id)
      .eq("id", body.id);

    if (error)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    await supabase.from("audit_logs").insert({
      store_id,
      actor_type: "merchant_user",
      actor_id: user.id,
      action: "store.payments.bank_update",
      entity_type: "store_bank_accounts",
      entity_id: body.id,
      after_data: patch,
    });

    return NextResponse.json({ ok: true });
  }

  if (body.op === "bank_delete") {
    const { error } = await supabase
      .from("store_bank_accounts")
      .delete()
      .eq("store_id", store_id)
      .eq("id", body.id);

    if (error)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    await supabase.from("audit_logs").insert({
      store_id,
      actor_type: "merchant_user",
      actor_id: user.id,
      action: "store.payments.bank_delete",
      entity_type: "store_bank_accounts",
      entity_id: body.id,
      after_data: { deleted: true },
    });

    return NextResponse.json({ ok: true });
  }

  // =========================
  // Checkout settings
  // =========================
  if (body.op === "checkout_update") {
    const patch = body.patch || {};

    const { error } = await supabase
      .from("store_checkout_settings")
      .upsert({ store_id, ...patch }, { onConflict: "store_id" });

    if (error)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    await supabase.from("audit_logs").insert({
      store_id,
      actor_type: "merchant_user",
      actor_id: user.id,
      action: "store.payments.checkout_update",
      entity_type: "store_checkout_settings",
      entity_id: store_id,
      after_data: patch,
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "UNKNOWN_OP" }, { status: 400 });
}
