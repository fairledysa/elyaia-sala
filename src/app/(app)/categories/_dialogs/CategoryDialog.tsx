// FILE: apps/merchant/src/app/(app)/categories/_dialogs/CategoryDialog.tsx
"use client";

import * as React from "react";
import type { CategoryRow } from "../CategoriesClient";
import CategoryImageUploader from "../_components/CategoryImageUploader";

type Props = {
  mode: "create" | "edit";
  items: CategoryRow[];
  initial?: CategoryRow;
  parent?: CategoryRow | null;
  onClose: () => void;
  onSaved: () => void;
};

type ParentOption = CategoryRow & {
  level: number;
  disabled?: boolean;
  disabledReason?: string;
};

const MAX_DEPTH = 6;

function makeSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[^\u0600-\u06FFa-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildChildrenMap(items: CategoryRow[]) {
  const map = new Map<string, CategoryRow[]>();

  for (const item of items) {
    if (!item.parent_id) continue;

    const list = map.get(item.parent_id) ?? [];
    list.push(item);
    map.set(item.parent_id, list);
  }

  return map;
}

function getDescendantIds(items: CategoryRow[], id: string) {
  const childrenMap = buildChildrenMap(items);
  const disabled = new Set<string>();

  function walk(parentId: string) {
    const children = childrenMap.get(parentId) ?? [];

    for (const child of children) {
      disabled.add(child.id);
      walk(child.id);
    }
  }

  walk(id);
  return disabled;
}

function buildParentOptions({
  items,
  mode,
  initial,
}: {
  items: CategoryRow[];
  mode: "create" | "edit";
  initial?: CategoryRow;
}) {
  const sorted = [...items].sort((a, b) => {
    const byOrder = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (byOrder !== 0) return byOrder;
    return String(a.name || "").localeCompare(String(b.name || ""), "ar");
  });

  const byParent = new Map<string, CategoryRow[]>();

  for (const row of sorted) {
    const key = row.parent_id ?? "__root";
    const list = byParent.get(key) ?? [];
    list.push(row);
    byParent.set(key, list);
  }

  const descendantIds =
    mode === "edit" && initial?.id
      ? getDescendantIds(items, initial.id)
      : new Set<string>();

  const output: ParentOption[] = [];

  function walk(parentId: string | null, level: number) {
    const key = parentId ?? "__root";
    const children = byParent.get(key) ?? [];

    for (const child of children) {
      const isSelf = mode === "edit" && child.id === initial?.id;
      const isDescendant = descendantIds.has(child.id);
      const tooDeep = (child.depth ?? level + 1) >= MAX_DEPTH;

      output.push({
        ...child,
        level,
        disabled: isSelf || isDescendant || tooDeep,
        disabledReason: isSelf
          ? "هذا هو القسم الحالي"
          : isDescendant
            ? "لا يمكن النقل داخل فرع من نفس القسم"
            : tooDeep
              ? "وصل للحد الأعلى من الفروع"
              : undefined,
      });

      walk(child.id, level + 1);
    }
  }

  walk(null, 0);
  return output;
}

function buildPathPreview({
  items,
  parentId,
  name,
}: {
  items: CategoryRow[];
  parentId: string | null;
  name: string;
}) {
  const cleanName = name.trim() || "اسم القسم";

  if (!parentId) return cleanName;

  const map = new Map(items.map((row) => [row.id, row]));
  const names: string[] = [];
  let current = map.get(parentId);

  while (current) {
    names.unshift(current.name);
    current = current.parent_id ? map.get(current.parent_id) : undefined;
  }

  names.push(cleanName);
  return names.join(" › ");
}

export default function CategoryDialog(props: Props) {
  const { mode, items, initial, parent, onClose, onSaved } = props;

  const isCreate = mode === "create";
  const isEdit = mode === "edit";
  const isChildCreate = isCreate && !!parent;

  const [name, setName] = React.useState(initial?.name ?? "");
  const [imageUrl, setImageUrl] = React.useState<string | null>(
    initial?.image_url ?? null,
  );

  const [status, setStatus] = React.useState<"active" | "hidden">(
    (initial?.status as any) ?? "active",
  );

  const [sortOrder, setSortOrder] = React.useState<number>(
    initial?.sort_order ?? 0,
  );

  const [parentId, setParentId] = React.useState<string | "">(
    isChildCreate ? parent!.id : initial?.parent_id ?? "",
  );

  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isChildCreate && parent?.id) {
      setParentId(parent.id);
    }
  }, [isChildCreate, parent?.id]);

  const parentOptions = React.useMemo(
    () =>
      buildParentOptions({
        items,
        mode,
        initial,
      }),
    [items, mode, initial],
  );

  const selectedParent =
    parentId ? items.find((item) => item.id === parentId) ?? null : null;

  const selectedParentOption =
    parentId ? parentOptions.find((item) => item.id === parentId) ?? null : null;

  const cleanName = name.trim();

  const previewPath = buildPathPreview({
    items,
    parentId: parentId || null,
    name: cleanName,
  });

  const title = isCreate
    ? isChildCreate
      ? `إضافة فرع داخل ${parent?.name}`
      : "إضافة قسم رئيسي"
    : "تعديل قسم";

  const subtitle = isChildCreate
    ? "سيتم إنشاء القسم كفرع داخل القسم المحدد."
    : isCreate
      ? "أضف قسمًا رئيسيًا جديدًا في المتجر."
      : "عدّل بيانات القسم الحالي بدون كسر ترتيب الشجرة.";

  async function submit() {
    try {
      setErr(null);
      setSaving(true);

      const payloadName = name.trim();

      if (!payloadName) {
        throw new Error("اسم القسم مطلوب");
      }

      if (selectedParentOption?.disabled) {
        throw new Error(
          selectedParentOption.disabledReason || "لا يمكن اختيار هذا القسم كأب",
        );
      }

      if (selectedParent && (selectedParent.depth ?? 1) >= MAX_DEPTH) {
        throw new Error(
          "لا يمكن إضافة فرع جديد داخل هذا القسم لأنه وصل للحد الأعلى",
        );
      }

      const payload: any = {
        name: payloadName,
        slug: makeSlug(payloadName),
        status,
        sort_order: Number(sortOrder) || 0,
        parent_id: parentId || null,
        image_url: imageUrl || null,
      };

      const url =
        mode === "create"
          ? "/api/categories"
          : `/api/categories/${initial!.id}`;

      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "فشل حفظ القسم");
      }

      onSaved();
    } catch (e: any) {
      setErr(e?.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div
        dir="rtl"
        className="w-full max-w-[860px] overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 p-5">
          <div className="space-y-1">
            <div className="text-lg font-black text-zinc-950">{title}</div>
            <div className="text-xs font-semibold text-zinc-500">
              {subtitle}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-sm text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950"
          >
            ✕
          </button>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            {err && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                {err}
              </div>
            )}

            {isChildCreate && parent && (
              <div className="rounded-2xl border border-teal-100 bg-teal-50 p-3 text-sm font-semibold text-teal-800">
                الفرع الجديد سيكون داخل:{" "}
                <span className="font-black">{parent.name}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-zinc-800">
                اسم القسم
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                placeholder="مثال: كامري"
                className="h-11 w-full rounded-2xl border border-zinc-200 px-3 text-sm font-semibold outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              />
            </div>

            <CategoryImageUploader value={imageUrl} onChange={setImageUrl} />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-zinc-800">
                  الحالة
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.currentTarget.value as any)}
                  className="h-11 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                >
                  <option value="active">نشط</option>
                  <option value="hidden">مخفي</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-zinc-800">
                  الترتيب
                </label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.currentTarget.value))}
                  className="h-11 w-full rounded-2xl border border-zinc-200 px-3 text-sm font-semibold outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                />
              </div>
            </div>

            {!isChildCreate && (
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-zinc-800">
                  يتبع لقسم{" "}
                  <span className="font-normal text-zinc-400">(اختياري)</span>
                </label>

                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.currentTarget.value)}
                  className="h-11 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                >
                  <option value="">بدون — قسم رئيسي</option>

                  {parentOptions.map((x) => (
                    <option key={x.id} value={x.id} disabled={x.disabled}>
                      {"—".repeat(Math.max(0, x.level))} {x.name}
                      {x.disabledReason ? ` — ${x.disabledReason}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <aside className="space-y-3">
            <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xs font-black text-zinc-500">
                معاينة القسم
              </div>

              <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={cleanName || "صورة القسم"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xl">🖼️</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-black text-zinc-950">
                      {cleanName || "اسم القسم"}
                    </div>

                    <div className="mt-1 truncate text-xs font-semibold text-zinc-400">
                      يتم توليد الرابط تلقائيًا
                    </div>
                  </div>

                  <span
                    className={[
                      "shrink-0 rounded-full px-2 py-1 text-[10px] font-black",
                      status === "active"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-zinc-100 text-zinc-600",
                    ].join(" ")}
                  >
                    {status === "active" ? "نشط" : "مخفي"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-teal-100 bg-teal-50 p-4">
              <div className="text-xs font-black text-teal-800">
                مكان القسم في الشجرة
              </div>

              <div className="mt-2 rounded-2xl bg-white p-3 text-xs font-bold leading-6 text-teal-900">
                {previewPath}
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-white p-4 text-xs font-semibold leading-6 text-zinc-500">
              صورة القسم ستظهر لاحقًا في بطاقات الأقسام والقوائم داخل المتجر.
            </div>

            {isEdit && (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold leading-6 text-amber-800">
                تغيير القسم الأب من هنا يتم حفظه مباشرة عند الضغط على حفظ.
                للترتيب الدقيق استخدم السحب أو زر النقل في الشجرة.
              </div>
            )}
          </aside>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-100 p-5">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-2xl border border-zinc-200 px-4 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="h-10 rounded-2xl bg-teal-600 px-5 text-sm font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "جاري الحفظ..." : "حفظ"}
          </button>
        </div>
      </div>
    </div>
  );
}