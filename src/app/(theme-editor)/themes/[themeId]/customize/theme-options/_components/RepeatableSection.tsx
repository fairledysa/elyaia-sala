// apps/merchant/src/app/(theme-editor)/themes/[themeId]/customize/theme-options/_components/RepeatableSection.tsx
"use client";

import React, { useMemo, useState } from "react";
import FieldRenderer from "./FieldRenderer";
import type { Field } from "./types";

type Props = {
  title: string;
  sectionKey: string;
  template: Field[];
  initialItems: number;

  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
};

function ensureArray(v: any) {
  return Array.isArray(v) ? v : [];
}

export default function RepeatableSection({
  title,
  sectionKey,
  template,
  initialItems,
  values,
  onChange,
}: Props) {
  const [open, setOpen] = useState(true);

  const items = useMemo(() => {
    const arr = ensureArray(values[sectionKey]);
    if (arr.length > 0) return arr;

    // init default items
    return Array.from({ length: initialItems }, () => ({}));
  }, [values, sectionKey, initialItems]);

  const setItems = (next: any[]) => {
    onChange(sectionKey, next);
  };

  const addItem = () => setItems([...items, {}]);

  const removeItem = (idx: number) => {
    const next = items.filter((_: any, i: number) => i !== idx);
    setItems(next);
  };

  const updateItemField = (itemIndex: number, fieldName: string, v: any) => {
    const next = items.map((it: any, i: number) => {
      if (i !== itemIndex) return it;
      return { ...(it || {}), [fieldName]: v };
    });
    setItems(next);
  };

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
          {items.map((item: any, itemIndex: number) => (
            <div
              key={`${sectionKey}-${itemIndex}`}
              className="rounded-2xl border border-gray-200"
            >
              <div className="flex items-center justify-between rounded-t-2xl border-b border-gray-100 bg-gray-50 px-4 py-2">
                <div className="text-sm font-semibold text-gray-700">
                  #{itemIndex + 1}
                </div>
                <button
                  type="button"
                  className="rounded-xl border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  onClick={() => removeItem(itemIndex)}
                >
                  حذف
                </button>
              </div>

              <div className="space-y-4 p-4">
                {template.map((field, idx) => (
                  <FieldRenderer
                    key={field.key ?? `${field.name}-${idx}`}
                    field={field}
                    value={(item || {})[field.name]}
                    onChange={(n, v) => updateItemField(itemIndex, n, v)}
                  />
                ))}
              </div>
            </div>
          ))}

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50"
            onClick={addItem}
          >
            + إضافة
          </button>
        </div>
      )}
    </div>
  );
}
