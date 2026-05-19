//app/(app)/products/_dialogs/variant-utils.ts

import type { OptionGroup, VariantRow } from "./options-types";

export const uid = () =>
  (globalThis.crypto?.randomUUID?.() ??
    Math.random().toString(36).slice(2)) as string;

export function normalizeGroups(groups: OptionGroup[]) {
  return groups
    .map((g) => ({
      ...g,
      name: (g.name || "").trim(),
      values: (g.values || []).map((v) => ({
        ...v,
        name: (v.name || "").trim(),
      })),
    }))
    .filter((g) => g.name.length > 0);
}

export function countCartesian(groups: OptionGroup[]) {
  const usable = groups.filter((g) => g.values.some((v) => v.name));
  if (usable.length === 0) return 0;
  return usable.reduce(
    (acc, g) => acc * g.values.filter((v) => v.name).length,
    1,
  );
}

function buildKey(parts: { groupId: string; valueId: string }[]) {
  return parts.map((p) => `${p.groupId}:${p.valueId}`).join("|");
}

export function buildVariantsFromGroups(
  groupsRaw: OptionGroup[],
  prevByKey?: Map<string, VariantRow>,
) {
  const groups = normalizeGroups(groupsRaw).map((g) => ({
    ...g,
    values: g.values.filter((v) => v.name.length > 0),
  }));

  const usable = groups.filter((g) => g.values.length > 0);
  if (usable.length === 0) return [] as VariantRow[];

  // cartesian
  let combos: {
    groupId: string;
    groupName: string;
    valueId: string;
    valueName: string;
  }[][] = [[]];
  for (const g of usable) {
    const next: typeof combos = [];
    for (const base of combos) {
      for (const v of g.values) {
        next.push([
          ...base,
          {
            groupId: g.id,
            groupName: g.name,
            valueId: v.id,
            valueName: v.name,
          },
        ]);
      }
    }
    combos = next;
  }

  return combos.map((selections) => {
    const key = buildKey(
      selections.map((s) => ({ groupId: s.groupId, valueId: s.valueId })),
    );
    const label = selections.map((s) => s.valueName).join(" / ");

    const prev = prevByKey?.get(key);
    return {
      id: prev?.id ?? uid(),
      key,
      label,
      selections,

      price: prev?.price ?? null,
      cost: prev?.cost ?? null,
      discount: prev?.discount ?? null,
      weightKg: prev?.weightKg ?? null,
      barcode: prev?.barcode ?? null,
      sku: prev?.sku ?? null,
      lowQuantity: prev?.lowQuantity ?? null,
      mpn: prev?.mpn ?? null,
      gtin: prev?.gtin ?? null,
      qty: prev?.qty ?? 0,
    } satisfies VariantRow;
  });
}

export function computeSummary(unlimitedQty: boolean, variants: VariantRow[]) {
  const qtyTotal = unlimitedQty
    ? 0
    : variants.reduce((acc, v) => acc + (Number(v.qty) || 0), 0);

  const prices = variants
    .map((v) =>
      typeof v.price === "number" && Number.isFinite(v.price) ? v.price : null,
    )
    .filter((x): x is number => x !== null);

  const min = prices.length ? Math.min(...prices) : null;
  const max = prices.length ? Math.max(...prices) : null;

  const label =
    min === null || max === null
      ? "السعر محدد من الخيارات"
      : min === max
        ? `السعر: ${min}`
        : `السعر: ${min} - ${max}`;

  return {
    variants_total_qty: qtyTotal,
    variants_price_min: min,
    variants_price_max: max,
    variants_price_label: label,
  };
}
