// FILE: apps/merchant/src/app/(theme-editor)/themes/[themeId]/customize/main-info/page.tsx
// FILE: apps/merchant/src/app/(theme-editor)/themes/[themeId]/customize/main-info/page.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type FontKey = "tajawal" | "cairo" | "almarai" | "rubik" | "lusail";

type FormState = {
  store: {
    name: string;
    description: string;
    logo_url: string;
    favicon_url: string;
  };
  main_info: {
    primary_color: string;
    font: FontKey;
  };
};

const PRESET_COLORS = [
  "#ed1c24",
  "#0099e5",
  "#00a98f",
  "#050f2c",
  "#004d73",
  "#8cb811",
] as const;

const FONTS: Record<FontKey, { label: string; className: string }> = {
  tajawal: { label: "Tajawal", className: "font-tajawal" },
  cairo: { label: "Cairo", className: "font-cairo" },
  almarai: { label: "Almarai", className: "font-almarai" },
  rubik: { label: "Rubik", className: "font-rubik" },
  lusail: { label: "Lusail", className: "font-lusail" },
};

function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-right"
      >
        <span className="text-sm font-bold">{title}</span>

        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-900">
          <span
            className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          >
            ▾
          </span>
        </span>
      </button>

      {open ? (
        <div className="border-t border-slate-200 p-4">{children}</div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-900">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      {children}
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export default function MainInfoPage() {
  const params = useParams<{ themeId: string }>();
  const themeId = params.themeId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dirty, setDirty] = useState(false);

  const [form, setForm] = useState<FormState>({
    store: { name: "", description: "", logo_url: "", favicon_url: "" },
    main_info: { primary_color: "#00a98f", font: "tajawal" },
  });

  const [initial, setInitial] = useState<FormState | null>(null);

  const fontPreviewClass = useMemo(
    () => FONTS[form.main_info.font].className,
    [form.main_info.font],
  );

  // ✅ حساب dirty
  useEffect(() => {
    if (!initial) return;
    const changed =
      initial.main_info.primary_color !== form.main_info.primary_color ||
      initial.main_info.font !== form.main_info.font;
    setDirty(changed);
  }, [form.main_info.primary_color, form.main_info.font, initial]);

  const load = useCallback(async () => {
    if (!themeId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/themes/${themeId}/main-info`, {
        method: "GET",
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "LOAD_FAILED");

      const nextForm: FormState = {
        store: {
          name: json?.store?.name ?? "",
          description: json?.store?.description ?? "",
          logo_url: json?.store?.logo_url ?? "",
          favicon_url: json?.store?.favicon_url ?? "",
        },
        main_info: {
          primary_color: json?.main_info?.primary_color ?? "#00a98f",
          font: (json?.main_info?.font as FontKey) ?? "tajawal",
        },
      };

      setForm(nextForm);
      setInitial(nextForm);
      setDirty(false);
    } catch (e: any) {
      setError(e?.message || "LOAD_FAILED");
    } finally {
      setLoading(false);
    }
  }, [themeId]);

  useEffect(() => {
    load();
  }, [load]);

  const saveAll = useCallback(async () => {
    if (!themeId) return;
    if (loading || saving || !dirty) return;

    setSaving(true);
    setError(null);

    try {
      const payload = {
        main_info: {
          primary_color: form.main_info.primary_color,
          font: form.main_info.font,
        },
      };

      const res = await fetch(`/api/themes/${themeId}/main-info`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "SAVE_FAILED");

      setInitial((prev) => {
        const base = prev ?? form;
        return {
          ...base,
          main_info: {
            primary_color: form.main_info.primary_color,
            font: form.main_info.font,
          },
        };
      });

      setDirty(false);
    } catch (e: any) {
      setError(e?.message || "SAVE_FAILED");
    } finally {
      setSaving(false);
    }
  }, [themeId, loading, saving, dirty, form]);

  // ✅ نرسل حالة زر الحفظ للسايدبار + نرد على request (Handshake)
  useEffect(() => {
    function sendSaveState() {
      window.dispatchEvent(
        new CustomEvent("theme-editor:save-state", {
          detail: {
            pageKey: "main-info",
            showSaveButton: true,
            label: "حفظ التغييرات",
            canSave: !loading && !saving && dirty,
            saving: saving,
          },
        }),
      );
    }

    // ارسل فوراً + مع أي تغيير
    sendSaveState();

    // لو السايدبار طلب الحالة نرد فوراً
    function onRequest() {
      sendSaveState();
    }
    window.addEventListener(
      "theme-editor:save-state:request",
      onRequest as EventListener,
    );

    return () => {
      window.removeEventListener(
        "theme-editor:save-state:request",
        onRequest as EventListener,
      );
    };
  }, [loading, saving, dirty]);

  // ✅ لما يضغط زر الحفظ (اللي تحت بالسايدبار) ينادي saveAll هنا
  useEffect(() => {
    function onSave(e: Event) {
      const ce = e as CustomEvent<{ pageKey?: string }>;
      if (ce.detail?.pageKey && ce.detail.pageKey !== "main-info") return;
      saveAll();
    }

    window.addEventListener("theme-editor:save", onSave as EventListener);
    return () =>
      window.removeEventListener("theme-editor:save", onSave as EventListener);
  }, [saveAll]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-bold">هوية وبيانات المتجر</h2>
        <p className="mt-1 text-sm text-slate-600">
          إعدادات الهوية الأساسية للمتجر (لون + خط) للنسخة الحالية من الثيم.
        </p>

        {error ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        <Section title="لون المتجر" defaultOpen>
          <div className="flex flex-col gap-5">
            <Field label="اللون الأساسي" required>
              <div className="flex flex-wrap items-center gap-3">
                {PRESET_COLORS.map((c) => {
                  const active = form.main_info.primary_color === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          main_info: { ...p.main_info, primary_color: c },
                        }))
                      }
                      className={[
                        "h-9 w-9 rounded-full border transition",
                        active
                          ? "ring-2 ring-slate-400 border-transparent"
                          : "border-slate-300 hover:border-slate-400",
                      ].join(" ")}
                      style={{ backgroundColor: c }}
                      aria-label={c}
                      title={c}
                      disabled={loading || saving}
                    />
                  );
                })}

                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-2">
                  <input
                    type="color"
                    value={form.main_info.primary_color}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        main_info: {
                          ...p.main_info,
                          primary_color: e.target.value,
                        },
                      }))
                    }
                    className="h-9 w-14 cursor-pointer rounded-lg border border-slate-300 p-1"
                    disabled={loading || saving}
                  />
                  <span className="text-sm text-slate-600">
                    {form.main_info.primary_color}
                  </span>
                </div>
              </div>
            </Field>
          </div>
        </Section>

        <Section title="خط المتجر" defaultOpen={false}>
          <div className="flex flex-col gap-4">
            <Field label="اختر الخط">
              <select
                className="h-12 w-full rounded-xl border border-slate-300 px-3 outline-none focus:ring-2 focus:ring-slate-200"
                value={form.main_info.font}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    main_info: {
                      ...p.main_info,
                      font: e.target.value as FontKey,
                    },
                  }))
                }
                disabled={loading || saving}
              >
                {Object.entries(FONTS).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </Field>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className={`text-sm text-slate-700 ${fontPreviewClass}`}>
                معاينة: هذا نص تجريبي لعرض الخط المختار على المتجر.
              </p>
              <p className={`mt-2 text-xs text-slate-500 ${fontPreviewClass}`}>
                The quick brown fox jumps over the lazy dog. 1234567890
              </p>
            </div>
          </div>
        </Section>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            جاري تحميل الإعدادات...
          </div>
        ) : null}
      </div>
    </div>
  );
}
