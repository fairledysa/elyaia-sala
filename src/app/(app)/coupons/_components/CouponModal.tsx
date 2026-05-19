// FILE: apps/merchant/src/app/(app)/coupons/_components/CouponModal.tsx
"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import Modal, {
  ModalBody,
  ModalFooter,
  ModalFooterChild,
  ModalHeader,
} from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

import CouponForm, { type CouponFormHandle } from "./CouponForm";
import type { CouponRow } from "./types";

type UiState = {
  disabled: boolean;
  saving: boolean;
  deleting: boolean;
  error: boolean;
};

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
        <div className="space-y-2" dir="rtl">
          <div className="text-sm text-zinc-800">
            {desc ?? "هل أنت متأكد من حذف هذا العنصر؟"}
          </div>
          <div className="text-xs text-zinc-500">
            لا يمكن التراجع عن هذا الإجراء.
          </div>
        </div>
      </ModalBody>

      <ModalFooter className="gap-4">
        <ModalFooterChild className="w-full">
          <Button
            className="w-full"
            variant="outline"
            color="zinc"
            dimension="lg"
            onClick={onClose}
            isDisable={!!loading}
          >
            إلغاء
          </Button>
        </ModalFooterChild>

        <ModalFooterChild className="w-full">
          <Button
            className="w-full !bg-red-600 hover:!bg-red-700 !text-white"
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

export default function CouponModal(props: {
  open: boolean;
  onClose: () => void;
  editing: CouponRow | null;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const { open, onClose, editing, onSaved, onDeleted } = props;

  const formRef = useRef<CouponFormHandle | null>(null);

  const [ui, setUi] = useState<UiState>({
    disabled: false,
    saving: false,
    deleting: false,
    error: false,
  });

  // ✅ ثابتة وما تسبب loop
  const handleUiChange = useCallback((x: UiState) => {
    setUi((prev) => {
      if (
        prev.disabled === x.disabled &&
        prev.saving === x.saving &&
        prev.deleting === x.deleting &&
        prev.error === x.error
      )
        return prev;
      return x;
    });
  }, []);

  // تأكيد الحذف داخل المودال
  const [confirmOpen, setConfirmOpen] = useState(false);

  const title = useMemo(
    () => (editing ? "تعديل كوبون تخفيض" : "إضافة كوبون تخفيض"),
    [editing],
  );

  const disabled = !!ui.disabled;
  const isSaving = !!ui.saving;
  const isDeleting = !!ui.deleting;

  return (
    <>
      <Modal
        isOpen={open}
        setIsOpen={() => onClose()}
        isScrollable
        isStaticBackdrop
      >
        <ModalHeader>{title}</ModalHeader>

        <ModalBody>
          <CouponForm
            ref={formRef}
            editing={editing}
            onSaved={() => {
              onSaved();
            }}
            onDeleted={() => {
              onDeleted();
            }}
            onUiChange={handleUiChange}
          />
        </ModalBody>

        {/* ✅ أزرار المودال: (إلغاء + حفظ) و (حذف عند التعديل) */}
        <ModalFooter className="gap-4">
          <ModalFooterChild className="w-full">
            <Button
              className="w-full"
              variant="outline"
              color="zinc"
              dimension="lg"
              onClick={onClose}
              isDisable={disabled}
            >
              إلغاء
            </Button>
          </ModalFooterChild>

          {editing ? (
            <ModalFooterChild className="w-full">
              <Button
                className="w-full !bg-red-600 hover:!bg-red-700 !text-white"
                variant="solid"
                color="red"
                dimension="lg"
                onClick={() => setConfirmOpen(true)}
                isDisable={disabled}
                isLoading={isDeleting}
              >
                حذف
              </Button>
            </ModalFooterChild>
          ) : null}

          <ModalFooterChild className="w-full">
            {/* ✅ زر الحفظ مكان زر الإغلاق */}
            <Button
              className="w-full"
              variant="solid"
              color="primary"
              dimension="lg"
              onClick={() => formRef.current?.save()}
              isDisable={disabled}
              isLoading={isSaving}
            >
              حفظ
            </Button>
          </ModalFooterChild>
        </ModalFooter>
      </Modal>

      <ConfirmDeleteModal
        open={confirmOpen}
        onClose={() => {
          if (isDeleting) return;
          setConfirmOpen(false);
        }}
        onConfirm={async () => {
          // نفّذ الحذف من نفس الفورم (لأنه يعرف id)
          await formRef.current?.del();
          setConfirmOpen(false);
        }}
        loading={isDeleting}
        title="تأكيد الحذف"
        desc={`هل أنت متأكد من حذف الكوبون "${editing?.code ?? ""}"؟`}
      />
    </>
  );
}
