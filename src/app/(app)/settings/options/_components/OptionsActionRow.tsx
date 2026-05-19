//6) app/(app)/settings/options/_components/OptionsActionRow.tsx
"use client";

import OptionsRow from "./OptionsRow";

type Props = {
  title: string;
  description?: string;
  onClick: () => void;
};

export default function OptionsActionRow({
  title,
  description,
  onClick,
}: Props) {
  return (
    <OptionsRow
      title={title}
      description={description}
      right={
        <button
          type="button"
          onClick={onClick}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
        >
          تعيين
        </button>
      }
    />
  );
}