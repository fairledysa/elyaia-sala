// apps/merchant/src/app/(theme-editor)/themes/[themeId]/customize/theme-options/_components/fields/LabelBlock.tsx
"use client";
import React from "react";

export default function LabelBlock({
  label,
  description,
  htmlFor,
}: {
  label: string;
  description?: string;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-semibold text-gray-800"
      >
        {label}
      </label>
      {description ? (
        <div className="text-xs leading-5 text-gray-500">{description}</div>
      ) : null}
    </div>
  );
}
