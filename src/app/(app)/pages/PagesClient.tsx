// FILE: apps/merchant/src/app/(app)/pages/PagesClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type PageType = "general" | "privacy" | "returns" | "html";

type StorePage = {
  id: string;
  title: string;
  page_type: PageType;
  content: string;
  show_in_footer: boolean;
  is_active: boolean;
  seo_title: string;
  seo_slug: string;
  seo_description: string;
  sort_order: number;
  created_at?: string | null;
  updated_at?: string | null;
};

type PageForm = {
  title: string;
  page_type: PageType;
  content: string;
  show_in_footer: boolean;
  is_active: boolean;
  seo_title: string;
  seo_slug: string;
  seo_description: string;
  sort_order: string;
};

const DEFAULT_FORM: PageForm = {
  title: "",
  page_type: "general",
  content: "",
  show_in_footer: true,
  is_active: true,
  seo_title: "",
  seo_slug: "",
  seo_description: "",
  sort_order: "0",
};

const PAGE_TYPE_LABELS: Record<PageType, string> = {
  general: "عامة",
  privacy: "سياسة الاستخدام والخصوصية",
  returns: "سياسة الاستبدال والاسترجاع",
  html: "HTML Code",
};

function s(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeSlug(value: string) {
  return s(value)
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\u0600-\u06FFa-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function slugFromTitle(title: string) {
  const clean = normalizeSlug(title);
  return clean || "";
}

function emptyToDefaultForm(row?: Partial<StorePage> | null): PageForm {
  return {
    title: s(row?.title),
    page_type: (row?.page_type || "general") as PageType,
    content: String(row?.content ?? ""),
    show_in_footer: row?.show_in_footer !== false,
    is_active: row?.is_active !== false,
    seo_title: s(row?.seo_title),
    seo_slug: s(row?.seo_slug),
    seo_description: s(row?.seo_description),
    sort_order: String(Number(row?.sort_order ?? 0)),
  };
}

function toStorePage(row: any): StorePage {
  return {
    id: s(row?.id),
    title: s(row?.title),
    page_type: (s(row?.page_type) || "general") as PageType,
    content: String(row?.content ?? ""),
    show_in_footer: row?.show_in_footer !== false,
    is_active: row?.is_active !== false,
    seo_title: s(row?.seo_title),
    seo_slug: s(row?.seo_slug),
    seo_description: s(row?.seo_description),
    sort_order: Number(row?.sort_order ?? 0),
    created_at: row?.created_at ?? null,
    updated_at: row?.updated_at ?? null,
  };
}

export default function PagesClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [rows, setRows] = useState<StorePage[]>([]);
  const [query, setQuery] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PageForm>(DEFAULT_FORM);

  const editingPage = useMemo(() => {
    if (!editingId) return null;
    return rows.find((x) => x.id === editingId) || null;
  }, [editingId, rows]);

  const stats = useMemo(() => {
    return {
      total: rows.length,
      active: rows.filter((row) => row.is_active).length,
      footer: rows.filter((row) => row.show_in_footer).length,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = s(query).toLowerCase();
    if (!q) return rows;

    return rows.filter((row) => {
      return (
        row.title.toLowerCase().includes(q) ||
        row.seo_slug.toLowerCase().includes(q) ||
        PAGE_TYPE_LABELS[row.page_type]?.toLowerCase().includes(q)
      );
    });
  }, [query, rows]);

  useEffect(() => {
    void loadPages();
  }, []);

  async function loadPages() {
    try {
      setLoading(true);

      const res = await fetch("/api/pages", {
        method: "GET",
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "PAGES_LOAD_FAILED");
      }

      const nextRows = Array.isArray(json?.pages)
        ? json.pages.map(toStorePage).filter((x: StorePage) => x.id)
        : [];

      setRows(nextRows);
    } catch {
      window.alert("تعذر تحميل الصفحات التعريفية");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  function openCreateDialog() {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setDialogOpen(true);
  }

  function openEditDialog(row: StorePage) {
    setEditingId(row.id);
    setForm(emptyToDefaultForm(row));
    setDialogOpen(true);
  }

  function closeDialog() {
    if (saving) return;

    setDialogOpen(false);
    setEditingId(null);
    setForm(DEFAULT_FORM);
  }

  function patchForm(patch: Partial<PageForm>) {
    setForm((prev) => ({
      ...prev,
      ...patch,
    }));
  }

  async function savePage() {
    if (saving) return;

    const title = s(form.title);
    const content = String(form.content ?? "");
    const seoSlug = normalizeSlug(form.seo_slug || slugFromTitle(title));
    const sortOrder = Number(form.sort_order || 0);

    if (!title) {
      window.alert("اكتب عنوان الصفحة");
      return;
    }

    if (!seoSlug) {
      window.alert("اكتب رابط الصفحة SEO");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        title,
        page_type: form.page_type,
        content,
        show_in_footer: form.show_in_footer,
        is_active: form.is_active,
        seo_title: s(form.seo_title) || title,
        seo_slug: seoSlug,
        seo_description: s(form.seo_description),
        sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      };

      const url = editingId ? `/api/pages/${editingId}` : "/api/pages";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        console.error("PAGE_SAVE_FAILED_RESPONSE", {
          status: res.status,
          json,
        });

        const error = String(json?.error || "PAGE_SAVE_FAILED");
        const details =
          typeof json?.details === "string"
            ? json.details
            : json?.details?.message
              ? String(json.details.message)
              : JSON.stringify(json?.details || {}, null, 2);

        window.alert(
          [
            "تعذر حفظ الصفحة",
            "",
            `ERROR: ${error}`,
            details && details !== "{}" ? `DETAILS: ${details}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        );

        return;
      }

      const saved = toStorePage(json.page);

      setRows((prev) => {
        if (editingId) {
          return prev
            .map((row) => (row.id === saved.id ? saved : row))
            .sort((a, b) => a.sort_order - b.sort_order);
        }

        return [...prev, saved].sort((a, b) => a.sort_order - b.sort_order);
      });

      closeDialog();
    } catch (e: any) {
      console.error("PAGE_SAVE_EXCEPTION", e);

      window.alert(
        [
          "تعذر حفظ الصفحة",
          "",
          `EXCEPTION: ${String(e?.message || e)}`,
        ].join("\n"),
      );
    } finally {
      setSaving(false);
    }
  }

  async function togglePage(row: StorePage, key: "is_active" | "show_in_footer") {
    const nextValue = !row[key];

    setRows((prev) =>
      prev.map((x) => (x.id === row.id ? { ...x, [key]: nextValue } : x)),
    );

    try {
      const res = await fetch(`/api/pages/${row.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [key]: nextValue,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "PAGE_UPDATE_FAILED");
      }

      const saved = toStorePage(json.page);

      setRows((prev) => prev.map((x) => (x.id === saved.id ? saved : x)));
    } catch {
      setRows((prev) =>
        prev.map((x) => (x.id === row.id ? { ...x, [key]: row[key] } : x)),
      );

      window.alert("تعذر تحديث الصفحة");
    }
  }

  async function deletePage(row: StorePage) {
    const ok = window.confirm(`هل تريد حذف صفحة "${row.title}"؟`);
    if (!ok) return;

    const oldRows = rows;
    setRows((prev) => prev.filter((x) => x.id !== row.id));

    try {
      const res = await fetch(`/api/pages/${row.id}`, {
        method: "DELETE",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "PAGE_DELETE_FAILED");
      }
    } catch {
      setRows(oldRows);
      window.alert("تعذر حذف الصفحة");
    }
  }

  function onTitleChange(value: string) {
    const nextTitle = value;

    setForm((prev) => {
      const shouldAutoSlug =
        !prev.seo_slug || prev.seo_slug === slugFromTitle(prev.title);

      return {
        ...prev,
        title: nextTitle,
        seo_title: prev.seo_title ? prev.seo_title : nextTitle,
        seo_slug: shouldAutoSlug ? slugFromTitle(nextTitle) : prev.seo_slug,
      };
    });
  }

  return (
    <div className="adm-page__inner" dir="rtl">
      <section className="adm-pages-hero">
        <div className="adm-pages-hero__content">
          <div className="adm-pages-eyebrow">إدارة المحتوى</div>

          <h1 className="adm-pages-title">الصفحات التعريفية</h1>

          <p className="adm-pages-subtitle">
            أنشئ صفحات المتجر مثل الشروط والأحكام، الخصوصية، وسياسة الاستبدال
            والاسترجاع، مع التحكم في ظهورها وحالة تفعيلها.
          </p>
        </div>

        <div className="adm-pages-hero__aside">
          <div className="adm-pages-stat adm-pages-stat--primary">
            <span className="adm-pages-stat__label">إجمالي الصفحات</span>
            <strong className="adm-pages-stat__value">{stats.total}</strong>
          </div>

          <div className="adm-pages-stat">
            <span className="adm-pages-stat__label">مفعلة</span>
            <strong className="adm-pages-stat__value">{stats.active}</strong>
          </div>

          <div className="adm-pages-stat">
            <span className="adm-pages-stat__label">تظهر في الفوتر</span>
            <strong className="adm-pages-stat__value">{stats.footer}</strong>
          </div>

          <button
            type="button"
            onClick={openCreateDialog}
            className="adm-pages-primary-btn"
          >
            <span className="adm-pages-primary-btn__icon">+</span>
            <span>صفحة جديدة</span>
          </button>
        </div>
      </section>

      <section className="adm-pages-card">
        <div className="adm-pages-card__header">
          <div className="adm-pages-card__titleWrap">
            <h2 className="adm-pages-card__title">قائمة الصفحات</h2>
            <p className="adm-pages-card__hint">
              {filteredRows.length} من {rows.length} صفحة
            </p>
          </div>

          <div className="adm-pages-search">
            <span className="adm-pages-search__icon">⌕</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث بعنوان الصفحة أو الرابط"
              className="adm-pages-search__input"
            />
          </div>
        </div>

        {loading ? (
          <div className="adm-pages-state">
            <div className="adm-pages-state__loader" />
            <div className="adm-pages-state__title">جاري تحميل الصفحات...</div>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="adm-pages-empty">
            <div className="adm-pages-empty__icon">▦</div>
            <div className="adm-pages-empty__title">لا توجد صفحات</div>
            <div className="adm-pages-empty__text">
              اضغط صفحة جديدة لإضافة أول صفحة تعريفية.
            </div>
            <button
              type="button"
              onClick={openCreateDialog}
              className="adm-pages-secondary-btn"
            >
              إضافة صفحة
            </button>
          </div>
        ) : (
          <div className="adm-pages-list">
            <div className="adm-pages-list__head">
              <span>الصفحة</span>
              <span>الفوتر</span>
              <span>الحالة</span>
              <span>إجراءات</span>
            </div>

            <div className="adm-pages-list__body">
              {filteredRows.map((row) => (
                <div key={row.id} className="adm-pages-row">
                  <button
                    type="button"
                    onClick={() => openEditDialog(row)}
                    className="adm-pages-row__main"
                  >
                    <span className="adm-pages-row__title">{row.title}</span>

                    <span className="adm-pages-row__meta">
                      <span className="adm-pages-chip">
                        {PAGE_TYPE_LABELS[row.page_type]}
                      </span>

                      <span className="adm-pages-row__dot">•</span>

                      <span className="adm-pages-row__url" dir="ltr">
                        /pages/{row.seo_slug}
                      </span>
                    </span>
                  </button>

                  <Toggle
                    checked={row.show_in_footer}
                    label="الفوتر"
                    onChange={() => void togglePage(row, "show_in_footer")}
                  />

                  <Toggle
                    checked={row.is_active}
                    label={row.is_active ? "مفعل" : "غير مفعل"}
                    onChange={() => void togglePage(row, "is_active")}
                  />

                  <div className="adm-pages-row__actions">
                    <button
                      type="button"
                      onClick={() => openEditDialog(row)}
                      className="adm-pages-icon-btn"
                      title="تعديل"
                    >
                      …
                    </button>

                    <button
                      type="button"
                      onClick={() => void deletePage(row)}
                      className="adm-pages-icon-btn adm-pages-icon-btn--danger"
                      title="حذف"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {dialogOpen ? (
        <div className="adm-pages-dialog" role="dialog" aria-modal="true">
          <div className="adm-pages-dialog__panel">
            <div className="adm-pages-dialog__header">
              <div>
                <div className="adm-pages-dialog__eyebrow">
                  {editingPage ? "تعديل المحتوى" : "محتوى جديد"}
                </div>
                <div className="adm-pages-dialog__title">
                  {editingPage ? "تعديل صفحة" : "إنشاء صفحة"}
                </div>
              </div>

              <button
                type="button"
                onClick={closeDialog}
                disabled={saving}
                className="adm-pages-dialog__close"
                aria-label="إغلاق"
              >
                ×
              </button>
            </div>

            <div className="adm-pages-dialog__body">
              <div className="adm-pages-form">
                <TextField
                  label="عنوان الصفحة"
                  value={form.title}
                  onChange={onTitleChange}
                  placeholder="مثال: الشروط والأحكام"
                />

                <SelectField
                  label="نوع الصفحة"
                  value={form.page_type}
                  onChange={(v) => patchForm({ page_type: v as PageType })}
                  options={[
                    { value: "general", label: "عامة" },
                    { value: "privacy", label: "سياسة الاستخدام والخصوصية" },
                    { value: "returns", label: "سياسة الاستبدال والاسترجاع" },
                    { value: "html", label: "HTML Code" },
                  ]}
                />

                <RichTextField
                  label="محتوى الصفحة"
                  value={form.content}
                  onChange={(v) => patchForm({ content: v })}
                  htmlMode={form.page_type === "html"}
                />

                <div className="adm-pages-switch-grid">
                  <SwitchField
                    label="عرض رابط الصفحة في أسفل الموقع"
                    checked={form.show_in_footer}
                    onChange={(v) => patchForm({ show_in_footer: v })}
                  />

                  <SwitchField
                    label="تفعيل الصفحة"
                    checked={form.is_active}
                    onChange={(v) => patchForm({ is_active: v })}
                  />
                </div>

                <div className="adm-pages-seo">
                  <div className="adm-pages-seo__header">
                    <div className="adm-pages-seo__title">تحسينات SEO</div>
                    <div className="adm-pages-seo__hint">
                      تظهر هذه البيانات في محركات البحث ورابط الصفحة.
                    </div>
                  </div>

                  <div className="adm-pages-seo__grid">
                    <TextField
                      label="عنوان صفحة تعريفية (Page Title)"
                      value={form.seo_title}
                      onChange={(v) => patchForm({ seo_title: v })}
                      placeholder="عنوان صفحة تعريفية"
                    />

                    <TextField
                      label="رابط صفحة تعريفية (SEO Page URL)"
                      value={form.seo_slug}
                      onChange={(v) => patchForm({ seo_slug: normalizeSlug(v) })}
                      placeholder="terms-and-conditions"
                      dir="ltr"
                    />

                    <TextareaField
                      label="وصف صفحة تعريفية (Page Description)"
                      value={form.seo_description}
                      onChange={(v) => patchForm({ seo_description: v })}
                      placeholder="وصف مختصر للصفحة"
                    />

                    <TextField
                      label="ترتيب الظهور"
                      value={form.sort_order}
                      onChange={(v) => patchForm({ sort_order: v })}
                      placeholder="0"
                      dir="ltr"
                    />

                    <div className="adm-pages-preview-url" dir="ltr">
                      /pages/{form.seo_slug || "{description}"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="adm-pages-dialog__footer">
              <button
                type="button"
                onClick={closeDialog}
                disabled={saving}
                className="adm-pages-cancel-btn"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={() => void savePage()}
                disabled={saving}
                className="adm-pages-save-btn"
              >
                {saving
                  ? "جاري الحفظ..."
                  : editingPage
                    ? "حفظ التعديلات"
                    : "إنشاء الصفحة"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={[
        "adm-pages-toggle",
        checked ? "adm-pages-toggle--on" : "",
      ].join(" ")}
      title={label}
      aria-pressed={checked}
    >
      <span className="adm-pages-toggle__label">{label}</span>

      <span className="adm-pages-toggle__track">
        <span className="adm-pages-toggle__thumb" />
      </span>
    </button>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  dir = "rtl",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  dir?: "rtl" | "ltr";
}) {
  return (
    <div className="adm-pages-field">
      <label className="adm-pages-field__label">{label}</label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir={dir}
        className={[
          "adm-pages-field__input",
          dir === "ltr" ? "adm-pages-field__input--ltr" : "",
        ].join(" ")}
      />
    </div>
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
    <div className="adm-pages-field">
      <label className="adm-pages-field__label">{label}</label>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="adm-pages-field__textarea"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="adm-pages-field">
      <label className="adm-pages-field__label">{label}</label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="adm-pages-field__select"
      >
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[
        "adm-pages-switch-card",
        checked ? "adm-pages-switch-card--on" : "",
      ].join(" ")}
      aria-pressed={checked}
    >
      <span className="adm-pages-switch-card__label">{label}</span>

      <span className="adm-pages-toggle__track">
        <span className="adm-pages-toggle__thumb" />
      </span>
    </button>
  );
}

function RichTextField({
  label,
  value,
  onChange,
  htmlMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  htmlMode?: boolean;
}) {
  return (
    <div className="adm-pages-field">
      <label className="adm-pages-field__label">{label}</label>

      <div className="adm-pages-editor">
        <div className="adm-pages-editor__toolbar">
          <span className="adm-pages-editor__tool">B</span>
          <span className="adm-pages-editor__tool">S</span>
          <span className="adm-pages-editor__tool">•</span>
          <span className="adm-pages-editor__tool">≡</span>
          <span className="adm-pages-editor__tool">🔗</span>
          <span className="adm-pages-editor__mode">
            {htmlMode ? "اكتب HTML" : "محرر نصي بسيط"}
          </span>
        </div>

        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={htmlMode ? "<h1>عنوان الصفحة</h1>" : "محتوى الصفحة"}
          dir={htmlMode ? "ltr" : "rtl"}
          className={[
            "adm-pages-editor__textarea",
            htmlMode ? "adm-pages-editor__textarea--html" : "",
          ].join(" ")}
        />
      </div>
    </div>
  );
}