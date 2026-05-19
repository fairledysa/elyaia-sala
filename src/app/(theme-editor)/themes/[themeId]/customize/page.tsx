// apps/merchant/src/app/(theme-editor)/themes/[themeId]/customize/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragCancelEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type SectionItem = {
  id: string;
  title: string;
  enabled: boolean;
};

const DEFAULT_ITEMS: SectionItem[] = [
  { id: "square-links", title: "روابط مربعة", enabled: true },
  { id: "circle-links", title: "روابط دائرية", enabled: true },
  { id: "moving-products", title: "منتجات متحركة", enabled: true },
  { id: "stats", title: "إحصائيات", enabled: true },
  { id: "faq", title: "الأسئلة الشائعة", enabled: true },
  { id: "reviews", title: "آراء العملاء", enabled: true },
];

const LS_KEY = "theme-editor.homepage.sections.v1";

export default function HomepageEditorPage() {
  const [items, setItems] = useState<SectionItem[]>(DEFAULT_ITEMS);
  const [activeId, setActiveId] = useState<string | null>(null);

  // ✅ يمنع Hydration mismatch مع dnd-kit
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SectionItem[];
      if (Array.isArray(parsed) && parsed.length) setItems(parsed);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const ids = useMemo(() => items.map((i) => i.id), [items]);
  const activeItem = useMemo(
    () => items.find((x) => x.id === activeId) || null,
    [items, activeId],
  );

  // ✅ قبل mount: اعرض نفس القائمة بدون DND (بدون attributes المتغيرة)
  if (!mounted) {
    return (
      <div className="space-y-3" suppressHydrationWarning>
        <div className="rounded-2xl border border-gray-200 bg-white/60 p-2">
          {items.map((item) => (
            <StaticRow
              key={item.id}
              title={item.title}
              enabled={item.enabled}
              onToggle={() =>
                setItems((prev) =>
                  prev.map((x) =>
                    x.id === item.id ? { ...x, enabled: !x.enabled } : x,
                  ),
                )
              }
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
        onDragCancel={(_: DragCancelEvent) => setActiveId(null)}
        onDragEnd={(e: DragEndEvent) => {
          const { active, over } = e;
          setActiveId(null);
          if (!over) return;
          if (active.id === over.id) return;

          setItems((prev) => {
            const oldIndex = prev.findIndex((x) => x.id === active.id);
            const newIndex = prev.findIndex((x) => x.id === over.id);
            if (oldIndex < 0 || newIndex < 0) return prev;
            return arrayMove(prev, oldIndex, newIndex);
          });
        }}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="rounded-2xl border border-gray-200 bg-white/60 p-2">
            {items.map((item) => (
              <SortableRow
                key={item.id}
                item={item}
                onToggleEnabled={() =>
                  setItems((prev) =>
                    prev.map((x) =>
                      x.id === item.id ? { ...x, enabled: !x.enabled } : x,
                    ),
                  )
                }
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeItem ? (
            <OverlayRow title={activeItem.title} enabled={activeItem.enabled} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function StaticRow({
  title,
  enabled,
  onToggle,
}: {
  title: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={[
        "mb-2 last:mb-0 flex items-center justify-between rounded-2xl border bg-white px-3 py-3 shadow-sm",
        "border-gray-200",
        enabled ? "" : "opacity-60",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700">
          ⋯
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-gray-900">{title}</div>
          <div className="text-[12px] text-gray-500">اسحب للمكان المطلوب</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          className={[
            "inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-[12px] font-medium",
            "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
          ].join(" ")}
        >
          <span className="text-[14px]">{enabled ? "👁" : "🚫"}</span>
          {enabled ? "ظاهر" : "مخفي"}
        </button>

        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700">
          <GripIcon />
        </div>
      </div>
    </div>
  );
}

function SortableRow({
  item,
  onToggleEnabled,
}: {
  item: SectionItem;
  onToggleEnabled: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "group relative mb-2 last:mb-0 flex items-center justify-between rounded-2xl border bg-white px-3 py-3",
        "border-gray-200",
        isDragging ? "opacity-70 shadow-lg" : "shadow-sm",
        isOver ? "ring-2 ring-blue-200" : "",
        item.enabled ? "" : "opacity-60",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          title="خيارات"
        >
          ⋯
        </button>

        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-gray-900">
            {item.title}
          </div>
          <div className="text-[12px] text-gray-500">اسحب للمكان المطلوب</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleEnabled}
          className={[
            "inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-[12px] font-medium",
            "border-gray-200 bg-white hover:bg-gray-50",
            item.enabled ? "text-gray-700" : "text-gray-500",
          ].join(" ")}
          title="إظهار/إخفاء"
        >
          <span className="text-[14px]">{item.enabled ? "👁" : "🚫"}</span>
          {item.enabled ? "ظاهر" : "مخفي"}
        </button>

        <button
          ref={setActivatorNodeRef}
          type="button"
          className={[
            "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white",
            "text-gray-700 hover:bg-gray-50 cursor-grab active:cursor-grabbing",
          ].join(" ")}
          title="سحب لترتيب"
          {...attributes}
          {...listeners}
        >
          <GripIcon />
        </button>
      </div>
    </div>
  );
}

function OverlayRow({ title, enabled }: { title: string; enabled: boolean }) {
  return (
    <div
      className={[
        "flex items-center justify-between rounded-2xl border bg-white px-3 py-3 shadow-xl",
        "border-gray-200",
        enabled ? "" : "opacity-70",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white">
          ⋯
        </div>
        <div className="text-[13px] font-semibold text-gray-900">{title}</div>
      </div>
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white">
        <GripIcon />
      </div>
    </div>
  );
}

function GripIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 5H9M11 5H13M7 10H9M11 10H13M7 15H9M11 15H13"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
