"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ThemeItem } from "./types";

import Modal, {
  ModalBody,
  ModalFooter,
  ModalFooterChild,
  ModalHeader,
} from "@/boltify/components/ui/Modal";

import Button from "@/boltify/components/ui/Button";
import Input from "@/boltify/components/form/Input";

type Action = "publish" | "rename" | "duplicate" | null;

type Props = {
  item: ThemeItem; // يمثل نسخة ثيم (version)
  storeId?: string; // يجي من ThemesPage ويُرسل في الهيدر x-store-id
  onChanged?: () => void; // refresh list
  versionsCount?: number; // ✅ عدد النسخ لنفس الثيم (لحد 3)
};

function fmtError(e: any) {
  if (!e) return "صار خطأ غير متوقع";
  if (typeof e === "string") return e;
  return e?.message || "صار خطأ غير متوقع";
}

function mapApiError(msg: string) {
  if (!msg) return "صار خطأ غير متوقع";
  if (msg === "MAX_3_VERSIONS_PER_THEME")
    return "وصلت الحد الأقصى (3 نسخ) لهذا الثيم.";
  if (msg === "STORE_ID_MISSING") return "storeId ناقص (الهيدر x-store-id).";
  if (msg === "VERSION_ID_REQUIRED") return "معرّف النسخة (versionId) ناقص.";
  if (msg === "TITLE_REQUIRED") return "اكتب اسم صحيح.";
  if (msg.startsWith("HTTP_")) return "فشل الطلب. جرّب مرة ثانية.";
  return msg;
}

