// apps/merchant/src/app/(theme-editor)/themes/[themeId]/customize/theme-options/_components/fields/UrlField.tsx
"use client";

import React from "react";
import LabelBlock from "./LabelBlock";

type Props = {
  name: string;
  label: string;
  description?: string;
  value?: any;
  onChange: (name: string, value: any) => void;

  placeholder?: string;
  defaultValue?: string;
};

export default function UrlField({
  name,
  label,
  description,
  value,
  onChange,
  placeholder,
  defaultValue,
}: Props) {
  const v = value ?? defaultValue ?? "";

  return (
    <div className="space-y-2">
      <LabelBlock label={label} description={description} htmlFor={name} />
      <input
        id={name}
        name={name}
        type="url"
        value={v}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
      />
    </div>
  );
}
