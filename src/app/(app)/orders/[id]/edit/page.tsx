// app/(app)/orders/[id]/edit/page.tsx
import OrderEditPageClient from "./OrderEditPageClient";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <OrderEditPageClient id={id} />;
}