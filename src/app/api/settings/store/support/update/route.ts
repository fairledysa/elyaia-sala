// FILE: apps/merchant/src/app/api/settings/store/support/update/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function fail(error: string, status = 400, details?: any) {
  return NextResponse.json({ ok: false, error, details }, { status });
}

async function resolveStoreId() {
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

  const { data: au, error: auErr } = await supabase.auth.getUser();

  if (auErr || !au?.user) {
    return {
      supabase,
      storeId: null as string | null,
      reason: "NO_USER",
    };
  }

  const userId = au.user.id;
  const email = (au.user.email || "").toLowerCase();

  let { data: su } = await supabase
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!su?.store_id && email) {
    const r = await supabase
      .from("store_users")
      .select("store_id")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    su = r.data as any;
  }

  return {
    supabase,
    storeId: su?.store_id ?? null,
    reason: "OK",
  };
}

export async function POST(req: Request) {
  try {
    const { supabase, storeId, reason } = await resolveStoreId();

    if (!storeId) {
      return fail("NO_STORE", 403, { reason });
    }

    const body = (await req.json().catch(() => null)) as any;

    if (!body) {
      return fail("BAD_JSON", 400);
    }

    const phone = String(body.phone || "").trim();
    const whatsapp = String(body.whatsapp || "").trim();
    const telegram = String(body.telegram || "").trim();
    const email = String(body.email || "").trim();

    const { data: existing, error: existingError } = await supabase
      .from("store_settings")
      .select("id, value")
      .eq("store_id", storeId)
      .eq("slug", "store.support")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      return fail("SUPPORT_FETCH_FAILED", 500, existingError);
    }

    const prev: any =
      existing?.value && typeof existing.value === "object"
        ? existing.value
        : {};

    const now = new Date().toISOString();

    const nextValue = {
      ...prev,

      phone,
      whatsapp,
      telegram,
      email,

      /**
       * لا نحذف بيانات تحقق الواتساب لو كانت موجودة.
       */
      whatsapp_pending: prev.whatsapp_pending || "",
      whatsapp_verified_at: prev.whatsapp_verified_at || null,

      updated_at: now,
    };

    if (existing?.id) {
      const { error } = await supabase
        .from("store_settings")
        .update({
          value: nextValue,
          updated_at: now,
        })
        .eq("id", existing.id)
        .eq("store_id", storeId);

      if (error) {
        return fail("SUPPORT_UPDATE_FAILED", 500, error);
      }
    } else {
      const { error } = await supabase.from("store_settings").insert({
        store_id: storeId,
        slug: "store.support",
        type: "json",
        value: nextValue,
      });

      if (error) {
        return fail("SUPPORT_INSERT_FAILED", 500, error);
      }
    }

    return NextResponse.json({
      ok: true,
      support: {
        phone: nextValue.phone,
        whatsapp: nextValue.whatsapp,
        whatsapp_pending: nextValue.whatsapp_pending,
        whatsapp_verified_at: nextValue.whatsapp_verified_at,
        telegram: nextValue.telegram,
        email: nextValue.email,
      },
    });
  } catch (e: any) {
    return fail("UNHANDLED_ERROR", 500, String(e?.message || e));
  }
}