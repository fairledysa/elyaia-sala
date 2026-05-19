// apps/merchant/src/app/(theme-editor)/themes/[themeId]/customize/theme-options/_components/CollapsibleSection.tsx
"use client";

import React, { useState } from "react";
import FieldRenderer from "./FieldRenderer";
import type { Field } from "./types";

type Props = {
  title: string;
  fields: Field[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
};

export default function CollapsibleSection({
  title,
  fields,
  values,
  onChange,
}: Props) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        <span className="text-gray-400">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-gray-100 p-4">
          {fields.map((field, idx) => (
            <FieldRenderer
              key={field.key ?? `${field.name}-${idx}`}
              field={field}
              value={values[field.name]}
              onChange={onChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
