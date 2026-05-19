//app/(app)/orders/[id]/_components/OrderItemsCard.tsx
"use client";

import { useState } from "react";
import { Shirt, X, Package2 } from "lucide-react";
import type { OrderDetails, OrderItem } from "./OrderDetailsPageClient";
import { money, n, s } from "./OrderDetailsPageClient";

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

 function ProductMetaRows({
  sku,
  optionRows,
}: {
  sku: string;
  optionRows: SelectedOptionRow[];
}) {
  if (!sku && optionRows.length === 0) return null;

  return (
    <div className="mt-3 overflow-hidden rounded-[14px] border border-slate-200 bg-white">
      {sku ? (
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="inline-flex items-center gap-2 text-sm text-slate-400">
            <Package2 className="h-4 w-4 shrink-0" />
            <span>الرقم المخزني SKU</span>
          </div>

          <div
            dir="ltr"
            className="text-left text-sm font-medium text-slate-700"
          >
            {sku}
          </div>
        </div>
      ) : null}

      {optionRows.map((row, index) => {
        const hasBorder = sku || index > 0;

        return (
          <div
            key={`${s(row.name)}-${s(row.value)}-${index}`}
            className={`flex items-center justify-between gap-3 px-4 py-3 ${
              hasBorder ? "border-t border-slate-200" : ""
            }`}
          >
            <div className="inline-flex items-center gap-2 text-sm text-slate-400">
              <Package2 className="h-4 w-4 shrink-0" />
              <span>{s(row.name)}</span>
            </div>

            <div className="text-sm font-medium text-slate-700">
              {s(row.value)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function OrderItemsCard({
  order,
  itemName,
  itemSku,
  itemImage,
  itemWeight,
}: {
  order: OrderDetails;
  itemName: (item: OrderItem) => string;
  itemSku: (item: OrderItem) => string;
  itemImage: (item: OrderItem) => string;
  itemWeight: (item: OrderItem) => string;
  selectedOptionsText: (item: OrderItem) => string;
}) {
  const items = Array.isArray(order.order_items) ? order.order_items : [];
  const [preview, setPreview] = useState<{
    open: boolean;
    url: string;
    name: string;
  }>({
    open: false,
    url: "",
    name: "",
  });

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

  return (
    <>
      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between px-5 py-5 md:px-8">
          <div className="inline-flex items-center gap-3 text-[28px] font-medium text-slate-700">
            <Shirt className="h-6 w-6 text-slate-500" />
            المنتجات
          </div>
        </div>

        <div className="hidden grid-cols-[1.4fr_.7fr_.7fr_.7fr_.8fr] bg-slate-50 px-8 py-5 text-right text-lg text-slate-500 md:grid">
          <div className="text-right">المنتج</div>
          <div className="text-right">الكمية</div>
          <div className="text-right">الوزن</div>
          <div className="text-right">السعر</div>
          <div className="text-right">المجموع</div>
        </div>

        <div className="divide-y divide-slate-100">
          {items.map((item: OrderItem) => {
            const image = itemImage(item);
            const noteValue = getNoteValue(item);
            const attachments = getAttachmentItems(item);
            const imageAttachments = attachments.filter(isImageAttachment);
            const otherAttachments = attachments.filter((x) => !isImageAttachment(x));
            const skuValue = itemSku(item);
            const optionRows = getVisibleOptionRows(item);

            return (
              <div key={item.id} className="px-5 py-6 md:px-8">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-[1.4fr_.7fr_.7fr_.7fr_.8fr] md:items-start">
                  <div className="order-1 text-right">
                    <div className="flex items-start gap-4">
                      {image ? (
                        <img
                          src={image}
                          alt={itemName(item)}
                          className="mt-1 h-16 w-16 flex-none rounded-full bg-slate-100 object-cover"
                        />
                      ) : (
                        <div className="mt-1 h-16 w-16 flex-none rounded-full bg-slate-100" />
                      )}

                      <div className="min-w-0 flex-1 text-right">
                        <div className="text-[17px] font-medium text-[#0f7092]">
                          {itemName(item)}
                        </div>

                        <ProductMetaRows
                          sku={skuValue && skuValue !== "-" ? skuValue : ""}
                          optionRows={optionRows}
                        />

                        {noteValue ? (
                          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                            <div className="font-medium">النص المرفق</div>
                            <div className="mt-1 break-words">{noteValue}</div>
                          </div>
                        ) : null}

                        {imageAttachments.length > 0 ? (
                          <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-3">
                            <div className="text-sm font-medium text-sky-800">
                              الصور المرفقة
                            </div>

                            <div className="mt-3 flex flex-wrap justify-end gap-3">
                              {imageAttachments.map((file) => (
                                <div
                                  key={`${file.index}-${file.url}`}
                                  className="w-[116px] overflow-hidden rounded-xl border border-slate-200 bg-white"
                                >
                                  <button
                                    type="button"
                                    onClick={() => openPreview(file)}
                                    className="block w-full cursor-pointer"
                                  >
                                    <img
                                      src={file.url}
                                      alt={file.name}
                                      className="h-[95px] w-full object-cover"
                                    />
                                  </button>

                                  <div className="p-2 text-center">
                                    <div className="truncate text-xs text-slate-500">
                                      {file.name}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => openPreview(file)}
                                      className="mt-1 inline-block text-sm font-medium text-sky-700 hover:underline"
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
                          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                            <div className="text-sm font-medium text-slate-700">
                              الملفات المرفقة
                            </div>

                            <div className="mt-2 flex flex-col items-end gap-2">
                              {otherAttachments.map((file) => (
                                <a
                                  key={`${file.index}-${file.url}`}
                                  href={file.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                                >
                                  فتح {file.name}
                                </a>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="order-2 text-right text-[17px] text-slate-600 md:pt-3">
                    {n(item.qty)}
                  </div>

                  <div className="order-3 text-right text-[17px] text-slate-600 md:pt-3">
                    {itemWeight(item)}
                  </div>

                  <div className="order-4 text-right text-[17px] text-slate-600 md:pt-3">
                    {money(item.unit_price, s(order.currency) || "SAR")}
                  </div>

                  <div className="order-5 text-right text-[17px] text-slate-600 md:pt-3">
                    {money(item.total_price, s(order.currency) || "SAR")}
                  </div>
                </div>
              </div>
            );
          })}

          {items.length === 0 && (
            <div className="px-8 py-10 text-center text-slate-400">
              لا توجد منتجات في هذا الطلب
            </div>
          )}
        </div>
      </section>

      <ImagePreviewModal
        open={preview.open}
        imageUrl={preview.url}
        imageName={preview.name}
        onClose={closePreview}
      />
    </>
  );
}