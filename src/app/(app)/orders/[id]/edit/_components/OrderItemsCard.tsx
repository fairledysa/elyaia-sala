// FILE: apps/merchant/src/app/(app)/orders/[id]/edit/_components/OrderItemsCard.tsx
"use client";

import { useState } from "react";
import {
  Shirt,
  X,
  Package2,
  Plus,
  Pencil,
  Trash2,
  Check,
  TriangleAlert,
} from "lucide-react";
import type { OrderDetails, OrderItem } from "../OrderEditPageClient";
import { money, n, s } from "../OrderEditPageClient";
import AddOrderItemModal from "./AddOrderItemModal";
import EditOrderItemOptionsModal from "./EditOrderItemOptionsModal";

type SelectedOptionRow = {
  name?: string | null;
  value?: string | null;
};

type AttachmentItem = {
  index: number;
  name: string;
  type: string;
  size: string;
  url: string;
};

function getSelectedOptions(item: OrderItem): SelectedOptionRow[] {
  if (!Array.isArray(item?.selected_options)) return [];
  return item.selected_options as SelectedOptionRow[];
}

function getVisibleOptionRows(item: OrderItem): SelectedOptionRow[] {
  return getSelectedOptions(item).filter((row) => {
    const name = s(row?.name);
    const value = s(row?.value);

    if (!name || !value) return false;
    if (name.startsWith("__")) return false;
    if (name === "ملاحظة") return false;
    if (name === "مرفق") return false;
    if (name === "الوزن") return false;

    return true;
  });
}

function getNoteValue(item: OrderItem) {
  const raw = getSelectedOptions(item);
  const row = raw.find((x: SelectedOptionRow) => s(x?.name) === "ملاحظة");
  return s(row?.value);
}

function getAttachmentItems(item: OrderItem): AttachmentItem[] {
  const raw = getSelectedOptions(item);
  const bucket = new Map<number, Partial<AttachmentItem>>();

  for (const row of raw) {
    const key = s(row?.name);
    const value = s(row?.value);
    if (!key.startsWith("__attachment_")) continue;

    const match = key.match(/^__attachment_(\d+)_(name|type|size|url)$/);
    if (!match) continue;

    const index = Number(match[1]);
    const field = match[2] as "name" | "type" | "size" | "url";

    const current = bucket.get(index) ?? { index };
    current[field] = value;
    bucket.set(index, current);
  }

  return Array.from(bucket.values())
    .filter((x): x is AttachmentItem => Boolean(x.url))
    .sort((a, b) => a.index - b.index)
    .map((x) => ({
      index: x.index,
      name: s(x.name) || `مرفق ${x.index}`,
      type: s(x.type),
      size: s(x.size),
      url: s(x.url),
    }));
}

function isImageAttachment(file: AttachmentItem) {
  const type = s(file.type).toLowerCase();
  const url = s(file.url).toLowerCase();
  const name = s(file.name).toLowerCase();

  return (
    type.startsWith("image/") ||
    url.endsWith(".jpg") ||
    url.endsWith(".jpeg") ||
    url.endsWith(".png") ||
    url.endsWith(".webp") ||
    url.endsWith(".gif") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png") ||
    name.endsWith(".webp") ||
    name.endsWith(".gif")
  );
}

function isCustomItem(item: OrderItem) {
  return !s(item?.product_id);
}

function getSavedWeight(item: OrderItem): number | null {
  const raw = getSelectedOptions(item);
  const row = raw.find((x: SelectedOptionRow) => s(x?.name) === "الوزن");
  if (!row) return null;

  const value = Number(String(row.value ?? "").replace(/,/g, ".").trim());
  return Number.isFinite(value) ? value : 0;
}

