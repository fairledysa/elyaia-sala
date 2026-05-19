//7) app/(app)/settings/options/_components/OptionsModalShell.tsx
"use client";

import type { ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: "md" | "lg" | "xl";
};

export default function OptionsModalShell({
  open,
  title,
  onClose,
  children,
  footer,
  width = "lg",
}: Props) {
  if (!open) return null;

  const widthClass =
    width === "md"
      ? "max-w-2xl"
      : width === "xl"
      ? "max-w-5xl"
      : "max-w-3xl";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
      <div className={`w-full ${widthClass} overflow-hidden rounded-[28px] bg-white shadow-2xl`} dir="rtl">
        <div className="flex items-center justify-between bg-sky-600 px-5 py-4 text-white">
          <h3 className="text-base font-bold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-1 text-xl leading-none hover:bg-white/10"
          >
            ×
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-5 py-5">{children}</div>

        <div className="border-t border-slate-100 px-5 py-4">
          {footer ?? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700"
              >
                إغلاق
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}