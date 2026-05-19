// apps/merchant/src/lib/orders/log-order-event.ts
import { supabaseAdmin } from "@/lib/supabase/admin";

function s(x: any) {
  return String(x ?? "").trim();
}

type LogOrderEventInput = {
  order_id: string;
  store_id: string;
  changed_by_store_user_id?: string | null;
  note: string;
};

export async function logOrderEvent(input: LogOrderEventInput) {
  const admin = supabaseAdmin();

  const orderId = s(input.order_id);
  const storeId = s(input.store_id);
  const note = s(input.note);
  const actorId = s(input.changed_by_store_user_id) || null;

  if (!orderId || !storeId || !note) return;

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id, base_status_key, store_status_id")
    .eq("id", orderId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (orderError) {
    throw new Error(orderError.message);
  }

  if (!order?.id) return;

  const currentBaseStatusKey = s(order.base_status_key) || null;
  const currentStoreStatusId = s(order.store_status_id) || null;

  const { error: insertError } = await admin.from("order_status_history").insert({
    store_id: storeId,
    order_id: orderId,
    from_base_status_key: currentBaseStatusKey,
    to_base_status_key: currentBaseStatusKey,
    from_store_status_id: currentStoreStatusId,
    to_store_status_id: currentStoreStatusId,
    changed_by_store_user_id: actorId,
    note,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }
}