export default function ThemeCardMenu({
  item,
  storeId,
  onChanged,
  versionsCount,
}: Props) {
  const isPublished = item.status === "published";
  const reachedMax =
    typeof versionsCount === "number" ? versionsCount >= 3 : false;

  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<Action>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [title, setTitle] = useState(item.title || "");
  const [dupTitle, setDupTitle] = useState(
    item.title ? `${item.title} (نسخة)` : "نسخة جديدة",
  );

  useEffect(() => {
    setTitle(item.title || "");
    setDupTitle(item.title ? `${item.title} (نسخة)` : "نسخة جديدة");
  }, [item.id, item.title]);

  const modalTitle = useMemo(() => {
    switch (action) {
      case "publish":
        return "تأكيد النشر";
      case "rename":
        return "إعادة تسمية";
      case "duplicate":
        return "تكرار النسخة";
      default:
        return "";
    }
  }, [action]);

  const confirmLabel = useMemo(() => {
    if (busy) return "جاري التنفيذ...";
    switch (action) {
      case "publish":
        return "نشر الآن";
      case "rename":
        return "حفظ";
      case "duplicate":
        return "إنشاء النسخة";
      default:
        return "تأكيد";
    }
  }, [action, busy]);

  const canConfirm = useMemo(() => {
    if (!action) return false;
    if (busy) return false;
    if (action === "duplicate" && reachedMax) return false;
    return true;
  }, [action, busy, reachedMax]);

  function closeMenu() {
    if (detailsRef.current) detailsRef.current.open = false;
  }

  function openAction(a: Action) {
    setErr(null);
    setBusy(false);

    // ✅ منع فتح duplicate إذا وصل 3
    if (a === "duplicate" && reachedMax) {
      setErr("وصلت الحد الأقصى (3 نسخ) لهذا الثيم.");
      setAction("duplicate");
      setOpen(true);
      closeMenu();
      return;
    }

    setAction(a);
    setOpen(true);
    closeMenu();
  }

  function closeModal() {
    setOpen(false);
    setAction(null);
    setBusy(false);
    setErr(null);
  }

  async function postJSON(url: string, body: any) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(storeId ? { "x-store-id": storeId } : {}),
      },
      body: JSON.stringify(body),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || `HTTP_${res.status}`);
    return json;
  }

  async function confirmAction() {
    if (!storeId) {
      setErr(
        "storeId ناقص — لازم تمرره من ThemesPage وتضيفه في header x-store-id.",
      );
      return;
    }

    try {
      setBusy(true);
      setErr(null);

      if (action === "rename") {
        const newTitle = title.trim();
        if (newTitle.length < 2)
          throw new Error("اكتب اسم صحيح (حرفين على الأقل).");

        await postJSON("/api/themes/rename", {
          versionId: item.id,
          title: newTitle,
        });
      }

      if (action === "duplicate") {
        if (reachedMax) throw new Error("MAX_3_VERSIONS_PER_THEME");
        const newTitle = dupTitle.trim();
        if (newTitle.length < 2) throw new Error("اكتب اسم صحيح للنسخة.");

        await postJSON("/api/themes/duplicate", {
          versionId: item.id,
          title: newTitle,
        });
      }

      if (action === "publish") {
        await postJSON("/api/themes/publish", { versionId: item.id });
      }

      closeModal();
      onChanged?.();
    } catch (e: any) {
      setErr(mapApiError(fmtError(e)));
      setBusy(false);
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    closeMenu();
    try {
      const link = item.previewHref || item.customizeHref || "";
      if (!link) return;
      await navigator.clipboard.writeText(link);
    } catch {}
  }

  return (
    <>
     <details ref={detailsRef} className="adm-theme-menu relative">
         <summary className="adm-theme-menu__trigger">
          ⋯
        </summary>

         <div className="adm-theme-menu__panel">
          {!isPublished ? (
            <button
              className="w-full text-right px-3 py-2 text-sm hover:bg-gray-50"
              onClick={() => openAction("publish")}
              type="button"
            >
              نشر
            </button>
          ) : (
            <div className="w-full text-right px-3 py-2 text-sm bg-emerald-50 text-emerald-700">
              ✅ هذه النسخة منشورة
            </div>
          )}

          <a
            href={item.previewHref || "#"}
            className="block px-3 py-2 text-sm hover:bg-gray-50"
            onClick={closeMenu}
          >
            معاينة
          </a>

          <button
            className="w-full text-right px-3 py-2 text-sm hover:bg-gray-50"
            onClick={copyLink}
            type="button"
          >
            نسخ الرابط
          </button>

          <button
            className="w-full text-right px-3 py-2 text-sm hover:bg-gray-50"
            onClick={() => openAction("rename")}
            type="button"
          >
            إعادة تسمية
          </button>

          <button
            className={`w-full text-right px-3 py-2 text-sm hover:bg-gray-50 ${
              reachedMax ? "opacity-50 pointer-events-none" : ""
            }`}
            onClick={() => openAction("duplicate")}
            type="button"
            title={reachedMax ? "الحد الأقصى 3 نسخ" : ""}
          >
            تكرار النسخة
          </button>
        </div>
      </details>

      <Modal isOpen={open} setIsOpen={setOpen} isCentered>
        <ModalHeader>{modalTitle}</ModalHeader>

        <ModalBody>
          {action === "publish" ? (
            <div className="text-sm text-gray-700 leading-6">
              سيتم نشر هذه النسخة وجعلها النسخة المعتمدة للمتجر.
              <br />
              سيتم تحويل أي نسخة أخرى منشورة إلى <b>مسودة</b>.
            </div>
          ) : null}

          {action === "rename" ? (
            <div className="space-y-2">
              <div className="text-sm text-gray-700">
                اكتب اسم جديد لهذه النسخة:
              </div>
              <Input
                name="title"
                value={title}
                onChange={(e: any) => setTitle(e.target.value)}
                placeholder="اسم النسخة"
              />
              <div className="text-xs text-gray-500">
                مثال: {item.themeName} - (1)
              </div>
            </div>
          ) : null}

          {action === "duplicate" ? (
            <div className="space-y-2">
              <div className="text-sm text-gray-700">
                سيتم إنشاء نسخة جديدة (<b>مسودة</b>). الحد الأقصى <b>3</b> نسخ
                لكل ثيم.
              </div>
              <Input
                name="dupTitle"
                value={dupTitle}
                onChange={(e: any) => setDupTitle(e.target.value)}
                placeholder="اسم النسخة الجديدة"
              />
              {reachedMax ? (
                <div className="text-xs text-red-600">
                  لا يمكن إنشاء نسخة إضافية — وصلت 3 نسخ.
                </div>
              ) : null}
            </div>
          ) : null}

          {err ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </div>
          ) : null}
        </ModalBody>

        <ModalFooter>
          <ModalFooterChild>
            <Button
              color="zinc"
              variant="outline"
              onClick={closeModal}
              isDisable={busy}
              type="button"
            >
              إلغاء
            </Button>
          </ModalFooterChild>

          <ModalFooterChild>
            <Button
              color="primary"
              variant="solid"
              onClick={confirmAction}
              isDisable={!canConfirm}
              isLoading={busy}
              type="button"
            >
              {confirmLabel}
            </Button>
          </ModalFooterChild>
        </ModalFooter>
      </Modal>
    </>
  );
}
