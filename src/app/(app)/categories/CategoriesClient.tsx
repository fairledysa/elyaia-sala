// FILE: apps/merchant/src/app/(app)/categories/CategoriesClient.tsx
"use client";

import * as React from "react";
import CategoryDialog from "./_dialogs/CategoryDialog";
import MegaMenuDialog from "./_dialogs/MegaMenuDialog";
import CategoryTree from "./_components/CategoryTree";

export type CategoryRow = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  status: string;
  sort_order: number;
  depth: number;
  path: string;
  image_url?: string | null;
};

type FlatCategory = {
  row: CategoryRow;
  level: number;
};

const MAX_DEPTH = 6;
const TREE_OPEN_STORAGE_KEY = "merchant:categories:tree-open-ids:v1";

function readStoredOpenIds() {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const raw = window.localStorage.getItem(TREE_OPEN_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) return new Set<string>();

    return new Set(parsed.map((x) => String(x)).filter(Boolean));
  } catch {
    return new Set<string>();
  }
}

function writeStoredOpenIds(ids: Set<string>) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      TREE_OPEN_STORAGE_KEY,
      JSON.stringify(Array.from(ids)),
    );
  } catch {
    // تجاهل أخطاء التخزين المحلي
  }
}

function addCategoryAndParentsToOpenIds({
  current,
  rows,
  categoryId,
}: {
  current: Set<string>;
  rows: CategoryRow[];
  categoryId: string | null | undefined;
}) {
  const next = new Set(current);
  if (!categoryId) return next;

  const map = new Map(rows.map((row) => [row.id, row]));
  let cursor: CategoryRow | undefined = map.get(categoryId);

  while (cursor) {
    next.add(cursor.id);
    cursor = cursor.parent_id ? map.get(cursor.parent_id) : undefined;
  }

  return next;
}

function getRootIdsWithChildren(rows: CategoryRow[]) {
  const parentIds = new Set(
    rows
      .map((row) => row.parent_id)
      .filter((id): id is string => Boolean(id)),
  );

  return rows
    .filter((row) => !row.parent_id && parentIds.has(row.id))
    .map((row) => row.id);
}

