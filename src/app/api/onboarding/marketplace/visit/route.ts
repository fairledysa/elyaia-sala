import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST() {
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
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const email = (user.email || "").toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "NO_EMAIL" }, { status: 400 });
  }

  const { data: su, error: suErr } = await supabase
    .from("store_users")
    .select("store_id")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (suErr) {
    return NextResponse.json(
      { error: `STORE_USER_LOOKUP_FAILED: ${suErr.message}` },
      { status: 400 }
    );
  }

  const store_id = su?.store_id as string | undefined;
  if (!store_id) {
    return NextResponse.json({ error: "NO_STORE" }, { status: 400 });
  }

  const payload = { visited: true, at: new Date().toISOString() };

  const { error } = await supabase.from("store_settings").upsert(
    [
      {
        store_id,
        slug: "onboarding.marketplace_visited",
        type: "json",
        value: payload,
      },
    ],
    { onConflict: "store_id,slug" }
  );

  if (error) {
    return NextResponse.json(
      { error: `UPSERT_FAILED: ${error.message}` },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, store_id, value: payload });
}
