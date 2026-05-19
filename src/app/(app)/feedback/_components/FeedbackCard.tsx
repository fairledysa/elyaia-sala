// FILE: apps/merchant/src/app/(app)/feedback/_components/FeedbackCard.tsx

"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { FeedbackItem, FeedbackMedia } from "./types";

function typeBadgeLabel(item: FeedbackItem) {
  if (item.type === "product_review") return "تقييم المنتج";
  if (item.type === "store_review") return "تقييم المتجر";
  if (item.type === "shipping_review") return "تقييم الشحن";
  if (item.type === "support_contact") return "طلب تواصل";
  if (item.type === "product_question") return "سؤال";
  if (item.type === "page_question") return "سؤال";
  return "عنصر";
}

function typeIcon(item: FeedbackItem) {
  if (item.type === "product_review") return "📦";
  if (item.type === "store_review") return "⭐";
  if (item.type === "shipping_review") return "🚚";
  if (item.type === "support_contact") return "☎";
  return "؟";
}

function canHaveRating(item: FeedbackItem) {
  return (
    item.type === "product_review" ||
    item.type === "store_review" ||
    item.type === "shipping_review"
  );
}

function getCustomerDisplayName(item: FeedbackItem) {
  const name = String(item.customer_name ?? "").trim();
  const label = String(item.customer_label ?? "").trim();

  if (label === "زائر" && name && name !== "زائر") return name;
  if (!name && label === "زائر") return "زائر";
  if (name) return name;
  if (label) return label;

  return "عميل";
}

function getAvatarFallback(item: FeedbackItem) {
  const label = String(item.customer_label ?? "").trim();
  const name = getCustomerDisplayName(item);

  if (label === "زائر" && (!name || name === "زائر")) return "ز";
  return String(name || "ع").charAt(0);
}

function mediaThumb(media: FeedbackMedia) {
  return String(media.thumbnail_url || media.file_url || "").trim();
}

function mediaFull(media: FeedbackMedia) {
  return String(media.file_url || media.thumbnail_url || "").trim();
}

function isSupportContact(item: FeedbackItem) {
  return item.type === "support_contact";
}

