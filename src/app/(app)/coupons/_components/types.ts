// FILE: apps/merchant/src/app/(app)/coupons/_components/types.ts
export type CouponRow = {
  id: string;
  store_id: string;

  code: string;

  discount_type: "P" | "F";
  amount: number;
  maximum_amount: number | null;
  show_maximum_amount: boolean;

  start_at: string | null;
  end_at: string | null;

  free_shipping: boolean;
  exclude_sale_products: boolean;

  minimum_amount: number | null;
  usage_limit: number | null;
  usage_limit_per_user: number | null;

  is_apply_with_offer: boolean;

  marketing_active: boolean;
  marketing_name: string | null;
  marketing_type: "P" | "F" | null;
  marketing_amount: number | null;
  marketing_info: string | null;
  marketing_hide_total_sales: boolean;
  marketing_maximum_amount: number | null;
  marketing_show_maximum_amount: boolean;

  status: "active" | "inactive";

  created_at: string;
  updated_at: string;
};

export type CouponUpsertInput = {
  code: string;
  discount_type: "P" | "F";
  amount: number;
  maximum_amount?: number | null;
  show_maximum_amount?: boolean;

  start_at?: string | null;
  end_at?: string | null;

  free_shipping?: boolean;
  exclude_sale_products?: boolean;

  minimum_amount?: number | null;
  usage_limit?: number | null;
  usage_limit_per_user?: number | null;

  is_apply_with_offer?: boolean;

  marketing_active?: boolean;
  marketing_name?: string | null;
  marketing_type?: "P" | "F" | null;
  marketing_amount?: number | null;
  marketing_info?: string | null;
  marketing_hide_total_sales?: boolean;
  marketing_maximum_amount?: number | null;
  marketing_show_maximum_amount?: boolean;

  status?: "active" | "inactive";
};
