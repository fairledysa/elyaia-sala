// apps/merchant/src/app/(theme-editor)/themes/[themeId]/customize/theme-options/_components/fields/SwitchField.tsx
"use client";

import React from "react";
import LabelBlock from "./LabelBlock";
import Row from "./Row";

type Props = {
  name: string;
  label: string;
  description?: string;
  value?: boolean;
  onChange: (name: string, value: any) => void;
  defaultChecked?: boolean;
};

export default function SwitchField({
  name,
  label,
  description,
  value,
  onChange,
  defaultChecked,
}: Props) {
  const checked = typeof value === "boolean" ? value : !!defaultChecked;

  return (
    <Row
      left={
        <LabelBlock label={label} description={description} htmlFor={name} />
      }
      right={
        <input
          id={name}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(name, e.target.checked)}
          className="h-5 w-5 accent-black"
        />
      }
    />
  );
}
