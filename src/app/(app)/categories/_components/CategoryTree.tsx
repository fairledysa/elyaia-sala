// FILE: apps/merchant/src/app/(app)/categories/_components/CategoryTree.tsx
"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CategoryRow } from "../CategoriesClient";

type TreeCategory = CategoryRow & {
  children: TreeCategory[];
};

type FlatCategory = {
  id: string;
  node: TreeCategory;
  level: number;
};

type DropPosition = "before" | "inside" | "after";

type DropState = {
  activeId: string;
  overId: string;
  position: DropPosition;
};

type Props = {
  items: CategoryRow[];
  savingOrder?: boolean;
  megaMenuEnabledIds?: Set<string>;
  openIds?: Set<string>;
  onOpenIdsChange?: (openIds: Set<string>) => void;
  onOpenAll?: () => void;
  onCloseAll?: () => void;
  onOpenRoots?: () => void;
  onReorder?: (items: CategoryRow[]) => void | Promise<void>;
  onEdit?: (c: CategoryRow) => void;
  onMove?: (c: CategoryRow) => void;
  onAddChild?: (c: CategoryRow) => void;
  onMegaMenu?: (c: CategoryRow) => void;
};

const INDENT_WIDTH = 34;
const MAX_LEVEL = 5;
const BEFORE_ZONE = 0.14;
const AFTER_ZONE = 0.86;

function buildTree(items: CategoryRow[]) {
  const sorted = [...items].sort((a, b) => {
    const byOrder = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (byOrder !== 0) return byOrder;

    return String(a.name || "").localeCompare(String(b.name || ""), "ar");
  });

  const map = new Map<string, TreeCategory>();
  const roots: TreeCategory[] = [];

  sorted.forEach((category) => {
    map.set(category.id, { ...category, children: [] });
  });

  map.forEach((category) => {
    if (category.parent_id && map.has(category.parent_id)) {
      map.get(category.parent_id)!.children.push(category);
    } else {
      roots.push(category);
    }
  });

  return roots;
}

function flattenTree(
  nodes: TreeCategory[],
  openIds: Set<string>,
  includeClosedChildren: boolean,
  level = 0,
  output: FlatCategory[] = [],
) {
  for (const node of nodes) {
    output.push({
      id: node.id,
      node,
      level,
    });

    const shouldIncludeChildren = includeClosedChildren || openIds.has(node.id);

    if (node.children.length > 0 && shouldIncludeChildren) {
      flattenTree(
        node.children,
        openIds,
        includeClosedChildren,
        level + 1,
        output,
      );
    }
  }

  return output;
}

function getSubtreeRange(flat: FlatCategory[], activeId: string) {
  const startIndex = flat.findIndex((item) => item.id === activeId);
  if (startIndex < 0) return null;

  const activeLevel = flat[startIndex].level;
  let endIndex = startIndex + 1;

  while (endIndex < flat.length && flat[endIndex].level > activeLevel) {
    endIndex += 1;
  }

  return {
    startIndex,
    endIndex,
    segment: flat.slice(startIndex, endIndex),
  };
}

function getIndexAfterSubtree(flat: FlatCategory[], index: number) {
  const level = flat[index]?.level ?? 0;
  let nextIndex = index + 1;

  while (nextIndex < flat.length && flat[nextIndex].level > level) {
    nextIndex += 1;
  }

  return nextIndex;
}

function getMaxRelativeLevel(segment: FlatCategory[]) {
  const rootLevel = segment[0]?.level ?? 0;

  return Math.max(
    0,
    ...segment.map((item) => Math.max(0, item.level - rootLevel)),
  );
}

function rowsFromFlat(flat: FlatCategory[]) {
  const sortCounters = new Map<string, number>();

  return flat.map((item) => {
    const parentKey = item.node.parent_id ?? "__root";
    const sortOrder = sortCounters.get(parentKey) ?? 0;
    sortCounters.set(parentKey, sortOrder + 1);

    return {
      ...item.node,
      parent_id: item.node.parent_id ?? null,
      depth: item.level + 1,
      sort_order: sortOrder,
    };
  });
}

