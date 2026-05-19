import type { Brand } from "./types";

export async function listBrands(): Promise<Brand[]> {
  const r = await fetch("/api/brands", { cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j?.ok) throw new Error(j?.error || "LIST_FAILED");
  return (j.items || []) as Brand[];
}

export async function createBrand(payload: Partial<Brand>) {
  const r = await fetch("/api/brands", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j?.ok) throw new Error(j?.error || "CREATE_FAILED");
  return j.item as Brand;
}

export async function updateBrand(id: string, payload: Partial<Brand>) {
  const r = await fetch(`/api/brands/${id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j?.ok) throw new Error(j?.error || "UPDATE_FAILED");
  return j.item as Brand;
}

export async function deleteBrand(id: string) {
  const r = await fetch(`/api/brands/${id}`, { method: "DELETE" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j?.ok) throw new Error(j?.error || "DELETE_FAILED");
}

export async function uploadBrandImage(file: File, target: "logo" | "banner") {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("target", target);

  const res = await fetch("/api/uploads/brands", { method: "POST", body: fd });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j?.ok) throw new Error(j?.error || "UPLOAD_FAILED");

  return { url: String(j.url), key: String(j.key || "") };
}
