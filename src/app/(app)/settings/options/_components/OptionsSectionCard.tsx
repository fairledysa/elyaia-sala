//  app/(app)/settings/options/_components/OptionsSectionCard.tsx
import type { ReactNode } from "react";

type Props = {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
};

export default function OptionsSectionCard({ title, icon, children }: Props) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          {icon}
        </div>
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}