export default function FeedbackCard({
  item,
  onReload,
}: {
  item: FeedbackItem;
  onReload: () => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState(item.reply || "");
  const [busy, setBusy] = useState(false);
  const [activeMedia, setActiveMedia] = useState<FeedbackMedia | null>(null);

  const published = item.is_published;
  const supportContact = isSupportContact(item);

  const headerImage = useMemo(() => {
    return item.subject_image || item.product_image || null;
  }, [item.subject_image, item.product_image]);

  const customerDisplayName = useMemo(() => {
    return getCustomerDisplayName(item);
  }, [item]);

  const mediaItems = useMemo(() => {
    return Array.isArray(item.media)
      ? item.media.filter((media) => Boolean(mediaThumb(media)))
      : [];
  }, [item.media]);

  async function publish() {
    if (supportContact) return;

    try {
      setBusy(true);
      await fetch(`/api/feedback/${item.id}/publish`, { method: "POST" });
      onReload();
    } finally {
      setBusy(false);
    }
  }

  async function unpublish() {
    if (supportContact) return;

    try {
      setBusy(true);
      await fetch(`/api/feedback/${item.id}/unpublish`, { method: "POST" });
      onReload();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const ok = window.confirm("هل تريد حذف هذا العنصر؟");
    if (!ok) return;

    try {
      setBusy(true);
      await fetch(`/api/feedback/${item.id}/delete`, { method: "POST" });
      onReload();
    } finally {
      setBusy(false);
    }
  }

  async function sendReply() {
    const replyBody = reply.trim();
    if (!replyBody) return;

    try {
      setBusy(true);

      const res = await fetch(`/api/feedback/${item.id}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reply: replyBody }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "REPLY_FAILED");
      }

      setReplyOpen(false);
      onReload();
    } catch (error) {
      console.error(error);
      window.alert("تعذر حفظ الرد");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <article
        className={[
          "adm-feedback-item",
          supportContact ? "adm-feedback-item--support" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <header className="adm-feedback-item__head">
          <div className="adm-feedback-item__meta">
            <span
              className={[
                "adm-feedback-badge",
                supportContact ? "adm-feedback-badge--support" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {typeBadgeLabel(item)}
            </span>

            <span className="adm-feedback-date">{item.created_at_human}</span>
          </div>

          <div className="adm-feedback-subject">
            <div className="adm-feedback-subject__text">
              <h3 className="adm-feedback-subject__title">
                {item.subject_title}
              </h3>

              {item.subject_subtitle ? (
                <div className="adm-feedback-subject__product">
                  {item.subject_subtitle}
                </div>
              ) : null}

              {item.product_name &&
              (item.type === "product_review" ||
                item.type === "product_question") ? (
                <div className="adm-feedback-subject__product">
                  {item.product_name}
                </div>
              ) : null}

              {item.order_no ? (
                <div className="adm-feedback-subject__order">
                  طلب #{item.order_no}
                </div>
              ) : null}
            </div>

            <div className="adm-feedback-subject__image">
              {headerImage ? (
                <img
                  src={headerImage}
                  alt={item.subject_title}
                  className="adm-feedback-subject__img"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <span className="adm-feedback-subject__icon">
                  {typeIcon(item)}
                </span>
              )}
            </div>
          </div>
        </header>

        <div className="adm-feedback-item__body">
          <div className="adm-feedback-content">
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="adm-feedback-delete"
              title="حذف"
            >
              🗑
            </button>

            <div className="adm-feedback-message">
              <div className="adm-feedback-customer">
                <div className="adm-feedback-avatar">
                  {item.customer_avatar ? (
                    <img
                      src={item.customer_avatar}
                      alt={customerDisplayName}
                      className="adm-feedback-avatar__img"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="adm-feedback-avatar__fallback">
                      {getAvatarFallback(item)}
                    </span>
                  )}
                </div>

                <div className="adm-feedback-customer__info">
                  <div className="adm-feedback-customer__name">
                    {customerDisplayName}
                  </div>

                  {canHaveRating(item) && item.rating ? (
                    <div className="adm-feedback-rating">
                      {"★".repeat(Number(item.rating || 0))}
                    </div>
                  ) : null}
                </div>
              </div>

              {supportContact ? (
                <div className="adm-feedback-support-note">
                  <strong>طلب تواصل من خدمة العملاء</strong>
                  <span>
                    هذه ملاحظة داخلية وصلت من العميل أثناء تقييم الطلب، وليست
                    تقييمًا منشورًا في المتجر.
                  </span>
                </div>
              ) : null}

              {item.content ? (
                <div className="adm-feedback-text">{item.content}</div>
              ) : null}

              {mediaItems.length ? (
                <div className="adm-feedback-media">
                  {mediaItems.map((media) => (
                    <button
                      key={media.id}
                      type="button"
                      className="adm-feedback-media__item"
                      onClick={() => setActiveMedia(media)}
                      aria-label="عرض الصورة المرفقة"
                    >
                      <img
                        src={mediaThumb(media)}
                        alt={media.alt_text || "صورة مرفقة"}
                        className="adm-feedback-media__img"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </button>
                  ))}
                </div>
              ) : null}

              {item.reply ? (
                <div className="adm-feedback-reply">
                  <div className="adm-feedback-reply__label">رد المتجر</div>
                  <div className="adm-feedback-reply__text">{item.reply}</div>
                </div>
              ) : null}
            </div>
          </div>

          <footer className="adm-feedback-actions">
            <button
              type="button"
              onClick={() => setReplyOpen((v) => !v)}
              disabled={busy}
              className="adm-feedback-action-btn"
            >
              {item.reply ? "تعديل الرد" : "الرد"}
            </button>

            {!supportContact ? (
              published ? (
                <button
                  type="button"
                  onClick={unpublish}
                  disabled={busy}
                  className="adm-feedback-action-btn adm-feedback-action-btn--danger"
                >
                  إلغاء النشر
                </button>
              ) : (
                <button
                  type="button"
                  onClick={publish}
                  disabled={busy}
                  className="adm-feedback-action-btn adm-feedback-action-btn--primary"
                >
                  نشر
                </button>
              )
            ) : null}
          </footer>

          {replyOpen ? (
            <div className="adm-feedback-reply-form">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={
                  supportContact
                    ? "اكتب رد أو ملاحظة متابعة للعميل"
                    : "الرد على العميل"
                }
                rows={3}
                className="adm-feedback-reply-form__textarea"
              />

              <div className="adm-feedback-reply-form__actions">
                <button
                  type="button"
                  onClick={sendReply}
                  disabled={busy || !reply.trim()}
                  className="adm-feedback-action-btn adm-feedback-action-btn--primary"
                >
                  {item.reply ? "حفظ" : "إرسال"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReply(item.reply || "");
                    setReplyOpen(false);
                  }}
                  disabled={busy}
                  className="adm-feedback-action-btn"
                >
                  إلغاء
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </article>

      {activeMedia
        ? createPortal(
            <div
              className="adm-feedback-lightbox"
              role="dialog"
              aria-modal="true"
              aria-label="عرض الصورة المرفقة"
              onClick={() => setActiveMedia(null)}
            >
              <div
                className="adm-feedback-lightbox__panel"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="adm-feedback-lightbox__close"
                  onClick={() => setActiveMedia(null)}
                  aria-label="إغلاق"
                >
                  ×
                </button>

                <img
                  src={mediaFull(activeMedia)}
                  alt={activeMedia.alt_text || "صورة مرفقة"}
                  className="adm-feedback-lightbox__img"
                />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}