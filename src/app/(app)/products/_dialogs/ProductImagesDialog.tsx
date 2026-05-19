// FILE: apps/merchant/src/app/(app)/products/_dialogs/ProductImagesDialog.tsx

"use client";

import * as React from "react";
import Image from "next/image";
import { Star, Trash2, Upload } from "lucide-react";
import type { Product } from "../ProductsClient";

type Img = {
  id: string;
  url: string;
  alt?: string;
  is_primary: boolean;
  sort_order: number;
};

const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ALT_MAX_LENGTH = 160;

function s(value: unknown) {
  return String(value ?? "").trim();
}

function cleanAlt(value: unknown) {
  return s(value).replace(/\s+/g, " ").slice(0, ALT_MAX_LENGTH);
}

function readErrorMessage(j: any, raw: string, status: number) {
  if (j?.error) {
    return `${j.error}${j?.details ? ` — ${JSON.stringify(j.details)}` : ""}`;
  }

  const preview = String(raw || "").trim().slice(0, 300);

  if (preview) {
    return `UPLOAD_FAILED_HTTP_${status} — ${preview}`;
  }

  return `UPLOAD_FAILED_HTTP_${status}`;
}

function makeImageId(index = 0) {
  try {
    return `img-${crypto.randomUUID()}`;
  } catch {
    return `img-${Date.now()}-${index}`;
  }
}

function normalize(list: Img[]) {
  let next = list
    .filter((x) => s(x.url))
    .slice()
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
    .map((x, i) => ({
      id: String(x.id || makeImageId(i)),
      url: s(x.url),
      alt: cleanAlt(x.alt),
      sort_order: i,
      is_primary: Boolean(x.is_primary),
    }));

  if (next.length) {
    if (!next.some((x) => x.is_primary)) {
      next[0].is_primary = true;
    }

    let seenPrimary = false;

    next = next.map((x) => {
      if (!x.is_primary) return x;

      if (!seenPrimary) {
        seenPrimary = true;
        return x;
      }

      return {
        ...x,
        is_primary: false,
      };
    });
  }

  return next;
}

function initialImagesFromProduct(product: Product): Img[] {
  const imgs = Array.isArray((product as any).images)
    ? ((product as any).images as Img[])
    : [];

  if (imgs.length) return normalize(imgs);

  const url = s((product as any).imageUrl);

  return url
    ? normalize([
        {
          id: "img-1",
          url,
          alt: s((product as any).name),
          is_primary: true,
          sort_order: 0,
        },
      ])
    : [];
}

function validateFile(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error(`INVALID_FILE_TYPE — ${file.type || "unknown"}`);
  }

  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(`FILE_TOO_LARGE — الحد الأعلى ${MAX_SIZE_MB}MB`);
  }
}

async function uploadOne(file: File, productId: string): Promise<string> {
  const id = s(productId);

  if (!id) {
    throw new Error("MISSING_PRODUCT_ID");
  }

  validateFile(file);

  const fd = new FormData();
  fd.append("kind", "products/images");
  fd.append("product_id", id);
  fd.append("file", file, file.name);

  const r = await fetch("/api/uploads/r2/put", {
    method: "POST",
    body: fd,
  });

  const text = await r.text();

  let j: any = null;

  try {
    j = JSON.parse(text);
  } catch {
    j = null;
  }

  if (!r.ok || !j?.ok || !j?.publicUrl) {
    console.error("PRODUCT_IMAGE_UPLOAD_FAILED", {
      status: r.status,
      response: j,
      raw: text,
    });

    throw new Error(readErrorMessage(j, text, r.status));
  }

  return s(j.publicUrl);
}

