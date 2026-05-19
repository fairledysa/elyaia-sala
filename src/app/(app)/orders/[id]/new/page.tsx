// app/(app)/orders/[id]/new/page.tsx
import OrderCreatePageClient from "../../new/OrderCreatePageClient";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <OrderCreatePageClient id={id} />;
}