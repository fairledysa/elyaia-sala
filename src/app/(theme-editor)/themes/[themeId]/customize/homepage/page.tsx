// FILE: apps/merchant/src/app/(theme-editor)/themes/[themeId]/customize/homepage/page.tsx
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
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
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Icon from "@/boltify/components/icon/Icon";
import { STATUS_ICONS as THEME_EDITOR_ICONS } from "@/lib/icons/status-icons";

type ThemeComponentField = {
  id: string;
  component_id: string;
  key: string;
  label: string;
  field_type: string;
  description: string | null;
  placeholder: string | null;
  is_required: boolean;
  is_translatable: boolean;
  is_active: boolean;
  sort_order: number;
  default_value: any;
  options: any;
  validation: any;
  ui_props: any;
  width: string | null;
};

type AvailableComponent = {
  id: string;
  key: string;
  name: string;
  slug: string;
  description?: string | null;
  preview_image_url?: string | null;
  icon?: string | null;
  page_key: string;
  category?: string | null;
  component_kind: "section" | "widget" | "banner" | "block";
  is_active: boolean;
  is_builtin: boolean;
  supports_multiple: boolean;
  default_enabled: boolean;
  default_sort_order: number;
  settings_schema?: any;
  default_values?: any;
  metadata?: any;
  fields: ThemeComponentField[];
};

type StoreReferenceOption = {
  value: string;
  label: string;
  image_url?: string | null;
};

type LinkTargetType = "external" | "internal" | "product" | "category" | "page";

type UrlFieldValue = {
  type: LinkTargetType;
  value: string;
  label?: string;
};

type ButtonFieldValue = {
  text: string;
  link: UrlFieldValue;
  style?: "solid" | "outline" | "ghost";
};

type ThemeOptionsResponse = {
  ok?: boolean;
  theme_options?: Record<string, any>;
  available_components?: AvailableComponent[];
  store_products?: StoreReferenceOption[];
  store_categories?: StoreReferenceOption[];
  meta?: {
    runtime_theme_code?: string | null;
  };
  error?: string;
};

type HomepageSectionItem = {
  instance_id: string;
  component_id: string;
  key: string;
  title: string;
  enabled: boolean;
  values: Record<string, any>;
  supports_multiple: boolean;
  description?: string | null;
  preview_image_url?: string | null;
  fields: ThemeComponentField[];
};

type UploadResponse = {
  ok?: boolean;
  publicUrl?: string;
  key?: string;
  error?: string;
  details?: any;
};

function s(v: unknown) {
  return String(v ?? "").trim();
}

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

