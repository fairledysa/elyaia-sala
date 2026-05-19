// FILE: apps/merchant/src/app/(theme-editor)/themes/[themeId]/customize/lib/homepage-sections-registry.ts

export type HomepageSectionItem = {
  id: string;
  title: string;
  enabled: boolean;
};

export type HomepageSectionRegistryItem = {
  id: string;
  title: string;
  addKey: string;
  img?: string;
  starred?: boolean;
  icon?: string;
  enabledByDefault?: boolean;
};

/**
 * الملف صار fallback فقط للتوافق الخلفي.
 * المصدر الحقيقي للعناصر الآن من قاعدة البيانات عبر:
 * /api/themes/[themeId]/theme-options
 */
export const HOMEPAGE_SECTIONS_REGISTRY: HomepageSectionRegistryItem[] = [];

export const THEME_HOMEPAGE_CAPABILITIES: Record<string, string[]> = {};

export function buildDefaultHomepageSections(_themeCode?: string | null) {
  return [];
}

export function normalizeHomepageSections(
  raw: unknown,
  _themeCode?: string | null,
): HomepageSectionItem[] {
  if (!Array.isArray(raw)) return [];

  const picked: HomepageSectionItem[] = [];
  const seen = new Set<string>();

  for (const row of raw) {
    const id = String((row as any)?.id ?? "").trim();
    if (!id || seen.has(id)) continue;

    picked.push({
      id,
      title: String((row as any)?.title ?? id).trim() || id,
      enabled: Boolean((row as any)?.enabled),
    });

    seen.add(id);
  }

  return picked;
}

export function getHomepageAddPanelItems(_themeCode?: string | null) {
  return [];
}