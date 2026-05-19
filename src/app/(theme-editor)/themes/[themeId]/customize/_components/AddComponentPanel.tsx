// FILE: apps/merchant/src/app/(theme-editor)/themes/[themeId]/customize/_components/AddComponentPanel.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type AvailableComponent = {
  id: string;
  key: string;
  name: string;
  slug: string;
  description?: string | null;
  preview_image_url?: string | null;
  icon?: string | null;
  page_key: string;
  category?: string | null;
  component_kind: "section" | "widget" | "banner" | "block";
  is_active: boolean;
  is_builtin: boolean;
  supports_multiple: boolean;
  default_enabled: boolean;
  default_sort_order: number;
};

type ThemeOptionsResponse = {
  ok?: boolean;
  available_components?: AvailableComponent[];
};

function s(v: unknown) {
  return String(v ?? "").trim();
}

export default function AddComponentPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const params = useParams<{ themeId: string }>();
  const themeId = String(params?.themeId ?? "").trim();

  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AvailableComponent[]>([]);

  useEffect(() => {
    if (!open || !themeId) return;

    let alive = true;

    async function loadItems() {
      try {
        setLoading(true);

        const res = await fetch(`/api/themes/${themeId}/theme-options`, {
          method: "GET",
          cache: "no-store",
        });

        const json: ThemeOptionsResponse = await res.json().catch(() => ({}));

        if (!alive) return;

        if (!res.ok || !json?.ok) {
          setItems([]);
          return;
        }

        const available = Array.isArray(json?.available_components)
          ? json.available_components.filter(
              (x) => s(x.page_key || "homepage") === "homepage" && x.is_active,
            )
          : [];

        setItems(available);
      } catch {
        if (alive) setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    void loadItems();

    return () => {
      alive = false;
    };
  }, [open, themeId]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;

    return items.filter((x) => {
      const haystack = [
        x.name,
        x.slug,
        x.key,
        x.category,
        x.component_kind,
        x.description,
      ]
        .map((v) => s(v).toLowerCase())
        .join(" ");

      return haystack.includes(qq);
    });
  }, [items, q]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"
        aria-label="إغلاق"
      />

      <aside
        dir="rtl"
        className={[
          "absolute right-0 top-0 h-full w-[560px] max-w-[92vw]",
          "bg-white shadow-2xl border-l border-slate-200",
          "flex flex-col",
        ].join(" ")}
      >
        <div className="p-4 pb-0">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold md:text-xl">إضافة عنصر جديد</h2>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-400 transition-all hover:bg-red-100"
              aria-label="إغلاق الشريط الجانبي"
              title="إغلاق"
            >
              ✕
            </button>
          </div>

          <div className="relative mb-4">
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
              🔍
            </span>
            <input
              type="text"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pr-10 pl-3 text-sm outline-none focus:border-slate-300"
              placeholder="ابحث في العناصر"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="custom-scrollbar flex-1 overflow-auto p-4 pt-0">
          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
              جاري تحميل العناصر...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-gray-600">
              لا توجد نتائج مطابقة.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {filtered.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  title={it.name}
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("theme-editor:add-homepage-component", {
                        detail: {
                          componentId: it.id,
                          addKey: it.key,
                        },
                      }),
                    );
                    onClose();
                  }}
                  className={[
                    "flex flex-col overflow-hidden rounded-[6px] text-right",
                    "border border-slate-200 bg-slate-50",
                    "transition duration-150 ease-in-out",
                    "hover:border-slate-300 focus:outline-none focus-visible:ring focus-visible:ring-orange-500/40",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-1.5 bg-white p-2.5">
                    <span
                      className="text-[14px]"
                      style={{ color: "#ffc62a" }}
                      aria-hidden="true"
                      title="عنصر"
                    >
                      ★
                    </span>

                    <p className="line-clamp-1 text-sm font-medium text-gray-900">
                      {it.name}
                    </p>
                  </div>

                  <div className="flex grow items-center justify-center overflow-hidden bg-slate-50">
                    {it.preview_image_url ? (
                      <img
                        src={it.preview_image_url}
                        alt={it.name}
                        className="max-h-full w-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-24 w-full items-center justify-center text-3xl opacity-60">
                        {it.icon ? <span>{it.icon}</span> : <span>▦</span>}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}