function getRowsAfterDrop({
  flat,
  activeId,
  overId,
  position,
}: {
  flat: FlatCategory[];
  activeId: string;
  overId: string;
  position: DropPosition;
}) {
  const range = getSubtreeRange(flat, activeId);
  if (!range) return null;

  const { startIndex, endIndex, segment } = range;

  if (segment.some((item) => item.id === overId)) {
    return null;
  }

  const activeItem = segment[0];
  const maxRelativeLevel = getMaxRelativeLevel(segment);

  const remaining = [...flat.slice(0, startIndex), ...flat.slice(endIndex)];
  const overIndex = remaining.findIndex((item) => item.id === overId);
  if (overIndex < 0) return null;

  const overItem = remaining[overIndex];

  let insertIndex = overIndex;
  let targetLevel = overItem.level;
  let parentId: string | null = overItem.node.parent_id ?? null;

  if (position === "before") {
    insertIndex = overIndex;
    targetLevel = overItem.level;
    parentId = overItem.node.parent_id ?? null;
  }

  if (position === "after") {
    insertIndex = getIndexAfterSubtree(remaining, overIndex);
    targetLevel = overItem.level;
    parentId = overItem.node.parent_id ?? null;
  }

  if (position === "inside") {
    insertIndex = getIndexAfterSubtree(remaining, overIndex);
    targetLevel = overItem.level + 1;
    parentId = overItem.id;
  }

  if (targetLevel + maxRelativeLevel > MAX_LEVEL) {
    return null;
  }

  const levelDiff = targetLevel - activeItem.level;

  const movedSegment = segment.map((item, index) => {
    const nextLevel = item.level + levelDiff;

    return {
      ...item,
      level: nextLevel,
      node: {
        ...item.node,
        parent_id: index === 0 ? parentId : item.node.parent_id,
        depth: nextLevel + 1,
      },
    };
  });

  const nextFlat = [
    ...remaining.slice(0, insertIndex),
    ...movedSegment,
    ...remaining.slice(insertIndex),
  ];

  return rowsFromFlat(nextFlat);
}

function makeDropId(position: DropPosition, id: string) {
  return `${position}::${id}`;
}

function parseDropId(raw: string) {
  const [position, overId] = raw.split("::");

  if (
    (position === "before" || position === "inside" || position === "after") &&
    overId
  ) {
    return {
      position,
      overId,
    } as {
      position: DropPosition;
      overId: string;
    };
  }

  return null;
}

const categoryCollisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  const zoneHits = pointerHits.filter((hit) => String(hit.id).includes("::"));

  if (zoneHits.length > 0) {
    const insideHit = zoneHits.find((hit) =>
      String(hit.id).startsWith("inside::"),
    );

    if (insideHit) return [insideHit];

    return zoneHits;
  }

  return closestCenter(args);
};

function getFallbackDropPosition(event: DragOverEvent): DropPosition | null {
  const overRect = event.over?.rect;
  const activeRect = event.active.rect.current.translated;

  if (!overRect || !activeRect) return null;

  const activeCenterY = activeRect.top + activeRect.height / 2;
  const topZone = overRect.top + overRect.height * BEFORE_ZONE;
  const bottomZone = overRect.top + overRect.height * AFTER_ZONE;

  if (activeCenterY < topZone) return "before";
  if (activeCenterY > bottomZone) return "after";

  return "inside";
}

function getDropLabel(position: DropPosition, title: string) {
  if (position === "before") return `سيتم وضعه قبل: ${title}`;
  if (position === "after") return `سيتم وضعه بعد: ${title}`;
  return `سيصبح فرع داخل: ${title}`;
}

