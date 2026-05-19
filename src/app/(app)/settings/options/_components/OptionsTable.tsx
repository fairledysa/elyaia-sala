//3) app/(app)/settings/options/_components/OptionsTable.tsx
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function OptionsTable({ children }: Props) {
  return <div className="divide-y divide-slate-100">{children}</div>;
}