// app/api/customers/[id]/groups/route.ts
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

  if (!user) {
    return { storeId: null, error: "Unauthorized", status: 401 };
  }

  const { data: storeUser, error: storeUserError } = await sb
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", user.id)
    .single();

  if (storeUserError || !storeUser?.store_id) {
    return { storeId: null, error: "No store", status: 400 };
  }

  return { storeId: storeUser.store_id as string, error: null, status: 200 };
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: customerId } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const groupId = s(body?.group_id);

    if (!customerId) {
      return NextResponse.json(
        { error: "customer_id مطلوب" },
        { status: 400 }
      );
    }

    if (!groupId) {
      return NextResponse.json(
        { error: "group_id مطلوب" },
        { status: 400 }
      );
    }

    const storeCtx = await resolveStoreId();

    if (!storeCtx.storeId) {
      return NextResponse.json(
        { error: storeCtx.error },
        { status: storeCtx.status }
      );
    }

    const storeId = storeCtx.storeId;
    const admin = supabaseAdmin();

    const { data: storeCustomer, error: storeCustomerError } = await admin
      .from("store_customers")
      .select("store_id, customer_id")
      .eq("store_id", storeId)
      .eq("customer_id", customerId)
      .maybeSingle();

    if (storeCustomerError) {
      return NextResponse.json(
        { error: storeCustomerError.message },
        { status: 500 }
      );
    }

    if (!storeCustomer?.customer_id) {
      return NextResponse.json(
        { error: "العميل غير موجود في هذا المتجر" },
        { status: 404 }
      );
    }

    const { data: group, error: groupError } = await admin
      .from("customer_groups")
      .select("id, store_id, name")
      .eq("id", groupId)
      .eq("store_id", storeId)
      .maybeSingle();

    if (groupError) {
      return NextResponse.json(
        { error: groupError.message },
        { status: 500 }
      );
    }

    if (!group?.id) {
      return NextResponse.json(
        { error: "المجموعة غير موجودة في هذا المتجر" },
        { status: 404 }
      );
    }

    const { data: existingMember, error: existingMemberError } = await admin
      .from("customer_group_members")
      .select("group_id, customer_id")
      .eq("group_id", groupId)
      .eq("customer_id", customerId)
      .maybeSingle();

    if (existingMemberError) {
      return NextResponse.json(
        { error: existingMemberError.message },
        { status: 500 }
      );
    }

    if (existingMember?.group_id && existingMember?.customer_id) {
      return NextResponse.json(
        {
          ok: true,
          already_exists: true,
          message: "العميل مضاف مسبقًا إلى هذه المجموعة",
          group: {
            id: group.id,
            name: group.name,
          },
        },
        { status: 200 }
      );
    }

    const { error: insertError } = await admin
      .from("customer_group_members")
      .insert({
        group_id: groupId,
        customer_id: customerId,
        store_id: storeId,
      });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        already_exists: false,
        message: "تمت إضافة العميل إلى المجموعة بنجاح",
        group: {
          id: group.id,
          name: group.name,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "فشل إضافة العميل إلى المجموعة" },
      { status: 500 }
    );
  }
}