export default function CategoryTree({
  items,
  savingOrder,
  megaMenuEnabledIds,
  openIds,
  onOpenIdsChange,
  onOpenAll,
  onCloseAll,
  onOpenRoots,
  onReorder,
  onEdit,
  onMove,
  onAddChild,
  onMegaMenu,
}: Props) {
  const tree = React.useMemo(() => buildTree(items), [items]);

  const [internalOpenIds, setInternalOpenIds] = React.useState<Set<string>>(
    () => new Set(),
  );

  const actualOpenIds = openIds ?? internalOpenIds;

  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [dropState, setDropState] = React.useState<DropState | null>(null);

  const validIds = React.useMemo(() => {
    return new Set(items.map((item) => item.id));
  }, [items]);

  function setNextOpenIds(updater: (prev: Set<string>) => Set<string>) {
    const next = updater(actualOpenIds);

    const cleaned = new Set(
      Array.from(next).filter((id) => validIds.has(String(id))),
    );

    if (onOpenIdsChange) {
      onOpenIdsChange(cleaned);
      return;
    }

    setInternalOpenIds(cleaned);
  }

  const flatAll = React.useMemo(
    () => flattenTree(tree, actualOpenIds, true),
    [tree, actualOpenIds],
  );

  const flatVisible = React.useMemo(
    () => flattenTree(tree, actualOpenIds, false),
    [tree, actualOpenIds],
  );

  const activeItem = React.useMemo(() => {
    if (!activeId) return null;
    return flatAll.find((item) => item.id === activeId) ?? null;
  }, [activeId, flatAll]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function toggle(id: string) {
    setNextOpenIds((prev) => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const currentActiveId = String(event.active.id);
    const rawOverId = event.over?.id ? String(event.over.id) : "";

    if (!rawOverId) {
      setDropState(null);
      return;
    }

    let parsed = parseDropId(rawOverId);

    if (!parsed) {
      const fallbackPosition = getFallbackDropPosition(event);

      if (!fallbackPosition || currentActiveId === rawOverId) {
        setDropState(null);
        return;
      }

      parsed = {
        overId: rawOverId,
        position: fallbackPosition,
      };
    }

    const { overId, position } = parsed;

    if (currentActiveId === overId) {
      setDropState(null);
      return;
    }

    const range = getSubtreeRange(flatAll, currentActiveId);
    if (range?.segment.some((item) => item.id === overId)) {
      setDropState(null);
      return;
    }

    const preview = getRowsAfterDrop({
      flat: flatAll,
      activeId: currentActiveId,
      overId,
      position,
    });

    if (!preview) {
      setDropState(null);
      return;
    }

    setDropState({
      activeId: currentActiveId,
      overId,
      position,
    });

    if (position === "inside") {
      setNextOpenIds((prev) => new Set(prev).add(overId));
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const currentActiveId = String(event.active.id);

    const finalDrop =
      dropState && dropState.activeId === currentActiveId ? dropState : null;

    setActiveId(null);
    setDropState(null);

    if (!finalDrop || currentActiveId === finalDrop.overId) return;

    const nextRows = getRowsAfterDrop({
      flat: flatAll,
      activeId: currentActiveId,
      overId: finalDrop.overId,
      position: finalDrop.position,
    });

    if (!nextRows) return;

    const activeRow = nextRows.find((row) => row.id === currentActiveId);
    if (activeRow?.parent_id) {
      setNextOpenIds((prev) => new Set(prev).add(activeRow.parent_id!));
    }

    onReorder?.(nextRows);
  }

  function handleDragCancel() {
    setActiveId(null);
    setDropState(null);
  }

  return (
    <section
      dir="rtl"
      className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-4 flex flex-col gap-3 border-b border-zinc-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-sm font-black text-zinc-950">شجرة الأقسام</div>
          <div className="mt-0.5 text-xs text-zinc-500">
            اسحب من المقبض. منتصف البطاقة يُدخل القسم داخلها، والحافة فقط
            للترتيب قبل أو بعد.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenRoots && (
            <button
              type="button"
              onClick={onOpenRoots}
              disabled={savingOrder}
              className="h-8 rounded-xl border border-zinc-200 bg-white px-3 text-[11px] font-black text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              الرئيسية فقط
            </button>
          )}

          {onCloseAll && (
            <button
              type="button"
              onClick={onCloseAll}
              disabled={savingOrder}
              className="h-8 rounded-xl border border-zinc-200 bg-white px-3 text-[11px] font-black text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              إغلاق الكل
            </button>
          )}

          {onOpenAll && (
            <button
              type="button"
              onClick={onOpenAll}
              disabled={savingOrder}
              className="h-8 rounded-xl border border-teal-200 bg-teal-50 px-3 text-[11px] font-black text-teal-700 transition hover:bg-teal-100 disabled:opacity-50"
            >
              فتح الكل
            </button>
          )}

          {savingOrder && (
            <div className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-teal-700">
              جاري حفظ الترتيب...
            </div>
          )}
        </div>
      </div>

      {activeId && (
        <div className="mb-3 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-xs font-black text-teal-800">
          مرّر فوق منتصف أي قسم لإدخاله داخله. لا تحتاج دقة عالية.
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={categoryCollisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={flatVisible.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {flatVisible.map((item) => (
              <SortableCategoryRow
                key={item.id}
                item={item}
                isOpen={actualOpenIds.has(item.id)}
                isMegaMenuEnabled={Boolean(megaMenuEnabledIds?.has(item.id))}
                onToggle={() => toggle(item.id)}
                onEdit={onEdit}
                onMove={onMove}
                onAddChild={onAddChild}
                onMegaMenu={onMegaMenu}
                dragEnabled={!!onReorder && !savingOrder}
                dropState={dropState}
                activeId={activeId}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={null}>
          {activeItem ? <DragPreview item={activeItem} /> : null}
        </DragOverlay>
      </DndContext>
    </section>
  );
}

function RowDropZones({ id, enabled }: { id: string; enabled: boolean }) {
  const before = useDroppable({
    id: makeDropId("before", id),
    disabled: !enabled,
  });

  const inside = useDroppable({
    id: makeDropId("inside", id),
    disabled: !enabled,
  });

  const after = useDroppable({
    id: makeDropId("after", id),
    disabled: !enabled,
  });

  if (!enabled) return null;

  return (
    <div className="absolute inset-0 z-20 overflow-hidden rounded-2xl">
      <div ref={before.setNodeRef} className="h-[14%] w-full" />
      <div ref={inside.setNodeRef} className="h-[72%] w-full" />
      <div ref={after.setNodeRef} className="h-[14%] w-full" />
    </div>
  );
}

function DropIndicator({
  position,
  title,
}: {
  position: DropPosition;
  title: string;
}) {
  if (position === "inside") {
    return (
      <div className="my-2 rounded-2xl border-2 border-dashed border-teal-400 bg-teal-50/90 px-4 py-3 text-xs font-black text-teal-800 shadow-sm">
        {getDropLabel(position, title)}
      </div>
    );
  }

  return (
    <div className="my-1 flex items-center gap-3">
      <div className="h-[2px] flex-1 rounded-full bg-teal-400" />
      <div className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[11px] font-black text-teal-700">
        {getDropLabel(position, title)}
      </div>
      <div className="h-[2px] flex-1 rounded-full bg-teal-400" />
    </div>
  );
}

function CategoryImage({
  src,
  name,
  isRoot,
}: {
  src?: string | null;
  name: string;
  isRoot: boolean;
}) {
  return (
    <div
      className={[
        "relative z-30 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border",
        isRoot ? "border-teal-100 bg-teal-50" : "border-zinc-200 bg-zinc-50",
      ].join(" ")}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-sm">🖼️</span>
      )}
    </div>
  );
}

function SortableCategoryRow({
  item,
  isOpen,
  isMegaMenuEnabled,
  onToggle,
  onEdit,
  onMove,
  onAddChild,
  onMegaMenu,
  dragEnabled,
  dropState,
  activeId,
}: {
  item: FlatCategory;
  isOpen: boolean;
  isMegaMenuEnabled: boolean;
  onToggle: () => void;
  onEdit?: (c: CategoryRow) => void;
  onMove?: (c: CategoryRow) => void;
  onAddChild?: (c: CategoryRow) => void;
  onMegaMenu?: (c: CategoryRow) => void;
  dragEnabled: boolean;
  dropState: DropState | null;
  activeId: string | null;
}) {
  const { node, level } = item;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    disabled: !dragEnabled,
  });

  const childCount = node.children.length;
  const hasChildren = childCount > 0;
  const isRoot = !node.parent_id;
  const depth = node.depth ?? level + 1;
  const canAddChild = depth < 6;

  const isActiveRow = activeId === item.id;
  const isDraggingOtherRow = Boolean(activeId && activeId !== item.id);

  const isDropTarget =
    dropState?.overId === item.id && dropState.activeId !== item.id;

  const showBefore = isDropTarget && dropState?.position === "before";
  const showInside = isDropTarget && dropState?.position === "inside";
  const showAfter = isDropTarget && dropState?.position === "after";

  const indent = level > 0 ? level * INDENT_WIDTH : 0;
  const connectorRight = level > 0 ? indent - 18 : 0;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    opacity: isDragging ? 0.22 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {showBefore && (
        <div style={{ paddingRight: indent }}>
          <DropIndicator position="before" title={node.name} />
        </div>
      )}

      <div className="relative" style={{ paddingRight: indent }}>
        {level > 0 && (
          <>
            <span
              className="absolute top-[-10px] h-[calc(100%+10px)] w-[2px] rounded-full bg-zinc-300"
              style={{ right: connectorRight }}
            />

            <span
              className="absolute top-1/2 h-[2px] w-5 rounded-full bg-zinc-300"
              style={{ right: connectorRight }}
            />
          </>
        )}

        <div
          className={[
            "relative rounded-2xl border bg-white px-3 py-2.5 transition",
            isDragging || isActiveRow ? "border-teal-300 shadow-lg" : "",
            isDraggingOtherRow ? "ring-1 ring-zinc-100" : "",
            showInside
              ? "border-2 border-dashed border-teal-400 bg-teal-50/70 shadow-md"
              : "",
            isRoot
              ? "border-zinc-200 shadow-sm hover:border-zinc-300"
              : "border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50/60",
          ].join(" ")}
        >
          <RowDropZones id={item.id} enabled={isDraggingOtherRow} />

          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <button
                type="button"
                {...attributes}
                {...listeners}
                disabled={!dragEnabled}
                className={[
                  "relative z-30 flex h-9 w-9 shrink-0 cursor-grab items-center justify-center rounded-xl border text-[13px] font-black transition active:cursor-grabbing",
                  dragEnabled
                    ? "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                    : "cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300",
                ].join(" ")}
                aria-label="سحب القسم"
              >
                ⋮⋮
              </button>

              <button
                type="button"
                onClick={onToggle}
                disabled={!hasChildren || isDraggingOtherRow}
                className={[
                  "relative z-30 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-xs transition",
                  hasChildren
                    ? "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                    : "cursor-default border-transparent bg-transparent text-transparent",
                ].join(" ")}
                aria-label={isOpen ? "إغلاق الفروع" : "فتح الفروع"}
              >
                {isOpen ? "⌄" : "‹"}
              </button>

              <div
                className={[
                  "relative z-30 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black",
                  isRoot
                    ? "bg-teal-50 text-teal-700"
                    : "bg-zinc-100 text-zinc-600",
                ].join(" ")}
              >
                {isRoot ? "ر" : depth}
              </div>

              <CategoryImage
                src={node.image_url}
                name={node.name}
                isRoot={isRoot}
              />

              <div className="relative z-30 min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="truncate text-sm font-black text-zinc-950">
                    {node.name}
                  </div>

                  <span
                    className={[
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                      node.status === "active"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-zinc-100 text-zinc-600",
                    ].join(" ")}
                  >
                    {node.status === "active" ? "نشط" : "مخفي"}
                  </span>

                  {hasChildren && (
                    <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500">
                      {childCount} فرع
                    </span>
                  )}

                  {isRoot && isMegaMenuEnabled && (
                    <span className="shrink-0 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-black text-violet-700">
                      Mega مفعلة
                    </span>
                  )}

                  {showInside && (
                    <span className="shrink-0 rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-black text-white">
                      إدخال داخل هذا القسم
                    </span>
                  )}
                </div>

                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-400">
                  <span>{isRoot ? "قسم رئيسي" : "فرع"}</span>
                  <span>•</span>
                  <span>مستوى {depth}</span>

                  {node.slug && (
                    <>
                      <span>•</span>
                      <span
                        dir="ltr"
                        className="max-w-[180px] truncate text-left"
                      >
                        /{node.slug}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="relative z-30 flex shrink-0 items-center gap-1.5">
              {onMegaMenu && isRoot && (
                <button
                  type="button"
                  disabled={isDraggingOtherRow}
                  onClick={() => onMegaMenu(node)}
                  className={[
                    "h-7 rounded-xl border px-2.5 text-[11px] font-black transition disabled:opacity-40",
                    isMegaMenuEnabled
                      ? "border-violet-300 bg-violet-600 text-white hover:bg-violet-700"
                      : "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100",
                  ].join(" ")}
                >
                  {isMegaMenuEnabled ? "Mega مفعلة" : "القائمة الكبيرة"}
                </button>
              )}

              {onMove && (
                <button
                  type="button"
                  disabled={isDraggingOtherRow}
                  onClick={() => onMove(node)}
                  className="h-7 rounded-xl border border-blue-200 bg-blue-50 px-2.5 text-[11px] font-black text-blue-700 transition hover:bg-blue-100 disabled:opacity-40"
                >
                  نقل
                </button>
              )}

              {onAddChild && canAddChild && (
                <button
                  type="button"
                  disabled={isDraggingOtherRow}
                  onClick={() => onAddChild(node)}
                  className="h-7 rounded-xl border border-teal-200 bg-teal-50 px-2.5 text-[11px] font-black text-teal-700 transition hover:bg-teal-100 disabled:opacity-40"
                >
                  + فرع
                </button>
              )}

              {onEdit && (
                <button
                  type="button"
                  disabled={isDraggingOtherRow}
                  onClick={() => onEdit(node)}
                  className="h-7 rounded-xl border border-zinc-200 bg-white px-2.5 text-[11px] font-black text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-40"
                >
                  تعديل
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showInside && (
        <div style={{ paddingRight: indent + INDENT_WIDTH }}>
          <DropIndicator position="inside" title={node.name} />
        </div>
      )}

      {showAfter && (
        <div style={{ paddingRight: indent }}>
          <DropIndicator position="after" title={node.name} />
        </div>
      )}
    </div>
  );
}

function DragPreview({ item }: { item: FlatCategory }) {
  const { node, level } = item;
  const isRoot = !node.parent_id;
  const depth = node.depth ?? level + 1;

  return (
    <div
      dir="rtl"
      className="w-[540px] rounded-2xl border border-teal-300 bg-white px-3 py-2.5 shadow-2xl"
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 text-[13px] font-black text-teal-700">
          ⋮⋮
        </div>

        <div
          className={[
            "flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black",
            isRoot
              ? "bg-teal-50 text-teal-700"
              : "bg-zinc-100 text-zinc-600",
          ].join(" ")}
        >
          {isRoot ? "ر" : depth}
        </div>

        <CategoryImage src={node.image_url} name={node.name} isRoot={isRoot} />

        <div className="min-w-0">
          <div className="truncate text-sm font-black text-zinc-950">
            {node.name}
          </div>
          <div className="text-[11px] text-zinc-400">
            منتصف البطاقة = إدخال داخل القسم
          </div>
        </div>
      </div>
    </div>
  );
}