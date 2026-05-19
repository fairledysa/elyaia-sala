// FILE: apps/merchant/src/app/(app)/advertisements/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type AnnouncementLinkType =
  | "none"
  | "product"
  | "category"
  | "discounts"
  | "external"
  | "page";

type StoreReferenceOption = {
  value: string;
  label: string;
  image_url?: string | null;
};

type AdvertisementSettings = {
  id: string;
  enabled: boolean;
  icon: string;
  title: string;
  content: string;
  link_type: AnnouncementLinkType;
  link_value: string;
  link_label: string;
  ends_at: string;
  pages: string[];
  text_color: string;
  background_color: string;
  text: string;
  link: string;
  sort_order: number;
};

const GET_URL = "/api/settings/store/advertisements/get";
const UPDATE_URL = "/api/settings/store/advertisements/update";

const DEFAULT_ADVERTISEMENT: AdvertisementSettings = {
  id: "",
  enabled: false,
  icon: "Notification01",
  title: "",
  content: "",
  link_type: "none",
  link_value: "",
  link_label: "",
  ends_at: "",
  pages: [],
  text_color: "#000000",
  background_color: "#b9f3e7",
  text: "",
  link: "",
  sort_order: 10,
};

const ICON_OPTIONS = [
  { value: "Notification01", label: "جرس / تنبيه" },
  { value: "Discount", label: "خصم" },
  { value: "SaleTag01", label: "وسم تخفيض" },
  { value: "Gift", label: "هدية" },
  { value: "TruckDelivery", label: "شحن" },
  { value: "InformationCircle", label: "معلومة" },
];

const LINK_TYPE_OPTIONS: Array<{ value: AnnouncementLinkType; label: string }> =
  [
    { value: "none", label: "بدون رابط" },
    { value: "product", label: "رابط منتج" },
    { value: "category", label: "رابط تصنيف" },
    { value: "discounts", label: "رابط التخفيضات" },
    { value: "external", label: "رابط خارجي" },
    { value: "page", label: "صفحة تعريفية" },
  ];

