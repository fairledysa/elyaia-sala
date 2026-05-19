// FILE: apps/merchant/src/app/(app)/settings/_components/RatingSettingsModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type ChannelKey = "email" | "sms";

export type RatingSettingsValues = {
  publishTestimonials: boolean;
  publishRatings: boolean;
  allowAttachImages: boolean;
  allowLikes: boolean;
  showRatingSummary: boolean;
  showRecommendation: boolean;
  allowContactSupport: boolean;
  allowUpdate: boolean;
  allowUpdatePeriod: number;

  testimonialsEnabled: boolean;
  shippingEnabled: boolean;
  productsEnabled: boolean;
  allowHiddenNames: boolean;
  displayTestimonials: boolean;
  displayCustomerReviews: boolean;
  displayProductReviewsOnApp: boolean;

  orderStatuses: string[];
  thanksMessage: string;

  ratingEnabled: boolean;
  ratingHoursPeriod: number;
  channels: ChannelKey[];
  ratingMessageTitle: string;
  ratingMessage: string;
};

export const DEFAULT_RATING_SETTINGS: RatingSettingsValues = {
  publishTestimonials: true,
  publishRatings: true,
  allowAttachImages: false,
  allowLikes: false,
  showRatingSummary: true,
  showRecommendation: true,
  allowContactSupport: false,
  allowUpdate: false,
  allowUpdatePeriod: 7,

  testimonialsEnabled: true,
  shippingEnabled: true,
  productsEnabled: true,
  allowHiddenNames: false,
  displayTestimonials: true,
  displayCustomerReviews: true,
  displayProductReviewsOnApp: false,

  orderStatuses: ["completed", "delivered"],
  thanksMessage: "شكراً لوقتك\nونتمنى لك تسوق ممتع",

  ratingEnabled: true,
  ratingHoursPeriod: 168,
  channels: ["email"],
  ratingMessageTitle: "نتمنى أن نعرف رأيك في الطلب",
  ratingMessage: "ياليت نعرف رأيك في الطلب من خلال الرابط: {url}",
};

const ORDER_STATUS_OPTIONS = [
  { value: "pending", label: "قيد التنفيذ" },
  { value: "completed", label: "تم التنفيذ" },
  { value: "processing", label: "جاري التجهيز" },
  { value: "shipping", label: "جاري التوصيل" },
  { value: "delivered", label: "تم التوصيل" },
  { value: "shipped", label: "تم الشحن" },
  { value: "cancelled", label: "ملغي" },
  { value: "refunded", label: "مسترجع" },
  { value: "failed", label: "فشل الدفع" },
];

const PARAMS = [
  { key: "{url}", label: "رابط التقييم", preview: "https://example.com/rating" },
  { key: "{name}", label: "اسم العميل", preview: "اسم العميل" },
  { key: "{order}", label: "رقم الطلب", preview: "1001" },
];

function normalizeSettings(
  settings?: Partial<RatingSettingsValues> | null,
): RatingSettingsValues {
  return {
    ...DEFAULT_RATING_SETTINGS,
    ...(settings ?? {}),
    orderStatuses: Array.isArray(settings?.orderStatuses)
      ? [...settings.orderStatuses]
      : [...DEFAULT_RATING_SETTINGS.orderStatuses],
    channels: Array.isArray(settings?.channels)
      ? [...settings.channels]
      : [...DEFAULT_RATING_SETTINGS.channels],
  };
}

function cloneSettings(settings: RatingSettingsValues): RatingSettingsValues {
  return normalizeSettings(settings);
}

function toNumber(value: string, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function toggleListValue<T extends string>(list: T[], value: T) {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function getApiError(payload: any, fallback: string) {
  return String(payload?.error ?? payload?.message ?? fallback);
}

async function fetchRatingSettings(signal?: AbortSignal) {
  const res = await fetch("/api/settings/rating", {
    method: "GET",
    cache: "no-store",
    signal,
  });

  const payload = await res.json().catch(() => null);

  if (!res.ok || !payload?.ok) {
    throw new Error(getApiError(payload, "تعذر تحميل إعدادات التقييم."));
  }

  return normalizeSettings(payload.settings);
}

async function saveRatingSettings(settings: RatingSettingsValues) {
  const res = await fetch("/api/settings/rating", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ settings }),
  });

  const payload = await res.json().catch(() => null);

  if (!res.ok || !payload?.ok) {
    throw new Error(getApiError(payload, "تعذر حفظ إعدادات التقييم."));
  }

  return normalizeSettings(payload.settings);
}

function SwitchRow({
  title,
  desc,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="adm-rating-modal__switchRow">
      <div className="adm-rating-modal__switchText">
        <h4>{title}</h4>
        <p>{desc}</p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={`adm-rating-switch ${checked ? "is-on" : ""}`}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </div>
  );
}

