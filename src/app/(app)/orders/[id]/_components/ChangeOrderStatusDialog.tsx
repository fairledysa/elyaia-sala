// FILE: apps/merchant/src/app/(app)/orders/[id]/_components/ChangeOrderStatusDialog.tsx
"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import Icon from "@/boltify/components/icon/Icon";

type StatusStyle = CSSProperties & {
  "--adm-order-status-color"?: string;
};

type StatusCardItem = {
  key: string;
  label: string;
  count?: number;
  dotColor: string;
  icon: string;
  type: "base" | "store";
  base_status_key: string;
  store_status_id?: string | null;
};

type StatusSummaryResponse = {
  cards?: StatusCardItem[];
  error?: string;
};

function s(x: any) {
  return String(x ?? "").trim();
}

function statusStyle(color?: string | null): StatusStyle {
  return {
    "--adm-order-status-color": s(color) || "var(--adm-primary, #0d3b45)",
  };
}

export default function ChangeOrderStatusDialog({
  orderId,
  open,
  currentBaseStatusKey,
  currentStoreStatusId,
  currentStatusLabel,
  onClose,
  onUpdated,
}: {
  orderId: string;
  open: boolean;
  currentBaseStatusKey?: string | null;
  currentStoreStatusId?: string | null;
  currentStatusLabel?: string;
  onClose: () => void;
  onUpdated: () => Promise<void> | void;
}) {
  const [loading, setLoading] = useState(false);
  const [loadingStatuses, setLoadingStatuses] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [statuses, setStatuses] = useState<StatusCardItem[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<StatusCardItem | null>(
    null
  );
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;

    setNote("");
    setMenuOpen(false);

    let active = true;

    async function loadStatuses() {
      try {
        setLoadingStatuses(true);

        const res = await fetch("/api/orders/status-summary", {
          cache: "no-store",
          credentials: "include",
        });

        const data: StatusSummaryResponse = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "تعذر تحميل الحالات");
        }

        if (!active) return;

        const list = Array.isArray(data?.cards) ? data.cards : [];
        setStatuses(list);

        const current =
          list.find((item) =>
            item.type === "store"
              ? s(item.store_status_id) === s(currentStoreStatusId)
              : s(item.base_status_key) === s(currentBaseStatusKey)
          ) || null;

        setSelectedStatus(current);
      } catch (e: any) {
        if (!active) return;
        alert(s(e?.message) || "تعذر تحميل الحالات");
      } finally {
        if (!active) return;
        setLoadingStatuses(false);
      }
    }

    loadStatuses();

    return () => {
      active = false;
    };
  }, [open, currentBaseStatusKey, currentStoreStatusId]);

  const visibleStatuses = useMemo(() => {
    return statuses.filter((item) => {
      if (item.type === "store" && !s(item.store_status_id)) return false;
      if (item.type === "base" && !s(item.base_status_key)) return false;
      return true;
    });
  }, [statuses]);

  async function submit() {
    try {
      if (!selectedStatus) {
        alert("اختر الحالة");
        return;
      }

      setLoading(true);

      const body: any = {
        order_ids: [orderId],
        base_status_key: selectedStatus.base_status_key,
        note: s(note) || null,
      };

      if (selectedStatus.type === "store" && selectedStatus.store_status_id) {
        body.store_status_id = selectedStatus.store_status_id;
      }

      const res = await fetch("/api/orders/bulk-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "فشل تحديث الحالة");
      }

      await onUpdated();
      onClose();
    } catch (e: any) {
      alert(s(e?.message) || "فشل تحديث الحالة");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="adm-order-details-dialog">
      <button
        type="button"
        className="adm-order-details-dialog__backdrop"
        onClick={loading ? undefined : onClose}
        aria-label="إغلاق"
      />

      <div className="adm-order-details-dialog__shell" dir="rtl">
        <div className="adm-order-details-dialog__panel adm-order-details-dialog__panel--status">
          <div className="adm-order-details-dialog__head">
            <div className="adm-order-details-dialog__titleWrap">
              <div className="adm-order-details-dialog__title">
                تغيير حالة الطلب
              </div>
              <div className="adm-order-details-dialog__desc">
                الحالة الحالية: {currentStatusLabel || "-"}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="adm-order-details-dialog__close"
              aria-label="إغلاق"
            >
              ×
            </button>
          </div>

          <div className="adm-order-details-dialog__body adm-order-details-dialog__body--status">
            {loadingStatuses ? (
              <div className="adm-order-details-noteEmpty">
                جارٍ تحميل الحالات...
              </div>
            ) : (
              <>
                <div className="adm-order-details-field">
                  <div className="adm-order-details-field__label">
                    اختر حالة الطلب
                  </div>

                  <div className="adm-order-details-selectWrap adm-order-details-selectWrap--static">
                    <button
                      type="button"
                      onClick={() => setMenuOpen((v) => !v)}
                      className="adm-order-details-selectBtn"
                      style={statusStyle(selectedStatus?.dotColor)}
                    >
                      <span className="adm-order-details-selectBtn__label">
                        {selectedStatus?.icon ? (
                          <Icon
                            icon={selectedStatus.icon as any}
                            className="adm-order-details__icon"
                          />
                        ) : null}

                        <span>{selectedStatus?.label || "اختر الحالة"}</span>
                      </span>

                      <span className="adm-order-details-selectBtn__side">
                        <span className="adm-order-details-statusDot" />
                        <span className="adm-order-details-selectBtn__arrow">
                          {menuOpen ? "⌃" : "⌄"}
                        </span>
                      </span>
                    </button>

                    {menuOpen ? (
                      <div className="adm-order-details-selectMenu adm-order-details-selectMenu--static">
                        {visibleStatuses.length === 0 ? (
                          <div className="adm-order-details-selectMenu__empty">
                            لا توجد حالات متاحة
                          </div>
                        ) : (
                          visibleStatuses.map((status) => {
                            const isActive = selectedStatus?.key === status.key;

                            return (
                              <button
                                key={status.key}
                                type="button"
                                onClick={() => {
                                  setSelectedStatus(status);
                                  setMenuOpen(false);
                                }}
                                className={[
                                  "adm-order-details-selectMenu__item",
                                  isActive
                                    ? "adm-order-details-selectMenu__item--active"
                                    : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                                style={statusStyle(status.dotColor)}
                              >
                                <span className="adm-order-details-selectMenu__itemText">
                                  {status.icon ? (
                                    <Icon
                                      icon={status.icon as any}
                                      className="adm-order-details__icon"
                                    />
                                  ) : null}

                                  <span>{status.label}</span>
                                </span>

                                <span className="adm-order-details-statusDot" />
                              </button>
                            );
                          })
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="adm-order-details-field">
                  <div className="adm-order-details-field__label">
                    ملاحظة العميل
                  </div>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={4}
                    placeholder="اكتب ملاحظة تظهر مع تحديث الحالة"
                    className="adm-order-details-textarea"
                  />
                </div>
              </>
            )}
          </div>

          <div className="adm-order-details-dialog__footer">
            <button
              type="button"
              onClick={submit}
              disabled={loading || loadingStatuses}
              className="adm-order-details-btn adm-order-details-btn--primary"
            >
              {loading ? "جارٍ التحديث..." : "حفظ الحالة"}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="adm-order-details-btn adm-order-details-btn--light"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}