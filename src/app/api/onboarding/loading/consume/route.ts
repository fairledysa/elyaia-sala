// apps/merchant/src/app/api/onboarding/loading/consume/route.ts
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
  if (!user)
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const email = (user.email || "").toLowerCase();
  const { data: su } = await supabase
    .from("store_users")
    .select("store_id")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const store_id = su?.store_id;
  if (!store_id)
    return NextResponse.json({ error: "NO_STORE" }, { status: 400 });

  await supabase.from("store_settings").upsert(
    {
      store_id,
      slug: "onboarding.loading_pending",
      type: "json",
      value: { pending: false, seen_at: new Date().toISOString() },
    },
    { onConflict: "store_id,slug" }
  );

  return NextResponse.json({ ok: true });
}