function ImagePreviewModal({
  open,
  imageUrl,
  imageName,
  onClose,
}: {
  open: boolean;
  imageUrl: string;
  imageName: string;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl rounded-[24px] bg-white p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute left-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow hover:bg-slate-100"
          aria-label="إغلاق"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-3 pr-2 text-right text-sm font-medium text-slate-600">
          {imageName}
        </div>

        <div className="flex max-h-[80vh] items-center justify-center overflow-hidden rounded-[18px] bg-slate-50">
          <img
            src={imageUrl}
            alt={imageName}
            className="max-h-[80vh] w-auto max-w-full object-contain"
          />
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  open,
  itemName,
  deleting,
  onClose,
  onConfirm,
}: {
  open: boolean;
  itemName: string;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-60"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex flex-1 items-start justify-end gap-3 text-right">
            <div>
              <div className="text-lg font-semibold text-slate-800">
                حذف المنتج
              </div>
              <div className="mt-2 text-sm text-slate-500">
                هل أنت متأكد من حذف هذا المنتج من الطلب؟
              </div>
              <div className="mt-2 text-sm font-medium text-slate-700">
                {itemName || "منتج"}
              </div>
            </div>

            <div className="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <TriangleAlert className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex h-12 items-center justify-center rounded-xl bg-rose-600 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
          >
            {deleting ? "جارٍ الحذف..." : "تأكيد الحذف"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductMetaRows({
  sku,
  optionRows,
  isCustom,
}: {
  sku: string;
  optionRows: SelectedOptionRow[];
  isCustom?: boolean;
}) {
  if (!sku && optionRows.length === 0) return null;

  return (
    <div className="adm-order-edit-productMeta">
      {!isCustom && sku ? (
        <div className="adm-order-edit-productMeta__row">
          <div className="adm-order-edit-productMeta__label">
            <Package2 size={16} />
            <span>الرقم المخزني SKU</span>
          </div>

          <div dir="ltr" className="adm-order-edit-productMeta__value">
            {sku}
          </div>
        </div>
      ) : null}

      {optionRows.map((row, index) => {
        const hasBorder = (!isCustom && sku) || index > 0;

        return (
          <div
            key={`${s(row.name)}-${s(row.value)}-${index}`}
            className={[
              "adm-order-edit-productMeta__row",
              hasBorder ? "is-separated" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="adm-order-edit-productMeta__label">
              <Package2 size={16} />
              <span>{s(row.name)}</span>
            </div>

            <div className="adm-order-edit-productMeta__value">
              {s(row.value)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function parseWeightValue(weightLabel: string) {
  const normalized = s(weightLabel)
    .replace("كجم", "")
    .replace(/,/g, ".")
    .trim();

  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
}

function InlineEditor({
  title,
  value,
  inputType = "number",
  inputDir = "ltr",
  saving,
  onSave,
}: {
  title: string;
  value: string;
  inputType?: "number" | "text";
  inputDir?: "ltr" | "rtl";
  saving?: boolean;
  onSave: (value: string) => Promise<boolean | void> | boolean | void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  function openEditor() {
    setDraft(value);
    setOpen(true);
  }

  async function save() {
    const result = await onSave(draft);
    if (result === false) return;
    setOpen(false);
  }

  function cancel() {
    setDraft(value);
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={openEditor}
        className="adm-order-edit-inlineValue"
      >
        <Pencil size={15} />
        <span>{value}</span>
      </button>
    );
  }

  return (
    <div className="adm-order-edit-inlineEditor">
      <div className="adm-order-edit-inlineEditor__title">{title}</div>

      <input
        type={inputType}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        dir={inputDir}
        className="adm-order-edit-inlineEditor__input"
      />

      <div className="adm-order-edit-inlineEditor__actions">
        <button
          type="button"
          onClick={cancel}
          className="adm-order-edit-inlineEditor__btn adm-order-edit-inlineEditor__btn--light"
        >
          <X size={15} />
        </button>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="adm-order-edit-inlineEditor__btn adm-order-edit-inlineEditor__btn--primary"
        >
          <Check size={15} />
        </button>

        <div className="adm-order-edit-inlineEditor__preview">
          {draft || "-"}
        </div>
      </div>
    </div>
  );
}

export default function OrderItemsCard({
  order,
  itemName,
  itemSku,
  itemImage,
  itemWeight,
  onUpdated,
}: {
  order: OrderDetails;
  itemName: (item: OrderItem) => string;
  itemSku: (item: OrderItem) => string;
  itemImage: (item: OrderItem) => string;
  itemWeight: (item: OrderItem) => string;
  selectedOptionsText: (item: OrderItem) => string;
  onUpdated: () => Promise<void> | void;
}) {
  const items = Array.isArray(order.order_items) ? order.order_items : [];
  const currency = s(order.currency) || "SAR";

  const [preview, setPreview] = useState<{
    open: boolean;
    url: string;
    name: string;
  }>({
    open: false,
    url: "",
    name: "",
  });

  const [addOpen, setAddOpen] = useState(false);
  const [editOptionsItem, setEditOptionsItem] = useState<OrderItem | null>(null);
  const [deleteItemState, setDeleteItemState] = useState<OrderItem | null>(null);
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openPreview(file: AttachmentItem) {
    setPreview({
      open: true,
      url: file.url,
      name: file.name,
    });
  }

  function closePreview() {
    setPreview({
      open: false,
      url: "",
      name: "",
    });
  }

  async function patchItem(itemId: string, patch: Record<string, any>) {
    try {
      setSavingMap((prev) => ({ ...prev, [itemId]: true }));

      const res = await fetch(`/api/orders/${order.id}/items/${itemId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(patch),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "فشل تحديث المنتج");
      }

      await onUpdated();
      return true;
    } catch (e: any) {
      alert(s(e?.message) || "فشل تحديث المنتج");
      return false;
    } finally {
      setSavingMap((prev) => ({ ...prev, [itemId]: false }));
    }
  }

  async function deleteItem(itemId: string) {
    try {
      setDeletingId(itemId);

      const res = await fetch(`/api/orders/${order.id}/items/${itemId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "فشل حذف المنتج");
      }

      setDeleteItemState(null);
      await onUpdated();
    } catch (e: any) {
      alert(s(e?.message) || "فشل حذف المنتج");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <section className="adm-order-edit-card adm-order-edit-items">
        <div className="adm-order-edit-card__head">
          <div className="adm-order-edit-card__titleRow">
            <Shirt className="adm-order-edit-card__titleIcon" size={22} />
            <h3 className="adm-order-edit-card__title">المنتجات</h3>
          </div>

          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="adm-order-edit-btn adm-order-edit-btn--outline"
          >
            <Plus size={16} />
            إضافة منتج
          </button>
        </div>

        <div className="adm-order-edit-items__tableHead">
          <div>المنتج</div>
          <div>الكمية</div>
          <div>وزن القطعة</div>
          <div>السعر</div>
          <div>المجموع</div>
        </div>

        <div className="adm-order-edit-items__list">
          {items.map((item: OrderItem) => {
            const image = itemImage(item);
            const noteValue = getNoteValue(item);
            const attachments = getAttachmentItems(item);
            const imageAttachments = attachments.filter(isImageAttachment);
            const otherAttachments = attachments.filter(
              (x) => !isImageAttachment(x)
            );
            const customItem = isCustomItem(item);
            const skuValue = customItem ? "" : itemSku(item);
            const optionRows = getVisibleOptionRows(item);
            const saving = !!savingMap[item.id];

            const savedWeight = getSavedWeight(item);
            const qtyValue = String(n(item.qty));
            const weightValue = String(
              savedWeight !== null
                ? savedWeight
                : customItem
                  ? 0
                  : parseWeightValue(itemWeight(item))
            );
            const priceValue = String(n(item.unit_price));

            const totalPrice = n(item.total_price);
            const totalLabel = money(totalPrice, currency);

            return (
              <div key={item.id} className="adm-order-edit-items__row">
                <div className="adm-order-edit-items__product">
                  <button
                    type="button"
                    onClick={() => setDeleteItemState(item)}
                    disabled={deletingId === item.id}
                    className="adm-order-edit-items__delete"
                    aria-label="حذف المنتج"
                  >
                    <Trash2 size={15} />
                  </button>

                  {image ? (
                    <img
                      src={image}
                      alt={itemName(item)}
                      className="adm-order-edit-items__image"
                    />
                  ) : (
                    <div className="adm-order-edit-items__imagePlaceholder" />
                  )}

                  <div className="adm-order-edit-items__productInfo">
                    <div className="adm-order-edit-items__productName">
                      {itemName(item)}
                    </div>

                    <ProductMetaRows
                      sku={skuValue && skuValue !== "-" ? skuValue : ""}
                      optionRows={optionRows}
                      isCustom={customItem}
                    />

                    {!customItem && optionRows.length > 0 ? (
                      <div className="adm-order-edit-items__optionAction">
                        <button
                          type="button"
                          onClick={() => setEditOptionsItem(item)}
                          className="adm-order-edit-items__optionBtn"
                        >
                          <Pencil size={15} />
                          تعديل الخيارات
                        </button>
                      </div>
                    ) : null}

                    {noteValue ? (
                      <div className="adm-order-edit-items__note">
                        <div>النص المرفق</div>
                        <p>{noteValue}</p>
                      </div>
                    ) : null}

                    {imageAttachments.length > 0 ? (
                      <div className="adm-order-edit-attachments adm-order-edit-attachments--images">
                        <div className="adm-order-edit-attachments__title">
                          الصور المرفقة
                        </div>

                        <div className="adm-order-edit-attachments__grid">
                          {imageAttachments.map((file) => (
                            <div
                              key={`${file.index}-${file.url}`}
                              className="adm-order-edit-attachmentImage"
                            >
                              <button
                                type="button"
                                onClick={() => openPreview(file)}
                                className="adm-order-edit-attachmentImage__preview"
                              >
                                <img src={file.url} alt={file.name} />
                              </button>

                              <div className="adm-order-edit-attachmentImage__body">
                                <div>{file.name}</div>
                                <button
                                  type="button"
                                  onClick={() => openPreview(file)}
                                >
                                  عرض الصورة
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {otherAttachments.length > 0 ? (
                      <div className="adm-order-edit-attachments">
                        <div className="adm-order-edit-attachments__title">
                          الملفات المرفقة
                        </div>

                        <div className="adm-order-edit-attachments__files">
                          {otherAttachments.map((file) => (
                            <a
                              key={`${file.index}-${file.url}`}
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              className="adm-order-edit-attachmentFile"
                            >
                              فتح {file.name}
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="adm-order-edit-items__cell">
                  <InlineEditor
                    title="الكمية الجديدة"
                    value={qtyValue}
                    saving={saving}
                    onSave={async (value) => {
                      const qty = Number(value);
                      if (!Number.isFinite(qty) || qty <= 0) {
                        alert("الكمية يجب أن تكون أكبر من 0");
                        return false;
                      }
                      return await patchItem(item.id, { qty });
                    }}
                  />
                </div>

                <div className="adm-order-edit-items__cell">
                  <InlineEditor
                    title="الوزن الجديد"
                    value={weightValue}
                    saving={saving}
                    onSave={async (value) => {
                      const weight = Number(String(value).replace(/,/g, "."));
                      if (!Number.isFinite(weight) || weight < 0) {
                        alert("الوزن غير صحيح");
                        return false;
                      }
                      return await patchItem(item.id, { weight });
                    }}
                  />
                  <div className="adm-order-edit-items__unit">كجم</div>
                </div>

                <div className="adm-order-edit-items__cell">
                  <InlineEditor
                    title="السعر الجديد"
                    value={priceValue}
                    saving={saving}
                    onSave={async (value) => {
                      const unit_price = Number(value);
                      if (!Number.isFinite(unit_price) || unit_price < 0) {
                        alert("السعر غير صحيح");
                        return false;
                      }
                      return await patchItem(item.id, { unit_price });
                    }}
                  />
                  <div className="adm-order-edit-items__unit">{currency}</div>
                </div>

                <div className="adm-order-edit-items__total">{totalLabel}</div>
              </div>
            );
          })}

          {items.length === 0 ? (
            <div className="adm-order-edit-items__empty">
              لا توجد منتجات في هذا الطلب
            </div>
          ) : null}
        </div>
      </section>

      <ImagePreviewModal
        open={preview.open}
        imageUrl={preview.url}
        imageName={preview.name}
        onClose={closePreview}
      />

      <DeleteConfirmModal
        open={!!deleteItemState}
        itemName={deleteItemState ? itemName(deleteItemState) : ""}
        deleting={!!(deleteItemState && deletingId === deleteItemState.id)}
        onClose={() => {
          if (deletingId) return;
          setDeleteItemState(null);
        }}
        onConfirm={async () => {
          if (!deleteItemState?.id) return;
          await deleteItem(deleteItemState.id);
        }}
      />

      <AddOrderItemModal
        open={addOpen}
        order={order}
        onClose={() => setAddOpen(false)}
        onSaved={async () => {
          setAddOpen(false);
          await onUpdated();
        }}
      />

      <EditOrderItemOptionsModal
        open={!!editOptionsItem}
        order={order}
        item={editOptionsItem}
        onClose={() => setEditOptionsItem(null)}
        onSaved={async () => {
          setEditOptionsItem(null);
          await onUpdated();
        }}
      />
    </>
  );
}