// FILE: apps/merchant/src/app/(app)/orders/statuses/_components/OrderStatusesPageClient.tsx
"use client";

import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Icon from "@/boltify/components/icon/Icon";
import { STATUS_ICONS as ORDER_STATUS_ICONS } from "@/lib/icons/status-icons";

type BaseStatus = {
  key: string;
  name_ar: string;
  name_en?: string | null;
  icon?: string | null;
  color?: string | null;
  sort_order: number;
  is_active: boolean;
  is_system: boolean;
};

type StoreStatus = {
  id: string;
  store_id: string;
  base_status_key: string;
  name: string;
  slug?: string | null;
  icon?: string | null;
  color?: string | null;
  sort_order: number;
  is_active: boolean;
  notify_customer: boolean;
  message_template?: string | null;
  email_template?: string | null;
  sms_template?: string | null;
  created_at?: string;
  updated_at?: string;
};

type StatusesResponse = {
  base_statuses: BaseStatus[];
  store_statuses: StoreStatus[];
};

type FormState = {
  id?: string | null;
  base_status_key: string;
  name: string;
  icon: string;
  color: string;
  is_active: boolean;
  notify_customer: boolean;
  message_template: string;
  email_template: string;
  sms_template: string;
};

type StatusColorStyle = CSSProperties & {
  "--adm-status-color"?: string;
};

function s(x: any) {
  return String(x ?? "").trim();
}

async function safeJson(r: Response) {
  try {
    return await r.json();
  } catch {
    return null;
  }
}

function defaultForm(baseStatusKey = ""): FormState {
  return {
    id: null,
    base_status_key: baseStatusKey,
    name: "",
    icon: "",
    color: "",
    is_active: true,
    notify_customer: false,
    message_template: "",
    email_template: "",
    sms_template: "",
  };
}

function sortByOrder<T extends { sort_order?: number | null }>(items: T[]) {
  return [...items].sort(
    (a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)
  );
}

function baseStatusLabel(key: string, list: BaseStatus[]) {
  return list.find((x) => x.key === key)?.name_ar || key;
}

function iconLabel(value?: string | null) {
  const item = ORDER_STATUS_ICONS.find((x) => x.value === value);
  return item?.label || "اختر الأيقونة";
}

function statusColorStyle(color?: string | null): StatusColorStyle {
  return {
    "--adm-status-color": s(color) || "var(--adm-primary, #0d3b45)",
  };
}

function BaseStatusBadge({
  name,
  color,
}: {
  name: string;
  color?: string | null;
}) {
  return (
    <div className="adm-statuses-baseBadge" style={statusColorStyle(color)}>
      <span className="adm-statuses-baseBadge__dot" />
      <span>{name}</span>
    </div>
  );
}

function IconPreview({
  icon,
  color,
}: {
  icon?: string | null;
  color?: string | null;
}) {
  return (
    <div
      className="adm-statuses-iconPreview"
      style={statusColorStyle(color)}
      aria-hidden="true"
    >
      {icon ? <Icon icon={icon as any} className="adm-statuses-icon" /> : null}
    </div>
  );
}

