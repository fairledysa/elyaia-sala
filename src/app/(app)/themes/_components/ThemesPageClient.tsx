// FILE: apps/merchant/src/app/(app)/themes/_components/ThemesPageClient.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { LayoutTemplate, RefreshCw, Store, Wand2 } from "lucide-react";

import ThemeCard from "./ThemeCard";
import type { MarketplaceThemeItem, ThemeItem } from "./types";

type ApiResponse = {
  items?: ThemeItem[];
  marketplaceItems?: MarketplaceThemeItem[];
  error?: string;
};

type TabKey = "mine" | "marketplace";

export default function ThemesPageClient({ storeId }: { storeId: string }) {
  const [items, setItems] = useState<ThemeItem[]>([]);
  const [marketplaceItems, setMarketplaceItems] = useState<
    MarketplaceThemeItem[]
  >([]);

  const [tab, setTab] = useState<TabKey>("marketplace");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    setLoading(true);

    try {
      const res = await fetch("/api/themes", {
        headers: storeId ? { "x-store-id": storeId } : {},
        cache: "no-store",
      });

      const json: ApiResponse = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "فشل تحميل الثيمات");
      }

      setItems(Array.isArray(json.items) ? json.items : []);
      setMarketplaceItems(
        Array.isArray(json.marketplaceItems) ? json.marketplaceItems : [],
      );
    } catch (e: any) {
      setErr(e?.message || "فشل تحميل الثيمات");
      setItems([]);
      setMarketplaceItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!storeId) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const counts = useMemo(() => {
    return items.reduce(
      (map, item) => {
        const key =
          item.theme_id || item.themeId || item.theme_key || item.themeKey;

        if (!key) return map;

        map[key] = (map[key] || 0) + 1;
        return map;
      },
      {} as Record<string, number>,
    );
  }, [items]);

  const published = items.find((item) => item.status === "published");

  if (!storeId) {
    return (
      <section dir="rtl" className="adm-page adm-themes">
        <div className="adm-page__inner">
          <div className="adm-alert adm-alert--danger">
            storeId غير موجود في السياق.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section dir="rtl" className="adm-page">
      <div className="adm-page__inner">
        <header className="adm-hero">
          <div className="adm-hero__main">
            <div className="adm-hero__icon">
              <LayoutTemplate />
            </div>

            <div className="adm-hero__text">
              <h1 className="adm-hero__title">تصميم المتجر</h1>
              <p className="adm-hero__desc">
                اختر ثيم مناسب من متجر الثيمات، جرّبه، ثم خصّصه وانشره على
                متجرك.
              </p>
            </div>
          </div>

          <div className="adm-hero__actions">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="adm-btn adm-btn--secondary"
            >
              <RefreshCw />
              تحديث
            </button>
          </div>
        </header>

        {err ? (
          <div className="adm-alert adm-alert--danger mb-4">{err}</div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 mb-4">
          <div className="adm-card">
            <div className="adm-card__body">
              <div className="text-sm font-extrabold text-[var(--adm-muted)]">
                الثيم المنشور
              </div>
              <div className="mt-2 text-2xl font-black text-[var(--adm-primary)]">
                {published?.themeName ||
                  published?.theme?.name ||
                  published?.title ||
                  "لا يوجد"}
              </div>
            </div>
          </div>

          <div className="adm-card">
            <div className="adm-card__body">
              <div className="text-sm font-extrabold text-[var(--adm-muted)]">
                ثيماتي
              </div>
              <div className="mt-2 text-2xl font-black text-[var(--adm-primary)]">
                {items.length}
              </div>
            </div>
          </div>

          <div className="adm-card">
            <div className="adm-card__body">
              <div className="text-sm font-extrabold text-[var(--adm-muted)]">
                متجر الثيمات
              </div>
              <div className="mt-2 text-2xl font-black text-[var(--adm-primary)]">
                {marketplaceItems.length}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTab("marketplace")}
            className={[
              "inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-extrabold transition",
              tab === "marketplace"
                ? "border-[var(--adm-primary)] bg-[var(--adm-primary)] text-white"
                : "border-[var(--adm-border)] bg-white text-[var(--adm-text)] hover:bg-[var(--adm-soft)]",
            ].join(" ")}
          >
            <Store className="h-4 w-4" />
            متجر الثيمات
          </button>

          <button
            type="button"
            onClick={() => setTab("mine")}
            className={[
              "inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-extrabold transition",
              tab === "mine"
                ? "border-[var(--adm-primary)] bg-[var(--adm-primary)] text-white"
                : "border-[var(--adm-border)] bg-white text-[var(--adm-text)] hover:bg-[var(--adm-soft)]",
            ].join(" ")}
          >
            <Wand2 className="h-4 w-4" />
            ثيماتي
          </button>
        </div>

        {loading ? (
          <div className="adm-card">
            <div className="adm-card__body">
              <div className="py-10 text-center text-sm font-bold text-[var(--adm-muted)]">
                جاري تحميل الثيمات...
              </div>
            </div>
          </div>
        ) : tab === "marketplace" ? (
          marketplaceItems.length ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {marketplaceItems.map((item) => (
                <ThemeCard
                  key={item.id}
                  mode="marketplace"
                  item={item}
                  storeId={storeId}
                  onChanged={load}
                />
              ))}
            </div>
          ) : (
            <div className="adm-card">
              <div className="adm-card__body">
                <div className="py-10 text-center text-sm font-bold text-[var(--adm-muted)]">
                  لا توجد ثيمات متاحة في متجر الثيمات.
                </div>
              </div>
            </div>
          )
        ) : items.length ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => {
              const key =
                item.theme_id ||
                item.themeId ||
                item.theme_key ||
                item.themeKey ||
                "";

              return (
                <ThemeCard
                  key={item.id}
                  mode="owned"
                  item={item}
                  storeId={storeId}
                  versionsCount={key ? counts[key] || 0 : 0}
                  onChanged={load}
                />
              );
            })}
          </div>
        ) : (
          <div className="adm-card">
            <div className="adm-card__body">
              <div className="py-10 text-center text-sm font-bold text-[var(--adm-muted)]">
                لا توجد ثيمات في ثيماتي. اختر ثيم من متجر الثيمات واضغط تجربة
                الثيم.
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}