function SectionTitle({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="adm-rating-modal__sectionTitle">
      <h3>{title}</h3>
      {desc ? <p>{desc}</p> : null}
    </div>
  );
}

export default function RatingSettingsModal({
  open,
  settings,
  onClose,
  onSave,
}: {
  open: boolean;
  settings: RatingSettingsValues;
  onClose: () => void;
  onSave: (settings: RatingSettingsValues) => void;
}) {
  const [draft, setDraft] = useState<RatingSettingsValues>(() =>
    cloneSettings(settings),
  );

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const busy = loading || saving;

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();

    setDraft(cloneSettings(settings));
    setErrorMessage("");
    setLoading(true);

    fetchRatingSettings(controller.signal)
      .then((loaded) => {
        setDraft(loaded);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setErrorMessage(String(error?.message ?? "تعذر تحميل إعدادات التقييم."));
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setLoading(false);
      });

    return () => controller.abort();
  }, [open, settings]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, busy, onClose]);

  const previewMessage = useMemo(() => {
    return PARAMS.reduce((text, param) => {
      return text.split(param.key).join(param.preview);
    }, draft.ratingMessage);
  }, [draft.ratingMessage]);

  async function handleSave() {
    if (saving) return;

    setSaving(true);
    setErrorMessage("");

    try {
      const saved = await saveRatingSettings(cloneSettings(draft));
      setDraft(saved);
      onSave(saved);
    } catch (error: any) {
      setErrorMessage(String(error?.message ?? "تعذر حفظ إعدادات التقييم."));
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="adm-rating-modalOverlay" dir="rtl">
      <button
        type="button"
        className="adm-rating-modalOverlay__backdrop"
        onClick={() => {
          if (!busy) onClose();
        }}
        aria-label="إغلاق إعدادات التقييم"
      />

      <div
        className="adm-rating-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adm-rating-modal-title"
      >
        <div className="adm-rating-modal__header">
          <div>
            <p className="adm-rating-modal__eyebrow">إعدادات المتجر</p>
            <h2 id="adm-rating-modal-title">إعدادات التقييم</h2>
            <p>
              تحكم في نشر التقييمات، طلبات التقييم، ظهور الآراء، ورسائل طلب
              التقييم.
            </p>
          </div>

          <button
            type="button"
            className="adm-rating-modal__close"
            onClick={onClose}
            disabled={busy}
            aria-label="إغلاق"
          >
            ×
          </button>
        </div>

        <div className="adm-rating-modal__body">
          {loading ? (
            <section className="adm-rating-modal__section">
              <div className="adm-rating-modal__field">
                <p className="adm-rating-modal__hint">
                  جاري تحميل إعدادات التقييم...
                </p>
              </div>
            </section>
          ) : null}

          {errorMessage ? (
            <section className="adm-rating-modal__section">
              <div className="adm-rating-modal__field">
                <p className="adm-rating-modal__hint">{errorMessage}</p>
              </div>
            </section>
          ) : null}

          <section className="adm-rating-modal__section">
            <SectionTitle
              title="النشر والعرض"
              desc="حدد متى يتم نشر التقييمات وما الذي يظهر داخل المتجر."
            />

            <SwitchRow
              title="نشر تقييم المتجر تلقائياً"
              desc="نشر تقييم المتجر تلقائياً دون الحاجة للمراجعة."
              checked={draft.publishTestimonials}
              disabled={busy}
              onChange={(checked) =>
                setDraft((prev) => ({
                  ...prev,
                  publishTestimonials: checked,
                }))
              }
            />

            <SwitchRow
              title="نشر تقييم المنتجات تلقائياً"
              desc="نشر تقييمات المنتجات مباشرة دون الحاجة للمراجعة."
              checked={draft.publishRatings}
              disabled={busy}
              onChange={(checked) =>
                setDraft((prev) => ({
                  ...prev,
                  publishRatings: checked,
                }))
              }
            />

            <SwitchRow
              title="إتاحة إرفاق صور في التقييم"
              desc="السماح للعميل بإرفاق صور عند تقييم المنتج."
              checked={draft.allowAttachImages}
              disabled={busy}
              onChange={(checked) =>
                setDraft((prev) => ({
                  ...prev,
                  allowAttachImages: checked,
                }))
              }
            />

            <SwitchRow
              title="إتاحة زر الإعجاب بالتعليقات"
              desc="السماح للعملاء بتقييم التعليق كـ مفيد."
              checked={draft.allowLikes}
              disabled={busy}
              onChange={(checked) =>
                setDraft((prev) => ({
                  ...prev,
                  allowLikes: checked,
                }))
              }
            />

            <SwitchRow
              title="إظهار التقييم العام للمنتج"
              desc="عرض متوسط التقييم من 5 نجوم داخل صفحة المنتج."
              checked={draft.showRatingSummary}
              disabled={busy}
              onChange={(checked) =>
                setDraft((prev) => ({
                  ...prev,
                  showRatingSummary: checked,
                }))
              }
            />

            <SwitchRow
              title="توصيات العملاء"
              desc="تمييز المنتجات الموصى بها بناءً على تقييمات العملاء."
              checked={draft.showRecommendation}
              disabled={busy}
              onChange={(checked) =>
                setDraft((prev) => ({
                  ...prev,
                  showRecommendation: checked,
                }))
              }
            />
          </section>

          <section className="adm-rating-modal__section">
            <SectionTitle
              title="صلاحيات العميل"
              desc="خيارات مرتبطة بطريقة تفاعل العميل مع التقييم بعد إضافته."
            />

            <SwitchRow
              title="التواصل مع خدمة العملاء عند التقييم"
              desc="إتاحة خيار التواصل وتلقي ملاحظات العميل عبر قنوات الدعم."
              checked={draft.allowContactSupport}
              disabled={busy}
              onChange={(checked) =>
                setDraft((prev) => ({
                  ...prev,
                  allowContactSupport: checked,
                }))
              }
            />

            <SwitchRow
              title="تعديل وحذف التقييم"
              desc="السماح للعميل بتعديل أو حذف التقييم بعد إضافته."
              checked={draft.allowUpdate}
              disabled={busy}
              onChange={(checked) =>
                setDraft((prev) => ({
                  ...prev,
                  allowUpdate: checked,
                }))
              }
            />

            {draft.allowUpdate ? (
              <div className="adm-rating-modal__field">
                <label>عدد الأيام المسموح بها للتعديل والحذف</label>
                <div className="adm-rating-modal__inputGroup">
                  <input
                    type="number"
                    min={0}
                    value={draft.allowUpdatePeriod}
                    disabled={busy}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        allowUpdatePeriod: toNumber(event.target.value, 0),
                      }))
                    }
                  />
                  <span>يوم</span>
                </div>
              </div>
            ) : null}

            <SwitchRow
              title="إخفاء اسم العميل"
              desc="منح العميل خيار إظهار اسمه بشكل مشفر داخل التقييمات والأسئلة."
              checked={draft.allowHiddenNames}
              disabled={busy}
              onChange={(checked) =>
                setDraft((prev) => ({
                  ...prev,
                  allowHiddenNames: checked,
                }))
              }
            />
          </section>

          <section className="adm-rating-modal__section">
            <SectionTitle
              title="طلبات التقييم"
              desc="حدد أنواع التقييمات المطلوبة من العميل وحالات الطلب التي ترسل بعدها الرسالة."
            />

            <SwitchRow
              title="طلب تقييم المتجر"
              desc="طلب تقييم عام للمتجر من العميل."
              checked={draft.testimonialsEnabled}
              disabled={busy}
              onChange={(checked) =>
                setDraft((prev) => ({
                  ...prev,
                  testimonialsEnabled: checked,
                }))
              }
            />

            <SwitchRow
              title="طلب تقييم شركة الشحن"
              desc="طلب تقييم تجربة الشحن والتوصيل من العميل."
              checked={draft.shippingEnabled}
              disabled={busy}
              onChange={(checked) =>
                setDraft((prev) => ({
                  ...prev,
                  shippingEnabled: checked,
                }))
              }
            />

            <SwitchRow
              title="طلب تقييم المنتجات"
              desc="طلب تقييم المنتجات الموجودة في الطلب."
              checked={draft.productsEnabled}
              disabled={busy}
              onChange={(checked) =>
                setDraft((prev) => ({
                  ...prev,
                  productsEnabled: checked,
                }))
              }
            />

            <SwitchRow
              title="عرض آراء العملاء في صفحة التصنيفات"
              desc="إظهار آراء العملاء داخل صفحات التصنيفات."
              checked={draft.displayTestimonials}
              disabled={busy}
              onChange={(checked) =>
                setDraft((prev) => ({
                  ...prev,
                  displayTestimonials: checked,
                }))
              }
            />

            <SwitchRow
              title="عرض آراء العملاء في صفحة المنتج"
              desc="إظهار تقييمات وآراء العملاء داخل صفحة المنتج."
              checked={draft.displayCustomerReviews}
              disabled={busy}
              onChange={(checked) =>
                setDraft((prev) => ({
                  ...prev,
                  displayCustomerReviews: checked,
                }))
              }
            />

            <SwitchRow
              title="إظهار التقييمات على التطبيق"
              desc="إظهار التقييمات داخل تطبيق المتجر."
              checked={draft.displayProductReviewsOnApp}
              disabled={busy}
              onChange={(checked) =>
                setDraft((prev) => ({
                  ...prev,
                  displayProductReviewsOnApp: checked,
                }))
              }
            />

            <div className="adm-rating-modal__field">
              <label>حالات الطلب</label>
              <p className="adm-rating-modal__hint">
                اختر الحالات التي يتم بعدها إرسال رسالة طلب التقييم.
              </p>

              <div className="adm-rating-statuses">
                {ORDER_STATUS_OPTIONS.map((status) => {
                  const checked = draft.orderStatuses.includes(status.value);

                  return (
                    <button
                      key={status.value}
                      type="button"
                      disabled={busy}
                      className={`adm-rating-status ${
                        checked ? "is-selected" : ""
                      }`}
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          orderStatuses: toggleListValue(
                            prev.orderStatuses,
                            status.value,
                          ),
                        }))
                      }
                    >
                      {status.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="adm-rating-modal__field">
              <label>رسالة الشكر</label>
              <p className="adm-rating-modal__hint">
                الرسالة التي تظهر للعميل بعد الانتهاء من التقييم.
              </p>
              <textarea
                rows={3}
                maxLength={120}
                value={draft.thanksMessage}
                disabled={busy}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    thanksMessage: event.target.value,
                  }))
                }
                placeholder="شكراً لوقتك ونتمنى لك تسوق ممتع"
              />
            </div>
          </section>

          <section className="adm-rating-modal__section">
            <SectionTitle
              title="رسائل طلب التقييم"
              desc="إعداد رسالة طلب التقييم وقنوات الإرسال ووقت الإرسال."
            />

            <SwitchRow
              title="إرسال رسائل طلب التقييم"
              desc="تفعيل إرسال رسائل تنبيه للعملاء لتقييم الطلب."
              checked={draft.ratingEnabled}
              disabled={busy}
              onChange={(checked) =>
                setDraft((prev) => ({
                  ...prev,
                  ratingEnabled: checked,
                }))
              }
            />

            <div className="adm-rating-modal__grid2">
              <div className="adm-rating-modal__field">
                <label>وقت الإرسال بعد اكتمال الطلب</label>
                <div className="adm-rating-modal__inputGroup">
                  <input
                    type="number"
                    min={0}
                    value={draft.ratingHoursPeriod}
                    disabled={busy}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        ratingHoursPeriod: toNumber(event.target.value, 0),
                      }))
                    }
                  />
                  <span>ساعة</span>
                </div>
              </div>

              <div className="adm-rating-modal__field">
                <label>قناة الإرسال</label>
                <div className="adm-rating-channels">
                  <button
                    type="button"
                    disabled={busy}
                    className={`adm-rating-channel ${
                      draft.channels.includes("email") ? "is-selected" : ""
                    }`}
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        channels: toggleListValue(prev.channels, "email"),
                      }))
                    }
                  >
                    البريد الإلكتروني
                  </button>

                  <button
                    type="button"
                    className="adm-rating-channel is-disabled"
                    disabled
                    title="تحتاج إلى ربط مزود رسائل SMS أولاً"
                  >
                    رسائل SMS
                  </button>
                </div>
              </div>
            </div>

            <div className="adm-rating-modal__field">
              <label>عنوان الرسالة</label>
              <input
                value={draft.ratingMessageTitle}
                disabled={busy}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    ratingMessageTitle: event.target.value,
                  }))
                }
                placeholder="عنوان الرسالة البريدية"
              />
            </div>

            <div className="adm-rating-modal__field">
              <label>نص الرسالة</label>
              <textarea
                rows={4}
                value={draft.ratingMessage}
                disabled={busy}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    ratingMessage: event.target.value,
                  }))
                }
                placeholder="ياليت نعرف رأيك في الطلب من خلال الرابط: {url}"
              />

              <div className="adm-rating-params">
                {PARAMS.map((param) => (
                  <button
                    key={param.key}
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        ratingMessage: `${prev.ratingMessage}${
                          prev.ratingMessage.trim() ? " " : ""
                        }${param.key}`,
                      }))
                    }
                  >
                    {param.label}
                    <span>{param.key}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="adm-rating-preview">
              <div className="adm-rating-preview__head">
                <span>معاينة الرسالة</span>
              </div>
              <div className="adm-rating-preview__box">
                <strong>{draft.ratingMessageTitle || "عنوان الرسالة"}</strong>
                <p>{previewMessage || "نص الرسالة سيظهر هنا..."}</p>
              </div>
            </div>
          </section>
        </div>

        <div className="adm-rating-modal__footer">
          <button
            type="button"
            className="adm-btn adm-btn--primary"
            disabled={busy}
            onClick={handleSave}
          >
            {saving ? "جارٍ الحفظ..." : "حفظ"}
          </button>

          <button
            type="button"
            className="adm-btn adm-btn--ghost"
            disabled={busy}
            onClick={onClose}
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}