// FILE: apps/merchant/src/app/(app)/feedback/_components/FeedbackList.tsx

import FeedbackCard from "./FeedbackCard";
import type { FeedbackItem } from "./types";

export default function FeedbackList({
  items,
  onReload,
}: {
  items: FeedbackItem[];
  onReload: () => void;
}) {
  return (
    <div className="adm-feedback-list">
      {items.map((item) => (
        <FeedbackCard key={item.id} item={item} onReload={onReload} />
      ))}
    </div>
  );
}