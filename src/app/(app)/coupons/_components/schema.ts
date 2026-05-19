// FILE: apps/merchant/src/app/(app)/coupons/_components/schema.ts
import { CouponUpsertInput } from "./types";
import { sanitizeCode, toIntOrNull, toNumberOrNull } from "./utils";

export function normalizeCouponInput(raw: any): CouponUpsertInput {
  const code = sanitizeCode(raw?.code ?? "");
  const discount_type = raw?.discount_type === "F" ? "F" : "P";

  const amount = Number(raw?.amount ?? 0) || 0;

  return {
    code,
    discount_type,
    amount,

    maximum_amount: toNumberOrNull(raw?.maximum_amount),
    show_maximum_amount: Boolean(raw?.show_maximum_amount),

    start_at: raw?.start_at ?? null,
    end_at: raw?.end_at ?? null,

    free_shipping: Boolean(raw?.free_shipping),
    exclude_sale_products: Boolean(raw?.exclude_sale_products),

    minimum_amount: toNumberOrNull(raw?.minimum_amount),
    usage_limit: toIntOrNull(raw?.usage_limit),
    usage_limit_per_user: toIntOrNull(raw?.usage_limit_per_user),

    is_apply_with_offer: raw?.is_apply_with_offer !== false,

    marketing_active: Boolean(raw?.marketing_active),
    marketing_name: raw?.marketing_name ? String(raw.marketing_name) : null,
    marketing_type:
      raw?.marketing_type === "F"
        ? "F"
        : raw?.marketing_type === "P"
          ? "P"
          : null,
    marketing_amount: toNumberOrNull(raw?.marketing_amount),
    marketing_info: raw?.marketing_info ? String(raw.marketing_info) : null,
    marketing_hide_total_sales: Boolean(raw?.marketing_hide_total_sales),
    marketing_maximum_amount: toNumberOrNull(raw?.marketing_maximum_amount),
    marketing_show_maximum_amount: Boolean(raw?.marketing_show_maximum_amount),

    status: raw?.status === "inactive" ? "inactive" : "active",
  };
}
