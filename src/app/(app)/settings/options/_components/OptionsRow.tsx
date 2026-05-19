//4) app/(app)/settings/options/_components/OptionsRow.tsx
import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  right: ReactNode;
};

export default function OptionsRow({ title, description, right }: Props) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        {description ? (
          <div className="mt-1 text-xs leading-6 text-slate-500">{description}</div>
        ) : null}
      </div>

      <div className="shrink-0">{right}</div>
    </div>
  );
}