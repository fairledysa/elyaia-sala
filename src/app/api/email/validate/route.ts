import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  const hdrs = await headers();
  const origin = hdrs.get("origin") || "http://localhost:3002";

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

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user)
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const email = user.email;
  if (!email) return NextResponse.json({ error: "NO_EMAIL" }, { status: 400 });

  // يرسل رابط على الإيميل
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/email/verify/callback`,
      shouldCreateUser: false,
    },
  });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
