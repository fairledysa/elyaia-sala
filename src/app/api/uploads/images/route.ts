// FILE: apps/merchant/src/app/api/uploads/images/route.ts
import { NextResponse } from "next/server";

const MAX_SIZE_MB = 10;

function fail(error: string, status = 400, details?: any) {
  return NextResponse.json({ ok: false, error, details }, { status });
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";

    if (!contentType.includes("multipart/form-data")) {
      return fail("EXPECTED_MULTIPART", 415, { got: contentType });
    }

    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return fail("MISSING_FILE", 400);
    }

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

    const forward = new FormData();
    forward.append("kind", "categories/images");
    forward.append("file", file, file.name);

    const cookie = req.headers.get("cookie") || "";

    const response = await fetch(new URL("/api/uploads/r2/put", req.url), {
      method: "POST",
      headers: cookie ? { cookie } : undefined,
      body: forward,
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok || !json?.ok) {
      return fail("R2_UPLOAD_FAILED", 500, json);
    }

    const url = String(json.publicUrl || "");

    if (!url) {
      return fail("MISSING_PUBLIC_URL", 500, json);
    }

    return NextResponse.json({
      ok: true,
      url,
      key: json.key,
    });
  } catch (e: any) {
    return fail("UPLOAD_IMAGES_EXCEPTION", 500, String(e?.message || e));
  }
}