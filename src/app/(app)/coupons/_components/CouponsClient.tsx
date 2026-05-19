// FILE: apps/merchant/src/app/(app)/coupons/_components/CouponsClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

import Card, { CardBody } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/icon/Icon";
import Checkbox from "@/components/form/Checkbox";

import Modal, {
  ModalBody,
  ModalFooter,
  ModalFooterChild,
  ModalHeader,
} from "@/components/ui/Modal";

import CouponModal from "./CouponModal";
import type { CouponRow } from "./types";

type LoadState = "idle" | "loading" | "error";
type DeleteState = "idle" | "deleting" | "error";

function formatDateTimeAr(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleString("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isActive(row: CouponRow) {
  return row.status === "active";
}

function ConfirmDeleteModal(props: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  title?: string;
  desc?: string;
}) {
  const { open, onClose, onConfirm, loading, title, desc } = props;

  return (
    <Modal isOpen={open} setIsOpen={() => onClose()} isStaticBackdrop>
      <ModalHeader>{title ?? "تأكيد الحذف"}</ModalHeader>

      <ModalBody>
        <div className="adm-coupons-confirm" dir="rtl">
          <div className="adm-coupons-confirm__title">
            {desc ?? "هل أنت متأكد من حذف هذا العنصر؟"}
          </div>

          <div className="adm-coupons-confirm__desc">
            لا يمكن التراجع عن هذا الإجراء.
          </div>
        </div>
      </ModalBody>

      <ModalFooter className="adm-coupons-confirm__footer">
        <ModalFooterChild className="adm-coupons-confirm__footerItem">
          <Button
            className="adm-coupons-confirm__btn"
            variant="outline"
            color="zinc"
            dimension="lg"
            onClick={onClose}
            isDisable={!!loading}
          >
            إلغاء
          </Button>
        </ModalFooterChild>

        <ModalFooterChild className="adm-coupons-confirm__footerItem">
          <Button
            className="adm-coupons-confirm__btn adm-coupons-confirm__btn--danger"
            variant="solid"
            color="red"
            dimension="lg"
            onClick={onConfirm}
            isLoading={!!loading}
            isDisable={!!loading}
          >
            نعم، احذف
          </Button>
        </ModalFooterChild>
      </ModalFooter>
    </Modal>
  );
}

