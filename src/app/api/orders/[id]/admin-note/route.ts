//apps/merchant/src/app/api/orders/[id]/admin-note/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function s(x: any) {
  return String(x ?? "").trim();
}

async function resolveStoreUser() {
  const sb = await supabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) return null;

  const { data: storeUser } = await sb
    .from("store_users")
    .select("id,store_id,auth_user_id,name,email,role")
    .eq("auth_user_id", user.id)
    .single();

  return storeUser ?? null;
}

async function writeOrderAuditLog(args: {
  admin: ReturnType<typeof supabaseAdmin>;
  storeId: string;
  actorId: string;
  orderId: string;
  action: string;
  beforeData: any;
  afterData: any;
}) {
  const { admin, storeId, actorId, orderId, action, beforeData, afterData } =
    args;

  await admin.from("audit_logs").insert({
    store_id: storeId,
    actor_type: "store_user",
    actor_id: actorId,
    action,
    entity_type: "order",
    entity_id: orderId,
    before_data: beforeData,
    after_data: afterData,
  });
}

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const storeUser = await resolveStoreUser();

    if (!storeUser?.store_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const orderId = s(id);

    const admin = supabaseAdmin();

    const { data: noteRow, error } = await admin
      .from("order_admin_notes")
      .select(
        `
        id,
        store_id,
        order_id,
        note,
        created_by_store_user_id,
        updated_by_store_user_id,
        created_at,
        updated_at
      `
      )
      .eq("store_id", storeUser.store_id)
      .eq("order_id", orderId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      note: noteRow ?? null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load admin note" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const storeUser = await resolveStoreUser();

    if (!storeUser?.store_id || !storeUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const orderId = s(id);
    const body = await req.json().catch(() => ({}));
    const note = s(body?.note);

    const admin = supabaseAdmin();

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id,store_id")
      .eq("id", orderId)
      .eq("store_id", storeUser.store_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    const { data: existing, error: existingError } = await admin
      .from("order_admin_notes")
      .select(
        `
        id,
        note,
        created_by_store_user_id,
        updated_by_store_user_id,
        created_at,
        updated_at
      `
      )
      .eq("store_id", storeUser.store_id)
      .eq("order_id", orderId)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { error: existingError.message },
        { status: 500 }
      );
    }

    const nowIso = new Date().toISOString();

    if (!note) {
      if (existing?.id) {
        const { error: deleteError } = await admin
          .from("order_admin_notes")
          .delete()
          .eq("id", existing.id)
          .eq("store_id", storeUser.store_id)
          .eq("order_id", orderId);

        if (deleteError) {
          return NextResponse.json(
            { error: deleteError.message },
            { status: 500 }
          );
        }

        await writeOrderAuditLog({
          admin,
          storeId: s(storeUser.store_id),
          actorId: s(storeUser.id),
          orderId,
          action: "order.admin_note.deleted",
          beforeData: {
            id: existing.id,
            note: s(existing.note),
          },
          afterData: null,
        });
      }

      return NextResponse.json({ ok: true, note: null });
    }

    if (existing?.id) {
      const { data: updated, error: updateError } = await admin
        .from("order_admin_notes")
        .update({
          note,
          updated_by_store_user_id: storeUser.id,
          updated_at: nowIso,
        })
        .eq("id", existing.id)
        .eq("store_id", storeUser.store_id)
        .eq("order_id", orderId)
        .select(
          `
          id,
          store_id,
          order_id,
          note,
          created_by_store_user_id,
          updated_by_store_user_id,
          created_at,
          updated_at
        `
        )
        .single();

      if (updateError || !updated) {
        return NextResponse.json(
          { error: updateError?.message || "تعذر تحديث الملاحظة" },
          { status: 500 }
        );
      }

      await writeOrderAuditLog({
        admin,
        storeId: s(storeUser.store_id),
        actorId: s(storeUser.id),
        orderId,
        action: "order.admin_note.updated",
        beforeData: {
          id: existing.id,
          note: s(existing.note),
        },
        afterData: {
          id: updated.id,
          note: s(updated.note),
        },
      });

      return NextResponse.json({
        ok: true,
        note: updated,
      });
    }

    const { data: created, error: createError } = await admin
      .from("order_admin_notes")
      .insert({
        store_id: storeUser.store_id,
        order_id: orderId,
        note,
        created_by_store_user_id: storeUser.id,
        updated_by_store_user_id: storeUser.id,
      })
      .select(
        `
        id,
        store_id,
        order_id,
        note,
        created_by_store_user_id,
        updated_by_store_user_id,
        created_at,
        updated_at
      `
      )
      .single();

    if (createError || !created) {
      return NextResponse.json(
        { error: createError?.message || "تعذر إنشاء الملاحظة" },
        { status: 500 }
      );
    }

    await writeOrderAuditLog({
      admin,
      storeId: s(storeUser.store_id),
      actorId: s(storeUser.id),
      orderId,
      action: "order.admin_note.created",
      beforeData: null,
      afterData: {
        id: created.id,
        note: s(created.note),
      },
    });

    return NextResponse.json({
      ok: true,
      note: created,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to save admin note" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const storeUser = await resolveStoreUser();

    if (!storeUser?.store_id || !storeUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const orderId = s(id);

    const admin = supabaseAdmin();

    const { data: existing, error: existingError } = await admin
      .from("order_admin_notes")
      .select("id,note")
      .eq("store_id", storeUser.store_id)
      .eq("order_id", orderId)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { error: existingError.message },
        { status: 500 }
      );
    }

    if (!existing?.id) {
      return NextResponse.json({ ok: true, note: null });
    }

    const { error: deleteError } = await admin
      .from("order_admin_notes")
      .delete()
      .eq("id", existing.id)
      .eq("store_id", storeUser.store_id)
      .eq("order_id", orderId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    await writeOrderAuditLog({
      admin,
      storeId: s(storeUser.store_id),
      actorId: s(storeUser.id),
      orderId,
      action: "order.admin_note.deleted",
      beforeData: {
        id: existing.id,
        note: s(existing.note),
      },
      afterData: null,
    });

    return NextResponse.json({ ok: true, note: null });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to delete admin note" },
      { status: 500 }
    );
  }
}