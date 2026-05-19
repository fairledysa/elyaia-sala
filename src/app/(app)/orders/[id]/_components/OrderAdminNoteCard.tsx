// FILE: apps/merchant/src/app/(app)/orders/[id]/_components/OrderAdminNoteCard.tsx
"use client";

import { useEffect, useState } from "react";
import { MessageSquareText, Pencil, Trash2, Save, X } from "lucide-react";
import type { OrderDetails } from "./OrderDetailsPageClient";
import { dt, s } from "./OrderDetailsPageClient";

type NotePayload = {
  ok?: boolean;
  note?: {
    id?: string | null;
    note?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    created_by_name?: string | null;
    updated_by_name?: string | null;
  } | null;
  error?: string;
};

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export default function OrderAdminNoteCard({
  order,
  onUpdated,
}: {
  order: OrderDetails;
  onUpdated?: () => Promise<void> | void;
}) {
  const currentNote = order.order_admin_note ?? null;

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(s(currentNote?.note));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setValue(s(currentNote?.note));
  }, [currentNote?.note]);

  async function handleSave() {
    try {
      setSaving(true);
      setError("");

      const res = await fetch(`/api/orders/${order.id}/admin-note`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          note: value,
        }),
      });

      const data: NotePayload = await safeJson(res);

      if (!res.ok) {
        throw new Error(data?.error || "فشل حفظ الملاحظة");
      }

      setEditing(false);
      await onUpdated?.();
    } catch (e: any) {
      setError(s(e?.message) || "فشل حفظ الملاحظة");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      setDeleting(true);
      setError("");

      const res = await fetch(`/api/orders/${order.id}/admin-note`, {
        method: "DELETE",
        credentials: "include",
      });

      const data: NotePayload = await safeJson(res);

      if (!res.ok) {
        throw new Error(data?.error || "فشل حذف الملاحظة");
      }

      setEditing(false);
      setValue("");
      await onUpdated?.();
    } catch (e: any) {
      setError(s(e?.message) || "فشل حذف الملاحظة");
    } finally {
      setDeleting(false);
    }
  }

  const hasNote = Boolean(s(currentNote?.note));

  return (
    <section className="adm-order-details-card">
      <div className="adm-order-details-card__head">
        <div className="adm-order-details-card__title">
          <MessageSquareText className="adm-order-details__iconLg adm-order-details-card__titleIcon" />
          ملاحظات الإدارة
        </div>

        <div className="adm-order-details-bottom__actions">
          {!editing ? (
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setError("");
              }}
              className="adm-order-details-btn adm-order-details-btn--mint"
            >
              <Pencil className="adm-order-details__icon" />
              {hasNote ? "تعديل الملاحظة" : "إضافة ملاحظة"}
            </button>
          ) : (
            <>
              {hasNote ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting || saving}
                  className="adm-order-details-btn adm-order-details-btn--danger"
                >
                  <Trash2 className="adm-order-details__icon" />
                  {deleting ? "جارٍ الحذف..." : "حذف"}
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setValue(s(currentNote?.note));
                  setError("");
                }}
                disabled={saving || deleting}
                className="adm-order-details-btn adm-order-details-btn--light"
              >
                <X className="adm-order-details__icon" />
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving || deleting}
                className="adm-order-details-btn adm-order-details-btn--primary"
              >
                <Save className="adm-order-details__icon" />
                {saving ? "جارٍ الحفظ..." : "حفظ"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="adm-order-details-noteContent">
        {editing ? (
          <>
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="اكتب ملاحظة داخلية خاصة بالإدارة..."
              className="adm-order-details-textarea"
            />

            {error ? (
              <div className="adm-order-details-alertDanger">{error}</div>
            ) : null}
          </>
        ) : hasNote ? (
          <>
            <div className="adm-order-details-noteTextBox">
              {s(currentNote?.note)}
            </div>

            <div className="adm-order-details-noteMeta">
              {s(currentNote?.updated_by_name)
                ? `آخر تحديث بواسطة: ${s(currentNote?.updated_by_name)}`
                : s(currentNote?.created_by_name)
                  ? `أُضيفت بواسطة: ${s(currentNote?.created_by_name)}`
                  : "ملاحظة داخلية"}
            </div>

            <div dir="ltr" className="adm-order-details-noteMeta">
              {dt(currentNote?.updated_at || currentNote?.created_at)}
            </div>
          </>
        ) : (
          <div className="adm-order-details-noteEmpty">
            لا توجد ملاحظات إدارية حتى الآن.
          </div>
        )}
      </div>
    </section>
  );
}