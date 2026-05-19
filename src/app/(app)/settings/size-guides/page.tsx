// FILE: apps/merchant/src/app/(app)/settings/size-guides/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type StoreCategoryOption = {
  value: string;
  label: string;
};

type SizeGuide = {
  id: string;
  enabled: boolean;
  title: string;
  content: string;
  category_ids: string[];
  category_labels: string[];
  sort_order: number;
};

const GET_URL = "/api/settings/store/size-guides/get";
const UPDATE_URL = "/api/settings/store/size-guides/update";

const DEFAULT_SIZE_GUIDE: SizeGuide = {
  id: "",
  enabled: true,
  title: "",
  content: "",
  category_ids: [],
  category_labels: [],
  sort_order: 10,
};

function s(value: unknown) {
  return String(value ?? "").trim();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `size-guide-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.map((item) => s(item)).filter(Boolean);
}

function normalizeSizeGuide(value: any, fallbackIndex = 0): SizeGuide {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};

  const sortOrder = Number(source.sort_order ?? source.sortOrder ?? 0);

  return {
    id: s(source.id) || makeId(),
    enabled:
      typeof source.enabled === "boolean"
        ? source.enabled
        : DEFAULT_SIZE_GUIDE.enabled,
    title: s(source.title),
    content: s(source.content),
    category_ids: normalizeStringArray(
      source.category_ids ?? source.categoryIds ?? source.categories,
    ),
    category_labels: normalizeStringArray(
      source.category_labels ?? source.categoryLabels,
    ),
    sort_order:
      Number.isFinite(sortOrder) && sortOrder > 0
        ? sortOrder
        : (fallbackIndex + 1) * 10,
  };
}

function hasGuideContent(value: SizeGuide) {
  return Boolean(
    value.enabled ||
      s(value.title) ||
      s(value.content) ||
      value.category_ids.length > 0,
  );
}

function normalizeGuidesFromJson(json: any): SizeGuide[] {
  const rawList: any[] = Array.isArray(json?.size_guides)
    ? json.size_guides
    : Array.isArray(json?.guides)
      ? json.guides
      : Array.isArray(json?.items)
        ? json.items
        : [];

  return rawList
    .map((item, index) => normalizeSizeGuide(item, index))
    .filter(hasGuideContent)
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
}

function snapshotList(values: SizeGuide[]) {
  return JSON.stringify(
    values
      .map((item, index) => normalizeSizeGuide(item, index))
      .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)),
  );
}

function maxSortOrder(items: SizeGuide[]) {
  return items.reduce((max, item) => {
    const n = Number(item.sort_order ?? 0);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
}

function resolveCategoryLabels(
  categoryIds: string[],
  categories: StoreCategoryOption[],
  fallbackLabels: string[] = [],
) {
  if (!Array.isArray(categoryIds) || categoryIds.length === 0) return [];

  const map = new Map(categories.map((item) => [item.value, item.label]));

  return categoryIds
    .map((id, index) => map.get(id) || fallbackLabels[index] || id)
    .filter(Boolean);
}

function categoriesLabel(guide: SizeGuide, categories: StoreCategoryOption[]) {
  const labels = resolveCategoryLabels(
    guide.category_ids,
    categories,
    guide.category_labels,
  );

  if (labels.length === 0) return "لم يتم تحديد أقسام";
  return labels.join("، ");
}

export default function SizeGuidesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [guides, setGuides] = useState<SizeGuide[]>([]);
  const [draft, setDraft] = useState<SizeGuide>(DEFAULT_SIZE_GUIDE);
  const [categories, setCategories] = useState<StoreCategoryOption[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState("");

  const [initialSnapshot, setInitialSnapshot] = useState(snapshotList([]));

  const dirty = useMemo(() => {
    return snapshotList(guides) !== initialSnapshot;
  }, [guides, initialSnapshot]);

  const hasItems = guides.length > 0;

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        setSuccess("");

        const res = await fetch(GET_URL, {
          method: "GET",
          cache: "no-store",
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "LOAD_FAILED");
        }

        if (!alive) return;

        const nextCategories = Array.isArray(json.store_categories)
          ? json.store_categories
              .map((item: any) => ({
                value: s(item.value),
                label: s(item.label),
              }))
              .filter((item: StoreCategoryOption) => item.value && item.label)
          : [];

        const nextItems = normalizeGuidesFromJson(json);

        setCategories(nextCategories);
        setGuides(nextItems);
        setInitialSnapshot(snapshotList(nextItems));
      } catch {
        if (!alive) return;
        setError("تعذر تحميل جداول المقاسات.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load();

    return () => {
      alive = false;
    };
  }, []);

  function openCreateModal() {
    setError("");
    setSuccess("");
    setModalMode("create");
    setEditingId("");

    setDraft({
      ...clone(DEFAULT_SIZE_GUIDE),
      id: makeId(),
      enabled: true,
      sort_order: maxSortOrder(guides) + 10,
    });

    setModalOpen(true);
  }

  function openEditModal(id: string) {
    const item = guides.find((row) => row.id === id);
    if (!item) return;

    setError("");
    setSuccess("");
    setModalMode("edit");
    setEditingId(id);
    setDraft(clone(item));
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditingId("");
  }

  function updateDraft(patch: Partial<SizeGuide>) {
    setDraft((prev) => ({
      ...prev,
      ...patch,
    }));
  }

  function normalizeForSave(items: SizeGuide[]) {
    return items
      .map((item, index) => {
        const clean = normalizeSizeGuide(item, index);

        return {
          ...clean,
          category_labels: resolveCategoryLabels(
            clean.category_ids,
            categories,
            clean.category_labels,
          ),
        };
      })
      .filter(hasGuideContent)
      .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
  }

  async function saveGuides(
    nextItemsValue: SizeGuide[],
    options?: { close?: boolean; silent?: boolean },
  ) {
    try {
      setSaving(true);
      setError("");
      if (!options?.silent) setSuccess("");

      const payloadItems = normalizeForSave(nextItemsValue);

      const res = await fetch(UPDATE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          size_guides: payloadItems,
          guides: payloadItems,
          items: payloadItems,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "SAVE_FAILED");
      }

      const responseItems = normalizeGuidesFromJson(json);
      const finalItems = responseItems.length > 0 ? responseItems : payloadItems;

      setGuides(finalItems);
      setInitialSnapshot(snapshotList(finalItems));

      if (!options?.silent) {
        setSuccess("تم حفظ جدول المقاسات بنجاح.");
      }

      if (options?.close !== false) {
        closeModal();
      }

      return true;
    } catch {
      setError("تعذر حفظ جدول المقاسات.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDraft() {
    if (saving) return;

    const cleanDraft = normalizeForSave([draft])[0];

    const nextItems =
      modalMode === "edit" && editingId
        ? guides.map((item) => (item.id === editingId ? cleanDraft : item))
        : [...guides, cleanDraft];

    await saveGuides(nextItems, { close: true });
  }

  async function handleToggleEnabled(id: string, nextEnabled: boolean) {
    if (saving || loading) return;

    const previous = guides;

    const nextItems = guides.map((item) =>
      item.id === id ? { ...item, enabled: nextEnabled } : item,
    );

    setGuides(nextItems);

    const ok = await saveGuides(nextItems, {
      close: false,
      silent: true,
    });

    if (!ok) {
      setGuides(previous);
    }
  }

  async function handleDisableAll() {
    if (saving || loading) return;

    const nextItems = guides.map((item) => ({
      ...item,
      enabled: false,
    }));

    await saveGuides(nextItems, {
      close: false,
    });
  }

  async function handleDeleteGuide() {
    if (saving || loading || !editingId) return;

    const ok = window.confirm("هل تريد حذف جدول المقاسات؟");
    if (!ok) return;

    const nextItems = guides.filter((item) => item.id !== editingId);

    await saveGuides(nextItems, {
      close: true,
    });
  }

  return (
    <div className="adm-page__inner adm-size-guides" dir="rtl">
      <section className="adm-size-guides-toolbar">
        <button
          type="button"
          className="adm-btn adm-btn--primary"
          onClick={openCreateModal}
          disabled={loading || saving}
        >
          + إضافة قياس جديد
        </button>

        {hasItems ? (
          <button
            type="button"
            className="adm-btn adm-btn--secondary"
            onClick={handleDisableAll}
            disabled={loading || saving}
          >
            إيقاف الكل
          </button>
        ) : null}
      </section>

      {error ? (
        <div className="adm-size-guides-alert is-error">{error}</div>
      ) : null}

      {success ? (
        <div className="adm-size-guides-alert is-success">{success}</div>
      ) : null}

      <section className="adm-size-guides-card">
        <div className="adm-size-guides-card__head">
          <h1>جداول المقاسات</h1>
          <span>📏</span>
        </div>

        <div className="adm-size-guides-card__body">
          {loading ? (
            <div className="adm-size-guides-empty">
              جاري تحميل جداول المقاسات...
            </div>
          ) : !hasItems ? (
            <div className="adm-size-guides-empty">
              لا يوجد جدول مقاسات حتى الآن. اضغط على “إضافة قياس جديد”.
            </div>
          ) : (
            <div className="adm-size-guides-list">
              {guides.map((item) => (
                <SizeGuideRow
                  key={item.id}
                  guide={item}
                  categories={categories}
                  saving={saving}
                  onToggle={(checked) => handleToggleEnabled(item.id, checked)}
                  onEdit={() => openEditModal(item.id)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {dirty ? (
        <div className="adm-size-guides-alert is-success">
          يوجد تعديل غير محفوظ على جداول المقاسات.
        </div>
      ) : null}

      {modalOpen ? (
        <div className="adm-size-guides-modalOverlay" role="presentation">
          <div
            className="adm-size-guides-modal"
            role="dialog"
            aria-modal="true"
            aria-label={
              modalMode === "create" ? "إضافة قياس جديد" : "تعديل جدول القياس"
            }
          >
            <div className="adm-size-guides-modal__head">
              <button
                type="button"
                className="adm-size-guides-modal__close"
                onClick={closeModal}
                disabled={saving}
                aria-label="إغلاق"
              >
                ×
              </button>

              <h2>
                {modalMode === "create" ? "إضافة/تعديل قياس" : "تعديل جدول القياس"}
              </h2>
            </div>

            <div className="adm-size-guides-modal__body">
              <div className="adm-size-guides-form">
                <TextField
                  label="عنوان جدول القياس"
                  value={draft.title}
                  onChange={(value) => updateDraft({ title: value })}
                  placeholder="أضف عنوان مناسب لجدول القياس"
                />

                <TextareaField
                  label="تفاصيل جدول القياس"
                  value={draft.content}
                  onChange={(value) => updateDraft({ content: value })}
                  placeholder="اكتب تفاصيل جدول القياس هنا"
                />

                <CheckboxGroupField
                  label="الأقسام التي يظهر فيها جدول القياس"
                  description="اختر الأقسام. أي منتج داخل هذه الأقسام يظهر له جدول المقاسات."
                  value={draft.category_ids}
                  onChange={(categoryIds) =>
                    updateDraft({
                      category_ids: categoryIds,
                      category_labels: resolveCategoryLabels(
                        categoryIds,
                        categories,
                      ),
                    })
                  }
                  options={categories}
                  emptyText="لا توجد أقسام متاحة في المتجر."
                />

                <SwitchField
                  label="تفعيل جدول القياس"
                  checked={draft.enabled}
                  onChange={(checked) => updateDraft({ enabled: checked })}
                />
              </div>
            </div>

            <div className="adm-size-guides-modal__footer">
              <div className="adm-size-guides-modal__footerStart">
                {modalMode === "edit" ? (
                  <button
                    type="button"
                    className="adm-size-guides-deleteBtn"
                    onClick={handleDeleteGuide}
                    disabled={saving}
                  >
                    حذف
                  </button>
                ) : null}
              </div>

              <div className="adm-size-guides-modal__footerActions">
                <button
                  type="button"
                  className="adm-btn adm-btn--secondary"
                  onClick={closeModal}
                  disabled={saving}
                >
                  إغلاق
                </button>

                <button
                  type="button"
                  className="adm-btn adm-btn--primary"
                  onClick={handleSaveDraft}
                  disabled={saving}
                >
                  {saving ? "جارٍ الحفظ..." : "حفظ"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SizeGuideRow({
  guide,
  categories,
  saving,
  onToggle,
  onEdit,
}: {
  guide: SizeGuide;
  categories: StoreCategoryOption[];
  saving: boolean;
  onToggle: (checked: boolean) => void;
  onEdit: () => void;
}) {
  return (
    <div className="adm-size-guides-row">
      <button
        type="button"
        className={[
          "adm-size-guides-switch",
          guide.enabled ? "is-active" : "",
        ].join(" ")}
        onClick={() => onToggle(!guide.enabled)}
        disabled={saving}
        aria-pressed={guide.enabled}
        title={guide.enabled ? "إيقاف جدول القياس" : "تفعيل جدول القياس"}
      >
        <span />
      </button>

      <button
        type="button"
        className="adm-size-guides-row__content"
        onClick={onEdit}
        disabled={saving}
      >
        <span className="adm-size-guides-row__title">
          {guide.title || "عنوان جدول القياس"}
        </span>

        <span className="adm-size-guides-row__type">
          {categoriesLabel(guide, categories)}
        </span>
      </button>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="adm-size-guides-field">
      <span className="adm-size-guides-field__label">{label}</span>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="adm-size-guides-input"
      />
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="adm-size-guides-field">
      <span className="adm-size-guides-field__label">{label}</span>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="adm-size-guides-textarea"
      />
    </label>
  );
}

function CheckboxGroupField({
  label,
  description,
  value,
  onChange,
  options,
  emptyText,
}: {
  label: string;
  description?: string;
  value: string[];
  onChange: (value: string[]) => void;
  options: StoreCategoryOption[];
  emptyText?: string;
}) {
  const current = Array.isArray(value) ? value : [];

  return (
    <div className="adm-size-guides-field">
      <span className="adm-size-guides-field__label">{label}</span>

      {description ? (
        <span className="adm-size-guides-field__desc">{description}</span>
      ) : null}

      <div className="adm-size-guides-checks">
        {options.length === 0 ? (
          <div className="adm-size-guides-checks__empty">
            {emptyText || "لا توجد خيارات."}
          </div>
        ) : (
          options.map((option) => {
            const checked = current.includes(option.value);

            return (
              <label
                key={`${label}-${option.value}`}
                className={[
                  "adm-size-guides-check",
                  checked ? "is-checked" : "",
                ].join(" ")}
              >
                <span>{option.label}</span>

                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    if (event.target.checked) {
                      onChange([...current, option.value]);
                    } else {
                      onChange(current.filter((item) => item !== option.value));
                    }
                  }}
                />
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

function SwitchField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={["adm-size-guides-check", checked ? "is-checked" : ""].join(
        " ",
      )}
    >
      <span>{label}</span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}