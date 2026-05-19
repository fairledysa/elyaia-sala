// FILE: apps/merchant/src/app/(app)/themes/_components/ThemesPage.tsx
"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ComponentProps,
} from "react";

import ThemeCard from "./ThemeCard";
import MarketplaceCta from "./MarketplaceCta";

type ThemeCardProps = ComponentProps<typeof ThemeCard>;
type MarketplaceCardProps = Extract<ThemeCardProps, { mode: "marketplace" }>;
type MarketplaceThemeItem = MarketplaceCardProps["item"];

// نفس المؤقت الموجود عندك، فقط طلعناه فوق عشان نستخدمه في ThemeCard كذلك
const STORE_ID = "8b3e3b93-0a9a-4308-9b2f-c7393bec0ada";

export default function ThemesPage() {
  const [items, setItems] = useState<MarketplaceThemeItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/themes", {
        cache: "no-store",
        headers: { "x-store-id": STORE_ID },
      });

      const json = await res.json();

      setItems(Array.isArray(json?.items) ? json.items : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        setLoading(true);

        const res = await fetch("/api/themes", {
          cache: "no-store",
          headers: { "x-store-id": STORE_ID },
        });

        const json = await res.json();
        if (!alive) return;

        setItems(Array.isArray(json?.items) ? json.items : []);
      } finally {
        if (alive) setLoading(false);
      }
    }

    void run();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="container mt-4">
      <div className="my-6 flex min-h-[35px] items-center justify-between gap-4">
        <h1 className="text-primary text-2xl font-bold">إدارة الثيمات</h1>

        <button className="rounded-xl border px-3 py-2 text-sm">
          جهز صفحة هبوط
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-gray-500">
          جاري التحميل…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => (
              <ThemeCard
                key={it.id}
                mode="marketplace"
                item={it}
                storeId={STORE_ID}
                onChanged={load}
              />
            ))}
          </div>

          <div className="mt-12">
            <MarketplaceCta />
          </div>
        </>
      )}
    </div>
  );
}