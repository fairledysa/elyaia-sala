// FILE: apps/merchant/src/app/(theme-editor)/themes/[themeId]/customize/marketing/page.tsx
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useParams } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type StoreReferenceOption = {
  value: string;
  label: string;
  image_url?: string | null;
};

type LinkTargetType = "product" | "category" | "external" | "internal" | "page";

type LinkValue = {
  type: LinkTargetType;
  value: string;
  label?: string;
};

type SearchGroupStyle = "chips" | "brands" | "cards" | "compact";

type SearchItemType = "keyword" | "icon" | "image" | "brand";

type MarketingSearchGroupItem = {
  id: string;
  title: string;
  subtitle: string;
  type: SearchItemType;
  icon: string;
  imageUrl: string;
  link: LinkValue;
  href: string;
  enabled: boolean;
};

type MarketingSearchGroup = {
  id: string;
  title: string;
  description: string;
  style: SearchGroupStyle;
  enabled: boolean;
  items: MarketingSearchGroupItem[];
};

type MarketingSearchItem = {
  id: string;
  label: string;
  href: string;
  enabled: boolean;
};

type MarketingBrandItem = {
  id: string;
  name: string;
  href: string;
  imageUrl: string;
  enabled: boolean;
};

type MarketingSearchSettings = {
  enabled: boolean;
  title: string;
  placeholder: string;
  groups: MarketingSearchGroup[];

  /**
   * تبقى للتوافق مع الواجهة الحالية إلى أن نربط الواجهة الجديدة بالمجموعات.
   */
  showPopularSearches: boolean;
  showPopularBrands: boolean;
  popularSearches: MarketingSearchItem[];
  popularBrands: MarketingBrandItem[];
};

type MarketingOptions = {
  search: MarketingSearchSettings;
};

type ThemeOptionsResponse = {
  ok?: boolean;
  theme_options?: Record<string, any>;
  store_products?: StoreReferenceOption[];
  store_categories?: StoreReferenceOption[];
  items?: StoreReferenceOption[];
  error?: string;
};

type UploadResponse = {
  ok?: boolean;
  publicUrl?: string;
  key?: string;
  error?: string;
  details?: any;
};

