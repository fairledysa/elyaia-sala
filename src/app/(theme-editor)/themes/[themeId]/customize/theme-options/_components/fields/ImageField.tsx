// apps/merchant/src/app/(theme-editor)/themes/[themeId]/customize/theme-options/_components/fields/ImageField.tsx
"use client";

import React, { useRef, useState } from "react";
import { useParams } from "next/navigation";
import LabelBlock from "./LabelBlock";

type Props = {
  name: string;
  label: string;
  description?: string;
  value?: any; // نخزن { url, key } أو url
  onChange: (name: string, value: any) => void;
};

export default function ImageField({
  name,
  label,
  description,
  value,
  onChange,
}: Props) {
  const params = useParams<{ themeId: string }>();
  const themeId = params.themeId;

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const currentUrl =
    typeof value === "string" ? value : (value?.url as string | undefined);

  async function upload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file, file.name);

      const res = await fetch(
        `/api/themes/${themeId}/theme-options/upload-image`,
        {
          method: "POST",
          body: fd,
        },
      );

      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) throw new Error(j?.error || "UPLOAD_FAILED");

      // ✅ نخزن object عشان نحافظ على key + url
      onChange(name, { url: j.url, key: j.key });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <LabelBlock label={label} description={description} />

      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4">
        <input
          ref={inputRef}
          id={name}
          name={name}
          type="file"
          accept=".jpg,.jpeg,.png,.gif,.webp"
          className="w-full text-sm"
          disabled={uploading}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            await upload(f);
            // reset input
            if (inputRef.current) inputRef.current.value = "";
          }}
        />

        <div className="mt-2 text-xs text-gray-500">
          {uploading
            ? "جارٍ رفع الصورة..."
            : "ارفع صورة (jpg, jpeg, gif, png, webp)"}
        </div>

        {currentUrl ? (
          <div className="mt-3 space-y-2">
            <img
              src={currentUrl}
              alt={label}
              className="max-h-40 w-auto rounded-xl border bg-white"
            />
            <button
              type="button"
              className="rounded-xl border bg-white px-3 py-1 text-xs"
              onClick={() => onChange(name, null)}
              disabled={uploading}
            >
              إزالة الصورة
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
