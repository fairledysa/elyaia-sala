// apps/merchant/src/app/(theme-editor)/themes/[themeId]/customize/theme-options/_components/fields/Row.tsx
"use client";
import React from "react";

export default function Row({
  left,
  right,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">{left}</div>
      <div className="shrink-0">{right}</div>
    </div>
  );
}
