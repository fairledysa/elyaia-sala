// apps/merchant/src/app/api/settings/options/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getStoreIdFromSession } from "@/lib/auth/getStoreId";

const ALLOWED_KEYS = [
  "receiving_orders",
  "receiving_orders_times",
  "order_notes",
  "cancel_order",
  "order_auto_completed_status",
  "restore_stock_by_status",
  "agreement_before_submit",
  "order_completion_page",
  "customize_packing_list",
  "shipping_label_deduction",
  "customer_address_method",
  "reports_statuses",
  "product_purchase_count",
  "product_recommendations",
  "switches",

  // product switches
  "switch_duplicate_product_in_cart",
  "switch_quantity_sort",
  "switch_see_more_button",
  "switch_show_dash_instead",
  "switch_price_start_from",
  "switch_digital_product_protection",
  "switch_show_weight",
  "switch_show_product_sku",
  "switch_hs_code_enabled",
  "switch_tax_included",

  // order switches
  "switch_disable_payment_delay",
  "switch_shipping_indicator",
  "switch_reorder_enable",

  // customer switches
  "switch_optional_register_email",
  "switch_allow_email_login",
  "switch_merge_old_cart",
  "switch_browser_notification_for_applepay",

  // feedback switches
  "switch_publish_comments",
  "switch_pages_feedback_enable",
  "switch_products_feedback_enable",
  "switch_products_feedback_disable_guest",
] as const;

type AllowedKey = (typeof ALLOWED_KEYS)[number];

function isAllowedKey(v: string): v is AllowedKey {
  return (ALLOWED_KEYS as readonly string[]).includes(v);
}

function buildSlug(key: AllowedKey) {
  return `options:${key}`;
}

export async function GET(req: NextRequest) {
  try {
    const storeId = await getStoreIdFromSession();
    const sb = supabaseAdmin();

    const key = String(req.nextUrl.searchParams.get("key") ?? "").trim();

    if (!key) {
      const slugs = ALLOWED_KEYS.map(buildSlug);

      const { data, error } = await sb
        .from("store_settings")
        .select("slug,value,updated_at")
        .eq("store_id", storeId)
        .in("slug", slugs)
        .order("updated_at", { ascending: false });

      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 }
        );
      }

      const items: Record<string, unknown> = {};
      for (const row of data ?? []) {
        items[row.slug] = row.value;
      }

      return NextResponse.json({
        ok: true,
        store_id: storeId,
        items,
      });
    }

    if (!isAllowedKey(key)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_KEY" },
        { status: 400 }
      );
    }

    const slug = buildSlug(key);

    const { data, error } = await sb
      .from("store_settings")
      .select("id,slug,type,value,updated_at")
      .eq("store_id", storeId)
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      store_id: storeId,
      item: data ?? null,
    });
  } catch (error: any) {
    const msg = String(error?.message ?? "UNKNOWN_ERROR");

    if (msg === "UNAUTHENTICATED") {
      return NextResponse.json(
        { ok: false, error: "UNAUTHENTICATED" },
        { status: 401 }
      );
    }

    if (msg === "STORE_NOT_FOUND") {
      return NextResponse.json(
        { ok: false, error: "STORE_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { ok: false, error: msg },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const storeId = await getStoreIdFromSession();
    const sb = supabaseAdmin();
    const body = await req.json();

    const key = String(body?.key ?? "").trim();
    const value = body?.value;

    if (!isAllowedKey(key)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_KEY" },
        { status: 400 }
      );
    }

    if (value === undefined) {
      return NextResponse.json(
        { ok: false, error: "MISSING_VALUE" },
        { status: 400 }
      );
    }

    const slug = buildSlug(key);

    const { data, error } = await sb
      .from("store_settings")
      .upsert(
        {
          store_id: storeId,
          slug,
          type: "json",
          value,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "store_id,slug",
        }
      )
      .select("id,store_id,slug,type,value,updated_at")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      item: data,
    });
  } catch (error: any) {
    const msg = String(error?.message ?? "UNKNOWN_ERROR");

    if (msg === "UNAUTHENTICATED") {
      return NextResponse.json(
        { ok: false, error: "UNAUTHENTICATED" },
        { status: 401 }
      );
    }

    if (msg === "STORE_NOT_FOUND") {
      return NextResponse.json(
        { ok: false, error: "STORE_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { ok: false, error: msg },
      { status: 500 }
    );
  }
}