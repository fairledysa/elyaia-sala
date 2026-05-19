// FILE: apps/merchant/src/app/api/uploads/brands/route.ts
import { NextResponse } from "next/server";

const MAX_SIZE_MB = 10;

function fail(error: string, status = 400, details?: any) {
  return NextResponse.json({ ok: false, error, details }, { status });
}

export async function POST(req: Request) {
  try {
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("multipart/form-data")) {
      return fail("EXPECTED_MULTIPART", 415, { got: ct });
    }

    const form = await req.formData();
    const file = form.get("file");
    const target = String(form.get("target") || "brands/logo"); // brands/logo | brands/banner

    if (!(file instanceof File)) return fail("MISSING_FILE", 400);
    if (!file.type.startsWith("image/")) {
      return fail("INVALID_FILE_TYPE", 400, { type: file.type });
    }

    const maxBytes = MAX_SIZE_MB * 1024 * 1024;
    if (file.size > maxBytes) {
      return fail("FILE_TOO_LARGE", 400, {
        maxMB: MAX_SIZE_MB,
        size: file.size,
      });
    }

    // ✅ نفس نظامك السابق: forward إلى R2 put
    const forward = new FormData();
    forward.append("kind", target); // ✅ هنا الفرق: نخليها brands/logo أو brands/banner
    forward.append("file", file, file.name);

    const cookie = req.headers.get("cookie") || "";

    const r = await fetch(new URL("/api/uploads/r2/put", req.url), {
      method: "POST",
      headers: cookie ? { cookie } : undefined,
      body: forward,
    });

    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.ok) return fail("R2_UPLOAD_FAILED", 500, j);

    const url = String(j.publicUrl || "");
    if (!url) return fail("MISSING_PUBLIC_URL", 500, j);

    return NextResponse.json({ ok: true, url, key: j.key });
  } catch (e: any) {
    return fail("UPLOAD_BRANDS_EXCEPTION", 500, String(e?.message || e));
  }
}
