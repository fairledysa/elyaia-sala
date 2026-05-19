import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) return NextResponse.redirect(`${origin}/`);

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

  // يثبت session (لو احتاج)
  await supabase.auth.exchangeCodeForSession(code);

  // نجيب المستخدم
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return NextResponse.redirect(`${origin}/`);

  // نجيب store_id من store_users
  const email = (user.email || "").toLowerCase();
  const { data: su } = await supabase
    .from("store_users")
    .select("store_id")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const store_id = su?.store_id;
  if (store_id) {
    await supabase.from("store_settings").upsert(
      {
        store_id,
        slug: "auth.email_verified",
        type: "json",
        value: { verified: true, at: new Date().toISOString() },
      },
      { onConflict: "store_id,slug" }
    );
  }

  return NextResponse.redirect(`${origin}/`);
}
