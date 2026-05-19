// app/api/orders/statuses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function s(x: any) {
  return String(x ?? "").trim();
}

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = supabaseAdmin();

    const [{ data: baseStatuses, error: baseError }, { data: storeStatuses, error: storeError }] =
      await Promise.all([
        admin
          .from("order_status_bases")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        admin
          .from("store_order_statuses")
          .select("*")
          .eq("store_id", storeId)
          .order("base_status_key", { ascending: true })
          .order("sort_order", { ascending: true }),
      ]);

    if (baseError) {
      return NextResponse.json({ error: baseError.message }, { status: 500 });
    }

    if (storeError) {
      return NextResponse.json({ error: storeError.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        base_statuses: baseStatuses ?? [],
        store_statuses: storeStatuses ?? [],
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load order statuses" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const storeId = await resolveStoreId();
    if (!storeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const base_status_key = s(body?.base_status_key);
    const name = s(body?.name);
    const slug = s(body?.slug);
    const icon = s(body?.icon) || null;
    const color = s(body?.color) || null;
    const is_active = Boolean(body?.is_active ?? true);
    const notify_customer = Boolean(body?.notify_customer ?? false);
    const message_template = s(body?.message_template) || null;
    const email_template = s(body?.email_template) || null;
    const sms_template = s(body?.sms_template) || null;

    if (!base_status_key) {
      return NextResponse.json({ error: "base_status_key مطلوب" }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: "اسم الحالة مطلوب" }, { status: 400 });
    }

    const admin = supabaseAdmin();

    const { data: baseStatus, error: baseError } = await admin
      .from("order_status_bases")
      .select("key")
      .eq("key", base_status_key)
      .single();

    if (baseError || !baseStatus?.key) {
      return NextResponse.json({ error: "الحالة الأساسية غير موجودة" }, { status: 404 });
    }

    const { data: lastItem } = await admin
      .from("store_order_statuses")
      .select("sort_order")
      .eq("store_id", storeId)
      .eq("base_status_key", base_status_key)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSort = Number(lastItem?.sort_order ?? 0) + 1;

    const { data, error } = await admin
      .from("store_order_statuses")
      .insert({
        store_id: storeId,
        base_status_key,
        name,
        slug: slug || null,
        icon,
        color,
        sort_order: nextSort,
        is_active,
        notify_customer,
        message_template,
        email_template,
        sms_template,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, item: data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to create status" },
      { status: 500 }
    );
  }
}