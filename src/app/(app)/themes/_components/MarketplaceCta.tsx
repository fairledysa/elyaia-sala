// FILE: apps/merchant/src/app/(app)/themes/_components/MarketplaceCta.tsx
export default function MarketplaceCta() {
  return (
    <section className="w-full bg-white rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden mt-12 p-6">
      <div className="flex-1 text-start">
        <h2 className="text-2xl md:text-3xl font-bold text-primary mb-4">
          ودّك تجدّد مظهر متجرك؟
        </h2>
        <p className="text-gray-600 text-base mb-6">
          اكتشف مجموعة واسعة ومتجدِّدة من الثيمات ونسِّقها على ذوقك!
        </p>
        <button className="px-4 py-2 rounded-xl border">اكتشفها الآن</button>
      </div>
    </section>
  );
}