const PAGE_OPTIONS = [
  { value: "home", label: "الرئيسية" },
  { value: "category", label: "صفحات التصنيفات" },
  { value: "product", label: "صفحات المنتجات" },
  { value: "cart", label: "السلة" },
  { value: "checkout", label: "صفحة الدفع" },
  { value: "account", label: "حساب العميل" },
];

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

  return `ad-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeLinkType(value: unknown): AnnouncementLinkType {
  const v = s(value);

  if (v === "product") return "product";
  if (v === "category") return "category";
  if (v === "discounts") return "discounts";
  if (v === "external") return "external";
  if (v === "page") return "page";

  return "none";
}

function normalizePages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.map((item) => s(item)).filter(Boolean);
}

function normalizeAdvertisement(
  value: any,
  fallbackIndex = 0,
): AdvertisementSettings {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};

  const content = s(source.content) || s(source.text);
  const linkValue = s(source.link_value) || s(source.link);
  const sortOrder = Number(source.sort_order ?? source.sortOrder ?? 0);

  return {
    id: s(source.id) || makeId(),

    enabled:
      typeof source.enabled === "boolean"
        ? source.enabled
        : DEFAULT_ADVERTISEMENT.enabled,

    icon: s(source.icon) || DEFAULT_ADVERTISEMENT.icon,
    title: s(source.title),
    content,

    link_type: normalizeLinkType(source.link_type),
    link_value: linkValue,
    link_label: s(source.link_label),

    ends_at: s(source.ends_at),
    pages: normalizePages(source.pages),

    text_color: s(source.text_color) || DEFAULT_ADVERTISEMENT.text_color,
    background_color:
      s(source.background_color) || DEFAULT_ADVERTISEMENT.background_color,

    text: content,
    link: linkValue,

    sort_order:
      Number.isFinite(sortOrder) && sortOrder > 0
        ? sortOrder
        : (fallbackIndex + 1) * 10,
  };
}

function hasAdvertisementContent(value: AdvertisementSettings) {
  return Boolean(
    value.enabled ||
      s(value.title) ||
      s(value.content) ||
      s(value.link_value) ||
      s(value.ends_at) ||
      value.pages.length > 0,
  );
}

function normalizeAdvertisementsFromJson(json: any): AdvertisementSettings[] {
  const rawList: any[] = Array.isArray(json?.advertisements)
    ? json.advertisements
    : Array.isArray(json?.items)
      ? json.items
      : [];

  if (rawList.length > 0) {
    return rawList
      .map((item: any, index: number): AdvertisementSettings =>
        normalizeAdvertisement(item, index),
      )
      .filter((item: AdvertisementSettings) => hasAdvertisementContent(item))
      .sort(
        (a: AdvertisementSettings, b: AdvertisementSettings) =>
          Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
      );
  }

  const legacy = json?.announcement ?? json?.advertisement ?? null;
  if (!legacy) return [];

  const one = normalizeAdvertisement(legacy, 0);
  return hasAdvertisementContent(one) ? [one] : [];
}

function snapshotList(values: AdvertisementSettings[]) {
  return JSON.stringify(
    values
      .map(
        (item: AdvertisementSettings, index: number): AdvertisementSettings =>
          normalizeAdvertisement(item, index),
      )
      .sort(
        (a: AdvertisementSettings, b: AdvertisementSettings) =>
          Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
      ),
  );
}

function pageLabel(value: string) {
  const found = PAGE_OPTIONS.find((item) => item.value === value);
  return found?.label || value;
}

function pagesLabel(pages: string[]) {
  if (!Array.isArray(pages) || pages.length === 0) return "الكل";
  return pages.map(pageLabel).join("، ");
}

function firstLegacyAdvertisement(items: AdvertisementSettings[]) {
  return (
    items.find((item) => item.enabled && hasAdvertisementContent(item)) ||
    items.find(hasAdvertisementContent) ||
    clone(DEFAULT_ADVERTISEMENT)
  );
}

function maxSortOrder(items: AdvertisementSettings[]) {
  return items.reduce((max, item) => {
    const n = Number(item.sort_order ?? 0);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
}

export default function AdvertisementsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [advertisements, setAdvertisements] = useState<AdvertisementSettings[]>(
    [],
  );

  const [draft, setDraft] =
    useState<AdvertisementSettings>(DEFAULT_ADVERTISEMENT);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState("");

  const [products, setProducts] = useState<StoreReferenceOption[]>([]);
  const [categories, setCategories] = useState<StoreReferenceOption[]>([]);

  const [initialSnapshot, setInitialSnapshot] = useState(snapshotList([]));

  const dirty = useMemo(() => {
    return snapshotList(advertisements) !== initialSnapshot;
  }, [advertisements, initialSnapshot]);

  const hasItems = advertisements.length > 0;

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

        const nextItems = normalizeAdvertisementsFromJson(json);

        setAdvertisements(nextItems);
        setProducts(Array.isArray(json.store_products) ? json.store_products : []);
        setCategories(
          Array.isArray(json.store_categories) ? json.store_categories : [],
        );
        setInitialSnapshot(snapshotList(nextItems));
      } catch {
        if (!alive) return;
        setError("تعذر تحميل إعلانات المتجر.");
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
      ...clone(DEFAULT_ADVERTISEMENT),
      id: makeId(),
      enabled: true,
      sort_order: maxSortOrder(advertisements) + 10,
    });

    setModalOpen(true);
  }

  function openEditModal(id: string) {
    const item = advertisements.find((row) => row.id === id);
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

  function updateDraft(patch: Partial<AdvertisementSettings>) {
    setDraft((prev) => ({
      ...prev,
      ...patch,
    }));
  }

  function updateLinkType(nextType: AnnouncementLinkType) {
    updateDraft({
      link_type: nextType,
      link_value: nextType === "discounts" ? "/discounts" : "",
      link_label: "",
      link: nextType === "discounts" ? "/discounts" : "",
    });
  }

  function updateLinkValue(nextValue: string, nextLabel = "") {
    updateDraft({
      link_value: nextValue,
      link_label: nextLabel,
      link: nextValue,
    });
  }

  async function saveAdvertisements(
    nextItemsValue: AdvertisementSettings[],
    options?: { close?: boolean; silent?: boolean },
  ) {
    try {
      setSaving(true);
      setError("");
      if (!options?.silent) setSuccess("");

      const payloadItems = nextItemsValue
        .map((item, index) =>
          normalizeAdvertisement(
            {
              ...item,
              text: item.content,
              link: item.link_value,
            },
            index,
          ),
        )
        .filter(hasAdvertisementContent)
        .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));

      const legacy = firstLegacyAdvertisement(payloadItems);

      const res = await fetch(UPDATE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          advertisements: payloadItems,
          items: payloadItems,
          announcement: legacy,
          advertisement: legacy,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "SAVE_FAILED");
      }

      const responseItems = normalizeAdvertisementsFromJson(json);
      const finalItems = responseItems.length > 0 ? responseItems : payloadItems;

      setAdvertisements(finalItems);
      setInitialSnapshot(snapshotList(finalItems));

      if (!options?.silent) {
        setSuccess("تم حفظ إعلانات المتجر بنجاح.");
      }

      if (options?.close !== false) {
        closeModal();
      }

      return true;
    } catch {
      setError("تعذر حفظ إعلانات المتجر.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDraft() {
    if (saving) return;

    const cleanDraft = normalizeAdvertisement(
      {
        ...draft,
        text: draft.content,
        link: draft.link_value,
      },
      advertisements.length,
    );

    const nextItems =
      modalMode === "edit" && editingId
        ? advertisements.map((item) => (item.id === editingId ? cleanDraft : item))
        : [...advertisements, cleanDraft];

    await saveAdvertisements(nextItems, { close: true });
  }

  async function handleToggleEnabled(id: string, nextEnabled: boolean) {
    if (saving || loading) return;

    const previous = advertisements;

    const nextItems = advertisements.map((item) =>
      item.id === id ? { ...item, enabled: nextEnabled } : item,
    );

    setAdvertisements(nextItems);

    const ok = await saveAdvertisements(nextItems, {
      close: false,
      silent: true,
    });

    if (!ok) {
      setAdvertisements(previous);
    }
  }

  async function handleDisableAll() {
    if (saving || loading) return;

    const nextItems = advertisements.map((item) => ({
      ...item,
      enabled: false,
    }));

    await saveAdvertisements(nextItems, {
      close: false,
    });
  }

  async function handleDeleteAdvertisement() {
    if (saving || loading || !editingId) return;

    const ok = window.confirm("هل تريد حذف الإعلان؟");
    if (!ok) return;

    const nextItems = advertisements.filter((item) => item.id !== editingId);

    await saveAdvertisements(nextItems, {
      close: true,
    });
  }

  return (
    <div className="adm-page__inner adm-advertisements" dir="rtl">
      <section className="adm-hero">
        <div className="adm-hero__main">
          <div className="adm-hero__icon adm-advertisements-heroIcon">📣</div>

          <div className="adm-hero__text">
            <h1 className="adm-hero__title">إعلانات المتجر</h1>
            <p className="adm-hero__desc">
              إدارة الشريط الإعلاني الظاهر في واجهة المتجر بطريقة مختصرة.
            </p>
          </div>
        </div>

        <div className="adm-hero__actions">
          {hasItems ? (
            <button
              type="button"
              className="adm-btn adm-btn--secondary"
              onClick={handleDisableAll}
              disabled={loading || saving}
            >
              إيقاف الإعلانات
            </button>
          ) : null}

          <button
            type="button"
            className="adm-btn adm-btn--primary"
            onClick={openCreateModal}
            disabled={loading || saving}
          >
            + إعلان جديد
          </button>
        </div>
      </section>

      {error ? (
        <div className="adm-advertisements-alert is-error">{error}</div>
      ) : null}

      {success ? (
        <div className="adm-advertisements-alert is-success">{success}</div>
      ) : null}

      <section className="adm-card adm-card--lg adm-advertisements-card">
        <div className="adm-card__head adm-card__head--border">
          <div className="adm-card__titleWrap">
            <h2 className="adm-card__title">قائمة الإعلانات</h2>
            <p className="adm-card__desc">
              يمكن إضافة أكثر من إعلان وتحديد صفحات ظهوره.
            </p>
          </div>
        </div>

        <div className="adm-card__body adm-advertisements-cardBody">
          {loading ? (
            <div className="adm-advertisements-loading">
              جاري تحميل إعلانات المتجر...
            </div>
          ) : !hasItems ? (
            <div className="adm-advertisements-empty">
              لا يوجد إعلان متجر حتى الآن. اضغط على “إعلان جديد” لإضافة إعلان.
            </div>
          ) : (
            <div className="adm-advertisements-list">
              {advertisements.map((item) => (
                <AdvertisementRow
                  key={item.id}
                  advertisement={item}
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
        <div className="adm-advertisements-alert is-success">
          يوجد تعديل غير محفوظ على الإعلانات.
        </div>
      ) : null}

      {modalOpen ? (
        <div className="adm-advertisements-modalOverlay" role="presentation">
          <div
            className="adm-advertisements-modal"
            role="dialog"
            aria-modal="true"
            aria-label={modalMode === "create" ? "إعلان جديد" : "تعديل الإعلان"}
          >
            <div className="adm-advertisements-modal__head">
              <button
                type="button"
                className="adm-advertisements-modal__close"
                onClick={closeModal}
                disabled={saving}
                aria-label="إغلاق"
              >
                ×
              </button>

              <h2>{modalMode === "create" ? "إعلان جديد" : "تعديل الإعلان"}</h2>
            </div>

            <div className="adm-advertisements-modal__body">
              <div className="adm-advertisements-formGrid">
                <SwitchField
                  label="تفعيل الإعلان"
                  description="عند التفعيل يظهر الإعلان في واجهة المتجر حسب صفحات الظهور المحددة."
                  checked={draft.enabled}
                  onChange={(checked) => updateDraft({ enabled: checked })}
                />

                <SelectField
                  label="أيقونة الإعلان"
                  value={draft.icon}
                  onChange={(value) => updateDraft({ icon: value })}
                  options={ICON_OPTIONS}
                />

                <TextField
                  label="عنوان الإعلان"
                  value={draft.title}
                  onChange={(value) => updateDraft({ title: value })}
                  placeholder="عنوان الإعلان"
                />

                <TextareaField
                  label="محتوى الإعلان"
                  value={draft.content}
                  onChange={(value) =>
                    updateDraft({
                      content: value,
                      text: value,
                    })
                  }
                  placeholder="محتوى الإعلان"
                />

                <SelectField
                  label="نوع الرابط"
                  value={draft.link_type}
                  onChange={(value) =>
                    updateLinkType(value as AnnouncementLinkType)
                  }
                  options={LINK_TYPE_OPTIONS}
                />

                {draft.link_type === "product" ? (
                  <SelectField
                    label="اختر المنتج"
                    value={draft.link_value}
                    onChange={(value) => {
                      const item = products.find((row) => row.value === value);
                      updateLinkValue(value, item?.label || "");
                    }}
                    options={[
                      { value: "", label: "اختر منتج" },
                      ...products.map((product) => ({
                        value: product.value,
                        label: product.label,
                      })),
                    ]}
                  />
                ) : null}

                {draft.link_type === "category" ? (
                  <SelectField
                    label="اختر التصنيف"
                    value={draft.link_value}
                    onChange={(value) => {
                      const item = categories.find((row) => row.value === value);
                      updateLinkValue(value, item?.label || "");
                    }}
                    options={[
                      { value: "", label: "اختر تصنيف" },
                      ...categories.map((category) => ({
                        value: category.value,
                        label: category.label,
                      })),
                    ]}
                  />
                ) : null}

                {draft.link_type === "discounts" ? (
                  <TextField
                    label="رابط التخفيضات"
                    value={draft.link_value || "/discounts"}
                    onChange={(value) => updateLinkValue(value)}
                    placeholder="/discounts"
                    dir="ltr"
                  />
                ) : null}

                {draft.link_type === "external" ? (
                  <TextField
                    label="الرابط الخارجي"
                    value={draft.link_value}
                    onChange={(value) => updateLinkValue(value)}
                    placeholder="https://example.com"
                    dir="ltr"
                  />
                ) : null}

                {draft.link_type === "page" ? (
                  <TextField
                    label="رابط الصفحة التعريفية"
                    value={draft.link_value}
                    onChange={(value) => updateLinkValue(value)}
                    placeholder="/p/about-us"
                    dir="ltr"
                  />
                ) : null}

                <TextField
                  label="تاريخ انتهاء الإعلان"
                  value={draft.ends_at}
                  onChange={(value) => updateDraft({ ends_at: value })}
                  placeholder="2026-12-31"
                  dir="ltr"
                />

                <CheckboxGroupField
                  label="صفحات ظهور الإعلان"
                  value={draft.pages}
                  onChange={(pages) => updateDraft({ pages })}
                  options={PAGE_OPTIONS}
                />

                <div className="adm-advertisements-colorGrid">
                  <ColorField
                    label="لون الخط"
                    value={draft.text_color}
                    onChange={(value) => updateDraft({ text_color: value })}
                  />

                  <ColorField
                    label="لون الخلفية"
                    value={draft.background_color}
                    onChange={(value) =>
                      updateDraft({ background_color: value })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="adm-advertisements-modal__footer">
              <div className="adm-advertisements-modal__footerStart">
                {modalMode === "edit" ? (
                  <button
                    type="button"
                    className="adm-advertisements-deleteBtn"
                    onClick={handleDeleteAdvertisement}
                    disabled={saving}
                  >
                    حذف الإعلان
                  </button>
                ) : null}
              </div>

              <div className="adm-advertisements-modal__footerActions">
                <button
                  type="button"
                  className="adm-btn adm-btn--secondary"
                  onClick={closeModal}
                  disabled={saving}
                >
                  إلغاء
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

function AdvertisementRow({
  advertisement,
  saving,
  onToggle,
  onEdit,
}: {
  advertisement: AdvertisementSettings;
  saving: boolean;
  onToggle: (checked: boolean) => void;
  onEdit: () => void;
}) {
  return (
    <div className="adm-advertisements-row" dir="rtl">
      <button
        type="button"
        className="adm-advertisements-row__content"
        onClick={onEdit}
        disabled={saving}
      >
        <span className="adm-advertisements-row__title">
          {advertisement.title || "عنوان الإعلان"}
        </span>

        <span className="adm-advertisements-row__pages">
          {pagesLabel(advertisement.pages)}
        </span>
      </button>

      <button
        type="button"
        className="adm-btn adm-btn--secondary adm-advertisements-row__edit"
        onClick={onEdit}
        disabled={saving}
      >
        تعديل
      </button>

      <button
        type="button"
        className={[
          "adm-advertisements-switch",
          advertisement.enabled ? "is-active" : "",
        ].join(" ")}
        onClick={() => onToggle(!advertisement.enabled)}
        disabled={saving}
        aria-pressed={advertisement.enabled}
        title={advertisement.enabled ? "إيقاف الإعلان" : "تفعيل الإعلان"}
      >
        <span />
      </button>
    </div>
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
    <label className="adm-advertisements-field">
      <span className="adm-advertisements-field__label">{label}</span>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        dir={dir}
        className={[
          "adm-advertisements-input",
          dir === "ltr" ? "is-ltr" : "",
        ].join(" ")}
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
    <label className="adm-advertisements-field adm-advertisements-field--wide">
      <span className="adm-advertisements-field__label">{label}</span>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="adm-advertisements-textarea"
      />
    </label>
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
    <label className="adm-advertisements-field">
      <span className="adm-advertisements-field__label">{label}</span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="adm-advertisements-select"
      >
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SwitchField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="adm-advertisements-field adm-advertisements-field--wide">
      <span className="adm-advertisements-field__label">{label}</span>

      <label
        className={[
          "adm-advertisements-check",
          checked ? "is-checked" : "",
        ].join(" ")}
      >
        <span>{description || label}</span>

        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
      </label>
    </div>
  );
}

function CheckboxGroupField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  options: Array<{ value: string; label: string }>;
}) {
  const current = Array.isArray(value) ? value : [];

  return (
    <div className="adm-advertisements-field adm-advertisements-field--wide">
      <span className="adm-advertisements-field__label">{label}</span>

      <div className="adm-advertisements-checks">
        {options.map((option) => {
          const checked = current.includes(option.value);

          return (
            <label
              key={`${label}-${option.value}`}
              className={[
                "adm-advertisements-check",
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
        })}
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="adm-advertisements-field">
      <span className="adm-advertisements-field__label">{label}</span>

      <div className="adm-advertisements-color">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(event) => onChange(event.target.value)}
        />

        <span dir="ltr">{value || "#000000"}</span>
      </div>
    </label>
  );
}