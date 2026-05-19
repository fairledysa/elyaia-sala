// FILE: apps/merchant/src/app/(app)/products/_components/TaxonTagsField.tsx

"use client";

import * as React from "react";
import { X } from "lucide-react";

import MultiTagSelect from "./MultiTagSelect";

export type TaxonCatRow = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  status: string;
  sort_order: number;
  depth: number;
  path: string;
};

export type TaxonLookup = {
  idToLabel: Record<string, string>;
  labelToId: Record<string, string>;
  suggestions: string[];
  loading?: boolean;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr));
}

function sortCats(list: TaxonCatRow[]) {
  return list.slice().sort((a, b) => {
    const pa = (a.path ?? "/") + "/" + (a.slug ?? "");
    const pb = (b.path ?? "/") + "/" + (b.slug ?? "");

    if (pa < pb) return -1;
    if (pa > pb) return 1;

    if ((a.sort_order ?? 0) !== (b.sort_order ?? 0)) {
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    }

    return String(a.name ?? "").localeCompare(String(b.name ?? ""));
  });
}

function labelFor(cat: TaxonCatRow) {
  const d = Math.max(1, Number(cat.depth ?? 1));
  const prefix = "— ".repeat(Math.max(0, d - 1));
  return `${prefix}${cat.name}`.trim();
}

function buildLookup(cats: TaxonCatRow[], loading = false): TaxonLookup {
  const idToLabel: Record<string, string> = {};
  const labelToId: Record<string, string> = {};
  const labels: string[] = [];

  const active = sortCats(cats).filter((cat) => {
    const status = String(cat.status ?? "active").trim();
    return status === "active" || status === "";
  });

  const usable = active.length ? active : sortCats(cats);

  usable.forEach((cat) => {
    if (!cat?.id || !cat?.name) return;

    const label = labelFor(cat);
    idToLabel[cat.id] = label;
    labelToId[label] = cat.id;
    labels.push(label);
  });

  return {
    idToLabel,
    labelToId,
    suggestions: uniq(labels),
    loading,
  };
}

function normalizeCategoryResponse(json: any): TaxonCatRow[] {
  const arr = Array.isArray(json?.data)
    ? json.data
    : Array.isArray(json?.items)
      ? json.items
      : Array.isArray(json?.categories)
        ? json.categories
        : Array.isArray(json)
          ? json
          : [];

  return arr
    .map((x: any) => ({
      id: String(x?.id ?? "").trim(),
      parent_id: x?.parent_id ?? null,
      name: String(x?.name ?? "").trim(),
      slug: String(x?.slug ?? "").trim(),
      status: String(x?.status ?? "active").trim(),
      sort_order: Number.isFinite(Number(x?.sort_order))
        ? Number(x?.sort_order)
        : 0,
      depth: Number.isFinite(Number(x?.depth)) ? Number(x?.depth) : 1,
      path: String(x?.path ?? "/").trim(),
    }))
    .filter((x: TaxonCatRow) => x.id && x.name);
}

/**
 * مهم:
 * هذا cache على مستوى الملف حتى لو عندك 50 بطاقة،
 * ما يصير 50 fetch. يصير طلب واحد فقط كـ fallback.
 */
let cachedCategories: TaxonCatRow[] | null = null;
let categoriesPromise: Promise<TaxonCatRow[]> | null = null;

async function getCategoriesOnce() {
  if (cachedCategories) return cachedCategories;

  if (!categoriesPromise) {
    categoriesPromise = fetch("/api/categories", { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        const rows = normalizeCategoryResponse(json);
        cachedCategories = rows;
        return rows;
      })
      .catch(() => {
        cachedCategories = [];
        return [];
      });
  }

  return categoriesPromise;
}

export default function TaxonTagsField({
  valueIds,
  onChangeIds,
  lookup,
  placeholder = "أضف تصنيف",
  className,
}: {
  valueIds: string[];
  onChangeIds: (nextIds: string[]) => void;
  lookup?: TaxonLookup;
  placeholder?: string;
  className?: string;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [fallbackLookup, setFallbackLookup] = React.useState<TaxonLookup>(() =>
    buildLookup([], true),
  );

  const parentHasSuggestions = Boolean(lookup?.suggestions?.length);

  React.useEffect(() => {
    let alive = true;

    /**
     * لا نشغل fallback والـ parent لسه يحمل.
     * نشغله فقط إذا انتهى تحميل الأب أو ما فيه lookup أساسًا،
     * والقائمة ما زالت فاضية.
     */
    if (parentHasSuggestions || lookup?.loading) return;

    (async () => {
      setFallbackLookup((current) => ({ ...current, loading: true }));

      const cats = await getCategoriesOnce();
      if (!alive) return;

      setFallbackLookup(buildLookup(cats, false));
    })();

    return () => {
      alive = false;
    };
  }, [parentHasSuggestions, lookup?.loading]);

  const effectiveLookup = parentHasSuggestions ? lookup! : fallbackLookup;

  const selectedLabels = React.useMemo(() => {
    return valueIds
      .map((id) => effectiveLookup.idToLabel[id])
      .filter(Boolean) as string[];
  }, [valueIds, effectiveLookup.idToLabel]);

  const count = valueIds.length;

  const Chip = ({ id }: { id: string }) => {
    const name = effectiveLookup.idToLabel[id] ?? id;

    return (
      <span className="adm-products-taxons__chip" title={name}>
        <span>{name}</span>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onChangeIds(valueIds.filter((x) => x !== id));
          }}
          title="إزالة"
          aria-label={`إزالة ${name}`}
        >
          <X />
        </button>
      </span>
    );
  };

  return (
    <div className={cx("adm-products-taxons", className)}>
      <MultiTagSelect
        selected={selectedLabels}
        onChange={(labels) => {
          const ids = labels
            .map((label) => effectiveLookup.labelToId[label])
            .filter(Boolean);

          onChangeIds(ids);
        }}
        suggestions={effectiveLookup.suggestions}
        placeholder={
          effectiveLookup.loading ? "جاري تحميل التصنيفات…" : placeholder
        }
      />

      <div className="adm-products-taxons__meta">
        <span>{count > 0 ? `${count} تصنيف` : "لا توجد أقسام مرتبطة"}</span>

        {count > 0 ? (
          <button type="button" onClick={() => setExpanded((s) => !s)}>
            {expanded ? "إخفاء" : "عرض الكل"}
          </button>
        ) : null}
      </div>

      {count > 0 ? (
        expanded ? (
          <div className="adm-products-taxons__grid">
            {valueIds.map((id) => (
              <Chip key={id} id={id} />
            ))}
          </div>
        ) : (
          <div className="adm-products-taxons__scroll adm-products-no-scrollbar">
            {valueIds.map((id) => (
              <Chip key={id} id={id} />
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}