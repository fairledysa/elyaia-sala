// FILE: apps/merchant/src/app/(app)/themes/_components/ThemesGrid.tsx

import type { ComponentProps } from "react";
import ThemeCard from "./ThemeCard";

type ThemeCardProps = ComponentProps<typeof ThemeCard>;
type MarketplaceCardProps = Extract<ThemeCardProps, { mode: "marketplace" }>;
type MarketplaceThemeItem = MarketplaceCardProps["item"];

export default function ThemesGrid({
  items,
  storeId,
  versionsCount,
  onChanged,
}: {
  items: MarketplaceThemeItem[];
  storeId: string;
  versionsCount?: number;
  onChanged?: () => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {items.map((theme) => (
        <ThemeCard
          key={theme.id}
          mode="marketplace"
          item={theme}
          storeId={storeId}
          versionsCount={versionsCount}
          onChanged={onChanged}
        />
      ))}
    </div>
  );
}