function uid(prefix = "sec") {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`;
}

function sameSections(a: HomepageSectionItem[], b: HomepageSectionItem[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function normalizeFieldOptions(
  options: any,
): Array<{ label: string; value: string }> {
  if (!Array.isArray(options)) return [];

  return options
    .map((opt) => {
      if (typeof opt === "string") {
        return { label: opt, value: opt };
      }

      if (opt && typeof opt === "object") {
        const label = s(opt.label || opt.name || opt.title || opt.value);
        const value = s(opt.value || opt.key || opt.id || label);
        if (!label && !value) return null;

        return {
          label: label || value,
          value: value || label,
        };
      }

      return null;
    })
    .filter(Boolean) as Array<{ label: string; value: string }>;
}

function normalizeInlineField(row: any, index = 0): ThemeComponentField {
  return {
    id: s(row?.id || row?.key || `sub_field_${index + 1}`),
    component_id: s(row?.component_id || ""),
    key: s(row?.key),
    label: s(row?.label || row?.title || row?.name || row?.key),
    field_type: s(row?.field_type || row?.type || "text"),
    description: row?.description ?? null,
    placeholder: row?.placeholder ?? null,
    is_required: Boolean(row?.is_required),
    is_translatable: Boolean(row?.is_translatable),
    is_active: row?.is_active !== false,
    sort_order: Number(row?.sort_order ?? (index + 1) * 10),
    default_value: row?.default_value ?? null,
    options: row?.options ?? [],
    validation: row?.validation ?? {},
    ui_props: row?.ui_props ?? {},
    width: row?.width ?? "full",
  };
}

function getRepeaterSubFields(field: ThemeComponentField): ThemeComponentField[] {
  const raw =
    field?.ui_props?.repeater_fields ??
    field?.ui_props?.sub_fields ??
    field?.options?.repeater_fields ??
    field?.options?.sub_fields ??
    field?.validation?.repeater_fields ??
    field?.validation?.sub_fields ??
    [];

  if (!Array.isArray(raw)) return [];

  return raw
    .map((row, index) => normalizeInlineField(row, index))
    .filter((row) => !!s(row.key))
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
}

function getDefaultValueForField(field: ThemeComponentField) {
  if (field.default_value !== null && field.default_value !== undefined) {
    return clone(field.default_value);
  }

  switch (field.field_type) {
    case "switch":
    case "checkbox":
      return false;

    case "checkbox_group":
    case "images":
    case "repeater":
      return [];

    case "number":
      return 0;

    case "url":
      return {
        type: "external",
        value: "",
        label: "",
      };

    case "button":
      return {
        text: s(field?.ui_props?.button_text) || "عرض التفاصيل",
        style: s(field?.ui_props?.button_style) || "outline",
        link: {
          type: s(field?.ui_props?.button_link_type) || "external",
          value: "",
          label: "",
        },
      };

    case "datetime":
      return "";

    case "product_picker":
    case "category_picker":
      return field?.ui_props?.allow_multiple ? [] : "";

    case "select":
    case "radio": {
      const opts = normalizeFieldOptions(field.options);
      return opts[0]?.value ?? "";
    }

    case "divider":
    case "heading":
      return "";

    default:
      return "";
  }
}

function buildRepeaterItemInitialValues(field: ThemeComponentField) {
  const subFields = getRepeaterSubFields(field);
  const out: Record<string, any> = {};

  for (const subField of subFields) {
    out[subField.key] = getDefaultValueForField(subField);
  }

  return out;
}

function buildInitialValues(fields: ThemeComponentField[]) {
  const out: Record<string, any> = {};

  for (const field of [...fields].sort(
    (a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
  )) {
    out[field.key] = getDefaultValueForField(field);
  }

  return out;
}

function findComponentByToken(
  components: AvailableComponent[],
  token: string,
): AvailableComponent | null {
  const target = s(token);
  if (!target) return null;

  return (
    components.find((x) => s(x.id) === target) ||
    components.find((x) => s(x.key) === target) ||
    components.find((x) => s(x.slug) === target) ||
    null
  );
}

function normalizeHomepageSections(
  raw: any,
  components: AvailableComponent[],
): HomepageSectionItem[] {
  const componentMap = new Map<string, AvailableComponent>();

  for (const component of components) {
    componentMap.set(s(component.id), component);
    componentMap.set(s(component.key), component);
    componentMap.set(s(component.slug), component);
  }

  if (!Array.isArray(raw)) return [];

  const items: HomepageSectionItem[] = [];

  for (const row of raw) {
    const token =
      s(row?.component_id) || s(row?.id) || s(row?.key) || s(row?.slug);

    const component = componentMap.get(token);
    if (!component) continue;

    items.push({
      instance_id: s(row?.instance_id) || uid("instance"),
      component_id: s(component.id),
      key: s(component.key),
      title: s(row?.title) || s(component.name) || s(component.key),
      enabled:
        typeof row?.enabled === "boolean"
          ? row.enabled
          : Boolean(component.default_enabled),
      values:
        row?.values && typeof row.values === "object"
          ? clone(row.values)
          : buildInitialValues(component.fields || []),
      supports_multiple: Boolean(component.supports_multiple),
      description: component.description ?? null,
      preview_image_url: component.preview_image_url ?? null,
      fields: Array.isArray(component.fields) ? clone(component.fields) : [],
    });
  }

  return items;
}

function serializeSections(items: HomepageSectionItem[]) {
  return items.map((item, index) => ({
    instance_id: item.instance_id,
    component_id: item.component_id,
    id: item.key,
    key: item.key,
    title: item.title,
    enabled: Boolean(item.enabled),
    sort_order: (index + 1) * 10,
    values: clone(item.values || {}),
  }));
}

async function uploadThemeEditorFile(file: File): Promise<string> {
  const form = new FormData();
  form.append("kind", "theme-editor/image");
  form.append("file", file, file.name);

  const res = await fetch("/api/uploads/r2/put", {
    method: "POST",
    body: form,
  });

  const json: UploadResponse = await res.json().catch(() => ({}));

  if (!res.ok || !json?.ok || !json?.publicUrl) {
    throw new Error(json?.error || "UPLOAD_FAILED");
  }

  return String(json.publicUrl);
}

function normalizeUrlFieldValue(value: any): UrlFieldValue {
  if (typeof value === "string") {
    return {
      type: "external",
      value: s(value),
      label: "",
    };
  }

  if (value && typeof value === "object") {
    const rawType = s(value.type) as LinkTargetType;

    const type: LinkTargetType =
      rawType === "product" ||
      rawType === "category" ||
      rawType === "external" ||
      rawType === "internal" ||
      rawType === "page"
        ? rawType
        : "external";

    return {
      type,
      value: s(value.value || value.url || value.href || ""),
      label: s(value.label || value.name || ""),
    };
  }

  return {
    type: "external",
    value: "",
    label: "",
  };
}

function getUrlFieldAllowedTypes(field: ThemeComponentField) {
  const raw = Array.isArray(field?.ui_props?.url_types)
    ? field.ui_props.url_types
    : Array.isArray(field?.ui_props?.link_types)
      ? field.ui_props.link_types
      : Array.isArray(field?.ui_props?.image_link_types)
        ? field.ui_props.image_link_types
        : ["external", "internal", "product", "category", "page"];

  const allowed = raw
    .map((x: any) => s(x))
    .filter((x: string) =>
      ["external", "internal", "product", "category", "page"].includes(x),
    ) as LinkTargetType[];

  return allowed.length
    ? allowed
    : ([
        "external",
        "internal",
        "product",
        "category",
        "page",
      ] as LinkTargetType[]);
}

function isProductsSourceRepeater(field: ThemeComponentField) {
  const subFields = getRepeaterSubFields(field);

  const hasSourceField = subFields.some(
    (subField) =>
      s(subField.key) === "field_2" &&
      s(subField.field_type) === "select" &&
      normalizeFieldOptions(subField.options).some((opt) =>
        ["manual", "category", "latest", "best_selling"].includes(s(opt.value)),
      ),
  );

  const hasProductPicker = subFields.some(
    (subField) =>
      s(subField.key) === "field_3" &&
      s(subField.field_type) === "product_picker",
  );

  const hasCategoryPicker = subFields.some(
    (subField) =>
      s(subField.key) === "field_4" &&
      s(subField.field_type) === "category_picker",
  );

  return hasSourceField && hasProductPicker && hasCategoryPicker;
}

function shouldShowRepeaterSubField(
  parentField: ThemeComponentField,
  row: Record<string, any>,
  subField: ThemeComponentField,
) {
  if (!shouldShowFieldByVisibleWhen(row || {}, subField)) {
    return false;
  }

  if (!isProductsSourceRepeater(parentField)) {
    return true;
  }

  const source = s(row?.field_2 || row?.source || row?.products_source);

  if (subField.key === "field_3") {
    return source === "" || source === "manual";
  }

  if (subField.key === "field_4") {
    return source === "category";
  }

  return true;
}

function shouldShowAdvancedProductsCollectionField(
  item: HomepageSectionItem,
  field: ThemeComponentField,
) {
  const componentKey = s(item.key);
  const fieldKey = s(field.key);

  if (componentKey !== "advanced_products_collection") {
    return true;
  }

  const values = item.values || {};
  const tabsEnabled = Boolean(values.field_7);
  const sliderSource = s(values.field_8 || "manual");

  if (fieldKey === "field_12") {
    return tabsEnabled;
  }

  if (fieldKey === "field_8") {
    return !tabsEnabled;
  }

  if (fieldKey === "field_9") {
    return !tabsEnabled && sliderSource === "manual";
  }

  if (fieldKey === "field_10") {
    return !tabsEnabled && sliderSource === "category";
  }

  if (fieldKey === "field_11") {
    return !tabsEnabled;
  }

  return true;
}

function compareVisibilityValue(
  currentValue: any,
  operator: string,
  expectedValue: any,
) {
  const current = s(currentValue);

  if (operator === "=" || operator === "eq") {
    return current === s(expectedValue);
  }

  if (operator === "!=" || operator === "neq") {
    return current !== s(expectedValue);
  }

  if (operator === "in") {
    const list = Array.isArray(expectedValue)
      ? expectedValue.map(s)
      : [s(expectedValue)];

    return list.includes(current);
  }

  if (operator === "not_in") {
    const list = Array.isArray(expectedValue)
      ? expectedValue.map(s)
      : [s(expectedValue)];

    return !list.includes(current);
  }

  return true;
}
function shouldShowFieldByVisibleWhen(
  values: Record<string, any>,
  field: ThemeComponentField,
) {
  const rule = field?.ui_props?.visible_when;

  if (!rule || typeof rule !== "object") {
    return true;
  }

  const sourceFieldKey = s(rule.field || rule.field_key || rule.key);
  if (!sourceFieldKey) return true;

  const operator = s(rule.operator || "=");
  const expectedValue = rule.value;

  return compareVisibilityValue(
    values?.[sourceFieldKey],
    operator,
    expectedValue,
  );
}

function isFieldRequiredNow(
  values: Record<string, any>,
  field: ThemeComponentField,
) {
  const rule = field?.validation?.required_when;

  if (!rule || typeof rule !== "object") {
    return Boolean(field.is_required);
  }

  const sourceFieldKey = s(rule.field || rule.field_key || rule.key);
  if (!sourceFieldKey) return Boolean(field.is_required);

  const operator = s(rule.operator || "=");
  const expectedValue = rule.value;

  return compareVisibilityValue(
    values?.[sourceFieldKey],
    operator,
    expectedValue,
  );
}

function isEmptyFieldValue(value: any) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return !s(value);
  if (Array.isArray(value)) return value.length === 0;

  if (value && typeof value === "object") {
    if ("value" in value) return !s(value.value);
    return Object.keys(value).length === 0;
  }

  return false;
}

function themeIconLabel(value?: string | null) {
  const item = THEME_EDITOR_ICONS.find((x) => x.value === value);
  return item?.label || "اختر الأيقونة";
}

function shouldUseIconPicker(field: ThemeComponentField) {
  if (field.field_type !== "text") return false;

  const label = s(field.label);
  const key = s(field.key);
  const uiProps = field.ui_props || {};

  return (
    uiProps.icon_picker === true ||
    uiProps.option_source === "icons" ||
    label.includes("أيقونة") ||
    label.includes("الايقونة") ||
    label.includes("الأيقونة") ||
    key === "icon" ||
    key === "icon_name"
  );
}

function ThemeIconPreview({ icon }: { icon?: string | null }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
      {icon ? <Icon icon={icon as any} className="text-lg" /> : null}
    </div>
  );
}

function ThemeIconPickerField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const PAGE_SIZE = 20;
  const totalPages = Math.max(
    1,
    Math.ceil(THEME_EDITOR_ICONS.length / PAGE_SIZE),
  );

  const currentItems = THEME_EDITOR_ICONS.slice(
    page * PAGE_SIZE,
    page * PAGE_SIZE + PAGE_SIZE,
  );

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const node = wrapRef.current;
      if (!node) return;
      if (node.contains(e.target as Node)) return;
      setOpen(false);
    }

    if (open) {
      document.addEventListener("mousedown", onDocClick);
    }

    return () => {
      document.removeEventListener("mousedown", onDocClick);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 w-full items-center justify-between rounded-2xl border border-slate-300 bg-white px-3 text-sm"
      >
        <span className="flex min-w-0 items-center gap-3">
          <ThemeIconPreview icon={value} />
          <span
            className={[
              "truncate",
              value ? "text-slate-900" : "text-slate-400",
            ].join(" ")}
          >
            {themeIconLabel(value)}
          </span>
        </span>

        <span className="text-slate-400">▾</span>
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+8px)] z-[10000] w-[320px] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40"
            >
              ‹
            </button>

            <div className="text-sm font-semibold text-slate-700">
              {page + 1} / {totalPages}
            </div>

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {currentItems.map((item) => {
              const selected = value === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  title={item.label}
                  onClick={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  className={[
                    "flex h-12 w-full items-center justify-center rounded-xl border transition",
                    selected
                      ? "border-[#7fe0d4] bg-[#dffaf5] text-[#0f766e]"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                >
                  <Icon icon={item.value as any} className="text-lg" />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);

  return debounced;
}

export default function HomepageEditorPage() {
  const params = useParams<{ themeId: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const themeId = String(params?.themeId ?? "").trim();

  const [items, setItems] = useState<HomepageSectionItem[]>([]);
  const [availableComponents, setAvailableComponents] = useState<
    AvailableComponent[]
  >([]);
  const [storeProducts, setStoreProducts] = useState<StoreReferenceOption[]>([]);
  const [storeCategories, setStoreCategories] = useState<StoreReferenceOption[]>(
    [],
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(
    null,
  );
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);

  const initialRef = useRef<HomepageSectionItem[]>([]);
  const themeOptionsRef = useRef<Record<string, any>>({});
  const addHandledRef = useRef<string>("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const ids = useMemo(() => items.map((i) => i.instance_id), [items]);

  const activeItem = useMemo(
    () => items.find((x) => x.instance_id === activeId) || null,
    [items, activeId],
  );

  const selectedItem = useMemo(
    () => items.find((x) => x.instance_id === selectedInstanceId) || null,
    [items, selectedInstanceId],
  );

  const canSave = useMemo(() => {
    if (loading || saving) return false;
    return !sameSections(items, initialRef.current);
  }, [items, loading, saving]);

  useEffect(() => {
    if (!themeId) return;

    let alive = true;

    async function load() {
      try {
        setLoading(true);

        const res = await fetch(`/api/themes/${themeId}/theme-options`, {
          method: "GET",
          cache: "no-store",
        });

        const json: ThemeOptionsResponse = await res.json().catch(() => ({}));

        if (!alive) return;

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "FAILED_TO_LOAD_THEME_OPTIONS");
        }

        const themeOptions =
          json?.theme_options && typeof json.theme_options === "object"
            ? clone(json.theme_options)
            : {};

        const components = Array.isArray(json?.available_components)
          ? json.available_components
          : [];

        themeOptionsRef.current = themeOptions;
        setAvailableComponents(components);
        setStoreProducts(
          Array.isArray(json?.store_products) ? json.store_products : [],
        );
        setStoreCategories(
          Array.isArray(json?.store_categories) ? json.store_categories : [],
        );

        const normalized = normalizeHomepageSections(
          themeOptions?.homepage?.sections,
          components,
        );

        setItems(normalized);
        initialRef.current = clone(normalized);
      } catch {
        themeOptionsRef.current = {};
        setAvailableComponents([]);
        setStoreProducts([]);
        setStoreCategories([]);
        setItems([]);
        initialRef.current = [];
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load();

    return () => {
      alive = false;
    };
  }, [themeId]);

  useEffect(() => {
    const addToken = s(searchParams.get("add"));
    if (!addToken || !availableComponents.length || !pathname) return;

    const fingerprint = `${pathname}?add=${addToken}`;
    if (addHandledRef.current === fingerprint) return;

    const component = findComponentByToken(availableComponents, addToken);
    if (!component) return;

    addHandledRef.current = fingerprint;
    addComponent(component);
    router.replace(pathname, { scroll: false });
  }, [searchParams, availableComponents, pathname, router]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("theme-editor:save-state", {
        detail: {
          pageKey: "homepage",
          showSaveButton: true,
          label: selectedItem ? "حفظ إعدادات العنصر" : "حفظ ترتيب وعرض العناصر",
          canSave,
          saving,
        },
      }),
    );
  }, [selectedItem, canSave, saving]);

  useEffect(() => {
    function onRequestState() {
      window.dispatchEvent(
        new CustomEvent("theme-editor:save-state", {
          detail: {
            pageKey: "homepage",
            showSaveButton: true,
            label: selectedItem
              ? "حفظ إعدادات العنصر"
              : "حفظ ترتيب وعرض العناصر",
            canSave,
            saving,
          },
        }),
      );
    }

    function onSave(e: Event) {
      const ce = e as CustomEvent<{ pageKey?: string }>;
      const pageKey = String(ce?.detail?.pageKey ?? "").trim();
      if (pageKey && pageKey !== "homepage") return;
      void handleSave();
    }

    window.addEventListener(
      "theme-editor:save-state:request",
      onRequestState as EventListener,
    );
    window.addEventListener("theme-editor:save", onSave as EventListener);

    return () => {
      window.removeEventListener(
        "theme-editor:save-state:request",
        onRequestState as EventListener,
      );
      window.removeEventListener("theme-editor:save", onSave as EventListener);
    };
  }, [selectedItem, canSave, saving, items, themeId]);

  useEffect(() => {
    function onAddComponent(e: Event) {
      const ce = e as CustomEvent<{ componentId?: string; addKey?: string }>;
      const token = s(ce?.detail?.componentId || ce?.detail?.addKey);
      if (!token) return;

      const component = findComponentByToken(availableComponents, token);
      if (!component) return;

      addComponent(component);
    }

    window.addEventListener(
      "theme-editor:add-homepage-component",
      onAddComponent as EventListener,
    );

    return () => {
      window.removeEventListener(
        "theme-editor:add-homepage-component",
        onAddComponent as EventListener,
      );
    };
  }, [availableComponents]);

  function addComponent(component: AvailableComponent) {
    setItems((prev) => {
      if (!component.supports_multiple) {
        const exists = prev.find((x) => x.component_id === component.id);
        if (exists) {
          setSelectedInstanceId(exists.instance_id);
          return prev;
        }
      }

      const nextItem: HomepageSectionItem = {
        instance_id: uid("instance"),
        component_id: s(component.id),
        key: s(component.key),
        title: s(component.name),
        enabled: Boolean(component.default_enabled),
        values: buildInitialValues(component.fields || []),
        supports_multiple: Boolean(component.supports_multiple),
        description: component.description ?? null,
        preview_image_url: component.preview_image_url ?? null,
        fields: Array.isArray(component.fields) ? clone(component.fields) : [],
      };

      const next = [...prev, nextItem];
      setSelectedInstanceId(nextItem.instance_id);
      return next;
    });
  }

  async function handleSave() {
    if (!themeId || loading || saving) return;

    try {
      setSaving(true);

      for (const item of items) {
        if (!item.enabled) continue;

        const fields = [...(item.fields || [])].sort(
          (a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
        );

        for (const field of fields) {
          if (!shouldShowAdvancedProductsCollectionField(item, field)) continue;
          if (!shouldShowFieldByVisibleWhen(item.values || {}, field)) continue;
          if (!isFieldRequiredNow(item.values || {}, field)) continue;

          const value = item.values?.[field.key];

          if (isEmptyFieldValue(value)) {
            window.alert(`الحقل مطلوب: ${field.label} داخل عنصر ${item.title}`);
            setSelectedInstanceId(item.instance_id);
            return;
          }
        }
      }

      const nextThemeOptions = clone(themeOptionsRef.current || {});
      nextThemeOptions.homepage = {
        ...(nextThemeOptions.homepage || {}),
        sections: serializeSections(items),
      };

      const res = await fetch(`/api/themes/${themeId}/theme-options`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          theme_options: nextThemeOptions,
        }),
      });

      const json: ThemeOptionsResponse = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "FAILED_TO_SAVE_THEME_OPTIONS");
      }

      const savedThemeOptions =
        json?.theme_options && typeof json.theme_options === "object"
          ? clone(json.theme_options)
          : nextThemeOptions;

      themeOptionsRef.current = savedThemeOptions;

      const components = Array.isArray(json?.available_components)
        ? json.available_components
        : availableComponents;

      if (Array.isArray(json?.available_components)) {
        setAvailableComponents(json.available_components);
      }

      if (Array.isArray(json?.store_products)) {
        setStoreProducts(json.store_products);
      }

      if (Array.isArray(json?.store_categories)) {
        setStoreCategories(json.store_categories);
      }

      const normalized = normalizeHomepageSections(
        savedThemeOptions?.homepage?.sections,
        components,
      );

      setItems(normalized);
      initialRef.current = clone(normalized);
    } catch {
      //
    } finally {
      setSaving(false);
    }
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragCancel(_e: DragCancelEvent) {
    setActiveId(null);
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);

    if (!over) return;
    if (String(active.id) === String(over.id)) return;

    setItems((prev) => {
      const oldIndex = prev.findIndex(
        (x) => x.instance_id === String(active.id),
      );
      const newIndex = prev.findIndex(
        (x) => x.instance_id === String(over.id),
      );
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function updateSelectedValues(fieldKey: string, value: any) {
    if (!selectedInstanceId) return;

    setItems((prev) =>
      prev.map((item) => {
        if (item.instance_id !== selectedInstanceId) return item;

        const nextValues = {
          ...(item.values || {}),
          [fieldKey]: value,
        };

        if (item.key === "image_links_grid" && fieldKey === "field_1") {
          const layout = s(value || "2");

          if (layout === "2") {
            delete nextValues.field_8;
            delete nextValues.field_9;
            delete nextValues.field_10;
            delete nextValues.field_11;
            delete nextValues.field_12;
            delete nextValues.field_13;
          }

          if (layout === "3") {
            delete nextValues.field_11;
            delete nextValues.field_12;
            delete nextValues.field_13;
          }
        }

        if (item.key === "advanced_products_collection") {
          if (fieldKey === "field_7") {
            if (Boolean(value)) {
              delete nextValues.field_8;
              delete nextValues.field_9;
              delete nextValues.field_10;
              delete nextValues.field_11;
            } else {
              nextValues.field_8 = nextValues.field_8 || "manual";
              nextValues.field_11 = Number(nextValues.field_11 || 10);
            }
          }

          if (fieldKey === "field_8") {
            if (value === "manual") {
              delete nextValues.field_10;
            }

            if (value === "category") {
              delete nextValues.field_9;
            }

            if (value === "latest" || value === "best_selling") {
              delete nextValues.field_9;
              delete nextValues.field_10;
            }
          }
        }

        return {
          ...item,
          values: nextValues,
        };
      }),
    );
  }

  function deleteItem(instanceId: string) {
    setItems((prev) => prev.filter((x) => x.instance_id !== instanceId));
    setMenuOpenFor(null);

    if (selectedInstanceId === instanceId) {
      setSelectedInstanceId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white/60 p-4 text-sm text-gray-500">
        جاري تحميل عناصر الصفحة الرئيسية...
      </div>
    );
  }

  if (selectedItem) {
    return (
      <ComponentEditorView
        item={selectedItem}
        themeId={themeId}
        productOptions={storeProducts}
        categoryOptions={storeCategories}
        onBack={() => setSelectedInstanceId(null)}
        onChangeTitle={(value) =>
          setItems((prev) =>
            prev.map((x) =>
              x.instance_id === selectedItem.instance_id
                ? { ...x, title: value }
                : x,
            ),
          )
        }
        onToggleEnabled={() =>
          setItems((prev) =>
            prev.map((x) =>
              x.instance_id === selectedItem.instance_id
                ? { ...x, enabled: !x.enabled }
                : x,
            ),
          )
        }
        onChangeValue={updateSelectedValues}
      />
    );
  }

  return (
    <div className="space-y-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="rounded-2xl border border-gray-200 bg-white/60 p-2">
            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400">
                لا توجد عناصر في الصفحة الرئيسية حتى الآن.
              </div>
            ) : (
              items.map((item) => (
                <SortableRow
                  key={item.instance_id}
                  item={item}
                  menuOpen={menuOpenFor === item.instance_id}
                  onOpen={() => {
                    setSelectedInstanceId(item.instance_id);
                    setMenuOpenFor(null);
                  }}
                  onToggleEnabled={() =>
                    setItems((prev) =>
                      prev.map((x) =>
                        x.instance_id === item.instance_id
                          ? { ...x, enabled: !x.enabled }
                          : x,
                      ),
                    )
                  }
                  onToggleMenu={() =>
                    setMenuOpenFor((prev) =>
                      prev === item.instance_id ? null : item.instance_id,
                    )
                  }
                  onEdit={() => {
                    setSelectedInstanceId(item.instance_id);
                    setMenuOpenFor(null);
                  }}
                  onDelete={() => deleteItem(item.instance_id)}
                />
              ))
            )}
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

function SortableRow({
  item,
  menuOpen,
  onOpen,
  onToggleEnabled,
  onToggleMenu,
  onEdit,
  onDelete,
}: {
  item: HomepageSectionItem;
  menuOpen: boolean;
  onOpen: () => void;
  onToggleEnabled: () => void;
  onToggleMenu: () => void;
  onEdit: () => void;
  onDelete: () => void;
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
  } = useSortable({ id: item.instance_id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "group relative flex items-center justify-between rounded-2xl border bg-white px-3 py-3",
        "border-gray-200",
        "mb-2 last:mb-0",
        isDragging ? "opacity-70 shadow-lg" : "shadow-sm",
        isOver ? "ring-2 ring-blue-200" : "",
        item.enabled ? "" : "opacity-60",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-2 text-right"
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-gray-900">
            {item.title}
          </div>
          <div className="truncate text-[12px] text-gray-500">
            {item.description || "اسحب للمكان المطلوب أو اضغط للتعديل"}
          </div>
        </div>
      </button>

      <div className="mr-2 flex items-center gap-2">
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

        <div className="relative">
          <button
            type="button"
            onClick={onToggleMenu}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            title="خيارات"
          >
            ⋯
          </button>

          {menuOpen ? (
            <div className="absolute left-0 top-11 z-20 min-w-[150px] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
              <button
                type="button"
                onClick={onEdit}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <span>تعديل</span>
                <span>✏️</span>
              </button>

              <button
                type="button"
                onClick={onDelete}
                className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <span>حذف</span>
                <span>🗑️</span>
              </button>
            </div>
          ) : null}
        </div>

        <button
          ref={setActivatorNodeRef}
          type="button"
          className={[
            "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white",
            "text-gray-700 hover:bg-gray-50",
            "cursor-grab active:cursor-grabbing",
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
      <div className="text-[13px] font-semibold text-gray-900">{title}</div>
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white">
        <GripIcon />
      </div>
    </div>
  );
}

function ComponentEditorView({
  item,
  themeId,
  productOptions,
  categoryOptions,
  onBack,
  onChangeTitle,
  onToggleEnabled,
  onChangeValue,
}: {
  item: HomepageSectionItem;
  themeId: string;
  productOptions: StoreReferenceOption[];
  categoryOptions: StoreReferenceOption[];
  onBack: () => void;
  onChangeTitle: (value: string) => void;
  onToggleEnabled: () => void;
  onChangeValue: (fieldKey: string, value: any) => void;
}) {
  const fields = [...(item.fields || [])].sort(
    (a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
  );

  const visibleFields = fields.filter((field) => {
    if (!shouldShowAdvancedProductsCollectionField(item, field)) {
      return false;
    }

    return shouldShowFieldByVisibleWhen(item.values || {}, field);
  });

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          ← رجوع
        </button>

        <div className="text-right">
          <div className="text-xs text-slate-400">أنت الآن تخصص</div>
          <div className="text-lg font-bold text-slate-900">{item.title}</div>
          {item.description ? (
            <div className="mt-1 text-sm leading-7 text-slate-500">
              {item.description}
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-4">
          <FieldBlock label="العنوان">
            <input
              value={item.title}
              onChange={(e) => onChangeTitle(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-300 px-3 outline-none"
            />
          </FieldBlock>

          <label className="flex h-11 items-center justify-between rounded-xl border border-slate-300 px-3">
            <span className="text-sm text-slate-700">
              {item.enabled ? "العنصر ظاهر" : "العنصر مخفي"}
            </span>
            <input
              type="checkbox"
              checked={item.enabled}
              onChange={onToggleEnabled}
            />
          </label>
        </div>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-400">
          هذا العنصر لا يحتوي على أدوات إعداد بعد.
        </div>
      ) : (
        <div className="space-y-4">
          {visibleFields.map((field) => (
            <DynamicFieldRenderer
              key={field.id || field.key}
              themeId={themeId}
              field={field}
              value={item.values?.[field.key]}
              productOptions={productOptions}
              categoryOptions={categoryOptions}
              required={isFieldRequiredNow(item.values || {}, field)}
              onChange={(value) => onChangeValue(field.key, value)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DynamicFieldRenderer({
  themeId,
  field,
  value,
  productOptions,
  categoryOptions,
  required,
  onChange,
}: {
  themeId: string;
  field: ThemeComponentField;
  value: any;
  productOptions: StoreReferenceOption[];
  categoryOptions: StoreReferenceOption[];
  required?: boolean;
  onChange: (value: any) => void;
}) {
  const widthClass =
    field.width === "half"
      ? "w-full md:w-[calc(50%-8px)]"
      : field.width === "third"
        ? "w-full md:w-[calc(33.333%-11px)]"
        : field.width === "quarter"
          ? "w-full md:w-[calc(25%-12px)]"
          : "w-full";

  const options = normalizeFieldOptions(field.options);
  const displayLabel = required ? `${field.label} *` : field.label;

  if (field.field_type === "divider") {
    return <div className="w-full border-t border-slate-200" />;
  }

  if (field.field_type === "heading") {
    return (
      <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right text-base font-bold text-slate-900">
        {displayLabel}
      </div>
    );
  }

  if (field.field_type === "repeater") {
    return (
      <div className="w-full">
        <RepeaterFieldRenderer
          themeId={themeId}
          field={{ ...field, label: displayLabel }}
          value={value}
          productOptions={productOptions}
          categoryOptions={categoryOptions}
          onChange={onChange}
        />
      </div>
    );
  }

  if (field.field_type === "switch" || field.field_type === "checkbox") {
    return (
      <div className={widthClass}>
        <label className="flex h-12 items-center justify-between rounded-xl border border-slate-300 px-3">
          <span className="text-sm text-slate-700">{displayLabel}</span>
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
        </label>
        {field.description ? (
          <div className="mt-2 text-right text-xs text-slate-500">
            {field.description}
          </div>
        ) : null}
      </div>
    );
  }

  if (field.field_type === "textarea" || field.field_type === "richtext") {
    return (
      <div className={widthClass}>
        <FieldBlock label={displayLabel} description={field.description}>
          <textarea
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? ""}
            className="min-h-[110px] w-full rounded-xl border border-slate-300 px-3 py-3 outline-none"
          />
        </FieldBlock>
      </div>
    );
  }

  if (field.field_type === "number") {
    return (
      <div className={widthClass}>
        <FieldBlock label={displayLabel} description={field.description}>
          <input
            type="number"
            value={value ?? 0}
            onChange={(e) => onChange(Number(e.target.value || 0))}
            placeholder={field.placeholder ?? ""}
            className="h-11 w-full rounded-xl border border-slate-300 px-3 outline-none"
          />
        </FieldBlock>
      </div>
    );
  }

  if (field.field_type === "select") {
    return (
      <div className={widthClass}>
        <FieldBlock label={displayLabel} description={field.description}>
          <select
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-300 px-3 outline-none"
          >
            <option value="">اختر</option>
            {options.map((opt) => (
              <option key={`${field.key}-${opt.value}`} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FieldBlock>
      </div>
    );
  }

  if (field.field_type === "radio") {
    return (
      <div className={widthClass}>
        <FieldBlock label={displayLabel} description={field.description}>
          <div className="space-y-2 rounded-xl border border-slate-300 p-3">
            {options.map((opt) => (
              <label
                key={`${field.key}-${opt.value}`}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-sm text-slate-700">{opt.label}</span>
                <input
                  type="radio"
                  name={field.key}
                  checked={String(value ?? "") === opt.value}
                  onChange={() => onChange(opt.value)}
                />
              </label>
            ))}
          </div>
        </FieldBlock>
      </div>
    );
  }

  if (field.field_type === "checkbox_group") {
    const current = Array.isArray(value) ? value.map(String) : [];

    return (
      <div className={widthClass}>
        <FieldBlock label={displayLabel} description={field.description}>
          <div className="space-y-2 rounded-xl border border-slate-300 p-3">
            {options.map((opt) => {
              const checked = current.includes(opt.value);

              return (
                <label
                  key={`${field.key}-${opt.value}`}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-sm text-slate-700">{opt.label}</span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onChange([...current, opt.value]);
                      } else {
                        onChange(current.filter((x) => x !== opt.value));
                      }
                    }}
                  />
                </label>
              );
            })}
          </div>
        </FieldBlock>
      </div>
    );
  }

  if (field.field_type === "image") {
    return (
      <div className={widthClass}>
        <SingleImageField
          label={displayLabel}
          description={field.description}
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
        />
      </div>
    );
  }

  if (field.field_type === "images") {
    return (
      <div className={widthClass}>
        <MultiImagesField
          label={displayLabel}
          description={field.description}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
        />
      </div>
    );
  }

  if (field.field_type === "url") {
    return (
      <div className={widthClass}>
        <UrlFieldRenderer
          themeId={themeId}
          field={{ ...field, label: displayLabel }}
          value={value}
          productOptions={productOptions}
          categoryOptions={categoryOptions}
          onChange={onChange}
        />
      </div>
    );
  }

  if (field.field_type === "datetime") {
    return (
      <div className={widthClass}>
        <FieldBlock label={displayLabel} description={field.description}>
          <input
            type="datetime-local"
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-300 px-3 outline-none"
          />
        </FieldBlock>
      </div>
    );
  }

  if (field.field_type === "button") {
    return (
      <div className={widthClass}>
        <ButtonFieldRenderer
          themeId={themeId}
          field={{ ...field, label: displayLabel }}
          value={value}
          productOptions={productOptions}
          categoryOptions={categoryOptions}
          onChange={onChange}
        />
      </div>
    );
  }

  if (field.field_type === "product_picker") {
    return (
      <div className={widthClass}>
        <ReferencePickerField
          themeId={themeId}
          label={displayLabel}
          description={field.description}
          refType="product"
          allowMultiple={Boolean(field?.ui_props?.allow_multiple)}
          value={value}
          options={productOptions}
          onChange={onChange}
        />
      </div>
    );
  }

  if (field.field_type === "category_picker") {
    return (
      <div className={widthClass}>
        <ReferencePickerField
          themeId={themeId}
          label={displayLabel}
          description={field.description}
          refType="category"
          allowMultiple={Boolean(field?.ui_props?.allow_multiple)}
          value={value}
          options={categoryOptions}
          onChange={onChange}
        />
      </div>
    );
  }

  if (
    field.field_type === "color" ||
    field.field_type === "date" ||
    field.field_type === "time"
  ) {
    return (
      <div className={widthClass}>
        <FieldBlock label={displayLabel} description={field.description}>
          <input
            type={
              field.field_type === "color"
                ? "color"
                : field.field_type === "date"
                  ? "date"
                  : "time"
            }
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? ""}
            className="h-11 w-full rounded-xl border border-slate-300 px-3 outline-none"
          />
        </FieldBlock>
      </div>
    );
  }

  if (shouldUseIconPicker(field)) {
    return (
      <div className={widthClass}>
        <FieldBlock label={displayLabel} description={field.description}>
          <ThemeIconPickerField
            value={String(value ?? "")}
            onChange={onChange}
          />
        </FieldBlock>
      </div>
    );
  }

  return (
    <div className={widthClass}>
      <FieldBlock label={displayLabel} description={field.description}>
        <input
          type="text"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? ""}
          className="h-11 w-full rounded-xl border border-slate-300 px-3 outline-none"
        />
      </FieldBlock>
    </div>
  );
}

function RepeaterFieldRenderer({
  themeId,
  field,
  value,
  productOptions,
  categoryOptions,
  onChange,
}: {
  themeId: string;
  field: ThemeComponentField;
  value: any;
  productOptions: StoreReferenceOption[];
  categoryOptions: StoreReferenceOption[];
  onChange: (value: any[]) => void;
}) {
  const rows = Array.isArray(value) ? value : [];
  const subFields = getRepeaterSubFields(field);

  const addButtonLabel = s(
    field?.ui_props?.repeater_button_label ||
      field?.ui_props?.add_button_label ||
      "إضافة",
  );
  const itemLabel = s(
    field?.ui_props?.repeater_item_label ||
      field?.ui_props?.item_label ||
      "عنصر",
  );
  const itemTitleKey = s(
    field?.ui_props?.repeater_item_title_key ||
      field?.ui_props?.item_title_key ||
      "title",
  );
  const minItems = Number(
    field?.ui_props?.repeater_min_items ?? field?.ui_props?.min_items ?? 0,
  );
  const rawMax =
    field?.ui_props?.repeater_max_items ?? field?.ui_props?.max_items ?? null;
  const maxItems =
    rawMax === null || rawMax === "" || rawMax === undefined
      ? null
      : Number(rawMax);

  function handleAdd() {
    if (maxItems !== null && rows.length >= maxItems) return;
    onChange([...rows, buildRepeaterItemInitialValues(field)]);
  }

  function handleDelete(index: number) {
    if (rows.length <= minItems) return;
    onChange(rows.filter((_, i) => i !== index));
  }

  function handleRowFieldChange(index: number, fieldKey: string, nextValue: any) {
    const nextRows = [...rows];
    const currentRow =
      nextRows[index] && typeof nextRows[index] === "object"
        ? { ...nextRows[index] }
        : {};

    currentRow[fieldKey] = nextValue;

    if (isProductsSourceRepeater(field) && fieldKey === "field_2") {
      if (nextValue === "manual") {
        delete currentRow.field_4;
      }

      if (nextValue === "category") {
        delete currentRow.field_3;
      }

      if (nextValue === "latest" || nextValue === "best_selling") {
        delete currentRow.field_3;
        delete currentRow.field_4;
      }
    }

    nextRows[index] = currentRow;

    onChange(nextRows);
  }

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-4 text-right">
        <div className="text-base font-bold text-slate-900">{field.label}</div>
        {field.description ? (
          <div className="mt-1 text-sm text-slate-500">{field.description}</div>
        ) : null}
      </div>

      <div className="space-y-4">
        {rows.map((row, index) => {
          const safeRow =
            row && typeof row === "object" && !Array.isArray(row) ? row : {};
          const dynamicTitle = s(safeRow?.[itemTitleKey]);
          const title = dynamicTitle || `${itemLabel} #${index + 1}`;
          const visibleSubFields = subFields.filter((subField) =>
            shouldShowRepeaterSubField(field, safeRow, subField),
          );

          return (
            <div
              key={`${field.key}-${index}`}
              className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-800">
                  {title}
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(index)}
                  disabled={rows.length <= minItems}
                  className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  حذف
                </button>
              </div>

              {visibleSubFields.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">
                  لا توجد حقول فرعية لهذا العنصر المكرر.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {visibleSubFields.map((subField) => (
                    <DynamicFieldRenderer
                      key={`${field.key}-${index}-${subField.key}`}
                      themeId={themeId}
                      field={{ ...subField, width: "full" }}
                      value={safeRow?.[subField.key]}
                      productOptions={productOptions}
                      categoryOptions={categoryOptions}
                      onChange={(nextValue) =>
                        handleRowFieldChange(index, subField.key, nextValue)
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="pt-1">
          <button
            type="button"
            onClick={handleAdd}
            disabled={maxItems !== null && rows.length >= maxItems}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + {addButtonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function SearchableInlineSelect({
  themeId,
  refType,
  value,
  placeholder,
  options,
  onChange,
}: {
  themeId: string;
  refType: "product" | "category";
  value: string;
  placeholder: string;
  options: StoreReferenceOption[];
  onChange: (item: StoreReferenceOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [remoteOptions, setRemoteOptions] =
    useState<StoreReferenceOption[]>(options);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const debouncedQuery = useDebouncedValue(query, 300);

  const selected = useMemo(
    () =>
      remoteOptions.find((x) => s(x.value) === s(value)) ||
      options.find((x) => s(x.value) === s(value)) ||
      null,
    [remoteOptions, options, value],
  );

  useEffect(() => {
    setRemoteOptions(options);
  }, [options]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (!open) return;

    let alive = true;

    async function run() {
      try {
        setLoading(true);

        const url = new URL(
          `/api/themes/${themeId}/theme-options`,
          window.location.origin,
        );

        url.searchParams.set("refs_only", "1");
        url.searchParams.set("ref_type", refType);
        url.searchParams.set("q", debouncedQuery);
        url.searchParams.set("limit", "20");

        const res = await fetch(url.toString(), {
          method: "GET",
          cache: "no-store",
        });

        const json = await res.json().catch(() => ({}));

        if (!alive) return;
        setRemoteOptions(Array.isArray(json?.items) ? json.items : []);
      } finally {
        if (alive) setLoading(false);
      }
    }

    void run();

    return () => {
      alive = false;
    };
  }, [themeId, refType, debouncedQuery, open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"
      >
        <span className="truncate">{selected?.label || placeholder}</span>
        <span className="text-base">{open ? "▴" : "▾"}</span>
      </button>

      {open ? (
        <div className="absolute right-0 left-0 top-[calc(100%+8px)] z-50 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="mb-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none"
          />

          <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white">
            {loading ? (
              <div className="px-3 py-4 text-center text-sm text-slate-400">
                جاري البحث...
              </div>
            ) : remoteOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-slate-400">
                لا توجد نتائج
              </div>
            ) : (
              remoteOptions.map((item) => {
                const active = s(item.value) === s(value);

                return (
                  <button
                    key={`${refType}-${item.value}`}
                    type="button"
                    onClick={() => {
                      onChange(item);
                      setOpen(false);
                    }}
                    className={[
                      "flex w-full items-center justify-between gap-3 px-3 py-3 text-right text-sm",
                      "border-b border-slate-100 last:border-b-0",
                      active
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {refType === "product" ? (
                        item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.label}
                            className="h-10 w-10 rounded-lg border border-slate-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-xs text-slate-400">
                            —
                          </div>
                        )
                      ) : null}

                      <span className="truncate">{item.label}</span>
                    </div>

                    {active ? <span>✓</span> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function UrlFieldRenderer({
  themeId,
  field,
  value,
  productOptions,
  categoryOptions,
  onChange,
}: {
  themeId: string;
  field: ThemeComponentField;
  value: any;
  productOptions: StoreReferenceOption[];
  categoryOptions: StoreReferenceOption[];
  onChange: (value: UrlFieldValue) => void;
}) {
  const current = normalizeUrlFieldValue(value);
  const allowedTypes = getUrlFieldAllowedTypes(field);

  function setType(nextType: LinkTargetType) {
    onChange({
      type: nextType,
      value: "",
      label: "",
    });
  }

  return (
    <FieldBlock label={field.label} description={field.description}>
      <div className="rounded-2xl border border-slate-300 bg-white p-3">
        <LinkTypeTabs
          value={current.type}
          allowedTypes={allowedTypes}
          onChange={setType}
        />

        <LinkValueInput
          themeId={themeId}
          type={current.type}
          value={current.value}
          placeholder={field.placeholder || ""}
          productOptions={productOptions}
          categoryOptions={categoryOptions}
          onChange={(next) => onChange({ ...current, ...next })}
        />
      </div>
    </FieldBlock>
  );
}

function LinkTypeTabs({
  value,
  allowedTypes,
  onChange,
}: {
  value: LinkTargetType;
  allowedTypes: LinkTargetType[];
  onChange: (value: LinkTargetType) => void;
}) {
  const labels: Record<LinkTargetType, string> = {
    external: "رابط يدوي",
    internal: "رابط داخلي",
    product: "منتج",
    category: "قسم",
    page: "صفحة",
  };

  return (
    <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-5">
      {allowedTypes.map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => onChange(type)}
          className={[
            "rounded-xl px-3 py-2 text-sm font-semibold transition",
            value === type
              ? "bg-slate-900 text-white shadow-sm"
              : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
          ].join(" ")}
        >
          {labels[type]}
        </button>
      ))}
    </div>
  );
}

function LinkValueInput({
  themeId,
  type,
  value,
  placeholder,
  productOptions,
  categoryOptions,
  onChange,
}: {
  themeId: string;
  type: LinkTargetType;
  value: string;
  placeholder?: string;
  productOptions: StoreReferenceOption[];
  categoryOptions: StoreReferenceOption[];
  onChange: (patch: Partial<UrlFieldValue>) => void;
}) {
  if (type === "product") {
    return (
      <SearchableInlineSelect
        themeId={themeId}
        refType="product"
        value={value}
        placeholder="ابحث باسم المنتج"
        options={productOptions}
        onChange={(item) =>
          onChange({
            value: item.value,
            label: item.label,
          })
        }
      />
    );
  }

  if (type === "category") {
    return (
      <SearchableInlineSelect
        themeId={themeId}
        refType="category"
        value={value}
        placeholder="ابحث باسم القسم"
        options={categoryOptions}
        onChange={(item) =>
          onChange({
            value: item.value,
            label: item.label,
          })
        }
      />
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) =>
        onChange({
          value: e.target.value,
          label: "",
        })
      }
      placeholder={
        type === "external"
          ? placeholder || "https://example.com"
          : type === "internal"
            ? placeholder || "/account/orders"
            : placeholder || "/page/about"
      }
      className="h-11 w-full rounded-xl border border-slate-300 px-3 outline-none"
      dir="ltr"
    />
  );
}

function ButtonFieldRenderer({
  themeId,
  field,
  value,
  productOptions,
  categoryOptions,
  onChange,
}: {
  themeId: string;
  field: ThemeComponentField;
  value: any;
  productOptions: StoreReferenceOption[];
  categoryOptions: StoreReferenceOption[];
  onChange: (value: ButtonFieldValue) => void;
}) {
  const current: ButtonFieldValue = {
    text: s(value?.text) || s(field?.ui_props?.button_text) || "عرض التفاصيل",
    style:
      value?.style === "solid" ||
      value?.style === "outline" ||
      value?.style === "ghost"
        ? value.style
        : s(field?.ui_props?.button_style) === "solid" ||
            s(field?.ui_props?.button_style) === "ghost"
          ? field.ui_props.button_style
          : "outline",
    link: normalizeUrlFieldValue(value?.link),
  };

  const allowedTypes = getUrlFieldAllowedTypes({
    ...field,
    ui_props: {
      ...(field.ui_props || {}),
      link_types:
        field?.ui_props?.button_link_types || field?.ui_props?.link_types,
    },
  });

  function patch(next: Partial<ButtonFieldValue>) {
    onChange({
      ...current,
      ...next,
    });
  }

  return (
    <FieldBlock label={field.label} description={field.description}>
      <div className="space-y-4 rounded-2xl border border-slate-300 bg-white p-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2 text-right">
            <div className="text-xs font-semibold text-slate-500">نص الزر</div>
            <input
              value={current.text}
              onChange={(e) => patch({ text: e.target.value })}
              placeholder="مثال: عرض التفاصيل"
              className="h-11 w-full rounded-xl border border-slate-300 px-3 outline-none"
            />
          </div>

          <div className="space-y-2 text-right">
            <div className="text-xs font-semibold text-slate-500">شكل الزر</div>
            <select
              value={current.style}
              onChange={(e) =>
                patch({
                  style: e.target.value as ButtonFieldValue["style"],
                })
              }
              className="h-11 w-full rounded-xl border border-slate-300 px-3 outline-none"
            >
              <option value="solid">ممتلئ</option>
              <option value="outline">حدود فقط</option>
              <option value="ghost">شفاف</option>
            </select>
          </div>
        </div>

        <div>
          <div className="mb-2 text-right text-xs font-semibold text-slate-500">
            رابط الزر
          </div>

          <LinkTypeTabs
            value={current.link.type}
            allowedTypes={allowedTypes}
            onChange={(nextType) =>
              patch({
                link: {
                  type: nextType,
                  value: "",
                  label: "",
                },
              })
            }
          />

          <LinkValueInput
            themeId={themeId}
            type={current.link.type}
            value={current.link.value}
            productOptions={productOptions}
            categoryOptions={categoryOptions}
            onChange={(next) =>
              patch({
                link: {
                  ...current.link,
                  ...next,
                },
              })
            }
          />
        </div>
      </div>
    </FieldBlock>
  );
}

function getStoredReferenceId(item: any) {
  if (typeof item === "string") return s(item);

  if (item && typeof item === "object") {
    return (
      s(item.value) ||
      s(item.id) ||
      s(item.product_id) ||
      s(item.productId) ||
      s(item.category_id) ||
      s(item.categoryId)
    );
  }

  return "";
}

function normalizeStoredReferenceItem(
  item: any,
  options: StoreReferenceOption[],
): StoreReferenceOption {
  if (item && typeof item === "object") {
    const id = getStoredReferenceId(item);
    const found = options.find((x) => s(x.value) === s(id));

    return {
      value: id,
      label:
        s(item.label) ||
        s(item.name) ||
        s(item.title) ||
        found?.label ||
        id,
      image_url:
        s(item.image_url) ||
        s(item.imageUrl) ||
        s(item.thumbnail_url) ||
        s(item.thumbnailUrl) ||
        s(item.image) ||
        found?.image_url ||
        null,
    };
  }

  const id = s(item);
  const found = options.find((x) => s(x.value) === id);

  return {
    value: id,
    label: found?.label || id,
    image_url: found?.image_url || null,
  };
}

function ReferencePickerField({
  themeId,
  label,
  description,
  refType,
  allowMultiple,
  value,
  options,
  onChange,
}: {
  themeId: string;
  label: string;
  description?: string | null;
  refType: "product" | "category";
  allowMultiple: boolean;
  value: any;
  options: StoreReferenceOption[];
  onChange: (value: any) => void;
}) {
  const currentItems: StoreReferenceOption[] = allowMultiple
    ? Array.isArray(value)
      ? value
          .map((item) => normalizeStoredReferenceItem(item, options))
          .filter((item) => s(item.value))
      : []
    : [];

  const selectedIds = currentItems.map((item) => s(item.value)).filter(Boolean);

  useEffect(() => {
    if (!allowMultiple) return;
    if (!Array.isArray(value)) return;

    const normalized = value
      .map((item) => normalizeStoredReferenceItem(item, options))
      .filter((item) => s(item.value));

    const before = JSON.stringify(value);
    const after = JSON.stringify(normalized);

    if (before !== after) {
      onChange(normalized);
    }
  }, [allowMultiple, value, options, onChange]);

  if (!allowMultiple) {
    const current =
      value && typeof value === "object"
        ? normalizeStoredReferenceItem(value, options)
        : null;

    return (
      <FieldBlock label={label} description={description}>
        <SearchableInlineSelect
          themeId={themeId}
          refType={refType}
          value={current?.value || String(value ?? "")}
          placeholder={
            refType === "product" ? "ابحث باسم المنتج" : "ابحث باسم القسم"
          }
          options={options}
          onChange={(item) => {
            if (refType === "product") {
              onChange(normalizeStoredReferenceItem(item, options));
            } else {
              onChange(item.value);
            }
          }}
        />
      </FieldBlock>
    );
  }

  return (
    <FieldBlock label={label} description={description}>
      <div className="space-y-3 rounded-2xl border border-slate-300 bg-white p-3">
        <SearchableInlineSelect
          themeId={themeId}
          refType={refType}
          value=""
          placeholder={refType === "product" ? "أضف منتج" : "أضف قسم"}
          options={options.filter((x) => !selectedIds.includes(String(x.value)))}
          onChange={(item) => {
            const normalizedItem = normalizeStoredReferenceItem(item, options);
            const id = s(normalizedItem.value);

            if (!id) return;
            if (selectedIds.includes(id)) return;

            onChange([...currentItems, normalizedItem]);
          }}
        />

        {currentItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-400">
            لم يتم اختيار أي عنصر
          </div>
        ) : (
          <div className="space-y-2">
            {currentItems.map((item) => {
              const id = s(item.value);

              return (
                <div
                  key={id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <button
                    type="button"
                    onClick={() =>
                      onChange(currentItems.filter((x) => s(x.value) !== id))
                    }
                    className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    حذف
                  </button>

                  <div className="flex min-w-0 items-center gap-3 text-right">
                    {refType === "product" && item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.label}
                        className="h-10 w-10 rounded-lg border border-slate-200 object-cover"
                      />
                    ) : refType === "product" ? (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-xs text-slate-400">
                        —
                      </div>
                    ) : null}

                    <div className="truncate text-sm font-semibold text-slate-700">
                      {item.label || id}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </FieldBlock>
  );
}

function SingleImageField({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string | null;
  value: string;
  onChange: (value: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function onPickFile(file?: File | null) {
    if (!file) return;

    try {
      setUploading(true);
      const url = await uploadThemeEditorFile(file);
      onChange(url);
    } catch {
      window.alert("تعذر رفع الصورة");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <FieldBlock label={label} description={description}>
      <div className="rounded-2xl border border-slate-300 bg-white p-3">
        {value ? (
          <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <img
              src={value}
              alt={label}
              className="h-48 w-full object-contain bg-white"
            />
          </div>
        ) : (
          <div className="mb-3 flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
            لا توجد صورة
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {uploading ? "جارٍ الرفع..." : value ? "تغيير الصورة" : "رفع صورة"}
          </button>

          {value ? (
            <button
              type="button"
              onClick={() => onChange("")}
              disabled={uploading}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-60"
            >
              حذف الصورة
            </button>
          ) : null}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void onPickFile(e.target.files?.[0] || null)}
        />

        {value ? (
          <div className="mt-3 break-all text-xs leading-6 text-slate-500">
            {value}
          </div>
        ) : null}
      </div>
    </FieldBlock>
  );
}

function MultiImagesField({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string | null;
  value: any[];
  onChange: (value: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const list = Array.isArray(value)
    ? value.map((x) => String(x || "").trim()).filter(Boolean)
    : [];

  async function onPickFiles(files: FileList | null) {
    if (!files?.length) return;

    try {
      setUploading(true);
      const uploaded: string[] = [];

      for (const file of Array.from(files)) {
        const url = await uploadThemeEditorFile(file);
        uploaded.push(url);
      }

      onChange([...list, ...uploaded]);
    } catch {
      window.alert("تعذر رفع الصور");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeAt(index: number) {
    onChange(list.filter((_, i) => i !== index));
  }

  return (
    <FieldBlock label={label} description={description}>
      <div className="rounded-2xl border border-slate-300 bg-white p-3">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {uploading ? "جارٍ الرفع..." : "رفع صور"}
          </button>

          {list.length ? (
            <span className="text-xs text-slate-500">
              عدد الصور: {list.length}
            </span>
          ) : null}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void onPickFiles(e.target.files)}
        />

        {list.length === 0 ? (
          <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
            لا توجد صور
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {list.map((url, index) => (
              <div
                key={`${url}-${index}`}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <img
                  src={url}
                  alt={`${label}-${index + 1}`}
                  className="h-36 w-full object-cover"
                />
                <div className="p-2">
                  <button
                    type="button"
                    onClick={() => removeAt(index)}
                    className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </FieldBlock>
  );
}

function FieldBlock({
  label,
  description,
  children,
}: {
  label: string;
  description?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 text-right">
      <div className="text-sm font-medium text-slate-800">{label}</div>
      {children}
      {description ? (
        <div className="text-xs leading-6 text-slate-500">{description}</div>
      ) : null}
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