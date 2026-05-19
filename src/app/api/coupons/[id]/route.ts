import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";

/* -------------------------------- Helpers -------------------------------- */

function firstRow<T>(x: T | T[] | null | undefined): T | null {
  if (!x) return null;
  return Array.isArray(x) ? (x[0] ?? null) : x;
}

async function getStoreIdFromSession() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
      },
    },
  );

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("UNAUTHENTICATED");

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", auth.user.id)
    .limit(1);

  if (error) throw new Error(error.message);
  const row = firstRow<{ store_id: string }>(data);
  if (!row?.store_id) throw new Error("STORE_NOT_FOUND");

  return row.store_id;
}

/* ------------------------------- Route ----------------------------------- */

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, context: Ctx) {
  try {
    const store_id = await getStoreIdFromSession();

    // ✅ Next 16: params is Promise
    const { id } = await context.params;

    const payload = await req.json().catch(() => ({}));

    // حماية: لا تسمح بتغيير ملكية المتجر/المعرف
    if (payload?.id) delete payload.id;
    if (payload?.store_id) delete payload.store_id;
    if (payload?.created_at) delete payload.created_at;

    const sb = supabaseAdmin();

    const { data, error } = await sb
      .from("coupons")
      .update(payload)
      .eq("id", id)
      .eq("store_id", store_id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ coupon: data });
  } catch (e: any) {
    const msg = String(e?.message || "UNKNOWN_ERROR");
    const status = msg === "UNAUTHENTICATED" ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(_req: Request, context: Ctx) {
  try {
    const store_id = await getStoreIdFromSession();

    // ✅ Next 16: params is Promise
    const { id } = await context.params;

    const sb = supabaseAdmin();

    const { error } = await sb
      .from("coupons")
      .delete()
      .eq("id", id)
      .eq("store_id", store_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = String(e?.message || "UNKNOWN_ERROR");
    const status = msg === "UNAUTHENTICATED" ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
