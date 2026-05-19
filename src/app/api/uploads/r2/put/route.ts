// FILE: apps/merchant/src/app/api/uploads/r2/put/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function fail(error: string, status = 400, details?: any) {
  return NextResponse.json({ ok: false, error, details }, { status });
}

function s(value: unknown) {
  return String(value ?? "").trim();
}

const ALLOWED_KINDS = new Set<string>([
  "verification/id",
  "verification/cr",

  "logo",
  "favicon",

  "theme/image",
  "theme/images",
  "theme/banner",

  "categories/images",
  "brands/images",

  "products/images",
]);

function normalizeKind(value: unknown) {
  return s(value).replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/|\/$/g, "");
}

function getFormText(form: FormData, keys: string[]) {
  for (const key of keys) {
    const value = s(form.get(key));
    if (value) return value;
  }

  return "";
}

async function verifyProductBelongsToStore(args: {
  supabase: any;
  storeId: string;
  productId: string;
}) {
  const { data, error } = await args.supabase
    .from("products")
    .select("id")
    .eq("store_id", args.storeId)
    .eq("id", args.productId)
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      ok: false as const,
      error: "PRODUCT_LOOKUP_FAILED",
      details: error.message,
    };
  }

  if (!data?.id) {
    return {
      ok: false as const,
      error: "PRODUCT_NOT_FOUND",
      details: {
        product_id: args.productId,
        store_id: args.storeId,
      },
    };
  }

  return { ok: true as const };
}

export async function POST(req: Request) {
  try {
    const ct = req.headers.get("content-type") || "";

    if (!ct.includes("multipart/form-data")) {
      return fail("EXPECTED_MULTIPART", 415, { got: ct });
    }

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
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return fail("UNAUTHORIZED", 401, {
        reason: "AUTH_USER_NOT_FOUND",
        detail: authError?.message || null,
      });
    }

    let storeId: string | null = null;

    const { data: storeUserByAuth, error: storeUserByAuthError } = await supabase
      .from("store_users")
      .select("store_id, id, email, auth_user_id")
      .eq("auth_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (storeUserByAuthError) {
      return fail("STORE_LOOKUP_FAILED", 500, {
        step: "lookup_by_auth_user_id",
        detail: storeUserByAuthError.message,
      });
    }

    if (storeUserByAuth?.store_id) {
      storeId = String(storeUserByAuth.store_id);
    }

    if (!storeId) {
      const email = s(user.email).toLowerCase();

      if (email) {
        const { data: storeUserByEmail, error: storeUserByEmailError } =
          await supabase
            .from("store_users")
            .select("store_id, id, email, auth_user_id")
            .eq("email", email)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (storeUserByEmailError) {
          return fail("STORE_LOOKUP_FAILED", 500, {
            step: "lookup_by_email",
            detail: storeUserByEmailError.message,
          });
        }

        if (storeUserByEmail?.store_id) {
          storeId = String(storeUserByEmail.store_id);
        }
      }
    }

    if (!storeId) {
      return fail("NO_STORE", 403, {
        reason: "STORE_USER_NOT_FOUND",
        auth_user_id: user.id,
        email: user.email || null,
        note: "اربط store_users.auth_user_id مع auth user id للمستخدم الحالي",
      });
    }

    const form = await req.formData();

    const kind = normalizeKind(form.get("kind"));
    const fileValue = form.get("file");

    if (!kind) {
      return fail("MISSING_UPLOAD_KIND", 400, {
        allowedKinds: Array.from(ALLOWED_KINDS),
      });
    }

    if (!ALLOWED_KINDS.has(kind)) {
      return fail("INVALID_UPLOAD_KIND", 400, {
        kind,
        allowedKinds: Array.from(ALLOWED_KINDS),
      });
    }

    if (!(fileValue instanceof File)) {
      return fail("MISSING_FILE", 400);
    }

    const productId = getFormText(form, ["product_id", "productId"]);
    const categoryId = getFormText(form, ["category_id", "categoryId"]);
    const brandId = getFormText(form, ["brand_id", "brandId"]);

    if (kind === "products/images") {
      if (!productId) {
        return fail("MISSING_PRODUCT_ID", 400);
      }

      const productCheck = await verifyProductBelongsToStore({
        supabase,
        storeId,
        productId,
      });

      if (!productCheck.ok) {
        return fail(productCheck.error, 403, productCheck.details);
      }
    }

    const workerBase = process.env.CDN_WORKER_BASE_URL || "";
    const token = process.env.CDN_WORKER_UPLOAD_TOKEN || "";

    if (!workerBase) return fail("CDN_WORKER_BASE_URL_MISSING", 500);
    if (!token) return fail("CDN_WORKER_UPLOAD_TOKEN_MISSING", 500);

    const url = `${workerBase.replace(/\/+$/, "")}/v1/uploads/put`;

    const outForm = new FormData();

    outForm.append("store_id", storeId);
    outForm.append("kind", kind);
    outForm.append("file", fileValue, fileValue.name);

    if (productId) outForm.append("product_id", productId);
    if (categoryId) outForm.append("category_id", categoryId);
    if (brandId) outForm.append("brand_id", brandId);

    const r = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
      },
      body: outForm,
    });

    const text = await r.text();

    if (!r.ok) {
      return fail("WORKER_HTTP_ERROR", r.status, {
        workerStatus: r.status,
        workerBodyPreview: text.slice(0, 1000),
        url,
        kind,
        storeId,
        productId: productId || null,
        categoryId: categoryId || null,
        brandId: brandId || null,
      });
    }

    let j: any = null;

    try {
      j = JSON.parse(text);
    } catch {
      j = null;
    }

    if (!j?.ok) {
      return fail("WORKER_BAD_JSON", 500, {
        workerBodyPreview: text.slice(0, 1000),
        storeId,
        kind,
        productId: productId || null,
      });
    }

    return NextResponse.json({
      ok: true,
      key: j.key,
      publicUrl: j.publicUrl,
      store_id: storeId,
      kind,
      product_id: productId || null,
      category_id: categoryId || null,
      brand_id: brandId || null,
    });
  } catch (e: any) {
    return fail("MERCHANT_ROUTE_EXCEPTION", 500, String(e?.message || e));
  }
}