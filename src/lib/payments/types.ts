// FILE: apps/merchant/src/lib/payments/types.ts
export type ProviderCode =
  | "card"
  | "apple_pay"
  | "tabby"
  | "tamara"
  | "emkan"
  | "mokafaa";

export type ProviderStatus =
  | "inactive"
  | "needs_setup"
  | "active"
  | "disabled_by_platform";

export type StorePaymentMethod = {
  id: string;
  provider_code: ProviderCode;
  enabled: boolean;
  status: ProviderStatus;
  config: Record<string, any>;
  sort_order: number;
  updated_at: string;
};

export type StoreBankAccount = {
  id: string;
  bank_name: string;
  account_holder: string;
  iban: string;
  is_primary: boolean;
  status: "active" | "disabled";
  updated_at: string;
};

export type StoreCheckoutSettings = {
  prefill_from_last_order: boolean;
  company_purchase_enabled: boolean;
  updated_at?: string;
};

export type PaymentsGetResponse = {
  ok: true;
  store_id: string;
  payment_methods: StorePaymentMethod[];
  bank_accounts: StoreBankAccount[];
  checkout: StoreCheckoutSettings;
};

export type PaymentsUpdateOp =
  | { op: "toggle_provider"; provider_code: ProviderCode; enabled: boolean }
  | {
      op: "update_provider_config";
      provider_code: ProviderCode;
      config: Record<string, any>;
      status?: ProviderStatus;
    }
  | {
      op: "bank_add";
      bank_name: string;
      account_holder: string;
      iban: string;
      is_primary?: boolean;
    }
  | {
      op: "bank_update";
      id: string;
      patch: Partial<{
        bank_name: string;
        account_holder: string;
        iban: string;
        is_primary: boolean;
        status: "active" | "disabled";
      }>;
    }
  | { op: "bank_delete"; id: string }
  | {
      op: "checkout_update";
      patch: Partial<{
        prefill_from_last_order: boolean;
        company_purchase_enabled: boolean;
      }>;
    };

export type ProviderMeta = {
  code: ProviderCode;
  title: string;
  subtitle?: string;
  group: "electronic" | "bnpl" | "loyalty";
  comingSoon?: boolean;
};

export const PROVIDERS: ProviderMeta[] = [
  {
    code: "card",
    title: "المدفوعات الإلكترونية",
    subtitle: "مدى • Visa • Mastercard",
    group: "electronic",
  },
  {
    code: "apple_pay",
    title: "Apple Pay",
    subtitle: "مدفوعات سريعة وآمنة",
    group: "electronic",
  },

  {
    code: "tabby",
    title: "تابي (Tabby)",
    subtitle: "اشترِ الآن وادفع لاحقًا",
    group: "bnpl",
  },
  {
    code: "tamara",
    title: "تمارا (Tamara)",
    subtitle: "اشترِ الآن وادفع لاحقًا",
    group: "bnpl",
  },
  {
    code: "emkan",
    title: "إمكان (Emkan)",
    subtitle: "حلول تقسيط",
    group: "bnpl",
  },

  {
    code: "mokafaa",
    title: "مكافأة (Mokafaa)",
    subtitle: "برنامج ولاء",
    group: "loyalty",
  },
];