export default function CouponsClient() {
  const [state, setState] = useState<LoadState>("idle");
  const [rows, setRows] = useState<CouponRow[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CouponRow | null>(null);

  const [toggleBusyId, setToggleBusyId] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteState, setDeleteState] = useState<DeleteState>("idle");
  const [deletingRow, setDeletingRow] = useState<CouponRow | null>(null);

  const deletingId = deletingRow?.id ?? null;
  const isDeleting = deleteState === "deleting";

  async function load() {
    setState("loading");

    try {
      const r = await fetch("/api/coupons", { cache: "no-store" });
      const j = await r.json().catch(() => ({}));

      if (!r.ok) throw new Error(j?.error || "FAILED_LOAD");

      setRows(Array.isArray(j?.data) ? j.data : []);
      setState("idle");
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const activeCount = useMemo(
    () => rows.filter((x) => x.status === "active").length,
    [rows],
  );

  async function toggleStatus(row: CouponRow, next: boolean) {
    const prev = rows;

    setToggleBusyId(row.id);
    setRows((p) =>
      p.map((x) =>
        x.id === row.id ? { ...x, status: next ? "active" : "inactive" } : x,
      ),
    );

    try {
      const r = await fetch(`/api/coupons/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next ? "active" : "inactive" }),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "TOGGLE_FAILED");
    } catch {
      setRows(prev);
    } finally {
      setToggleBusyId(null);
    }
  }

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (row: CouponRow) => {
    setEditing(row);
    setOpen(true);
  };

  function askDelete(row: CouponRow) {
    if (isActive(row)) return;

    setDeletingRow(row);
    setDeleteState("idle");
    setConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!deletingRow) return;

    setDeleteState("deleting");

    try {
      const r = await fetch(`/api/coupons/${deletingRow.id}`, {
        method: "DELETE",
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "DELETE_FAILED");

      setDeleteState("idle");
      setConfirmOpen(false);
      setDeletingRow(null);

      await load();
    } catch {
      setDeleteState("error");
    }
  }

  return (
    <div className="adm-coupons" dir="rtl">
      <section className="adm-card adm-card--lg adm-coupons-toolbar">
        <div className="adm-card__head">
          <div className="adm-card__titleWrap">
            <h2 className="adm-card__title">قائمة الكوبونات</h2>
            <p className="adm-card__desc">
              مفعل: <strong>{activeCount}</strong> / <strong>{rows.length}</strong>
            </p>
          </div>

          <div className="adm-card__actions">
            <Badge variant="soft">كوبونات خصم</Badge>

            <Button variant="solid" color="primary" onClick={openCreate}>
              <span className="adm-coupons-add-btn">
                <Icon icon="PlusSign" />
                <span>إضافة</span>
              </span>
            </Button>
          </div>
        </div>
      </section>

      {state === "loading" ? (
        <Card className="adm-coupons-state-card">
          <CardBody className="adm-coupons-state">جاري التحميل...</CardBody>
        </Card>
      ) : null}

      {state === "error" ? (
        <Card className="adm-coupons-state-card">
          <CardBody className="adm-coupons-state adm-coupons-state--error">
            تعذر تحميل الكوبونات.
          </CardBody>
        </Card>
      ) : null}

      {state === "idle" ? (
        <div className="adm-coupons-grid">
          {rows.map((x) => {
            const active = isActive(x);
            const busy = toggleBusyId === x.id;

            const deletingThis = isDeleting && deletingId === x.id;
            const lockActions = busy || deletingThis;

            return (
              <div key={x.id} className="adm-coupons-grid__item">
                <Card className="adm-coupons-card">
                  <CardBody className="adm-coupons-card__top">
                    <div className="adm-coupons-card__header">
                      <div className="adm-coupons-card__codeWrap">
                        <div className="adm-coupons-card__code">{x.code}</div>
                        <div className="adm-coupons-card__statusText">
                          {active ? "مفعل" : "مغلق"}
                        </div>
                      </div>

                      <div className="adm-coupons-card__switch">
                        <Badge variant="soft">
                          {active ? "Active" : "Inactive"}
                        </Badge>

                        <span
  className={[
    "adm-coupons-switch",
    active ? "adm-coupons-switch--active" : "",
    lockActions ? "adm-coupons-switch--disabled" : "",
  ].join(" ")}
>
  <Checkbox
    variant="switch"
    checked={active}
    disabled={lockActions}
    onChange={(e: any) =>
      toggleStatus(x, !!e?.target?.checked)
    }
  />
</span>
                      </div>
                    </div>

                    <div className="adm-coupons-card__dates">
                      <div className="adm-coupons-card__dateRow">
                        <span>تاريخ البداية</span>
                        <strong>{formatDateTimeAr(x.start_at)}</strong>
                      </div>

                      <div className="adm-coupons-card__dateRow">
                        <span>تاريخ الانتهاء</span>
                        <strong>{formatDateTimeAr(x.end_at)}</strong>
                      </div>
                    </div>
                  </CardBody>

                  <CardBody className="adm-coupons-card__bottom">
                    <div className="adm-coupons-actions">
                      <Button
                        variant="link"
                        className="adm-coupons-link-btn"
                        aria-label="Edit"
                        onClick={() => openEdit(x)}
                        isDisable={lockActions}
                      >
                        تعديل
                      </Button>

                      <Button
                        variant="link"
                        className="adm-coupons-link-btn"
                        aria-label="Stats"
                        onClick={() => {
                          // placeholder
                        }}
                        isDisable={lockActions}
                      >
                        إحصائيات
                      </Button>

                      <Button
                        variant="link"
                        className="adm-coupons-link-btn adm-coupons-link-btn--danger"
                        aria-label="Remove"
                        onClick={() => askDelete(x)}
                        isDisable={lockActions || active}
                      >
                        حذف
                      </Button>
                    </div>

                    {active ? (
                      <div className="adm-coupons-card__note">
                        لإمكانية الحذف، قم بإيقاف الكوبون أولاً.
                      </div>
                    ) : null}
                  </CardBody>
                </Card>
              </div>
            );
          })}

          <div className="adm-coupons-grid__item">
            <Card className="adm-coupons-add-card">
              <CardBody className="adm-coupons-add-card__body" onClick={openCreate}>
                <div className="adm-coupons-add-card__content">
                  <div className="adm-coupons-add-card__icon">
                    <Icon icon="PlusSign" />
                  </div>

                  <div className="adm-coupons-add-card__title">إضافة كوبون</div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      ) : null}

      <CouponModal
        open={open}
        onClose={() => setOpen(false)}
        editing={editing}
        onSaved={async () => {
          setOpen(false);
          await load();
        }}
        onDeleted={async () => {
          setOpen(false);
          await load();
        }}
      />

      <ConfirmDeleteModal
        open={confirmOpen}
        onClose={() => {
          if (isDeleting) return;
          setConfirmOpen(false);
          setDeletingRow(null);
          setDeleteState("idle");
        }}
        onConfirm={confirmDelete}
        loading={isDeleting}
        title="تأكيد الحذف"
        desc={`هل أنت متأكد من حذف الكوبون "${deletingRow?.code ?? ""}"؟`}
      />

      {deleteState === "error" ? (
        <Card className="adm-coupons-state-card">
          <CardBody className="adm-coupons-state adm-coupons-state--error">
            فشل حذف الكوبون. حاول مرة أخرى.
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}