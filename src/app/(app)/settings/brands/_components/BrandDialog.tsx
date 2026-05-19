// FILE: apps/merchant/src/app/(app)/settings/brands/_components/BrandDialog.tsx

"use client";

import * as React from "react";
import { Image as ImageIcon, Save, Trash2, UploadCloud, X } from "lucide-react";
import type { Brand } from "./types";
import { uploadBrandImage } from "./api";

function cn(...x: Array<string | false | null | undefined>) {
  return x.filter(Boolean).join(" ");
}

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initial?: Brand | null;
  onClose: () => void;
  onSubmit: (payload: Partial<Brand>) => Promise<void>;
  onDelete?: () => Promise<void>;
};

export default function BrandDialog({
  open,
  mode,
  initial,
  onClose,
  onSubmit,
  onDelete,
}: Props) {
  const [name, setName] = React.useState(initial?.name || "");
  const [description, setDescription] = React.useState(
    initial?.description || "",
  );
  const [logoUrl, setLogoUrl] = React.useState<string>(initial?.logo_url || "");
  const [bannerUrl, setBannerUrl] = React.useState<string>(
    initial?.banner_url || "",
  );

  const [seoTitle, setSeoTitle] = React.useState(initial?.seo_title || "");
  const [seoSlug, setSeoSlug] = React.useState(initial?.seo_slug || "");
  const [seoDesc, setSeoDesc] = React.useState(initial?.seo_description || "");

  const [isActive, setIsActive] = React.useState<boolean>(
    initial?.is_active ?? true,
  );

  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string>("");

  React.useEffect(() => {
    if (!open) return;

    setErr("");
    setName(initial?.name || "");
    setDescription(initial?.description || "");
    setLogoUrl(initial?.logo_url || "");
    setBannerUrl(initial?.banner_url || "");
    setSeoTitle(initial?.seo_title || "");
    setSeoSlug(initial?.seo_slug || "");
    setSeoDesc(initial?.seo_description || "");
    setIsActive(initial?.is_active ?? true);
  }, [open, initial]);

  if (!open) return null;

  async function onPickLogo(file: File) {
    setErr("");
    setBusy(true);

    try {
      const { url } = await uploadBrandImage(file, "logo");
      setLogoUrl(url);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function onPickBanner(file: File) {
    setErr("");
    setBusy(true);

    try {
      const { url } = await uploadBrandImage(file, "banner");
      setBannerUrl(url);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setErr("");

    const cleanName = name.trim();

    if (!cleanName) {
      setErr("اسم الماركة مطلوب");
      return;
    }

    setBusy(true);

    try {
      await onSubmit({
        name: cleanName,
        description: description.trim() || null,
        logo_url: logoUrl.trim() || null,
        banner_url: bannerUrl.trim() || null,
        seo_title: seoTitle.trim() || null,
        seo_slug: seoSlug.trim() || null,
        seo_description: seoDesc.trim() || null,
        is_active: isActive,
      });

      onClose();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!onDelete) return;

    setBusy(true);
    setErr("");

    try {
      await onDelete();
      onClose();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="adm-brand-dialog"
      dir="rtl"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="adm-brand-dialog__wrap">
        <div className="adm-brand-dialog__panel">
          <header className="adm-brand-dialog__head">
            <div className="adm-brand-dialog__title">
              <span className="adm-brand-dialog__titleIcon">
                <ImageIcon />
              </span>

              <div className="adm-brand-dialog__titleText">
                <strong>
                  {mode === "create"
                    ? "إضافة ماركة جديدة"
                    : `تعديل ${initial?.name || ""}`}
                </strong>
                <span>الشعار، البانر، الوصف، وتحسينات SEO</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="adm-brand-dialog__close"
            >
              <X />
              خروج
            </button>
          </header>

          <div className="adm-brand-dialog__body">
            {err ? <div className="adm-brand-dialog__error">{err}</div> : null}

            <div className="adm-brand-dialog__grid">
              <section className="adm-brand-dialog__card">
                <div className="adm-brand-dialog__cardTitle">
                  بانر الماركة
                </div>

                <div className="adm-brand-dialog__preview adm-brand-dialog__preview--banner">
                  {bannerUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={bannerUrl} alt="banner" />
                  ) : (
                    <div className="adm-brand-dialog__placeholder">
                      لا يوجد بانر
                    </div>
                  )}
                </div>

                <div className="adm-brand-dialog__uploadRow">
                  <label
                    className={cn(
                      "adm-btn adm-btn--primary",
                      busy && "is-disabled",
                    )}
                  >
                    <UploadCloud />
                    رفع بانر
                    <input
                      type="file"
                      accept="image/*"
                      className="adm-brand-dialog__fileInput"
                      onChange={(e) => {
                        const f = e.currentTarget.files?.[0];

                        if (f) void onPickBanner(f);

                        e.currentTarget.value = "";
                      }}
                    />
                  </label>

                  {bannerUrl ? (
                    <button
                      type="button"
                      className="adm-btn adm-btn--secondary"
                      disabled={busy}
                      onClick={() => setBannerUrl("")}
                    >
                      إزالة
                    </button>
                  ) : null}
                </div>

                <div className="adm-brand-dialog__hint">
                  مقاس مقترح: 1280×300
                </div>
              </section>

              <section className="adm-brand-dialog__card">
                <div className="adm-brand-dialog__cardTitle">
                  شعار ومعلومات الماركة
                </div>

                <div className="adm-brand-dialog__logoRow">
                  <div className="adm-brand-dialog__preview adm-brand-dialog__preview--logo">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="logo" />
                    ) : (
                      <div className="adm-brand-dialog__placeholder">Logo</div>
                    )}
                  </div>

                  <div>
                    <div className="adm-brand-dialog__uploadRow">
                      <label
                        className={cn(
                          "adm-btn adm-btn--primary",
                          busy && "is-disabled",
                        )}
                      >
                        <UploadCloud />
                        رفع شعار
                        <input
                          type="file"
                          accept="image/*"
                          className="adm-brand-dialog__fileInput"
                          onChange={(e) => {
                            const f = e.currentTarget.files?.[0];

                            if (f) void onPickLogo(f);

                            e.currentTarget.value = "";
                          }}
                        />
                      </label>

                      {logoUrl ? (
                        <button
                          type="button"
                          className="adm-btn adm-btn--secondary"
                          disabled={busy}
                          onClick={() => setLogoUrl("")}
                        >
                          إزالة
                        </button>
                      ) : null}
                    </div>

                    <div className="adm-brand-dialog__hint">
                      مقاس مقترح: 100×80
                    </div>
                  </div>
                </div>

                <div className="adm-brand-dialog__fields">
                  <div className="adm-brand-dialog__field">
                    <label>اسم الماركة</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.currentTarget.value)}
                      placeholder="مثال: Denso"
                    />
                  </div>

                  <div className="adm-brand-dialog__field">
                    <label>وصف مختصر</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.currentTarget.value)}
                      rows={4}
                      placeholder="وصف مختصر عن الماركة..."
                    />
                  </div>

                  <label className="adm-brand-dialog__activeRow">
                    <span>تفعيل الماركة</span>
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.currentTarget.checked)}
                    />
                  </label>
                </div>
              </section>
            </div>

            <section className="adm-brand-dialog__card adm-brand-dialog__seo">
              <div className="adm-brand-dialog__cardTitle">تحسينات SEO</div>

              <div className="adm-brand-dialog__fields">
                <div className="adm-brand-dialog__field">
                  <label>عنوان الصفحة</label>
                  <input
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.currentTarget.value)}
                    placeholder="مثال: {Name}"
                  />
                </div>

                <div className="adm-brand-dialog__field">
                  <label>Slug</label>
                  <input
                    dir="ltr"
                    value={seoSlug}
                    onChange={(e) => setSeoSlug(e.currentTarget.value)}
                    placeholder="مثال: denso"
                  />
                </div>

                <div className="adm-brand-dialog__field">
                  <label>وصف الصفحة</label>
                  <textarea
                    value={seoDesc}
                    onChange={(e) => setSeoDesc(e.currentTarget.value)}
                    rows={3}
                    placeholder="وصف مختصر..."
                  />
                </div>
              </div>
            </section>
          </div>

          <footer className="adm-brand-dialog__footer">
            <div className="adm-brand-dialog__footerInner">
              <button
                type="button"
                onClick={onClose}
                className="adm-btn adm-btn--secondary"
                disabled={busy}
              >
                إلغاء
              </button>

              <div className="adm-brand-dialog__footerActions">
                {mode === "edit" && onDelete ? (
                  <button
                    type="button"
                    onClick={del}
                    className="adm-btn adm-btn--danger"
                    disabled={busy}
                  >
                    <Trash2 />
                    حذف
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={save}
                  className="adm-btn adm-btn--primary"
                  disabled={busy}
                >
                  <Save />
                  {mode === "create" ? "إضافة" : "حفظ"}
                </button>
              </div>
            </div>

            {busy ? (
              <div className="adm-brand-dialog__busy">جاري التنفيذ...</div>
            ) : null}
          </footer>
        </div>
      </div>
    </div>
  );
}