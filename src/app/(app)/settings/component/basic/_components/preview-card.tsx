// FILE: apps/merchant/src/app/(app)/settings/component/basic/_components/preview-card.tsx

import type { ReactNode } from "react";

export default function PreviewCard({ children }: { children: ReactNode }) {
  return <div className="adm-basic-preview-card">{children}</div>;
}