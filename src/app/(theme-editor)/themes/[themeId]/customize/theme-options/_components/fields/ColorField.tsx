// apps/merchant/src/app/(theme-editor)/themes/[themeId]/customize/theme-options/_components/fields/ColorField.tsx
"use client";

import React from "react";
import LabelBlock from "./LabelBlock";
import Row from "./Row";

type Props = {
  name: string;
  label: string;
  description?: string;
  value?: any;
  onChange: (name: string, value: any) => void;

  defaultValue?: string;
};

export default function ColorField({
  name,
  label,
  description,
  value,
  onChange,
  defaultValue,
}: Props) {
  const v = value ?? defaultValue ?? "#000000";

  return (
    <Row
      left={
        <LabelBlock label={label} description={description} htmlFor={name} />
      }
      right={
        <input
          id={name}
          name={name}
          type="color"
          value={v}
          onChange={(e) => onChange(name, e.target.value)}
          className="h-9 w-16 cursor-pointer rounded-xl border border-gray-200 bg-white"
        />
      }
    />
  );
}
