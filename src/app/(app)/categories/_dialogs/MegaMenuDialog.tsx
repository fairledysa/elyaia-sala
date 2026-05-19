// FILE: apps/merchant/src/app/(app)/categories/_dialogs/MegaMenuDialog.tsx
"use client";

import * as React from "react";
import type { CategoryRow } from "../CategoriesClient";

type MegaMenuBanner = {
  id: string;
  title?: string;
  image_url: string;
  href?: string;
  sort_order: number;
  is_enabled: boolean;
};

type MegaMenuCategorySettings = {
  enabled: boolean;
  layout: "links_only" | "links_with_banners";
  banners: MegaMenuBanner[];
};

type MegaMenuValue = {
  categories: Record<string, MegaMenuCategorySettings>;
};

type Props = {
  category: CategoryRow;
  rows: CategoryRow[];
  onClose: () => void;
};

function defaultSettings(): MegaMenuCategorySettings {
  return {
    enabled: false,
    layout: "links_only",
    banners: [],
  };
}

function makeBanner(): MegaMenuBanner {
  return {
    id: crypto.randomUUID(),
    title: "",
    image_url: "",
    href: "",
    sort_order: 0,
    is_enabled: true,
  };
}

function sortBanners(banners: MegaMenuBanner[]) {
  return [...banners].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
}

function getChildren(rows: CategoryRow[], parentId: string) {
  return rows
    .filter((row) => row.parent_id === parentId)
    .sort((a, b) => {
      const byOrder = (a.sort_order ?? 0) - (b.sort_order ?? 0);
      if (byOrder !== 0) return byOrder;
      return String(a.name || "").localeCompare(String(b.name || ""), "ar");
    });
}

function normalizeSettings(input: any): MegaMenuCategorySettings {
  const settings = input && typeof input === "object" ? input : {};

  return {
    enabled: Boolean(settings.enabled),
    layout:
      settings.layout === "links_with_banners"
        ? "links_with_banners"
        : "links_only",
    banners: Array.isArray(settings.banners)
      ? sortBanners(
          settings.banners
            .map((item: any, index: number) => ({
              id:
                typeof item?.id === "string" && item.id
                  ? item.id
                  : crypto.randomUUID(),
              title: typeof item?.title === "string" ? item.title : "",
              image_url:
                typeof item?.image_url === "string" ? item.image_url : "",
              href: typeof item?.href === "string" ? item.href : "",
              sort_order: Number.isFinite(Number(item?.sort_order))
                ? Number(item.sort_order)
                : index,
              is_enabled:
                typeof item?.is_enabled === "boolean"
                  ? item.is_enabled
                  : true,
            }))
            .filter((item: MegaMenuBanner) => item.image_url),
        )
      : [],
  };
}

async function uploadImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("الملف يجب أن يكون صورة");
  }

  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/uploads/images", {
    method: "POST",
    body: form,
  });

  const json = await res.json();

  if (!res.ok || !json?.ok || !json?.url) {
    throw new Error(json?.error || "فشل رفع الصورة");
  }

  return String(json.url);
}