export default function ProductImagesDialog({
  product,
  onClose,
  onSaved,
}: {
  product: Product;
  onClose: () => void;
  onSaved: (patch: Partial<Product>) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = React.useState(false);

  const productId = s(product.id);
  const productName = s((product as any).name);

  const [list, setList] = React.useState<Img[]>(() =>
    initialImagesFromProduct(product),
  );

 const productImagesKey = React.useMemo(() => {
  const imgs = Array.isArray((product as any).images)
    ? ((product as any).images as Img[])
    : [];

  return [
    product.id,
    s((product as any).imageUrl),
    imgs
      .map((img) =>
        [
          s(img.id),
          s(img.url),
          s(img.alt),
          String(Boolean(img.is_primary)),
          String(Number(img.sort_order ?? 0)),
        ].join(":"),
      )
      .join("|"),
  ].join("::");
}, [product]);

React.useEffect(() => {
  setList(initialImagesFromProduct(product));
}, [productImagesKey, product]);

  async function persist(nextList: Img[]) {
    if (!productId) {
      throw new Error("MISSING_PRODUCT_ID");
    }

    const normalized = normalize(nextList);
    const primary =
      normalized.find((x) => x.is_primary)?.url || normalized[0]?.url || "";

    const res = await fetch(`/api/products/${productId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        images: normalized.map((x) => ({
          url: x.url,
          alt: cleanAlt(x.alt),
          is_primary: x.is_primary,
          sort_order: x.sort_order,
        })),
      }),
    });

    const text = await res.text();

    let j: any = null;

    try {
      j = JSON.parse(text);
    } catch {
      j = null;
    }

    if (!res.ok) {
      console.error("PRODUCT_IMAGES_SAVE_FAILED", {
        status: res.status,
        response: j,
        raw: text,
      });

      throw new Error(readErrorMessage(j, text, res.status));
    }

    setList(normalized);

    onSaved({
      imageUrl: primary || "",
      images: normalized,
    } as any);
  }

  async function applyAndSave(nextRaw: Img[]) {
    const next = normalize(nextRaw);
    await persist(next);
  }

  async function addFromFiles(files: FileList | null) {
    if (!files || !files.length) return;

    if (!productId) {
      alert("معرّف المنتج غير موجود");
      return;
    }

    setBusy(true);

    try {
      const uploaded: Img[] = [];
      const incoming = Array.from(files);

      for (const file of incoming) {
        const url = await uploadOne(file, productId);

        uploaded.push({
          id: makeImageId(uploaded.length),
          url,
          alt: productName,
          is_primary: false,
          sort_order: list.length + uploaded.length,
        });
      }

      await applyAndSave([...list, ...uploaded]);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (e: any) {
      alert(e?.message || "فشل رفع/حفظ الصور");
    } finally {
      setBusy(false);
    }
  }

  async function setPrimary(id: string) {
    if (!id) return;

    setBusy(true);

    try {
      await applyAndSave(
        list.map((x) => ({
          ...x,
          is_primary: x.id === id,
        })),
      );
    } catch (e: any) {
      alert(e?.message || "فشل حفظ الصورة الأساسية");
    } finally {
      setBusy(false);
    }
  }

  async function saveAlt(id: string, value: string) {
    if (!id) return;

    const next = list.map((x) =>
      x.id === id
        ? {
            ...x,
            alt: cleanAlt(value),
          }
        : x,
    );

    setBusy(true);

    try {
      await applyAndSave(next);
    } catch (e: any) {
      alert(e?.message || "فشل حفظ نص الصورة");
    } finally {
      setBusy(false);
    }
  }

  function updateAltLocal(id: string, value: string) {
    setList((current) =>
      current.map((x) =>
        x.id === id
          ? {
              ...x,
              alt: value.slice(0, ALT_MAX_LENGTH),
            }
          : x,
      ),
    );
  }

  async function removeImage(id: string) {
    if (!id) return;

    setBusy(true);

    try {
      const removed = list.find((x) => x.id === id);

      let remain = list.filter((x) => x.id !== id);

      if (removed?.is_primary && remain.length) {
        remain = remain.map((x, i) => ({
          ...x,
          is_primary: i === 0,
        }));
      }

      await applyAndSave(remain);
    } catch (e: any) {
      alert(e?.message || "فشل حذف/حفظ الصور");
    } finally {
      setBusy(false);
    }
  }

  const sortedList = list.slice().sort((a, b) => a.sort_order - b.sort_order);
  const primaryId = sortedList.find((x) => x.is_primary)?.id ?? "";

  return (
    <div
      className="adm-product-images-dialog"
      dir="rtl"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="adm-product-images-dialog__panel">
        <header className="adm-product-images-dialog__header">
          <div className="adm-product-images-dialog__title">
            <span className="adm-product-images-dialog__icon">
              <Upload />
            </span>

            <div>
              <h3>إدارة صور المنتج</h3>
              <p>{product.name}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="adm-product-images-dialog__close"
          >
            إغلاق
          </button>
        </header>

        <div className="adm-product-images-dialog__body">
          <section className="adm-product-images-dialog__upload">
            <div className="adm-product-images-dialog__uploadText">
              <strong>رفع صور المنتج</strong>
              <span>
                يدعم صور المنتج حتى {MAX_SIZE_MB}MB للصورة الواحدة. يتم الحفظ
                تلقائيًا بعد الرفع.
              </span>
            </div>

            <div className="adm-product-images-dialog__uploadRow">
              <input
                ref={inputRef}
                type="file"
                multiple
                accept="image/*"
                className="adm-product-images-dialog__file"
                onChange={(e) => void addFromFiles(e.currentTarget.files)}
                disabled={busy}
              />

              <span className="adm-product-images-dialog__uploadStatus">
                <Upload />
                {busy ? "جاري الحفظ..." : "رفع"}
              </span>
            </div>
          </section>

          <section className="adm-product-images-dialog__primary">
            <label>الصورة الأساسية</label>

            <select
              value={primaryId}
              onChange={(e) => void setPrimary(e.currentTarget.value)}
              disabled={!sortedList.length || busy}
            >
              {!sortedList.length ? (
                <option value="">لا توجد صور</option>
              ) : (
                sortedList.map((img, i) => (
                  <option key={img.id} value={img.id}>
                    {img.is_primary ? "⭐ " : ""}صورة #{i + 1}
                  </option>
                ))
              )}
            </select>
          </section>

          {!sortedList.length ? (
            <div className="adm-product-images-dialog__empty">
              لا توجد صور بعد.
            </div>
          ) : (
            <div className="adm-product-images-dialog__grid">
              {sortedList.map((img, index) => (
                <article
                  key={img.id}
                  className="adm-product-images-dialog__card"
                >
                  <div className="adm-product-images-dialog__imageBox">
                    <Image
                      src={img.url}
                      alt={cleanAlt(img.alt) || productName || "صورة المنتج"}
                      fill
                      unoptimized
                      className="adm-product-images-dialog__image"
                    />

                    {img.is_primary ? (
                      <span className="adm-product-images-dialog__badge">
                        أساسية
                      </span>
                    ) : null}
                  </div>

                  <div className="adm-product-images-dialog__alt">
                    <label>نص الصورة SEO / Alt</label>

                    <input
                      type="text"
                      value={img.alt ?? ""}
                      maxLength={ALT_MAX_LENGTH}
                      placeholder={productName || `صورة المنتج ${index + 1}`}
                      disabled={busy}
                      onChange={(e) => updateAltLocal(img.id, e.target.value)}
                      onBlur={(e) => void saveAlt(img.id, e.target.value)}
                    />
                  </div>

                  <div className="adm-product-images-dialog__cardActions">
                    <button
                      type="button"
                      onClick={() => void setPrimary(img.id)}
                      disabled={busy}
                      className={
                        img.is_primary
                          ? "adm-product-images-dialog__primaryBtn is-active"
                          : "adm-product-images-dialog__primaryBtn"
                      }
                      title="تعيين أساسية"
                    >
                      <Star />
                      أساسية
                    </button>

                    <button
                      type="button"
                      onClick={() => void removeImage(img.id)}
                      disabled={busy}
                      className="adm-product-images-dialog__deleteBtn"
                      title="حذف"
                    >
                      <Trash2 />
                      حذف
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <footer className="adm-product-images-dialog__footer">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="adm-btn adm-btn--secondary"
          >
            إغلاق
          </button>
        </footer>
      </div>
    </div>
  );
}