export default function CategoriesClient() {
  const [rows, setRows] = React.useState<CategoryRow[]>([]);
  const [originalRows, setOriginalRows] = React.useState<CategoryRow[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [savingOrder, setSavingOrder] = React.useState(false);
  const [hasPendingChanges, setHasPendingChanges] = React.useState(false);

  const [error, setError] = React.useState<string | null>(null);

  const [openCreateRoot, setOpenCreateRoot] = React.useState(false);
  const [createParent, setCreateParent] = React.useState<CategoryRow | null>(
    null,
  );
  const [editing, setEditing] = React.useState<CategoryRow | null>(null);
  const [moving, setMoving] = React.useState<CategoryRow | null>(null);

  const [megaMenuCategory, setMegaMenuCategory] =
    React.useState<CategoryRow | null>(null);

  const [megaMenuEnabledIds, setMegaMenuEnabledIds] = React.useState<
    Set<string>
  >(() => new Set());

  const [treeOpenIds, setTreeOpenIds] = React.useState<Set<string>>(
    () => new Set(),
  );

  const [didHydrateTreeOpenIds, setDidHydrateTreeOpenIds] =
    React.useState(false);

  React.useEffect(() => {
    setTreeOpenIds(readStoredOpenIds());
    setDidHydrateTreeOpenIds(true);
  }, []);

  React.useEffect(() => {
    if (!didHydrateTreeOpenIds) return;
    writeStoredOpenIds(treeOpenIds);
  }, [treeOpenIds, didHydrateTreeOpenIds]);

  function updateTreeOpenIds(next: Set<string>) {
    setTreeOpenIds(new Set(next));
  }

  function openOnlyRootCategories() {
    const ids = getRootIdsWithChildren(rows);
    setTreeOpenIds(new Set(ids));
  }

  function closeAllTree() {
    setTreeOpenIds(new Set());
  }

  function openAllTree() {
    const parentIds = new Set(
      rows
        .map((row) => row.parent_id)
        .filter((id): id is string => Boolean(id)),
    );

    const ids = rows.filter((row) => parentIds.has(row.id)).map((row) => row.id);
    setTreeOpenIds(new Set(ids));
  }

  async function loadMegaMenuStatus() {
    try {
      const res = await fetch("/api/categories/mega-menu", {
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok) {
        setMegaMenuEnabledIds(new Set());
        return;
      }

      const categories = json?.data?.categories || {};
      const enabledIds = Object.entries(categories)
        .filter(([, value]: any) => Boolean(value?.enabled))
        .map(([categoryId]) => categoryId);

      setMegaMenuEnabledIds(new Set(enabledIds));
    } catch {
      setMegaMenuEnabledIds(new Set());
    }
  }

  async function load() {
    try {
      setError(null);
      setLoading(true);

      const res = await fetch("/api/categories", {
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "فشل تحميل الأقسام");
      }

      const nextRows = json.data || [];

      setRows(nextRows);
      setOriginalRows(nextRows);
      setHasPendingChanges(false);

      void loadMegaMenuStatus();
    } catch (e: any) {
      setError(e?.message || "حدث خطأ أثناء تحميل الأقسام");
    } finally {
      setLoading(false);
    }
  }

  function applyDraftRows(nextRows: CategoryRow[]) {
    setError(null);
    setRows(nextRows);
    setHasPendingChanges(true);
  }

  function resetDraftRows() {
    setRows(originalRows);
    setHasPendingChanges(false);
    setError(null);
  }

  async function savePendingChanges() {
    try {
      setError(null);
      setSavingOrder(true);

      const res = await fetch("/api/categories/reorder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: rows.map((row) => ({
            id: row.id,
            parent_id: row.parent_id,
            sort_order: row.sort_order,
          })),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "فشل حفظ ترتيب الأقسام");
      }

      const savedRows = json.data || rows;

      setRows(savedRows);
      setOriginalRows(savedRows);
      setHasPendingChanges(false);
    } catch (e: any) {
      setError(e?.message || "حدث خطأ أثناء حفظ الترتيب");
    } finally {
      setSavingOrder(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

  const rootCount = rows.filter((x) => !x.parent_id).length;
  const childCount = Math.max(0, rows.length - rootCount);

  return (
    <div dir="rtl" className="space-y-5">
      <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-black text-zinc-950">الأقسام</h1>
            <p className="text-sm text-zinc-500">
              رتّب أقسام المتجر وفروعها من مكان واحد.
            </p>
          </div>

          <button
            onClick={() => setOpenCreateRoot(true)}
            className="inline-flex h-10 items-center justify-center rounded-2xl bg-teal-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700"
          >
            + إضافة قسم رئيسي
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="إجمالي الأقسام" value={rows.length} />
          <StatCard label="الأقسام الرئيسية" value={rootCount} />
          <StatCard label="الفروع" value={childCount} />
        </div>
      </div>

      {hasPendingChanges && (
        <div className="sticky top-3 z-30 rounded-3xl border border-amber-200 bg-amber-50/95 p-3 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-base">
                ⚠️
              </div>

              <div>
                <div className="text-sm font-black text-amber-950">
                  لديك تغييرات غير محفوظة
                </div>
                <div className="mt-0.5 text-xs font-semibold text-amber-700">
                  تم تعديل ترتيب أو مكان بعض الأقسام. اضغط حفظ لاعتماد التغيير
                  في قاعدة البيانات.
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={resetDraftRows}
                disabled={savingOrder}
                className="h-9 rounded-2xl border border-amber-200 bg-white px-4 text-xs font-black text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                تراجع
              </button>

              <button
                type="button"
                onClick={savePendingChanges}
                disabled={savingOrder}
                className="h-9 rounded-2xl bg-teal-600 px-5 text-xs font-black text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingOrder ? "جاري الحفظ..." : "حفظ الترتيب"}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-[76px] animate-pulse rounded-3xl border border-zinc-200 bg-zinc-50"
            />
          ))}
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-zinc-100 text-2xl">
            🗂️
          </div>

          <div className="mt-4 text-lg font-black text-zinc-950">
            لا توجد أقسام بعد
          </div>

          <p className="mt-1 text-sm text-zinc-500">
            ابدأ بإضافة قسم رئيسي، وبعدها أضف الفروع من داخل كل قسم.
          </p>

          <button
            onClick={() => setOpenCreateRoot(true)}
            className="mt-5 inline-flex h-10 items-center justify-center rounded-2xl bg-teal-600 px-4 text-sm font-bold text-white transition hover:bg-teal-700"
          >
            + إضافة قسم رئيسي
          </button>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <CategoryTree
          items={rows}
          savingOrder={savingOrder}
          megaMenuEnabledIds={megaMenuEnabledIds}
          openIds={treeOpenIds}
          onOpenIdsChange={updateTreeOpenIds}
          onOpenAll={openAllTree}
          onCloseAll={closeAllTree}
          onOpenRoots={openOnlyRootCategories}
          onReorder={applyDraftRows}
          onEdit={(category) => setEditing(category)}
          onMove={(category) => setMoving(category)}
          onAddChild={(category) => setCreateParent(category)}
          onMegaMenu={(category) => setMegaMenuCategory(category)}
        />
      )}

      {openCreateRoot && (
        <CategoryDialog
          mode="create"
          items={rows}
          parent={null}
          onClose={() => setOpenCreateRoot(false)}
          onSaved={() => {
            setOpenCreateRoot(false);
            void load();
          }}
        />
      )}

      {createParent && (
        <CategoryDialog
          mode="create"
          items={rows}
          parent={createParent}
          onClose={() => setCreateParent(null)}
          onSaved={() => {
            const parentId = createParent.id;

            setTreeOpenIds((prev) =>
              addCategoryAndParentsToOpenIds({
                current: prev,
                rows,
                categoryId: parentId,
              }),
            );

            setCreateParent(null);
            void load();
          }}
        />
      )}

      {editing && (
        <CategoryDialog
          mode="edit"
          items={rows}
          initial={editing}
          parent={null}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}

      {moving && (
        <MoveCategoryDialog
          rows={rows}
          category={moving}
          onClose={() => setMoving(null)}
          onMove={(nextRows) => {
            const moved = nextRows.find((row) => row.id === moving.id);

            if (moved?.parent_id) {
              setTreeOpenIds((prev) =>
                addCategoryAndParentsToOpenIds({
                  current: prev,
                  rows: nextRows,
                  categoryId: moved.parent_id,
                }),
              );
            }

            applyDraftRows(nextRows);
            setMoving(null);
          }}
        />
      )}

      {megaMenuCategory && (
        <MegaMenuDialog
          category={megaMenuCategory}
          rows={rows}
          onClose={() => {
            setMegaMenuCategory(null);
            void loadMegaMenuStatus();
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-zinc-50/70 p-4">
      <div className="text-xs font-semibold text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-black text-zinc-950">{value}</div>
    </div>
  );
}

function buildFlatRows(rows: CategoryRow[]) {
  const sorted = [...rows].sort((a, b) => {
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

  const flat: FlatCategory[] = [];

  function walk(parentId: string | null, level: number) {
    const key = parentId ?? "__root";
    const children = byParent.get(key) ?? [];

    for (const child of children) {
      flat.push({ row: child, level });
      walk(child.id, level + 1);
    }
  }

  walk(null, 0);

  return flat;
}

function getSubtree(flat: FlatCategory[], categoryId: string) {
  const startIndex = flat.findIndex((item) => item.row.id === categoryId);
  if (startIndex < 0) return null;

  const level = flat[startIndex].level;
  let endIndex = startIndex + 1;

  while (endIndex < flat.length && flat[endIndex].level > level) {
    endIndex += 1;
  }

  return {
    startIndex,
    endIndex,
    segment: flat.slice(startIndex, endIndex),
  };
}

function rowsFromFlat(flat: FlatCategory[]) {
  const counters = new Map<string, number>();

  return flat.map((item) => {
    const parentKey = item.row.parent_id ?? "__root";
    const sortOrder = counters.get(parentKey) ?? 0;
    counters.set(parentKey, sortOrder + 1);

    return {
      ...item.row,
      depth: item.level + 1,
      sort_order: sortOrder,
    };
  });
}

function buildRowsAfterMove({
  rows,
  categoryId,
  newParentId,
}: {
  rows: CategoryRow[];
  categoryId: string;
  newParentId: string | null;
}) {
  const flat = buildFlatRows(rows);
  const range = getSubtree(flat, categoryId);
  if (!range) return null;

  const { startIndex, endIndex, segment } = range;
  const activeLevel = segment[0].level;

  if (segment.some((item) => item.row.id === newParentId)) {
    return null;
  }

  const maxRelativeDepth = Math.max(
    0,
    ...segment.map((item) => item.level - activeLevel),
  );

  const remaining = [...flat.slice(0, startIndex), ...flat.slice(endIndex)];

  let insertIndex = remaining.length;
  let targetLevel = 0;

  if (newParentId) {
    const parentIndex = remaining.findIndex(
      (item) => item.row.id === newParentId,
    );

    if (parentIndex < 0) return null;

    const parentLevel = remaining[parentIndex].level;
    targetLevel = parentLevel + 1;

    let afterParentTreeIndex = parentIndex + 1;

    while (
      afterParentTreeIndex < remaining.length &&
      remaining[afterParentTreeIndex].level > parentLevel
    ) {
      afterParentTreeIndex += 1;
    }

    insertIndex = afterParentTreeIndex;
  }

  if (targetLevel + maxRelativeDepth + 1 > MAX_DEPTH) {
    return null;
  }

  const levelDiff = targetLevel - activeLevel;

  const moved = segment.map((item, index) => {
    const nextLevel = item.level + levelDiff;

    return {
      ...item,
      level: nextLevel,
      row: {
        ...item.row,
        parent_id: index === 0 ? newParentId : item.row.parent_id,
        depth: nextLevel + 1,
      },
    };
  });

  return rowsFromFlat([
    ...remaining.slice(0, insertIndex),
    ...moved,
    ...remaining.slice(insertIndex),
  ]);
}

function buildPathPreview(
  rows: CategoryRow[],
  targetParentId: string | null,
  categoryName: string,
) {
  if (!targetParentId) return categoryName;

  const map = new Map(rows.map((row) => [row.id, row]));
  const names: string[] = [];
  let current: CategoryRow | undefined = map.get(targetParentId);

  while (current) {
    names.unshift(current.name);
    current = current.parent_id ? map.get(current.parent_id) : undefined;
  }

  names.push(categoryName);
  return names.join(" > ");
}

function MoveCategoryDialog({
  rows,
  category,
  onClose,
  onMove,
}: {
  rows: CategoryRow[];
  category: CategoryRow;
  onClose: () => void;
  onMove: (nextRows: CategoryRow[]) => void;
}) {
  const [parentId, setParentId] = React.useState<string | null>(
    category.parent_id ?? null,
  );
  const [query, setQuery] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);

  const flat = React.useMemo(() => buildFlatRows(rows), [rows]);

  const disabledIds = React.useMemo(() => {
    const disabled = new Set<string>();
    const range = getSubtree(flat, category.id);

    if (range) {
      range.segment.forEach((item) => disabled.add(item.row.id));
    }

    return disabled;
  }, [flat, category.id]);

  const currentParent = rows.find((x) => x.id === category.parent_id) ?? null;

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return flat;

    return flat.filter(({ row }) => {
      return (
        row.name.toLowerCase().includes(q) ||
        row.slug.toLowerCase().includes(q)
      );
    });
  }, [flat, query]);

  const preview = buildPathPreview(rows, parentId, category.name);

  const canMove = parentId !== (category.parent_id ?? null);

  function submit() {
    try {
      setErr(null);

      const nextRows = buildRowsAfterMove({
        rows,
        categoryId: category.id,
        newParentId: parentId,
      });

      if (!nextRows) {
        throw new Error("لا يمكن نقل القسم إلى هذا المكان");
      }

      onMove(nextRows);
    } catch (e: any) {
      setErr(e?.message || "فشل نقل القسم");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div
        dir="rtl"
        className="w-full max-w-[680px] overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 p-5">
          <div className="space-y-1">
            <div className="text-lg font-black text-zinc-950">نقل القسم</div>
            <div className="text-xs text-zinc-500">
              اختر المكان الجديد. التغيير لن يُحفظ إلا بعد الضغط على حفظ
              الترتيب.
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

        <div className="grid gap-4 p-5 lg:grid-cols-[240px_1fr]">
          <div className="space-y-3">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xs font-bold text-zinc-500">
                القسم المراد نقله
              </div>
              <div className="mt-1 text-base font-black text-zinc-950">
                {category.name}
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                المكان الحالي:{" "}
                <span className="font-bold text-zinc-700">
                  {currentParent ? currentParent.name : "قسم رئيسي"}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-teal-100 bg-teal-50 p-4">
              <div className="text-xs font-black text-teal-800">
                المعاينة بعد النقل
              </div>
              <div className="mt-2 rounded-xl bg-white p-3 text-xs font-bold leading-6 text-teal-900">
                {preview}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold leading-6 text-amber-800">
              هذا النقل مؤقت الآن. بعد إغلاق النافذة سيظهر زر حفظ الترتيب أعلى
              الصفحة لاعتماد التعديل.
            </div>
          </div>

          <div className="space-y-3">
            {err && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                {err}
              </div>
            )}

            <input
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              placeholder="ابحث عن القسم الأب..."
              className="h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
            />

            <div className="max-h-[360px] space-y-2 overflow-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-2">
              <button
                type="button"
                onClick={() => setParentId(null)}
                className={[
                  "flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-right transition",
                  parentId === null
                    ? "border-teal-300 bg-teal-50"
                    : "border-transparent bg-white hover:border-zinc-200",
                ].join(" ")}
              >
                <div>
                  <div className="text-sm font-black text-zinc-950">
                    بدون — قسم رئيسي
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    سيظهر القسم في المستوى الأول.
                  </div>
                </div>

                <div
                  className={[
                    "h-5 w-5 rounded-full border",
                    parentId === null
                      ? "border-teal-600 bg-teal-600"
                      : "border-zinc-300 bg-white",
                  ].join(" ")}
                />
              </button>

              {filtered.map(({ row, level }) => {
                const disabled = disabledIds.has(row.id);
                const selected = parentId === row.id;

                return (
                  <button
                    key={row.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => setParentId(row.id)}
                    className={[
                      "flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-right transition",
                      selected
                        ? "border-teal-300 bg-teal-50"
                        : "border-transparent bg-white hover:border-zinc-200",
                      disabled ? "cursor-not-allowed opacity-40" : "",
                    ].join(" ")}
                  >
                    <div
                      className="min-w-0"
                      style={{ paddingRight: level * 18 }}
                    >
                      <div className="truncate text-sm font-black text-zinc-950">
                        {row.name}
                      </div>
                      <div className="mt-0.5 text-xs text-zinc-500">
                        مستوى {level + 1}
                        {disabled ? " — غير متاح" : ""}
                      </div>
                    </div>

                    <div
                      className={[
                        "h-5 w-5 shrink-0 rounded-full border",
                        selected
                          ? "border-teal-600 bg-teal-600"
                          : "border-zinc-300 bg-white",
                      ].join(" ")}
                    />
                  </button>
                );
              })}
            </div>
          </div>
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
            disabled={!canMove}
            className="h-10 rounded-2xl bg-teal-600 px-5 text-sm font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            تطبيق النقل مؤقتًا
          </button>
        </div>
      </div>
    </div>
  );
}