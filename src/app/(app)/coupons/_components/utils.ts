// FILE: apps/merchant/src/app/(app)/coupons/_components/utils.ts
export function toNumberOrNull(x: unknown): number | null {
  if (x === null || x === undefined || x === "") return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

export function toIntOrNull(x: unknown): number | null {
  const n = toNumberOrNull(x);
  if (n === null) return null;
  return Math.trunc(n);
}

export function sanitizeCode(code: string): string {
  return String(code ?? "")
    .trim()
    .replace(/\s+/g, ""); // بدون مسافات مثل سلة
}

export function isoOrNull(d: string): string | null {
  if (!d) return null;
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
}
