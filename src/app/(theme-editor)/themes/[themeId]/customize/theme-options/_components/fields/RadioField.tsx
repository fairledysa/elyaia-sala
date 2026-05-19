// apps/merchant/src/app/(theme-editor)/themes/[themeId]/customize/theme-options/_components/fields/RadioField.tsx
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

export default function RadioField({
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
      <LabelBlock label={label} description={description} />
      <div className="space-y-2">
        {options.map((o) => (
          <label
            key={`${name}-${o.value}`}
            className="flex items-center gap-2 text-sm text-gray-800"
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={v === o.value}
              onChange={() => onChange(name, o.value)}
              className="h-4 w-4 accent-black"
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
