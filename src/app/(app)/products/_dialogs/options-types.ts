export type OptionFeatureType = "text" | "color" | "image";

export type OptionValue = {
  id: string;
  name: string;
  isDefault?: boolean;
};

export type OptionGroup = {
  id: string;
  name: string;
  featureType: OptionFeatureType;
  values: OptionValue[];
};

export type VariantRow = {
  id: string;
  key: string; // unique combination key
  label: string; // "50/طقطق" style
  selections: {
    groupId: string;
    groupName: string;
    valueId: string;
    valueName: string;
  }[];

  price?: number | null;
  cost?: number | null;
  discount?: number | null;

  weightKg?: number | null;
  barcode?: string | null;
  sku?: string | null;
  lowQuantity?: number | null;
  mpn?: string | null;
  gtin?: string | null;

  qty?: number; // 0..n
};

export type OptionsPayload = {
  hasOptions: boolean;
  unlimitedQty: boolean;
  optionGroups: OptionGroup[];
  variants: VariantRow[];

  // summary used by the product card
  summary: {
    variants_total_qty: number;
    variants_price_min: number | null;
    variants_price_max: number | null;
    variants_price_label: string;
  };
};
