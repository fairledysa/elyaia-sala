//apps/merchant/src/app/(app)/settings/order-options/_components/OrderOptionsClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import OrderOptionCreateMenu from "./OrderOptionCreateMenu";
import OrderOptionModal, {
  type CategoryItem,
  type OrderOptionRecord,
  type OrderOptionType,
  type OrderOptionSubmitPayload,
} from "./OrderOptionModal";

const TYPE_LABELS: Record<OrderOptionType, string> = {
  text: "حقل نصي",
  number: "حقل رقمي",
  choices: "حقل الخيارات",
  appointment: "حقل موعد",
};

function getOptionSummary(option: OrderOptionRecord) {
  if (option.applies_to === "categories") {
    return `${option.category_ids?.length ?? 0} تصنيفات مختارة`;
  }

  return "كل المنتجات";
}

export default function OrderOptionsClient() {
  const [options, setOptions] = useState<OrderOptionRecord[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [modalType, setModalType] = useState<OrderOptionType | null>(null);
  const [editing, setEditing] = useState<OrderOptionRecord | null>(null);

  const hasOptions = options.length > 0;

  const stats = useMemo(() => {
    return {
      total: options.length,
      active: options.filter((item) => item.status === "active").length,
      required: options.filter((item) => item.is_required).length,
    };
  }, [options]);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [optionsRes, categoriesRes] = await Promise.all([
        fetch("/api/order-options", { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" }),
      ]);

      const optionsJson = await optionsRes.json();
      const categoriesJson = await categoriesRes.json();

      if (!optionsRes.ok) {
        throw new Error(optionsJson?.error || "تعذر جلب خيارات الطلب");
      }

      if (!categoriesRes.ok) {
        throw new Error(categoriesJson?.error || "تعذر جلب التصنيفات");
      }

      setOptions(Array.isArray(optionsJson?.data) ? optionsJson.data : []);
      setCategories(
        Array.isArray(categoriesJson?.data) ? categoriesJson.data : [],
      );
    } catch (e: any) {
      setError(e?.message || "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function openCreate(type: OrderOptionType) {
    setEditing(null);
    setModalType(type);
  }

  function openEdit(option: OrderOptionRecord) {
    setEditing(option);
    setModalType(option.type);
  }

  function closeModal() {
    if (saving) return;
    setEditing(null);
    setModalType(null);
  }

  async function saveOption(payload: OrderOptionSubmitPayload) {
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const isEdit = Boolean(editing?.id);
      const url = isEdit
        ? `/api/order-options/${editing?.id}`
        : "/api/order-options";

      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "تعذر حفظ خيار الطلب");
      }

      if (isEdit) {
        setOptions((prev) =>
          prev.map((item) => (item.id === json.data.id ? json.data : item)),
        );
        setNotice("تم تعديل خيار الطلب بنجاح");
      } else {
        setOptions((prev) => [...prev, json.data]);
        setNotice("تم إضافة خيار الطلب بنجاح");
      }

      closeModal();
    } catch (e: any) {
      setError(e?.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(option: OrderOptionRecord) {
    const nextStatus = option.status === "active" ? "inactive" : "active";

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const res = await fetch(`/api/order-options/${option.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "تعذر تحديث الحالة");
      }

      setOptions((prev) =>
        prev.map((item) => (item.id === json.data.id ? json.data : item)),
      );

      setNotice(nextStatus === "active" ? "تم تفعيل الحقل" : "تم تعطيل الحقل");
    } catch (e: any) {
      setError(e?.message || "حدث خطأ أثناء تحديث الحالة");
    } finally {
      setSaving(false);
    }
  }

  async function deleteOption(option: OrderOptionRecord) {
    const ok = window.confirm(`هل تريد حذف "${option.name}"؟`);
    if (!ok) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const res = await fetch(`/api/order-options/${option.id}`, {
        method: "DELETE",
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "تعذر حذف خيار الطلب");
      }

      setOptions((prev) => prev.filter((item) => item.id !== option.id));
      setNotice("تم حذف خيار الطلب");
    } catch (e: any) {
      setError(e?.message || "حدث خطأ أثناء الحذف");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="adm-page__inner adm-order-options" dir="rtl">
        <section className="adm-order-options__topbar">
          <div className="adm-order-options__crumbs">
            <span>الرئيسية</span>
            <span>/</span>
            <span>إعدادات المتجر</span>
            <span>/</span>
            <strong>خيارات الطلب</strong>
          </div>

          <OrderOptionCreateMenu onSelect={openCreate} />
        </section>

        {notice ? (
          <div className="adm-alert adm-alert--info">{notice}</div>
        ) : null}

        {error ? <div className="adm-alert adm-alert--danger">{error}</div> : null}

        <section className="adm-card adm-card--lg adm-order-options__card">
          <div className="adm-card__head adm-card__head--border">
            <div className="adm-card__titleWrap">
              <h1 className="adm-card__title">خيارات الطلبات</h1>
              <p className="adm-card__desc">
                أضف حقول تظهر للعميل في سلة المشتريات أو قبل إتمام الطلب.
              </p>
            </div>

            {hasOptions ? <OrderOptionCreateMenu onSelect={openCreate} /> : null}
          </div>

          <div className="adm-card__body">
            {loading ? (
              <div className="adm-loading-box">جاري تحميل خيارات الطلب...</div>
            ) : hasOptions ? (
              <div className="adm-order-options__list">
                <div className="adm-order-options__stats">
                  <div className="adm-order-options__stat">
                    <span>إجمالي الحقول</span>
                    <strong>{stats.total}</strong>
                  </div>
                  <div className="adm-order-options__stat">
                    <span>الحقول المفعلة</span>
                    <strong>{stats.active}</strong>
                  </div>
                  <div className="adm-order-options__stat">
                    <span>الحقول المطلوبة</span>
                    <strong>{stats.required}</strong>
                  </div>
                </div>

                {options.map((option) => (
                  <article key={option.id} className="adm-order-options__row">
                    <div className="adm-order-options__rowMain">
                      <span className="adm-order-options__drag">⋮⋮</span>

                      <div className="adm-order-options__rowText">
                        <div className="adm-order-options__rowTitleLine">
                          <h2>{option.name}</h2>
                          <span className="adm-order-options__typeBadge">
                            {TYPE_LABELS[option.type]}
                          </span>
                          {option.is_required ? (
                            <span className="adm-order-options__requiredBadge">
                              مطلوب
                            </span>
                          ) : null}
                          {option.status !== "active" ? (
                            <span className="adm-order-options__inactiveBadge">
                              معطل
                            </span>
                          ) : null}
                        </div>

                        {option.description ? (
                          <p>{option.description}</p>
                        ) : (
                          <p className="adm-order-options__muted">
                            لا يوجد وصف توضيحي.
                          </p>
                        )}

                        <div className="adm-order-options__meta">
                          <span>{getOptionSummary(option)}</span>
                          {option.type === "choices" ? (
                            <span>{option.choices?.length ?? 0} خيارات</span>
                          ) : null}
                          {option.type === "text" ? (
                            <span>
                              حجم الحقل:{" "}
                              {option.text_size === "large" ? "كبير" : "صغير"}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="adm-order-options__actions">
                      <button
                        type="button"
                        className="adm-btn adm-btn--secondary adm-btn--sm"
                        onClick={() => openEdit(option)}
                        disabled={saving}
                      >
                        تعديل
                      </button>

                      <button
                        type="button"
                        className="adm-btn adm-btn--soft adm-btn--sm"
                        onClick={() => updateStatus(option)}
                        disabled={saving}
                      >
                        {option.status === "active" ? "تعطيل" : "تفعيل"}
                      </button>

                      <button
                        type="button"
                        className="adm-btn adm-btn--danger adm-btn--sm"
                        onClick={() => deleteOption(option)}
                        disabled={saving}
                      >
                        حذف
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="adm-order-options__empty">
                <div className="adm-order-options__emptyIcon">＋</div>
                <h2>أضف أول حقل وخصصه</h2>
                <p>
                  قدم لعملائك خيارات تظهر في صفحة سلة المشتريات مثل تغليف الطلب
                  كهدية أو حجز موعد خدمة تركيب.
                </p>
                <OrderOptionCreateMenu onSelect={openCreate} align="center" />
              </div>
            )}
          </div>
        </section>
      </div>

      <OrderOptionModal
        open={Boolean(modalType)}
        type={modalType}
        option={editing}
        categories={categories}
        saving={saving}
        onClose={closeModal}
        onSubmit={saveOption}
      />
    </>
  );
}