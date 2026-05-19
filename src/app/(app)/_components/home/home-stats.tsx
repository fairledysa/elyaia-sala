export default function HomeStats({
  store,
  productsCount,
}: {
  store: { name: string; slug: string; plan: string };
  productsCount: number;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="text-sm text-zinc-500">المتجر</div>
        <div className="mt-2 text-xl font-bold text-zinc-900">{store.name}</div>
        <div className="mt-1 text-xs text-zinc-500">
          {store.slug}.elyaia.com
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="text-sm text-zinc-500">المنتجات</div>
        <div className="mt-2 text-xl font-bold text-zinc-900">
          {productsCount}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="text-sm text-zinc-500">الخطة</div>
        <div className="mt-2 text-xl font-bold text-zinc-900">{store.plan}</div>
      </div>
    </div>
  );
}
