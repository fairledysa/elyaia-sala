//apps/merchant/src/app/api/settings/store/profile/update/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function resolveStoreId(
  supabase: any,
  authUserId: string,
  email?: string | null
) {
  const r1 = await supabase
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", authUserId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (r1.data?.store_id) return r1.data.store_id as string;

  const e = String(email || "").toLowerCase().trim();
  if (!e) return null;

  const r2 = await supabase
    .from("store_users")
    .select("store_id")
    .ilike("email", e)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (r2.data?.store_id as string) || null;
}

export async function POST(req: Request) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const store_id = await resolveStoreId(supabase, user.id, user.email);
  if (!store_id) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    store_name?: string;
    description?: string;
    logo_url?: string;
    favicon_url?: string;
  } | null;

  if (!body) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // 1️⃣ تحديث اسم المتجر
  if (body.store_name) {
    const { error } = await supabase
      .from("stores")
      .update({
        name: body.store_name.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", store_id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
  }

  // 2️⃣ حفظ بيانات البروفايل في store_settings
  const profileValue = {
    description: body.description ?? null,
    logo_url: body.logo_url ?? null,
    favicon_url: body.favicon_url ?? null,
  };

  const { error: settingsErr } = await supabase
    .from("store_settings")
    .upsert(
      {
        store_id,
        slug: "profile",
        type: "json",
        value: profileValue,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store_id,slug" }
    );

  if (settingsErr) {
    return NextResponse.json({ ok: false, error: settingsErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
