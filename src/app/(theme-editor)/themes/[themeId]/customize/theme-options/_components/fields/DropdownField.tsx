// apps/merchant/src/app/(theme-editor)/themes/[themeId]/customize/theme-options/_components/fields/DropdownField.tsx
"use client";

import React from "react";
import LabelBlock from "./LabelBlock";

type Option = { label: string; value: string };

type Props = {
  name: string;
  label: string;
  description?: string;
  value?: any;
  onChange: (name: string, value: any) => void;

  options: Option[];
  defaultValue?: string;
};

export default function DropdownField({
  name,
  label,
  description,
  value,
  onChange,
  options,
  defaultValue,
}: Props) {
  const v = value ?? defaultValue ?? "";

  return (
    <div className="space-y-2">
      <LabelBlock label={label} description={description} htmlFor={name} />
      <select
        id={name}
        name={name}
        value={v}
        onChange={(e) => onChange(name, e.target.value)}
        className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
      >
        {options.map((o) => (
          <option key={`${name}-${o.value}`} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
