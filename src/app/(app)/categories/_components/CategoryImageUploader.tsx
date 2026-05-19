// FILE: apps/merchant/src/app/(app)/categories/_components/CategoryImageUploader.tsx
"use client";

import * as React from "react";

type Props = {
  value?: string | null;
  onChange: (url: string | null) => void;
};

export default function CategoryImageUploader({ value, onChange }: Props) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function upload(file: File) {
    try {
      setError(null);
      setUploading(true);

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

      onChange(String(json.url));
    } catch (e: any) {
      setError(e?.message || "حدث خطأ أثناء رفع الصورة");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-zinc-800">صورة القسم</div>
          <div className="mt-0.5 text-xs font-semibold text-zinc-400">
            تظهر في بطاقات الأقسام والقوائم داخل المتجر.
          </div>
        </div>

        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={uploading}
            className="h-8 rounded-xl border border-red-100 bg-red-50 px-3 text-xs font-black text-red-600 transition hover:bg-red-100 disabled:opacity-60"
          >
            حذف الصورة
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          e.currentTarget.value = "";

          if (file) {
            upload(file);
          }
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={[
          "group relative flex min-h-[150px] w-full items-center justify-center overflow-hidden rounded-3xl border border-dashed transition",
          value
            ? "border-zinc-200 bg-zinc-50"
            : "border-zinc-300 bg-zinc-50 hover:border-teal-300 hover:bg-teal-50/40",
          uploading ? "cursor-wait opacity-70" : "",
        ].join(" ")}
      >
        {value ? (
          <>
            <img
              src={value}
              alt="صورة القسم"
              className="absolute inset-0 h-full w-full object-cover"
            />

            <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/25" />

            <div className="relative z-10 rounded-2xl bg-white/95 px-4 py-2 text-xs font-black text-zinc-800 opacity-0 shadow-sm transition group-hover:opacity-100">
              تغيير الصورة
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white text-xl shadow-sm">
              🖼️
            </div>

            <div className="mt-3 text-sm font-black text-zinc-900">
              ارفع صورة القسم
            </div>

            <div className="mt-1 text-xs font-semibold text-zinc-400">
              PNG أو JPG — يفضل صورة واضحة ومربعة
            </div>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80">
            <div className="rounded-2xl bg-white px-4 py-2 text-xs font-black text-teal-700 shadow-sm">
              جاري رفع الصورة...
            </div>
          </div>
        )}
      </button>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}