// FILE: apps/merchant/src/app/(app)/categories/_components/CategoryRow.tsx
"use client";

import type { CategoryRow as Category } from "../CategoriesClient";

function badge(status: string) {
  if (status === "active") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  return "bg-zinc-50 text-zinc-600 border-zinc-200";
}

export default function CategoryRow({
  item,
  level,
  onEdit,
  onDelete,
}: {
  item: Category;
  level: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-2 py-2">
      <div className="flex items-center gap-2">
        <div
          className="h-8 w-1 rounded-full bg-zinc-200"
          style={{ marginRight: level * 14 }}
        />

        <div>
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold">{item.name}</div>

            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] ${badge(
                item.status,
              )}`}
            >
              {item.status === "active" ? "نشط" : "مخفي"}
            </span>
          </div>

          <div className="text-[11px] text-zinc-500">
            slug: <span className="font-mono">{item.slug}</span> — ترتيب:{" "}
            {item.sort_order}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs hover:bg-zinc-50"
        >
          تعديل
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs text-red-700 hover:bg-red-50"
        >
          حذف
        </button>
      </div>
    </div>
  );
}