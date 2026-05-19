// apps/merchant/src/app/(app)/profile/_components/tabs.tsx
"use client";

import Button from "@/components/ui/Button";

export default function Tabs({
  tab,
  setTab,
}: {
  tab: "profile" | "security" | "notifications";
  setTab: (t: "profile" | "security" | "notifications") => void;
}) {
  const item = (key: typeof tab, label: string) => (
    <Button
      aria-label={label}
      variant={tab === key ? "soft" : "link"}
      onClick={() => setTab(key)}
    >
      {label}
    </Button>
  );

  return (
    <div className="flex items-center gap-2">
      {item("profile", "الملف الشخصي")}
      {item("security", "الأمان")}
      {item("notifications", "الإشعارات")}
    </div>
  );
}
