// app/(app)/orders/[id]/page.tsx
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import OrderDetailsPageClient from "./_components/OrderDetailsPageClient";

function s(x: any) {
  return String(x ?? "").trim();
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const sb = await supabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: storeUser } = await sb
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!storeUser?.store_id) {
    redirect("/");
  }

  const { data: order } = await sb
    .from("orders")
    .select("id, store_id, status, base_status_key, store_status_id")
    .eq("id", id)
    .eq("store_id", storeUser.store_id)
    .maybeSingle();

  if (!order?.id) {
    redirect("/orders");
  }

  const isDraft =
    s(order.status).toLowerCase() === "draft" ||
    (!s(order.base_status_key) && !s(order.store_status_id));

  if (isDraft) {
    redirect(`/orders/${id}/new`);
  }

  return <OrderDetailsPageClient id={id} />;
}