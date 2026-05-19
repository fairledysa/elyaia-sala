// FILE: apps/merchant/src/app/api/uploads/products/images/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const UPLOAD_KIND = "products/images";

function fail(error: string, status = 400, details?: any) {
  return NextResponse.json({ ok: false, error, details }, { status });
}

function s(value: unknown) {
  return String(value ?? "").trim();
}

async function getAuthUser() {
  const cookieStore = await cookies();

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
    },
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) {
    return {
      user: null,
      error: error?.message || "AUTH_USER_NOT_FOUND",
    };
  }

  return {
    user,
    error: null,
  };
}

async function getStoreIdForUser(args: {
  authUserId: string;
  email?: string | null;
}) {
  const sb = supabaseAdmin();

  const byAuth = await sb
    .from("store_users")
    .select("store_id, id, email, auth_user_id")
    .eq("auth_user_id", args.authUserId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (byAuth.error) {
    return {
      storeId: "",
      error: "STORE_LOOKUP_FAILED",
      details: {
        step: "lookup_by_auth_user_id",
        detail: byAuth.error.message,
      },
    };
  }

  if (byAuth.data?.store_id) {
    return {
      storeId: String(byAuth.data.store_id),
      error: "",
      details: null,
    };
  }

  const email = s(args.email).toLowerCase();

  if (email) {
    const byEmail = await sb
      .from("store_users")
      .select("store_id, id, email, auth_user_id")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (byEmail.error) {
      return {
        storeId: "",
        error: "STORE_LOOKUP_FAILED",
        details: {
          step: "lookup_by_email",
          detail: byEmail.error.message,
        },
      };
    }

    if (byEmail.data?.store_id) {
      return {
        storeId: String(byEmail.data.store_id),
        error: "",
        details: null,
      };
    }
  }

  return {
    storeId: "",
    error: "NO_STORE",
    details: {
      reason: "STORE_USER_NOT_FOUND",
      auth_user_id: args.authUserId,
      email: args.email || null,
    },
  };
}

async function verifyProductBelongsToStore(args: {
  storeId: string;
  productId: string;
}) {
  const sb = supabaseAdmin();

  const { data, error } = await sb
    .from("products")
    .select("id, store_id")
    .eq("store_id", args.storeId)
    .eq("id", args.productId)
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      error: "PRODUCT_LOOKUP_FAILED",
      details: error.message,
    };
  }

  if (!data?.id) {
    return {
      ok: false,
      error: "PRODUCT_NOT_FOUND",
      details: {
        product_id: args.productId,
        store_id: args.storeId,
      },
    };
  }

  return {
    ok: true,
    error: "",
    details: null,
  };
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";

    if (!contentType.includes("multipart/form-data")) {
      return fail("EXPECTED_MULTIPART", 415, { got: contentType });
    }

    const { user, error: authError } = await getAuthUser();

    if (!user?.id) {
      return fail("UNAUTHORIZED", 401, {
        reason: authError || "AUTH_USER_NOT_FOUND",
      });
    }

    const storeLookup = await getStoreIdForUser({
      authUserId: user.id,
      email: user.email,
    });

    if (!storeLookup.storeId) {
      return fail(storeLookup.error || "NO_STORE", 403, storeLookup.details);
    }

    const storeId = storeLookup.storeId;

    const form = await req.formData();
    const file = form.get("file");
    const productId = s(form.get("product_id") || form.get("productId"));

    if (!(file instanceof File)) {
      return fail("MISSING_FILE", 400);
    }

    if (!productId) {
      return fail("MISSING_PRODUCT_ID", 400);
    }

    if (!file.type.startsWith("image/")) {
      return fail("INVALID_FILE_TYPE", 400, {
        type: file.type,
      });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return fail("FILE_TOO_LARGE", 400, {
        maxMB: MAX_SIZE_MB,
        size: file.size,
      });
    }

    const productCheck = await verifyProductBelongsToStore({
      storeId,
      productId,
    });

    if (!productCheck.ok) {
      return fail(productCheck.error, 403, productCheck.details);
    }

    const workerBase = process.env.CDN_WORKER_BASE_URL || "";
    const token = process.env.CDN_WORKER_UPLOAD_TOKEN || "";

    if (!workerBase) return fail("CDN_WORKER_BASE_URL_MISSING", 500);
    if (!token) return fail("CDN_WORKER_UPLOAD_TOKEN_MISSING", 500);

    const workerUrl = `${workerBase.replace(/\/+$/, "")}/v1/uploads/put`;

    const outForm = new FormData();
    outForm.append("store_id", storeId);
    outForm.append("kind", UPLOAD_KIND);
    outForm.append("product_id", productId);
    outForm.append("file", file, file.name);

    const workerResponse = await fetch(workerUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
      },
      body: outForm,
    });

    const workerText = await workerResponse.text();

    let workerJson: any = null;

    try {
      workerJson = JSON.parse(workerText);
    } catch {
      workerJson = null;
    }

    if (!workerResponse.ok) {
      return fail("WORKER_HTTP_ERROR", workerResponse.status, {
        workerStatus: workerResponse.status,
        workerBodyPreview: workerText.slice(0, 1000),
        workerUrl,
        storeId,
        productId,
        kind: UPLOAD_KIND,
      });
    }

    if (!workerJson?.ok) {
      return fail("WORKER_BAD_RESPONSE", 500, {
        workerBodyPreview: workerText.slice(0, 1000),
        workerJson,
        storeId,
        productId,
        kind: UPLOAD_KIND,
      });
    }

    const publicUrl = s(workerJson.publicUrl || workerJson.url);

    if (!publicUrl) {
      return fail("MISSING_PUBLIC_URL", 500, {
        workerJson,
        storeId,
        productId,
        kind: UPLOAD_KIND,
      });
    }

    return NextResponse.json({
      ok: true,
      url: publicUrl,
      publicUrl,
      key: workerJson.key ?? null,
      store_id: storeId,
      product_id: productId,
      kind: UPLOAD_KIND,
    });
  } catch (e: any) {
    return fail("UPLOAD_PRODUCT_IMAGE_EXCEPTION", 500, {
      message: String(e?.message || e),
    });
  }
}