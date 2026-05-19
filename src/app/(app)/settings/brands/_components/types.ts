//git checkout -- apps/merchant/src/app/(app)/settings/brands/_components/types.ts

export type Brand = {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  seo_title: string | null;
  seo_slug: string | null;
  seo_description: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};