function s(value: unknown) {
  return String(value ?? "").trim();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function uid(prefix = "item") {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`;
}

function sameValue(a: any, b: any) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function normalizeHref(value: unknown) {
  const href = s(value);
  if (!href) return "";

  if (
    href.startsWith("/") ||
    href.startsWith("#") ||
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("whatsapp:")
  ) {
    return href;
  }

  return `/${href}`;
}

function buildSearchHref(query: string) {
  const q = s(query);

  if (!q) return "/search";

  const params = new URLSearchParams();
  params.set("q", q);
  params.set("sort", "newest");

  return `/search?${params.toString()}`;
}

function normalizeLinkValue(value: any): LinkValue {
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

function buildHrefFromLink(title: string, link: LinkValue) {
  const label = s(link.label) || s(title);
  const value = s(link.value);

  if (link.type === "product" || link.type === "category") {
    return value ? buildSearchHref(label || value) : buildSearchHref(label);
  }

  if (link.type === "external") {
    return normalizeHref(value) || buildSearchHref(label);
  }

  if (link.type === "internal" || link.type === "page") {
    return normalizeHref(value) || buildSearchHref(label);
  }

  return buildSearchHref(label);
}

function makeKeywordItem(title: string): MarketingSearchGroupItem {
  const link: LinkValue = {
    type: "external",
    value: buildSearchHref(title),
    label: title,
  };

  return {
    id: uid("search_item"),
    title,
    subtitle: "",
    type: "keyword",
    icon: "",
    imageUrl: "",
    link,
    href: buildHrefFromLink(title, link),
    enabled: true,
  };
}

function makeBrandItem(title: string): MarketingSearchGroupItem {
  const link: LinkValue = {
    type: "external",
    value: buildSearchHref(title),
    label: title,
  };

  return {
    id: uid("brand_item"),
    title,
    subtitle: "",
    type: "brand",
    icon: "",
    imageUrl: "",
    link,
    href: buildHrefFromLink(title, link),
    enabled: true,
  };
}

const DEFAULT_GROUPS: MarketingSearchGroup[] = [
  {
    id: "group_popular_searches",
    title: "عمليات البحث الشعبية",
    description: "كلمات تظهر كاختصارات سريعة داخل صندوق البحث.",
    style: "chips",
    enabled: true,
    items: [
      makeKeywordItem("تنت"),
      makeKeywordItem("عدسات"),
      makeKeywordItem("توب فيس"),
      makeKeywordItem("واقي شمس"),
      makeKeywordItem("ديور"),
      makeKeywordItem("كحل"),
    ],
  },
  {
    id: "group_trending",
    title: "الأكثر انتشارًا",
    description: "اقتراحات موسمية أو كلمات تسويقية نشطة.",
    style: "chips",
    enabled: true,
    items: [
      makeKeywordItem("عطور"),
      makeKeywordItem("سيروم"),
      makeKeywordItem("مكياج"),
      makeKeywordItem("عناية"),
    ],
  },
  {
    id: "group_popular_brands",
    title: "العلامات التجارية الشعبية",
    description: "ماركات تظهر بشكل دائري أو كروت صغيرة داخل صندوق البحث.",
    style: "brands",
    enabled: true,
    items: [
      makeBrandItem("ANUA"),
      makeBrandItem("NYX"),
      makeBrandItem("LA ROCHE-POSAY"),
      makeBrandItem("REVOLUTION"),
    ],
  },
];

const DEFAULT_MARKETING_OPTIONS: MarketingOptions = {
  search: {
    enabled: true,
    title: "أداة البحث",
    placeholder: "مالذي تبحث عنه ؟",
    groups: clone(DEFAULT_GROUPS),

    showPopularSearches: true,
    showPopularBrands: true,
    popularSearches: [],
    popularBrands: [],
  },
};

function normalizeSearchItem(row: any): MarketingSearchItem {
  const label = s(row?.label);
  const href = s(row?.href) || buildSearchHref(label);

  return {
    id: s(row?.id) || uid("search"),
    label,
    href,
    enabled: row?.enabled !== false,
  };
}

function normalizeBrandItem(row: any): MarketingBrandItem {
  const name = s(row?.name);
  const href = s(row?.href) || buildSearchHref(name);

  return {
    id: s(row?.id) || uid("brand"),
    name,
    href,
    imageUrl: s(row?.imageUrl || row?.image_url),
    enabled: row?.enabled !== false,
  };
}

function normalizeSearchItemType(value: any): SearchItemType {
  const type = s(value);

  if (type === "icon") return "icon";
  if (type === "image") return "image";
  if (type === "brand") return "brand";

  return "keyword";
}

function normalizeGroupStyle(value: any): SearchGroupStyle {
  const style = s(value);

  if (style === "brands") return "brands";
  if (style === "cards") return "cards";
  if (style === "compact") return "compact";

  return "chips";
}

function normalizeGroupItem(row: any): MarketingSearchGroupItem {
  const title = s(row?.title || row?.label || row?.name);
  const type = normalizeSearchItemType(row?.type || row?.item_type);
  const link = normalizeLinkValue(row?.link || row?.href);

  return {
    id: s(row?.id) || uid("group_item"),
    title,
    subtitle: s(row?.subtitle || row?.description),
    type,
    icon: s(row?.icon || row?.iconName || row?.icon_name),
    imageUrl: s(row?.imageUrl || row?.image_url || row?.img),
    link,
    href: s(row?.href) || buildHrefFromLink(title, link),
    enabled: row?.enabled !== false,
  };
}

function normalizeGroup(row: any): MarketingSearchGroup {
  const items = Array.isArray(row?.items)
    ? row.items
        .map((item: any) => normalizeGroupItem(item))
        .filter((item: MarketingSearchGroupItem) => item.title || item.imageUrl)
    : [];

  return {
    id: s(row?.id) || uid("group"),
    title: s(row?.title) || "مجموعة بحث",
    description: s(row?.description),
    style: normalizeGroupStyle(row?.style || row?.display_style),
    enabled: row?.enabled !== false,
    items,
  };
}

 function buildGroupsFromLegacy(searchSource: any): MarketingSearchGroup[] {
  const groups: MarketingSearchGroup[] = [];

  const searches: MarketingSearchItem[] = Array.isArray(
    searchSource?.popularSearches,
  )
    ? searchSource.popularSearches
        .map((item: any): MarketingSearchItem => normalizeSearchItem(item))
        .filter((item: MarketingSearchItem) => Boolean(item.label))
    : [];

  const brands: MarketingBrandItem[] = Array.isArray(searchSource?.popularBrands)
    ? searchSource.popularBrands
        .map((item: any): MarketingBrandItem => normalizeBrandItem(item))
        .filter((item: MarketingBrandItem) => Boolean(item.name))
    : [];

  if (searches.length) {
    groups.push({
      id: "group_popular_searches",
      title: "عمليات البحث الشعبية",
      description: "كلمات تظهر كاختصارات سريعة داخل صندوق البحث.",
      style: "chips",
      enabled: true,
      items: searches.map((item: MarketingSearchItem) => {
        const link: LinkValue = {
          type: "external",
          value: item.href,
          label: item.label,
        };

        return {
          id: item.id,
          title: item.label,
          subtitle: "",
          type: "keyword",
          icon: "",
          imageUrl: "",
          link,
          href: item.href,
          enabled: item.enabled,
        };
      }),
    });
  }

  if (brands.length) {
    groups.push({
      id: "group_popular_brands",
      title: "العلامات التجارية الشعبية",
      description: "ماركات تظهر بشكل دائري أو كروت صغيرة داخل صندوق البحث.",
      style: "brands",
      enabled: true,
      items: brands.map((item: MarketingBrandItem) => {
        const link: LinkValue = {
          type: "external",
          value: item.href,
          label: item.name,
        };

        return {
          id: item.id,
          title: item.name,
          subtitle: "",
          type: "brand",
          icon: "",
          imageUrl: item.imageUrl,
          link,
          href: item.href,
          enabled: item.enabled,
        };
      }),
    });
  }

  return groups.length ? groups : clone(DEFAULT_GROUPS);
}

function derivePopularSearches(groups: MarketingSearchGroup[]) {
  const items: MarketingSearchItem[] = [];

  for (const group of groups) {
    if (!group.enabled) continue;

    for (const item of group.items || []) {
      if (!item.enabled) continue;
      if (item.type === "brand") continue;

      const label = s(item.title);
      if (!label) continue;

      const link = normalizeLinkValue(item.link);
      const href = s(item.href) || buildHrefFromLink(label, link);

      items.push({
        id: item.id,
        label,
        href,
        enabled: true,
      });
    }
  }

  return items;
}

function derivePopularBrands(groups: MarketingSearchGroup[]) {
  const items: MarketingBrandItem[] = [];

  for (const group of groups) {
    if (!group.enabled) continue;

    for (const item of group.items || []) {
      if (!item.enabled) continue;
      if (item.type !== "brand" && group.style !== "brands") continue;

      const name = s(item.title);
      if (!name) continue;

      const link = normalizeLinkValue(item.link);
      const href = s(item.href) || buildHrefFromLink(name, link);

      items.push({
        id: item.id,
        name,
        href,
        imageUrl: s(item.imageUrl),
        enabled: true,
      });
    }
  }

  return items;
}

function normalizeMarketingOptions(raw: any): MarketingOptions {
  const source = raw && typeof raw === "object" ? raw : {};
  const searchSource =
    source.search && typeof source.search === "object" ? source.search : {};

  const defaultSearch = DEFAULT_MARKETING_OPTIONS.search;

  const groups = Array.isArray(searchSource.groups)
    ? searchSource.groups
        .map((group: any) => normalizeGroup(group))
        .filter((group: MarketingSearchGroup) => group.title)
    : buildGroupsFromLegacy(searchSource);

  const safeGroups = groups.length ? groups : clone(DEFAULT_GROUPS);

  return {
    search: {
      enabled:
        typeof searchSource.enabled === "boolean"
          ? searchSource.enabled
          : defaultSearch.enabled,
      title: s(searchSource.title) || defaultSearch.title,
      placeholder: s(searchSource.placeholder) || defaultSearch.placeholder,
      groups: safeGroups,

      showPopularSearches:
        typeof searchSource.showPopularSearches === "boolean"
          ? searchSource.showPopularSearches
          : defaultSearch.showPopularSearches,
      showPopularBrands:
        typeof searchSource.showPopularBrands === "boolean"
          ? searchSource.showPopularBrands
          : defaultSearch.showPopularBrands,
      popularSearches: derivePopularSearches(safeGroups),
      popularBrands: derivePopularBrands(safeGroups),
    },
  };
}

function serializeMarketingOptions(options: MarketingOptions): MarketingOptions {
  const groups = options.search.groups
    .map((group) => ({
      id: s(group.id) || uid("group"),
      title: s(group.title) || "مجموعة بحث",
      description: s(group.description),
      style: normalizeGroupStyle(group.style),
      enabled: group.enabled !== false,
      items: (Array.isArray(group.items) ? group.items : [])
        .map((item) => {
          const title = s(item.title);
          const link = normalizeLinkValue(item.link);
          const href = s(item.href) || buildHrefFromLink(title, link);

          return {
            id: s(item.id) || uid("group_item"),
            title,
            subtitle: s(item.subtitle),
            type: normalizeSearchItemType(item.type),
            icon: s(item.icon),
            imageUrl: s(item.imageUrl),
            link,
            href,
            enabled: item.enabled !== false,
          };
        })
        .filter((item) => item.title || item.imageUrl),
    }))
    .filter((group) => group.title);

  return {
    search: {
      enabled: Boolean(options.search.enabled),
      title: s(options.search.title) || "أداة البحث",
      placeholder: s(options.search.placeholder) || "مالذي تبحث عنه ؟",
      groups,

      showPopularSearches: Boolean(options.search.showPopularSearches),
      showPopularBrands: Boolean(options.search.showPopularBrands),
      popularSearches: derivePopularSearches(groups),
      popularBrands: derivePopularBrands(groups),
    },
  };
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

export default function MarketingEditorPage() {
  const params = useParams<{ themeId: string }>();
  const themeId = s(params?.themeId);

  const [themeOptions, setThemeOptions] = useState<Record<string, any>>({});
  const [marketing, setMarketing] = useState<MarketingOptions>(
    clone(DEFAULT_MARKETING_OPTIONS),
  );

  const [storeProducts, setStoreProducts] = useState<StoreReferenceOption[]>([]);
  const [storeCategories, setStoreCategories] = useState<StoreReferenceOption[]>(
    [],
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedTool, setSelectedTool] = useState<"search" | null>(null);

  const initialRef = useRef<MarketingOptions>(clone(DEFAULT_MARKETING_OPTIONS));

  const canSave = useMemo(() => {
    if (loading || saving) return false;
    return !sameValue(marketing, initialRef.current);
  }, [marketing, loading, saving]);

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

        const nextThemeOptions =
          json.theme_options && typeof json.theme_options === "object"
            ? clone(json.theme_options)
            : {};

        const normalized = normalizeMarketingOptions(nextThemeOptions.marketing);

        setThemeOptions(nextThemeOptions);
        setMarketing(normalized);
        setStoreProducts(
          Array.isArray(json.store_products) ? json.store_products : [],
        );
        setStoreCategories(
          Array.isArray(json.store_categories) ? json.store_categories : [],
        );
        initialRef.current = clone(normalized);
      } catch {
        setThemeOptions({});
        setMarketing(clone(DEFAULT_MARKETING_OPTIONS));
        setStoreProducts([]);
        setStoreCategories([]);
        initialRef.current = clone(DEFAULT_MARKETING_OPTIONS);
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
    window.dispatchEvent(
      new CustomEvent("theme-editor:save-state", {
        detail: {
          pageKey: "marketing",
          showSaveButton: true,
          label: selectedTool ? "حفظ إعدادات الأداة" : "حفظ أدوات التسويق",
          canSave,
          saving,
        },
      }),
    );
  }, [selectedTool, canSave, saving]);

  useEffect(() => {
    function onRequestState() {
      window.dispatchEvent(
        new CustomEvent("theme-editor:save-state", {
          detail: {
            pageKey: "marketing",
            showSaveButton: true,
            label: selectedTool ? "حفظ إعدادات الأداة" : "حفظ أدوات التسويق",
            canSave,
            saving,
          },
        }),
      );
    }

    function onSave(e: Event) {
      const ce = e as CustomEvent<{ pageKey?: string }>;
      const pageKey = s(ce?.detail?.pageKey);

      if (pageKey && pageKey !== "marketing") return;

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
  }, [selectedTool, canSave, saving, marketing, themeId]);

  async function handleSave() {
    if (!themeId || loading || saving) return;

    try {
      setSaving(true);

      const serialized = serializeMarketingOptions(marketing);

      const nextThemeOptions = {
        ...(themeOptions || {}),
        marketing: serialized,
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
        json.theme_options && typeof json.theme_options === "object"
          ? clone(json.theme_options)
          : nextThemeOptions;

      const normalized = normalizeMarketingOptions(savedThemeOptions.marketing);

      setThemeOptions(savedThemeOptions);
      setMarketing(normalized);
      initialRef.current = clone(normalized);

      if (Array.isArray(json.store_products)) {
        setStoreProducts(json.store_products);
      }

      if (Array.isArray(json.store_categories)) {
        setStoreCategories(json.store_categories);
      }
    } catch {
      window.alert("تعذر حفظ أدوات التسويق");
    } finally {
      setSaving(false);
    }
  }

  function patchSearch(patch: Partial<MarketingSearchSettings>) {
    setMarketing((prev) => ({
      ...prev,
      search: {
        ...prev.search,
        ...patch,
      },
    }));
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white/60 p-4 text-sm text-gray-500">
        جاري تحميل أدوات التسويق...
      </div>
    );
  }

  if (selectedTool === "search") {
    return (
      <SearchToolEditor
        themeId={themeId}
        value={marketing.search}
        productOptions={storeProducts}
        categoryOptions={storeCategories}
        onBack={() => setSelectedTool(null)}
        onChange={patchSearch}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-right">
        <h1 className="text-lg font-bold text-slate-900">التسويق</h1>
        <p className="mt-1 text-sm leading-7 text-slate-500">
          خصص أدوات التسويق التي تظهر داخل واجهة المتجر.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white/60 p-2">
        <MarketingToolRow
          title="أداة البحث"
          description="إدارة مجموعات البحث والكلمات والبراندات والاقتراحات داخل صندوق البحث."
          icon="🔎"
          enabled={marketing.search.enabled}
          onOpen={() => setSelectedTool("search")}
          onToggle={() =>
            patchSearch({
              enabled: !marketing.search.enabled,
            })
          }
        />
      </div>
    </div>
  );
}

function MarketingToolRow({
  title,
  description,
  icon,
  enabled,
  onOpen,
  onToggle,
}: {
  title: string;
  description: string;
  icon: string;
  enabled: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  return (
    <div
      className={[
        "group relative mb-2 last:mb-0 flex items-center justify-between rounded-2xl border bg-white px-3 py-3",
        "border-gray-200 shadow-sm",
        enabled ? "" : "opacity-60",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 text-right"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-lg">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-gray-900">
            {title}
          </div>
          <div className="truncate text-[12px] text-gray-500">
            {description}
          </div>
        </div>
      </button>

      <div className="mr-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          className={[
            "inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-[12px] font-medium",
            "border-gray-200 bg-white hover:bg-gray-50",
            enabled ? "text-gray-700" : "text-gray-500",
          ].join(" ")}
          title="إظهار/إخفاء"
        >
          <span className="text-[14px]">{enabled ? "👁" : "🚫"}</span>
          {enabled ? "ظاهر" : "مخفي"}
        </button>

        <button
          type="button"
          onClick={onOpen}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          title="تعديل"
        >
          ⋯
        </button>
      </div>
    </div>
  );
}

function SearchToolEditor({
  themeId,
  value,
  productOptions,
  categoryOptions,
  onBack,
  onChange,
}: {
  themeId: string;
  value: MarketingSearchSettings;
  productOptions: StoreReferenceOption[];
  categoryOptions: StoreReferenceOption[];
  onBack: () => void;
  onChange: (patch: Partial<MarketingSearchSettings>) => void;
}) {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const selectedGroup = useMemo(
    () => value.groups.find((group) => group.id === selectedGroupId) || null,
    [value.groups, selectedGroupId],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const groupIds = useMemo(() => value.groups.map((group) => group.id), [
    value.groups,
  ]);

  function setGroups(groups: MarketingSearchGroup[]) {
    onChange({ groups });
  }

  function addGroup() {
    const next: MarketingSearchGroup = {
      id: uid("group"),
      title: "مجموعة جديدة",
      description: "",
      style: "chips",
      enabled: true,
      items: [],
    };

    setGroups([...value.groups, next]);
    setSelectedGroupId(next.id);
  }

  function updateGroup(
    groupId: string,
    patch: Partial<MarketingSearchGroup>,
  ) {
    setGroups(
      value.groups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              ...patch,
            }
          : group,
      ),
    );
  }

  function deleteGroup(groupId: string) {
    setGroups(value.groups.filter((group) => group.id !== groupId));

    if (selectedGroupId === groupId) {
      setSelectedGroupId(null);
    }
  }

  function handleGroupDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) return;
    if (String(active.id) === String(over.id)) return;

    const oldIndex = value.groups.findIndex(
      (group) => group.id === String(active.id),
    );
    const newIndex = value.groups.findIndex(
      (group) => group.id === String(over.id),
    );

    if (oldIndex < 0 || newIndex < 0) return;

    setGroups(arrayMove(value.groups, oldIndex, newIndex));
  }

  if (selectedGroup) {
    return (
      <SearchGroupEditor
        themeId={themeId}
        group={selectedGroup}
        productOptions={productOptions}
        categoryOptions={categoryOptions}
        onBack={() => setSelectedGroupId(null)}
        onChange={(patch) => updateGroup(selectedGroup.id, patch)}
      />
    );
  }

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
          <div className="text-lg font-bold text-slate-900">أداة البحث</div>
          <div className="mt-1 text-sm leading-7 text-slate-500">
            تحكم في مجموعات الكلمات والبراندات والاقتراحات التي تظهر أسفل شريط
            البحث.
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-4">
          <FieldBlock label="اسم الأداة">
            <input
              value={value.title}
              onChange={(e) => onChange({ title: e.target.value })}
              className="h-11 w-full rounded-xl border border-slate-300 px-3 outline-none"
            />
          </FieldBlock>

          <FieldBlock label="نص placeholder داخل البحث">
            <input
              value={value.placeholder}
              onChange={(e) => onChange({ placeholder: e.target.value })}
              className="h-11 w-full rounded-xl border border-slate-300 px-3 outline-none"
            />
          </FieldBlock>

          <SwitchRow
            label={value.enabled ? "الأداة ظاهرة" : "الأداة مخفية"}
            checked={value.enabled}
            onChange={(checked) => onChange({ enabled: checked })}
          />

          <SwitchRow
            label="إظهار مجموعات الكلمات"
            checked={value.showPopularSearches}
            onChange={(checked) => onChange({ showPopularSearches: checked })}
          />

          <SwitchRow
            label="إظهار مجموعات العلامات التجارية"
            checked={value.showPopularBrands}
            onChange={(checked) => onChange({ showPopularBrands: checked })}
          />
        </div>
      </div>

      <RepeaterCard
        title="مجموعات البحث"
        description="رتّب مجموعات البحث التي تظهر داخل صندوق البحث. كل مجموعة لها شكل وعناصر وروابط مستقلة."
        addLabel="إضافة مجموعة"
        onAdd={addGroup}
      >
        {value.groups.length === 0 ? (
          <EmptyRepeater label="لا توجد مجموعات بحث." />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleGroupDragEnd}
          >
            <SortableContext
              items={groupIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {value.groups.map((group, index) => (
                  <SortableGroupRow
                    key={group.id}
                    group={group}
                    index={index}
                    onOpen={() => setSelectedGroupId(group.id)}
                    onToggle={() =>
                      updateGroup(group.id, { enabled: !group.enabled })
                    }
                    onDelete={() => deleteGroup(group.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </RepeaterCard>
    </div>
  );
}

function SortableGroupRow({
  group,
  index,
  onOpen,
  onToggle,
  onDelete,
}: {
  group: MarketingSearchGroup;
  index: number;
  onOpen: () => void;
  onToggle: () => void;
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
  } = useSortable({ id: group.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const styleLabel: Record<SearchGroupStyle, string> = {
    chips: "أزرار صغيرة",
    brands: "ماركات",
    cards: "بطاقات",
    compact: "مضغوط",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "flex items-center justify-between gap-3 rounded-2xl border bg-white px-3 py-3",
        "border-gray-200 shadow-sm",
        group.enabled ? "" : "opacity-60",
        isDragging ? "opacity-70 shadow-lg" : "",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 text-right"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
          {index + 1}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-gray-900">
            {group.title}
          </div>
          <div className="truncate text-[12px] text-gray-500">
            {styleLabel[group.style]} · {group.items.length} عنصر
          </div>
        </div>
      </button>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-[12px] font-medium text-gray-700 hover:bg-gray-50"
        >
          <span className="text-[14px]">{group.enabled ? "👁" : "🚫"}</span>
          {group.enabled ? "ظاهر" : "مخفي"}
        </button>

        <button
          type="button"
          onClick={onOpen}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
        >
          ⋯
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 hover:bg-red-50"
          title="حذف"
        >
          ×
        </button>

        <button
          ref={setActivatorNodeRef}
          type="button"
          className="inline-flex h-9 w-9 cursor-grab items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:cursor-grabbing"
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

function SearchGroupEditor({
  themeId,
  group,
  productOptions,
  categoryOptions,
  onBack,
  onChange,
}: {
  themeId: string;
  group: MarketingSearchGroup;
  productOptions: StoreReferenceOption[];
  categoryOptions: StoreReferenceOption[];
  onBack: () => void;
  onChange: (patch: Partial<MarketingSearchGroup>) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const itemIds = useMemo(() => group.items.map((item) => item.id), [
    group.items,
  ]);

  function setItems(items: MarketingSearchGroupItem[]) {
    onChange({ items });
  }

  function addItem() {
    const next: MarketingSearchGroupItem = {
      id: uid("group_item"),
      title: "",
      subtitle: "",
      type: group.style === "brands" ? "brand" : "keyword",
      icon: "",
      imageUrl: "",
      link: {
        type: "external",
        value: "",
        label: "",
      },
      href: "",
      enabled: true,
    };

    setItems([...group.items, next]);
  }

  function updateItem(
    itemId: string,
    patch: Partial<MarketingSearchGroupItem>,
  ) {
    setItems(
      group.items.map((item) => {
        if (item.id !== itemId) return item;

        const next = {
          ...item,
          ...patch,
        };

        const link = normalizeLinkValue(next.link);
        const title = s(next.title);

        return {
          ...next,
          link,
          href:
            patch.href !== undefined
              ? s(patch.href)
              : buildHrefFromLink(title, link),
        };
      }),
    );
  }

  function deleteItem(itemId: string) {
    setItems(group.items.filter((item) => item.id !== itemId));
  }

  function handleItemDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) return;
    if (String(active.id) === String(over.id)) return;

    const oldIndex = group.items.findIndex(
      (item) => item.id === String(active.id),
    );
    const newIndex = group.items.findIndex(
      (item) => item.id === String(over.id),
    );

    if (oldIndex < 0 || newIndex < 0) return;

    setItems(arrayMove(group.items, oldIndex, newIndex));
  }

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
          <div className="text-xs text-slate-400">أنت الآن تخصص مجموعة</div>
          <div className="text-lg font-bold text-slate-900">{group.title}</div>
          <div className="mt-1 text-sm leading-7 text-slate-500">
            أضف عناصر، صور، أيقونات، ماركات وروابط بنفس نظام روابط الثيم.
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-4">
          <FieldBlock label="عنوان المجموعة">
            <input
              value={group.title}
              onChange={(e) => onChange({ title: e.target.value })}
              className="h-11 w-full rounded-xl border border-slate-300 px-3 outline-none"
            />
          </FieldBlock>

          <FieldBlock label="وصف مختصر اختياري">
            <input
              value={group.description}
              onChange={(e) => onChange({ description: e.target.value })}
              className="h-11 w-full rounded-xl border border-slate-300 px-3 outline-none"
            />
          </FieldBlock>

          <FieldBlock label="شكل عرض المجموعة">
            <select
              value={group.style}
              onChange={(e) =>
                onChange({
                  style: e.target.value as SearchGroupStyle,
                })
              }
              className="h-11 w-full rounded-xl border border-slate-300 px-3 outline-none"
            >
              <option value="chips">أزرار صغيرة</option>
              <option value="brands">دوائر ماركات</option>
              <option value="cards">بطاقات صغيرة</option>
              <option value="compact">مضغوط</option>
            </select>
          </FieldBlock>

          <SwitchRow
            label={group.enabled ? "المجموعة ظاهرة" : "المجموعة مخفية"}
            checked={group.enabled}
            onChange={(checked) => onChange({ enabled: checked })}
          />
        </div>
      </div>

      <RepeaterCard
        title="عناصر المجموعة"
        description="كل عنصر يمكن أن يكون كلمة، أيقونة، صورة أو ماركة مع رابط مستقل."
        addLabel="إضافة عنصر"
        onAdd={addItem}
      >
        {group.items.length === 0 ? (
          <EmptyRepeater label="لا توجد عناصر داخل هذه المجموعة." />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleItemDragEnd}
          >
            <SortableContext
              items={itemIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {group.items.map((item, index) => (
                  <SortableSearchItemRow
                    key={item.id}
                    themeId={themeId}
                    index={index}
                    item={item}
                    productOptions={productOptions}
                    categoryOptions={categoryOptions}
                    onChange={(patch) => updateItem(item.id, patch)}
                    onDelete={() => deleteItem(item.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </RepeaterCard>
    </div>
  );
}

function SortableSearchItemRow({
  themeId,
  index,
  item,
  productOptions,
  categoryOptions,
  onChange,
  onDelete,
}: {
  themeId: string;
  index: number;
  item: MarketingSearchGroupItem;
  productOptions: StoreReferenceOption[];
  categoryOptions: StoreReferenceOption[];
  onChange: (patch: Partial<MarketingSearchGroupItem>) => void;
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
  } = useSortable({ id: item.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const showIcon = item.type === "icon";
  const showImage = item.type === "image" || item.type === "brand";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "rounded-2xl border border-slate-200 bg-slate-50/50 p-4",
        isDragging ? "opacity-70 shadow-lg" : "",
      ].join(" ")}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            حذف
          </button>

          <button
            ref={setActivatorNodeRef}
            type="button"
            className="inline-flex h-9 w-9 cursor-grab items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:cursor-grabbing"
            title="سحب لترتيب"
            {...attributes}
            {...listeners}
          >
            <GripIcon />
          </button>
        </div>

        <div className="text-sm font-bold text-slate-800">
          عنصر #{index + 1}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <FieldBlock label="نوع العنصر">
          <select
            value={item.type}
            onChange={(e) =>
              onChange({
                type: e.target.value as SearchItemType,
              })
            }
            className="h-11 w-full rounded-xl border border-slate-300 px-3 outline-none"
          >
            <option value="keyword">كلمة</option>
            <option value="icon">أيقونة</option>
            <option value="image">صورة</option>
            <option value="brand">ماركة</option>
          </select>
        </FieldBlock>

        <FieldBlock label="العنوان">
          <input
            value={item.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="مثال: تنت"
            className="h-11 w-full rounded-xl border border-slate-300 px-3 outline-none"
          />
        </FieldBlock>

        <FieldBlock label="وصف مختصر اختياري">
          <input
            value={item.subtitle}
            onChange={(e) => onChange({ subtitle: e.target.value })}
            placeholder="يستخدم في شكل البطاقات فقط"
            className="h-11 w-full rounded-xl border border-slate-300 px-3 outline-none"
          />
        </FieldBlock>

        {showIcon ? (
          <FieldBlock label="اسم الأيقونة">
            <input
              value={item.icon}
              onChange={(e) => onChange({ icon: e.target.value })}
              placeholder="مثال: Search01"
              dir="ltr"
              className="h-11 w-full rounded-xl border border-slate-300 px-3 text-left outline-none"
            />
          </FieldBlock>
        ) : null}

        {showImage ? (
          <SingleImageField
            label={item.type === "brand" ? "شعار الماركة" : "الصورة"}
            value={item.imageUrl}
            onChange={(imageUrl) => onChange({ imageUrl })}
          />
        ) : null}

        <LinkTargetField
          themeId={themeId}
          value={item.link}
          productOptions={productOptions}
          categoryOptions={categoryOptions}
          onChange={(link) =>
            onChange({
              link,
              href: buildHrefFromLink(item.title, link),
            })
          }
        />

        <FieldBlock label="الرابط النهائي للتوافق">
          <input
            value={item.href}
            onChange={(e) => onChange({ href: e.target.value })}
            placeholder="/search?q=تنت&sort=newest"
            dir="ltr"
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-left outline-none"
          />
        </FieldBlock>

        <SwitchRow
          label={item.enabled ? "العنصر ظاهر" : "العنصر مخفي"}
          checked={item.enabled}
          onChange={(checked) => onChange({ enabled: checked })}
        />
      </div>
    </div>
  );
}

function LinkTargetField({
  themeId,
  value,
  productOptions,
  categoryOptions,
  onChange,
}: {
  themeId: string;
  value: any;
  productOptions: StoreReferenceOption[];
  categoryOptions: StoreReferenceOption[];
  onChange: (value: LinkValue) => void;
}) {
  const current = normalizeLinkValue(value);

  function setType(type: LinkTargetType) {
    onChange({
      type,
      value: "",
      label: "",
    });
  }

  return (
    <FieldBlock label="الرابط">
      <div className="rounded-2xl border border-slate-300 bg-white p-3">
        <LinkTypeTabs value={current.type} onChange={setType} />

        <div className="mt-3">
          <LinkValueInput
            themeId={themeId}
            type={current.type}
            value={current.value}
            productOptions={productOptions}
            categoryOptions={categoryOptions}
            onChange={(patch) =>
              onChange({
                ...current,
                ...patch,
              })
            }
          />
        </div>
      </div>
    </FieldBlock>
  );
}

function LinkTypeTabs({
  value,
  onChange,
}: {
  value: LinkTargetType;
  onChange: (value: LinkTargetType) => void;
}) {
  const tabs: Array<{ value: LinkTargetType; label: string }> = [
    { value: "product", label: "منتج" },
    { value: "category", label: "قسم" },
    { value: "external", label: "رابط يدوي" },
    { value: "internal", label: "رابط داخلي" },
    { value: "page", label: "صفحة" },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={[
            "h-10 rounded-xl border px-2 text-[12px] font-bold transition",
            value === tab.value
              ? "border-slate-900 bg-slate-900 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
          ].join(" ")}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function LinkValueInput({
  themeId,
  type,
  value,
  productOptions,
  categoryOptions,
  onChange,
}: {
  themeId: string;
  type: LinkTargetType;
  value: string;
  productOptions: StoreReferenceOption[];
  categoryOptions: StoreReferenceOption[];
  onChange: (patch: Partial<LinkValue>) => void;
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
          ? "https://example.com أو /search?q=..."
          : type === "internal"
            ? "/account/orders"
            : "/page/about"
      }
      className="h-11 w-full rounded-xl border border-slate-300 px-3 text-left outline-none"
      dir="ltr"
    />
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

  const selected = useMemo(
    () =>
      remoteOptions.find((x) => s(x.value) === s(value)) ||
      options.find((x) => s(x.value) === s(value)) ||
      null,
    [remoteOptions, options, value],
  );

  const filtered = useMemo(() => {
    const q = s(query).toLowerCase();
    const rows = Array.isArray(remoteOptions) ? remoteOptions : [];

    if (!q) return rows.slice(0, 30);

    return rows
      .filter((item) => {
        return (
          s(item.label).toLowerCase().includes(q) ||
          s(item.value).toLowerCase().includes(q)
        );
      })
      .slice(0, 30);
  }, [remoteOptions, query]);

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
    if (!open || !themeId) return;

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
        url.searchParams.set("q", query);
        url.searchParams.set("limit", "30");

        const res = await fetch(url.toString(), {
          method: "GET",
          cache: "no-store",
        });

        const json: ThemeOptionsResponse = await res.json().catch(() => ({}));

        if (!alive) return;

        if (Array.isArray(json?.items)) {
          setRemoteOptions(json.items);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    const timer = window.setTimeout(() => void run(), 250);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [themeId, refType, query, open]);

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
            ) : filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-slate-400">
                لا توجد نتائج
              </div>
            ) : (
              filtered.map((item) => {
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

function SingleImageField({
  label,
  value,
  onChange,
}: {
  label: string;
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
    <FieldBlock label={label}>
      <div className="rounded-2xl border border-slate-300 bg-white p-3">
        {value ? (
          <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <img
              src={value}
              alt={label}
              className="h-36 w-full bg-white object-contain"
            />
          </div>
        ) : (
          <div className="mb-3 flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
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

        <div className="mt-3">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="أو ضع رابط الصورة مباشرة"
            dir="ltr"
            className="h-10 w-full rounded-xl border border-slate-300 px-3 text-left text-xs outline-none"
          />
        </div>
      </div>
    </FieldBlock>
  );
}

function RepeaterCard({
  title,
  description,
  addLabel,
  onAdd,
  children,
}: {
  title: string;
  description: string;
  addLabel: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onAdd}
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
        >
          + {addLabel}
        </button>

        <div className="text-right">
          <div className="text-base font-bold text-slate-900">{title}</div>
          <div className="mt-1 text-sm leading-7 text-slate-500">
            {description}
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}

function EmptyRepeater({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-400">
      {label}
    </div>
  );
}

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex h-11 items-center justify-between rounded-xl border border-slate-300 bg-white px-3">
      <span className="text-sm text-slate-700">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function FieldBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 text-right">
      <div className="text-sm font-medium text-slate-800">{label}</div>
      {children}
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