// FILE: apps/merchant/src/app/(app)/themes/_components/types.ts

export type ThemeStatus = "draft" | "published";

export type ThemeItem = {
  id: string;
  title: string;
  status: ThemeStatus;

  is_default?: boolean;
  isDefault?: boolean;

  version_no?: number;
  versionNo?: number;

  last_updated_at?: string | null;
  lastUpdatedAt?: string | null;
  lastUpdatedTime?: string | null;

  theme_id?: string | null;
  themeId?: string | null;
  theme_key?: string | null;
  themeKey?: string | null;
  themeName?: string | null;

  isFree?: boolean;
  thumbUrl?: string | null;
  marketplaceId?: string | null;

  theme?: {
    key?: string | null;
    name?: string | null;
    is_free?: boolean | null;
    thumb_url?: string | null;
    marketplace_id?: string | null;
  } | null;

  previewHref?: string;
  customizeHref?: string;
};

export type MarketplaceThemeItem = {
  id: string;
  key: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  vendor?: string | null;
  is_free: boolean;
  thumb_url: string | null;
  marketplace_id: string | null;
  status: string | null;
  is_active: boolean;
  installedVersionsCount: number;
  isInstalled: boolean;
  reachedMax: boolean;
  previewHref?: string;
};