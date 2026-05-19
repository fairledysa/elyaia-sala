// FILE: apps/merchant/src/app/(app)/settings/brands/_components/BrandCard.tsx

"use client";

import * as React from "react";
import { Settings, Trash2 } from "lucide-react";
import type { Brand } from "./types";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function BrandCard({
  brand,
  onEdit,
  onChanged,
}: {
  brand: Brand;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = React.useState(false);

  async function toggleActive() {
    setBusy(true);

    try {
      const res = await fetch(`/api/brands/${brand.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ is_active: !brand.is_active }),
      });

      const j = await res.json();

      if (!res.ok) throw new Error(j?.error || "FAILED");

      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!confirm("حذف الماركة نهائياً؟")) return;

    setBusy(true);

    try {
      const res = await fetch(`/api/brands/${brand.id}`, {
        method: "DELETE",
      });

      const j = await res.json();

      if (!res.ok) throw new Error(j?.error || "FAILED");

      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="adm-brand-card">
      <div className="adm-brand-card__banner">
        {brand.banner_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brand.banner_url} alt="" />
        ) : (
          <div className="adm-brand-card__bannerPlaceholder" />
        )}
      </div>

      <div className="adm-brand-card__body">
        <div className="adm-brand-card__top">
          <div className="adm-brand-card__logo">
            {brand.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logo_url} alt={brand.name} />
            ) : (
              <div className="adm-brand-card__logoEmpty">LOGO</div>
            )}
          </div>

          <div className="adm-brand-card__info">
            <div className="adm-brand-card__nameRow">
              <h3 className="adm-brand-card__name">{brand.name}</h3>

              <span
                className={cn(
                  "adm-brand-card__status",
                  brand.is_active ? "is-active" : "is-inactive",
                )}
              >
                {brand.is_active ? "مفعلة" : "موقفة"}
              </span>
            </div>

            <p className="adm-brand-card__desc">
              {brand.description || "لا يوجد وصف مختصر لهذه الماركة."}
            </p>
          </div>
        </div>

        <div className="adm-brand-card__actions">
          <div className="adm-brand-card__actionsRight">
            <button
              type="button"
              onClick={onEdit}
              disabled={busy}
              className="adm-brand-card__miniBtn"
            >
              <Settings />
              تعديل
            </button>

            <button
              type="button"
              onClick={del}
              disabled={busy}
              className="adm-brand-card__miniBtn is-danger"
            >
              <Trash2 />
              حذف
            </button>
          </div>

          <div className="adm-brand-card__actionsLeft">
            <button
              type="button"
              onClick={toggleActive}
              disabled={busy}
              className={cn(
                "adm-brand-card__switch",
                brand.is_active && "is-active",
              )}
              title={brand.is_active ? "مفعّل" : "متوقف"}
              aria-label={brand.is_active ? "إيقاف الماركة" : "تفعيل الماركة"}
            >
              <span />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}