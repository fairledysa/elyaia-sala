// FILE: apps/merchant/src/app/(app)/themes/_components/ThemeCard.tsx

"use client";

import { useState } from "react";
import { Eye, Sparkles } from "lucide-react";

import type { MarketplaceThemeItem, ThemeItem } from "./types";
import ThemeCardMenu from "./ThemeCardMenu";

type Props =
  | {
      mode: "owned";
      item: ThemeItem;
      storeId?: string;
      versionsCount?: number;
      onChanged?: () => void;
    }
  | {
      mode: "marketplace";
      item: MarketplaceThemeItem;
      storeId: string;
      versionsCount?: number;
      onChanged?: () => void;
    };

function safeImg(src?: string | null) {
  if (!src) return "https://placehold.co/1200x700?text=Theme";
  return src;
}

function pickFirst<T = any>(...vals: Array<T | null | undefined>) {
  for (const value of vals) {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return value;
    }
  }

  return undefined;
}

function getOwnedMeta(item: ThemeItem) {
  const anyItem = item as any;

  const themeName =
    anyItem.theme?.name ||
    anyItem.theme_name ||
    anyItem.themeName ||
    anyItem.name ||
    "ثيم";

  const thumbUrl = pickFirst(
    anyItem.theme?.thumb_url,
    anyItem.theme?.thumbUrl,
    anyItem.thumbUrl,
    anyItem.thumb_url,
    anyItem.thumb,
    null,
  ) as string | null;

  const customizeHref =
    anyItem.customizeHref ||
    anyItem.customize_href ||
    `/themes/${item.id}/customize`;

  const previewHref =
    anyItem.previewHref ||
    anyItem.preview_href ||
    anyItem.previewUrl ||
    "";

  const title = anyItem.title || anyItem.version_title || themeName;

  const lastUpdatedAt = pickFirst(
    anyItem.lastUpdatedAt,
    anyItem.last_updated_at,
    anyItem.updated_at,
    null,
  ) as string | null;

  const lastUpdatedTime = pickFirst(
    anyItem.lastUpdatedTime,
    anyItem.last_updated_time,
    anyItem.updated_time,
    null,
  ) as string | null;

  const isDefault = Boolean(anyItem.isDefault || anyItem.is_default);

  return {
    themeName,
    thumbUrl,
    customizeHref,
    previewHref,
    title,
    lastUpdatedAt,
    lastUpdatedTime,
    isDefault,
  };
}

export default function ThemeCard(props: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (props.mode === "marketplace") {
    const { item, storeId, onChanged } = props;

    async function tryTheme() {
      setErr("");
      setBusy(true);

      try {
        const res = await fetch("/api/themes/try", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-store-id": storeId,
          },
          body: JSON.stringify({
            themeCatalogId: item.id,
          }),
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(json?.error || "فشل إضافة الثيم");
        }

        onChanged?.();
      } catch (e: any) {
        setErr(e?.message || "فشل إضافة الثيم");
      } finally {
        setBusy(false);
      }
    }

    return (
      <article className="adm-theme-card">
        <div className="adm-theme-card__media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={safeImg(item.thumb_url)} alt={item.name} />

          <div className="adm-theme-card__badge adm-theme-card__badge--right">
            {item.is_free ? "مجاني" : "مدفوع"}
          </div>

          {item.isInstalled ? (
            <div className="adm-theme-card__badge adm-theme-card__badge--left adm-theme-card__badge--primary">
              مضاف في ثيماتي
            </div>
          ) : null}
        </div>

        <div className="adm-theme-card__body">
          <div className="adm-theme-card__head">
            <div className="adm-theme-card__text">
              <h3>{item.name}</h3>
              <p>{item.description || item.vendor || "ثيم جاهز لتصميم المتجر."}</p>
            </div>

            <div className="adm-theme-card__icon">
              <Sparkles />
            </div>
          </div>

          <div className="adm-theme-card__footer">
            <div className="adm-theme-card__meta">
              النسخ في ثيماتي: {item.installedVersionsCount}/3
            </div>

            <div className="adm-theme-card__actions">
              {item.previewHref ? (
                <a href={item.previewHref} className="adm-theme-action adm-theme-action--ghost">
                  <Eye />
                  <span>معاينة</span>
                </a>
              ) : null}

              <button
                type="button"
                onClick={tryTheme}
                disabled={busy || item.reachedMax}
                className={[
                  "adm-theme-action",
                  item.reachedMax
                    ? "adm-theme-action--disabled"
                    : "adm-theme-action--primary",
                ].join(" ")}
              >
                <Sparkles />
                <span>
                  {busy
                    ? "جارٍ الإضافة..."
                    : item.reachedMax
                      ? "وصلت 3 نسخ"
                      : item.isInstalled
                        ? "إضافة نسخة تجربة"
                        : "تجربة الثيم"}
                </span>
              </button>
            </div>
          </div>

          {err ? <div className="adm-theme-card__error">{err}</div> : null}
        </div>
      </article>
    );
  }

  const { item, storeId, versionsCount = 0, onChanged } = props;
  const meta = getOwnedMeta(item);
  const isPublished = item.status === "published";

  return (
    <article className="adm-theme-card">
      <div className="adm-theme-card__media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={safeImg(meta.thumbUrl)} alt={meta.themeName} />

        <span className="adm-theme-card__badge adm-theme-card__badge--right">
          {meta.themeName}
        </span>

        {isPublished ? (
          <span className="adm-theme-card__badge adm-theme-card__badge--left adm-theme-card__badge--primary">
            منشور
          </span>
        ) : (
          <span className="adm-theme-card__badge adm-theme-card__badge--left">
            مسودة
          </span>
        )}
      </div>

      <div className="adm-theme-card__body">
        <div className="adm-theme-card__head">
          <div className="adm-theme-card__text">
            <div className="adm-theme-card__titleRow">
              <h3>{meta.title}</h3>

              {meta.isDefault ? (
                <span className="adm-theme-card__check">✓</span>
              ) : null}
            </div>

            <div className="adm-theme-card__statusLine">
              <span
                className={[
                  "adm-theme-card__status",
                  isPublished && "is-published",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <i />
                {isPublished ? "منشور" : "مسودة"}
              </span>

              <span className="adm-theme-card__meta">النسخ: {versionsCount}/3</span>
            </div>
          </div>

          <ThemeCardMenu
            item={item}
            storeId={storeId}
            versionsCount={versionsCount}
            onChanged={onChanged}
          />
        </div>

        <div className="adm-theme-card__footer">
          <div className="adm-theme-card__date">
            {meta.lastUpdatedAt ? (
              <>
                <div>آخر تعديل: {meta.lastUpdatedAt}</div>
                {meta.lastUpdatedTime ? <div>الوقت: {meta.lastUpdatedTime}</div> : null}
              </>
            ) : (
              <span>&nbsp;</span>
            )}
          </div>

          <div className="adm-theme-card__actions">
            <a href={meta.customizeHref} className="adm-theme-action adm-theme-action--primary">
              <span>تخصيص</span>
            </a>

            {meta.previewHref ? (
              <a href={meta.previewHref} className="adm-theme-action adm-theme-action--ghost">
                <Eye />
                <span>معاينة</span>
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}