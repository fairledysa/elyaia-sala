// FILE: apps/merchant/src/app/(theme-editor)/themes/[themeId]/customize/_components/SidebarShell.tsx
"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";

type SaveState = {
  pageKey?: string;
  showSaveButton?: boolean;
  label?: string;
  canSave?: boolean;
  saving?: boolean;
};

export default function SidebarShell({
  title,
  description,
  helpHref,
  onOpenAddPanel,
  showHeader = true,
  children,
}: {
  title?: string;
  description?: string;
  helpHref?: string;
  onOpenAddPanel?: () => void;
  showHeader?: boolean;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<SaveState>({
    pageKey: undefined,
    showSaveButton: false,
    label: "حفظ التغييرات",
    canSave: false,
    saving: false,
  });

  useEffect(() => {
    function onSaveState(e: Event) {
      const ce = e as CustomEvent<SaveState>;
      setState((prev) => ({ ...prev, ...ce.detail }));
    }

    window.addEventListener(
      "theme-editor:save-state",
      onSaveState as EventListener,
    );

    // ✅ طلب حالة الزر من الصفحة الحالية (Handshake)
    window.dispatchEvent(new CustomEvent("theme-editor:save-state:request"));

    return () => {
      window.removeEventListener(
        "theme-editor:save-state",
        onSaveState as EventListener,
      );
    };
  }, []);

  function triggerSave() {
    window.dispatchEvent(
      new CustomEvent("theme-editor:save", {
        detail: { pageKey: state.pageKey },
      }),
    );
  }

  return (
    <aside className="sticky top-[56px] z-40 h-[calc(100vh-56px)] w-full max-w-[440px] border-l bg-white">
      <div className="flex h-full flex-col">
        {showHeader ? (
          <div className="border-b px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-base font-semibold">{title || ""}</h1>
                {description ? (
                  <p className="mt-1 text-sm text-gray-600">{description}</p>
                ) : null}
              </div>

              {helpHref ? (
                <a
                  href={helpHref}
                  className="text-sm text-blue-600 hover:underline"
                >
                  اطّلع على الدليل
                </a>
              ) : null}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={onOpenAddPanel}
                disabled={!onOpenAddPanel}
              >
                + إضافة عنصر جديد
              </button>

              <button
                type="button"
                className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
              >
                بحث
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex-1 overflow-auto px-4 py-4">{children}</div>

        {/* ✅ زر واحد ثابت تحت */}
        {state.showSaveButton ? (
          <div className="border-t bg-white p-4">
            <Button
              variant="solid"
              color="primary"
              dimension="lg"
              className="w-full"
              onClick={triggerSave}
              isDisable={!state.canSave || !!state.saving}
              isLoading={!!state.saving}
            >
              {state.label || "حفظ التغييرات"}
            </Button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
