// FILE: apps/merchant/src/lib/payments/api.ts
import type { PaymentsGetResponse, PaymentsUpdateOp } from "./types";

async function parseJsonSafe(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { ok: false, error: "INVALID_JSON" };
  }
}

export async function paymentsGet(): Promise<PaymentsGetResponse> {
  const res = await fetch("/api/settings/store/payments/get", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  const data = await parseJsonSafe(res);
  if (!res.ok || !data?.ok) {
    const msg = data?.error || `HTTP_${res.status}`;
    throw new Error(msg);
  }
  return data as PaymentsGetResponse;
}

export async function paymentsUpdate(
  op: PaymentsUpdateOp
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch("/api/settings/store/payments/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(op),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok || !data?.ok) {
    return { ok: false, error: data?.error || `HTTP_${res.status}` };
  }
  return { ok: true };
}
