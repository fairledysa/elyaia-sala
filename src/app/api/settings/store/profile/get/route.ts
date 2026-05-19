//apps/merchant/src/app/api/settings/store/profile/get/route.ts

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET() {
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
  if (!user)
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  // store_id: auth_user_id ثم fallback email
  let store_id: string | undefined;

  const { data: suByAuth } = await supabase
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  store_id = suByAuth?.store_id as string | undefined;

  if (!store_id) {
    const email = (user.email || "").toLowerCase();
    if (!email)
      return NextResponse.json({ error: "NO_EMAIL" }, { status: 400 });

    const { data: suByEmail } = await supabase
      .from("store_users")
      .select("store_id")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    store_id = suByEmail?.store_id as string | undefined;
  }

  if (!store_id)
    return NextResponse.json({ error: "NO_STORE" }, { status: 400 });

  // stores.name (عربي)
  const { data: storeRow } = await supabase
    .from("stores")
    .select("id,name")
    .eq("id", store_id)
    .maybeSingle();

  if (!storeRow)
    return NextResponse.json({ error: "STORE_NOT_FOUND" }, { status: 404 });

  // store.profile من store_settings
  const { data: settings } = await supabase
    .from("store_settings")
    .select("slug,value")
    .eq("store_id", store_id);

  // ✅ تعديل بسيط: ندعم slug القديم والجديد
  const profileByOldSlug =
    (settings || []).find((s: any) => s.slug === "store.profile")?.value ?? null;

  const profileByNewSlug =
    (settings || []).find((s: any) => s.slug === "profile")?.value ?? null;

  const profile = profileByOldSlug ?? profileByNewSlug ?? {};

  return NextResponse.json(
    {
      ok: true,
      store: { id: storeRow.id, name: storeRow.name },
      profile: {
        description: String(profile.description ?? ""),
        logo_url: String(profile.logo_url ?? ""),
        favicon_url: String(profile.favicon_url ?? ""),
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