export default function MegaMenuDialog({ category, rows, onClose }: Props) {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [uploadingId, setUploadingId] = React.useState<string | null>(null);

  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  const [settings, setSettings] =
    React.useState<MegaMenuCategorySettings>(defaultSettings);

  const fileInputRefs = React.useRef<Record<string, HTMLInputElement | null>>(
    {},
  );

  const children = React.useMemo(
    () => getChildren(rows, category.id),
    [rows, category.id],
  );

  async function load() {
    try {
      setErr(null);
      setOk(null);
      setLoading(true);

      const res = await fetch("/api/categories/mega-menu", {
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "فشل تحميل إعدادات القائمة الكبيرة");
      }

      const value: MegaMenuValue = json.data || { categories: {} };
      const categorySettings = value.categories?.[category.id];

      setSettings(normalizeSettings(categorySettings));
    } catch (e: any) {
      setErr(e?.message || "حدث خطأ أثناء تحميل إعدادات القائمة الكبيرة");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    try {
      setErr(null);
      setOk(null);
      setSaving(true);

      const cleanBanners = settings.banners
        .filter((banner) => banner.image_url)
        .map((banner, index) => ({
          ...banner,
          sort_order: index,
        }));

      const payload: MegaMenuCategorySettings = {
        enabled: settings.enabled,
        layout: settings.layout,
        banners: cleanBanners,
      };

      const res = await fetch("/api/categories/mega-menu", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category_id: category.id,
          settings: payload,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "فشل حفظ إعدادات القائمة الكبيرة");
      }

      setSettings(normalizeSettings(json.category));
      setOk("تم حفظ إعدادات القائمة الكبيرة");
    } catch (e: any) {
      setErr(e?.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  }

  React.useEffect(() => {
    load();
  }, [category.id]);

  function updateBanner(id: string, patch: Partial<MegaMenuBanner>) {
    setSettings((prev) => ({
      ...prev,
      banners: prev.banners.map((banner) =>
        banner.id === id ? { ...banner, ...patch } : banner,
      ),
    }));
  }

  function addBanner() {
    setSettings((prev) => ({
      ...prev,
      layout: "links_with_banners",
      banners: [
        ...prev.banners,
        {
          ...makeBanner(),
          sort_order: prev.banners.length,
        },
      ],
    }));
  }

  function removeBanner(id: string) {
    setSettings((prev) => ({
      ...prev,
      banners: prev.banners
        .filter((banner) => banner.id !== id)
        .map((banner, index) => ({
          ...banner,
          sort_order: index,
        })),
    }));
  }

  function moveBanner(id: string, direction: "up" | "down") {
    setSettings((prev) => {
      const index = prev.banners.findIndex((banner) => banner.id === id);
      if (index < 0) return prev;

      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= prev.banners.length) return prev;

      const next = [...prev.banners];
      const current = next[index];
      next[index] = next[nextIndex];
      next[nextIndex] = current;

      return {
        ...prev,
        banners: next.map((banner, bannerIndex) => ({
          ...banner,
          sort_order: bannerIndex,
        })),
      };
    });
  }

  async function handleBannerFile(bannerId: string, file?: File) {
    if (!file) return;

    try {
      setErr(null);
      setOk(null);
      setUploadingId(bannerId);

      const url = await uploadImage(file);
      updateBanner(bannerId, { image_url: url });
    } catch (e: any) {
      setErr(e?.message || "فشل رفع الصورة");
    } finally {
      setUploadingId(null);
    }
  }

  const activeBanners = settings.banners.filter((banner) => banner.is_enabled);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div
        dir="rtl"
        className="flex max-h-[92vh] w-full max-w-[980px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 p-5">
          <div className="space-y-1">
            <div className="text-lg font-black text-zinc-950">
              القائمة الكبيرة
            </div>
            <div className="text-xs font-semibold text-zinc-500">
              إعداد طريقة ظهور قسم{" "}
              <span className="font-black text-zinc-800">{category.name}</span>{" "}
              داخل الميجا منيو.
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-sm text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-5">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-20 animate-pulse rounded-3xl border border-zinc-200 bg-zinc-50"
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
              <div className="space-y-4">
                {err && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                    {err}
                  </div>
                )}

                {ok && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                    {ok}
                  </div>
                )}

                <div className="rounded-3xl border border-zinc-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-black text-zinc-950">
                        تفعيل القائمة الكبيرة
                      </div>
                      <div className="mt-0.5 text-xs font-semibold text-zinc-500">
                        عند تفعيلها، يمكن عرض فروع القسم وصور جانبية داخل
                        القائمة.
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSettings((prev) => ({
                          ...prev,
                          enabled: !prev.enabled,
                        }))
                      }
                      className={[
                        "relative h-8 w-14 rounded-full transition",
                        settings.enabled ? "bg-teal-600" : "bg-zinc-200",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition",
                          settings.enabled ? "right-7" : "right-1",
                        ].join(" ")}
                      />
                    </button>
                  </div>
                </div>

                <div className="rounded-3xl border border-zinc-200 bg-white p-4">
                  <div className="mb-3">
                    <div className="text-sm font-black text-zinc-950">
                      نوع العرض
                    </div>
                    <div className="mt-0.5 text-xs font-semibold text-zinc-500">
                      اختر هل تظهر القائمة كروابط فقط أو روابط مع صور جانبية.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSettings((prev) => ({
                          ...prev,
                          layout: "links_only",
                        }))
                      }
                      className={[
                        "rounded-3xl border p-4 text-right transition",
                        settings.layout === "links_only"
                          ? "border-teal-300 bg-teal-50"
                          : "border-zinc-200 bg-white hover:bg-zinc-50",
                      ].join(" ")}
                    >
                      <div className="text-sm font-black text-zinc-950">
                        فروع فقط
                      </div>
                      <div className="mt-1 text-xs font-semibold leading-6 text-zinc-500">
                        عرض فروع القسم في القائمة بدون صور جانبية.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setSettings((prev) => ({
                          ...prev,
                          layout: "links_with_banners",
                        }))
                      }
                      className={[
                        "rounded-3xl border p-4 text-right transition",
                        settings.layout === "links_with_banners"
                          ? "border-teal-300 bg-teal-50"
                          : "border-zinc-200 bg-white hover:bg-zinc-50",
                      ].join(" ")}
                    >
                      <div className="text-sm font-black text-zinc-950">
                        فروع + صور جانبية
                      </div>
                      <div className="mt-1 text-xs font-semibold leading-6 text-zinc-500">
                        مثل المتاجر الكبيرة: فروع القسم مع صور أو بنرات جانبية.
                      </div>
                    </button>
                  </div>
                </div>

                <div className="rounded-3xl border border-zinc-200 bg-white p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-zinc-950">
                        صور القائمة الكبيرة
                      </div>
                      <div className="mt-0.5 text-xs font-semibold text-zinc-500">
                        تظهر بجانب فروع القسم داخل الميجا منيو.
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={addBanner}
                      className="h-9 rounded-2xl bg-teal-600 px-4 text-xs font-black text-white transition hover:bg-teal-700"
                    >
                      + إضافة صورة
                    </button>
                  </div>

                  {settings.banners.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
                      <div className="text-2xl">🖼️</div>
                      <div className="mt-2 text-sm font-black text-zinc-950">
                        لا توجد صور بعد
                      </div>
                      <div className="mt-1 text-xs font-semibold text-zinc-500">
                        أضف صورة أو بنر يظهر داخل القائمة الكبيرة.
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {settings.banners.map((banner, index) => (
                        <div
                          key={banner.id}
                          className="rounded-3xl border border-zinc-200 bg-zinc-50 p-3"
                        >
                          <div className="grid gap-3 md:grid-cols-[150px_1fr]">
                            <div>
                              <input
                                ref={(node) => {
                                  fileInputRefs.current[banner.id] = node;
                                }}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.currentTarget.files?.[0];
                                  e.currentTarget.value = "";
                                  handleBannerFile(banner.id, file);
                                }}
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  fileInputRefs.current[banner.id]?.click()
                                }
                                disabled={uploadingId === banner.id}
                                className="relative flex h-[120px] w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-zinc-300 bg-white transition hover:border-teal-300 hover:bg-teal-50/40 disabled:opacity-70"
                              >
                                {banner.image_url ? (
                                  <img
                                    src={banner.image_url}
                                    alt={banner.title || "صورة القائمة"}
                                    className="absolute inset-0 h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="text-center">
                                    <div className="text-xl">🖼️</div>
                                    <div className="mt-1 text-[11px] font-black text-zinc-500">
                                      رفع صورة
                                    </div>
                                  </div>
                                )}

                                {uploadingId === banner.id && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-xs font-black text-teal-700">
                                    جاري الرفع...
                                  </div>
                                )}
                              </button>
                            </div>

                            <div className="space-y-3">
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1">
                                  <label className="text-xs font-black text-zinc-700">
                                    عنوان اختياري
                                  </label>
                                  <input
                                    value={banner.title || ""}
                                    onChange={(e) =>
                                      updateBanner(banner.id, {
                                        title: e.currentTarget.value,
                                      })
                                    }
                                    placeholder="مثال: عروض المكياج"
                                    className="h-10 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-xs font-black text-zinc-700">
                                    الرابط عند الضغط
                                  </label>
                                  <input
                                    value={banner.href || ""}
                                    onChange={(e) =>
                                      updateBanner(banner.id, {
                                        href: e.currentTarget.value,
                                      })
                                    }
                                    placeholder="/category/..."
                                    dir="ltr"
                                    className="h-10 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-left text-sm font-semibold outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                                  />
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <label className="inline-flex items-center gap-2 text-xs font-black text-zinc-700">
                                  <input
                                    type="checkbox"
                                    checked={banner.is_enabled}
                                    onChange={(e) =>
                                      updateBanner(banner.id, {
                                        is_enabled: e.currentTarget.checked,
                                      })
                                    }
                                    className="h-4 w-4 accent-teal-600"
                                  />
                                  مفعلة
                                </label>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => moveBanner(banner.id, "up")}
                                    disabled={index === 0}
                                    className="h-8 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-black text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-40"
                                  >
                                    ↑
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      moveBanner(banner.id, "down")
                                    }
                                    disabled={
                                      index === settings.banners.length - 1
                                    }
                                    className="h-8 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-black text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-40"
                                  >
                                    ↓
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => removeBanner(banner.id)}
                                    className="h-8 rounded-xl border border-red-100 bg-red-50 px-3 text-xs font-black text-red-600 transition hover:bg-red-100"
                                  >
                                    حذف
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <aside className="space-y-4">
                <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="text-xs font-black text-zinc-500">
                    معاينة مبسطة
                  </div>

                  <div className="mt-3 rounded-3xl border border-zinc-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-3">
                      <div className="font-black text-zinc-950">
                        {category.name}
                      </div>

                      <span
                        className={[
                          "rounded-full px-2 py-1 text-[10px] font-black",
                          settings.enabled
                            ? "bg-teal-50 text-teal-700"
                            : "bg-zinc-100 text-zinc-500",
                        ].join(" ")}
                      >
                        {settings.enabled ? "مفعلة" : "غير مفعلة"}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2">
                      {children.length === 0 ? (
                        <div className="rounded-2xl bg-zinc-50 p-3 text-xs font-semibold text-zinc-500">
                          لا توجد فروع لهذا القسم.
                        </div>
                      ) : (
                        children.slice(0, 8).map((child) => (
                          <div
                            key={child.id}
                            className="flex items-center gap-2 rounded-2xl bg-zinc-50 px-3 py-2"
                          >
                            <div className="h-6 w-6 overflow-hidden rounded-lg bg-white">
                              {child.image_url ? (
                                <img
                                  src={child.image_url}
                                  alt={child.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : null}
                            </div>

                            <span className="truncate text-xs font-bold text-zinc-700">
                              {child.name}
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    {settings.layout === "links_with_banners" && (
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {activeBanners.length === 0 ? (
                          <div className="col-span-2 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-center text-xs font-semibold text-zinc-500">
                            لا توجد صور مفعلة.
                          </div>
                        ) : (
                          activeBanners.slice(0, 4).map((banner) => (
                            <div
                              key={banner.id}
                              className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50"
                            >
                              <img
                                src={banner.image_url}
                                alt={banner.title || "صورة القائمة"}
                                className="h-24 w-full object-cover"
                              />

                              {banner.title && (
                                <div className="p-2 text-[11px] font-black text-zinc-700">
                                  {banner.title}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-100 p-5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-10 rounded-2xl border border-zinc-200 px-4 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
          >
            إغلاق
          </button>

          <button
            type="button"
            onClick={save}
            disabled={loading || saving}
            className="h-10 rounded-2xl bg-teal-600 px-5 text-sm font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "جاري الحفظ..." : "حفظ القائمة الكبيرة"}
          </button>
        </div>
      </div>
    </div>
  );
}