function IconPickerField({
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
    Math.ceil(ORDER_STATUS_ICONS.length / PAGE_SIZE)
  );

  const currentItems = ORDER_STATUS_ICONS.slice(
    page * PAGE_SIZE,
    page * PAGE_SIZE + PAGE_SIZE
  );

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const node = wrapRef.current;
      if (!node) return;
      if (node.contains(e.target as Node)) return;
      setOpen(false);
    }

    if (open) document.addEventListener("mousedown", onDocClick);

    return () => {
      document.removeEventListener("mousedown", onDocClick);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="adm-statuses-iconPicker">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="adm-statuses-iconPicker__trigger"
      >
        <span className="adm-statuses-iconPicker__selected">
          <IconPreview icon={value} />
          <span
            className={
              value
                ? "adm-statuses-iconPicker__text"
                : "adm-statuses-iconPicker__text is-muted"
            }
          >
            {iconLabel(value)}
          </span>
        </span>

        <span className="adm-statuses-iconPicker__chevron">▾</span>
      </button>

      {open ? (
        <div className="adm-statuses-iconPicker__panel">
          <div className="adm-statuses-iconPicker__pager">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="adm-statuses-iconPicker__pagerBtn"
            >
              ‹
            </button>

            <div className="adm-statuses-iconPicker__pageText">
              {page + 1} / {totalPages}
            </div>

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="adm-statuses-iconPicker__pagerBtn"
            >
              ›
            </button>
          </div>

          <div className="adm-statuses-iconPicker__grid">
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
                    "adm-statuses-iconPicker__option",
                    selected ? "is-selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <Icon icon={item.value as any} className="adm-statuses-icon" />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatusDialog({
  open,
  title,
  saving,
  form,
  setForm,
  onClose,
  onSubmit,
  baseStatuses,
}: {
  open: boolean;
  title: string;
  saving: boolean;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onClose: () => void;
  onSubmit: () => void;
  baseStatuses: BaseStatus[];
}) {
  if (!open) return null;

  return (
    <div className="adm-statuses-dialog">
      <button
        type="button"
        className="adm-statuses-dialog__backdrop"
        onClick={saving ? undefined : onClose}
        aria-label="إغلاق"
      />

      <div className="adm-statuses-dialog__panel">
        <div className="adm-statuses-dialog__head">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="adm-statuses-dialog__close"
          >
            ×
          </button>

          <div className="adm-statuses-dialog__titleWrap">
            <div className="adm-statuses-dialog__title">{title}</div>
            <div className="adm-statuses-dialog__desc">
              أضف أو عدّل الحالة الفرعية التابعة للحالة الأساسية.
            </div>
          </div>
        </div>

        <div className="adm-statuses-form">
          <div className="adm-statuses-field">
            <label className="adm-statuses-label">اسم الحالة</label>
            <input
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
              placeholder="مثال: تحت الفرز"
              className="adm-statuses-input"
            />
          </div>

          <div className="adm-statuses-form__grid3">
            <div className="adm-statuses-field">
              <label className="adm-statuses-label">الأيقونة</label>
              <IconPickerField
                value={form.icon}
                onChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    icon: value,
                  }))
                }
              />
            </div>

            <div className="adm-statuses-field">
              <label className="adm-statuses-label">اللون</label>
              <input
                value={form.color}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, color: e.target.value }))
                }
                placeholder="#0D3B45"
                className="adm-statuses-input"
              />
            </div>

            <div className="adm-statuses-field">
              <label className="adm-statuses-label">الحالة الأساسية</label>
              <input
                value={baseStatusLabel(form.base_status_key, baseStatuses)}
                disabled
                className="adm-statuses-input adm-statuses-input--disabled"
              />
            </div>
          </div>

          <div className="adm-statuses-field">
            <label className="adm-statuses-label">رسالة الحالة</label>
            <textarea
              value={form.message_template}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  message_template: e.target.value,
                }))
              }
              placeholder="تم تحديث حالة طلبك إلى ..."
              className="adm-statuses-textarea"
            />
          </div>

          <div className="adm-statuses-form__grid2">
            <div className="adm-statuses-field">
              <label className="adm-statuses-label">قالب البريد</label>
              <textarea
                value={form.email_template}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    email_template: e.target.value,
                  }))
                }
                className="adm-statuses-textarea"
              />
            </div>

            <div className="adm-statuses-field">
              <label className="adm-statuses-label">قالب SMS</label>
              <textarea
                value={form.sms_template}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    sms_template: e.target.value,
                  }))
                }
                className="adm-statuses-textarea"
              />
            </div>
          </div>

          <div className="adm-statuses-form__grid2">
            <label className="adm-statuses-toggleRow">
              <span>الحالة مفعلة</span>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    is_active: e.target.checked,
                  }))
                }
              />
            </label>

            <label className="adm-statuses-toggleRow">
              <span>إشعار العميل عند التغيير</span>
              <input
                type="checkbox"
                checked={form.notify_customer}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    notify_customer: e.target.checked,
                  }))
                }
              />
            </label>
          </div>
        </div>

        <div className="adm-statuses-dialog__footer">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="adm-statuses-btn adm-statuses-btn--light"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            className="adm-statuses-btn adm-statuses-btn--primary"
          >
            {saving ? "جاري الحفظ..." : "حفظ"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrderStatusesPageClient() {
  const [baseStatuses, setBaseStatuses] = useState<BaseStatus[]>([]);
  const [storeStatuses, setStoreStatuses] = useState<StoreStatus[]>([]);

  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSaving, setDialogSaving] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("حالة جديدة");
  const [form, setForm] = useState<FormState>(defaultForm());

  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);

    try {
      const res = await fetch("/api/orders/statuses", {
        cache: "no-store",
        credentials: "include",
      });

      const json: StatusesResponse | any = await safeJson(res);

      if (!res.ok) {
        throw new Error(json?.error || "LOAD_FAILED");
      }

      setBaseStatuses(
        sortByOrder(
          Array.isArray(json?.base_statuses) ? json.base_statuses : []
        )
      );

      setStoreStatuses(
        sortByOrder(
          Array.isArray(json?.store_statuses) ? json.store_statuses : []
        )
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, StoreStatus[]>();

    for (const base of baseStatuses) {
      map.set(base.key, []);
    }

    for (const item of storeStatuses) {
      const arr = map.get(item.base_status_key) ?? [];
      arr.push(item);
      map.set(item.base_status_key, sortByOrder(arr));
    }

    return map;
  }, [baseStatuses, storeStatuses]);

  function openCreate(baseStatusKey: string) {
    setDialogTitle("حالة جديدة");
    setForm(defaultForm(baseStatusKey));
    setDialogOpen(true);
  }

  function openEdit(item: StoreStatus) {
    setDialogTitle("تعديل الحالة");
    setForm({
      id: item.id,
      base_status_key: item.base_status_key,
      name: item.name,
      icon: s(item.icon),
      color: s(item.color),
      is_active: !!item.is_active,
      notify_customer: !!item.notify_customer,
      message_template: s(item.message_template),
      email_template: s(item.email_template),
      sms_template: s(item.sms_template),
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!s(form.base_status_key) || !s(form.name)) return;

    setDialogSaving(true);

    try {
      const payload = {
        base_status_key: s(form.base_status_key),
        name: s(form.name),
        icon: s(form.icon) || null,
        color: s(form.color) || null,
        is_active: !!form.is_active,
        notify_customer: !!form.notify_customer,
        message_template: s(form.message_template) || null,
        email_template: s(form.email_template) || null,
        sms_template: s(form.sms_template) || null,
      };

      if (form.id) {
        const res = await fetch(`/api/orders/statuses/${form.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        const json = await safeJson(res);
        if (!res.ok) throw new Error(json?.error || "UPDATE_FAILED");
      } else {
        const res = await fetch("/api/orders/statuses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        const json = await safeJson(res);
        if (!res.ok) throw new Error(json?.error || "CREATE_FAILED");
      }

      setDialogOpen(false);
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setDialogSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("تأكيد حذف الحالة الفرعية؟")) return;

    setBusyId(id);

    try {
      const res = await fetch(`/api/orders/statuses/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error || "DELETE_FAILED");

      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggle(item: StoreStatus) {
    setBusyId(item.id);

    try {
      const res = await fetch(`/api/orders/statuses/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          is_active: !item.is_active,
        }),
      });

      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error || "TOGGLE_FAILED");

      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setBusyId(null);
    }
  }

  async function moveItem(item: StoreStatus, direction: "up" | "down") {
    const siblings = grouped.get(item.base_status_key) ?? [];
    const currentIndex = siblings.findIndex((x) => x.id === item.id);
    if (currentIndex === -1) return;

    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= siblings.length) return;

    const reordered = [...siblings];
    const [picked] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, picked);

    const items = reordered.map((x, index) => ({
      id: x.id,
      sort_order: index + 1,
    }));

    setBusyId(item.id);

    try {
      const res = await fetch("/api/orders/statuses/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          base_status_key: item.base_status_key,
          items,
        }),
      });

      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error || "REORDER_FAILED");

      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <StatusDialog
        open={dialogOpen}
        title={dialogTitle}
        saving={dialogSaving}
        form={form}
        setForm={setForm}
        onClose={() => {
          if (dialogSaving) return;
          setDialogOpen(false);
        }}
        onSubmit={handleSave}
        baseStatuses={baseStatuses}
      />

      <div className="adm-statuses" dir="rtl">
        <div className="adm-statuses__inner">
          <div className="adm-statuses-hero">
            <div className="adm-statuses-hero__main">
              <div className="adm-statuses-hero__icon">
                <Icon icon="Task01" className="adm-statuses-icon" />
              </div>

              <div className="adm-statuses-hero__text">
                <h1>تخصيص حالات الطلب</h1>
                <p>إدارة الحالات الفرعية لكل حالة أساسية في الطلبات.</p>
              </div>
            </div>

            <a href="/orders" className="adm-statuses-btn adm-statuses-btn--light">
              الذهاب إلى الطلبات
            </a>
          </div>

          {loading ? (
            <div className="adm-statuses-loading">
              <div className="adm-statuses-skeleton" />
              <div className="adm-statuses-skeleton" />
              <div className="adm-statuses-skeleton" />
            </div>
          ) : (
            baseStatuses.map((base) => {
              const items = grouped.get(base.key) ?? [];

              return (
                <section key={base.key} className="adm-statuses-group">
                  <div className="adm-statuses-group__head">
                    <div className="adm-statuses-group__info">
                      <BaseStatusBadge name={base.name_ar} color={base.color} />
                      <div className="adm-statuses-group__count">
                        عدد الحالات الفرعية: {items.length}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openCreate(base.key)}
                      className="adm-statuses-btn adm-statuses-btn--primary"
                    >
                      حالة جديدة
                    </button>
                  </div>

                  {items.length === 0 ? (
                    <div className="adm-statuses-empty">
                      لا توجد حالات فرعية تحت هذه الحالة الأساسية.
                    </div>
                  ) : (
                    <div className="adm-statuses-list">
                      {items.map((item, index) => (
                        <div key={item.id} className="adm-statuses-row">
                          <div className="adm-statuses-row__main">
                            <div
                              className="adm-statuses-row__icon"
                              style={statusColorStyle(item.color || base.color)}
                            >
                              {item.icon ? (
                                <Icon
                                  icon={item.icon as any}
                                  className="adm-statuses-icon"
                                />
                              ) : (
                                <span className="adm-statuses-row__dot" />
                              )}
                            </div>

                            <div className="adm-statuses-row__body">
                              <div className="adm-statuses-row__titleLine">
                                <div className="adm-statuses-row__title">
                                  {item.name}
                                </div>

                                {!item.is_active ? (
                                  <span className="adm-statuses-pill adm-statuses-pill--neutral">
                                    غير مفعلة
                                  </span>
                                ) : null}

                                {item.notify_customer ? (
                                  <span className="adm-statuses-pill adm-statuses-pill--mint">
                                    إشعار مفعّل
                                  </span>
                                ) : null}
                              </div>

                              {item.message_template ? (
                                <div className="adm-statuses-row__message">
                                  {item.message_template}
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div className="adm-statuses-row__actions">
                            <button
                              type="button"
                              disabled={busyId === item.id || index === 0}
                              onClick={() => moveItem(item, "up")}
                              className="adm-statuses-miniBtn"
                            >
                              ↑
                            </button>

                            <button
                              type="button"
                              disabled={
                                busyId === item.id || index === items.length - 1
                              }
                              onClick={() => moveItem(item, "down")}
                              className="adm-statuses-miniBtn"
                            >
                              ↓
                            </button>

                            <button
                              type="button"
                              disabled={busyId === item.id}
                              onClick={() => handleToggle(item)}
                              className="adm-statuses-btn adm-statuses-btn--light"
                            >
                              {item.is_active ? "تعطيل" : "تفعيل"}
                            </button>

                            <button
                              type="button"
                              onClick={() => openEdit(item)}
                              className="adm-statuses-btn adm-statuses-btn--light"
                            >
                              تعديل
                            </button>

                            <button
                              type="button"
                              disabled={busyId === item.id}
                              onClick={() => handleDelete(item.id)}
                              className="adm-statuses-btn adm-statuses-btn--danger"
                            >
                              حذف
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}