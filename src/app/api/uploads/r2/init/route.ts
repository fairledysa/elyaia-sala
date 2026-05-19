// FILE: apps/merchant/src/app/api/uploads/r2/put/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function fail(error: string, status = 400, details?: any) {
  return NextResponse.json({ ok: false, error, details }, { status });
}

function b64urlToUtf8(input: string) {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
  return Buffer.from(b64 + pad, "base64").toString("utf8");
}

function decodeJwtPayload(token: string) {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  return JSON.parse(b64urlToUtf8(parts[1]));
}

function getEmailFromSbAuthCookie(raw?: string) {
  if (!raw) return null;

  // Supabase غالبًا يخزنها: base64-<base64url(JSON)>
  if (raw.startsWith("base64-")) {
    const encoded = raw.slice("base64-".length);
    const jsonText = b64urlToUtf8(encoded);

    // غالبًا JSON فيه access_token
    try {
      const obj = JSON.parse(jsonText);
      const access = obj?.access_token;
      if (typeof access === "string") {
        const payload = decodeJwtPayload(access);
        const email =
          payload?.email ||
          payload?.user_metadata?.email ||
          payload?.app_metadata?.email;
        return typeof email === "string" ? email.toLowerCase() : null;
      }
    } catch {
      return null;
    }
  }

  // أو JWT مباشر
  if (raw.includes(".")) {
    try {
      const payload = decodeJwtPayload(raw);
      const email =
        payload?.email ||
        payload?.user_metadata?.email ||
        payload?.app_metadata?.email;
      return typeof email === "string" ? email.toLowerCase() : null;
    } catch {
      return null;
    }
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("multipart/form-data")) {
      return fail("EXPECTED_MULTIPART", 415);
    }

    // 1) نقرأ Session من كوكي Supabase ونطلع email
    const cookieStore = await cookies();
    const all = cookieStore.getAll();
    const sbAuth = all.find(
      (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
    );

    const email = getEmailFromSbAuthCookie(sbAuth?.value);
    if (!email) {
      return fail("UNAUTHORIZED", 401, { reason: "NO_EMAIL_IN_COOKIE" });
    }

    // 2) ننشئ Supabase client يحمل نفس كوكي المستخدم (عشان RLS)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    // 3) نجيب store_id تلقائيًا من store_users
    const { data: su, error: suErr } = await supabase
      .from("store_users")
      .select("store_id")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (suErr) return fail("STORE_LOOKUP_FAILED", 500, suErr);

    const storeId = su?.store_id;
    if (!storeId) return fail("NO_STORE", 403);

    // 4) نقرأ الملف من الفورم
    const form = await req.formData();
    const kind = String(form.get("kind") || "logo"); // logo | favicon
    const fileValue = form.get("file");

    if (!(fileValue instanceof File)) return fail("MISSING_FILE", 400);

    // 5) نرسل الملف للـ Worker (التوكن من السيرفر، ما يطلع للعميل)
    const workerBase = process.env.CDN_WORKER_BASE_URL || "";
    const token = process.env.CDN_WORKER_UPLOAD_TOKEN || "";
    if (!workerBase) return fail("CDN_WORKER_BASE_URL_MISSING", 500);
    if (!token) return fail("CDN_WORKER_UPLOAD_TOKEN_MISSING", 500);

    const url = `${workerBase.replace(/\/+$/, "")}/v1/uploads/put`;

    const outForm = new FormData();
    outForm.append("store_id", String(storeId));
    outForm.append("kind", kind);
    outForm.append("file", fileValue);

    const r = await fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: outForm,
    });

    const text = await r.text();
    let j: any = null;
    try {
      j = JSON.parse(text);
    } catch {
      j = null;
    }

    if (!r.ok) {
      return fail("WORKER_HTTP_ERROR", r.status, {
        bodyPreview: text.slice(0, 400),
      });
    }

    if (!j?.ok) {
      return fail("WORKER_BAD_JSON", 500, { bodyPreview: text.slice(0, 400) });
    }

    return NextResponse.json({
      ok: true,
      store_id: storeId,
      key: j.key,
      publicUrl: j.publicUrl,
    });
  } catch (e: any) {
    return fail("MERCHANT_ROUTE_EXCEPTION", 500, String(e?.message || e));
  }
}
