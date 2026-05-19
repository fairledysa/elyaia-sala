// FILE: apps/merchant/src/app/(app)/feedback/_components/FeedbackFilters.tsx

"use client";

type FeedbackTab = "all" | "reviews" | "questions";

export default function FeedbackFilters({
  tab,
  onChange,
}: {
  tab: FeedbackTab;
  onChange: (tab: FeedbackTab) => void;
}) {
  const btn = (value: FeedbackTab, label: string) => {
    const active = tab === value;

    return (
      <button
        type="button"
        onClick={() => onChange(value)}
        className={[
          "adm-feedback-tab",
          active ? "adm-feedback-tab--active" : "",
        ].join(" ")}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="adm-feedback-tabs">
      {btn("all", "الكل")}
      {btn("reviews", "التقييمات")}
      {btn("questions", "الأسئلة")}
    </div>
  );
}