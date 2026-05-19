// apps/merchant/src/app/(auth)/auth/email/verify/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import crypto from "node:crypto";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) return NextResponse.redirect(`${origin}/login`);

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

  const token_hash = sha256(token);

  // ✅ نجيب التوكن من DB (بدون أي Session)
  const { data: rows, error } = await supabase
    .from("email_verifications")
    .select("id, store_id, email, expires_at, used_at")
    .eq("token_hash", token_hash)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !rows?.length) {
    return NextResponse.redirect(`${origin}/login?email_verify=invalid`);
  }

  const row: any = rows[0];

  if (row.used_at) {
    // مستخدم من قبل
    return NextResponse.redirect(`${origin}/login?email_verify=used`);
  }

  const expired = new Date(row.expires_at).getTime() < Date.now();
  if (expired) {
    return NextResponse.redirect(`${origin}/login?email_verify=expired`);
  }

  // ✅ علّم التوكن مستخدم
  await supabase
    .from("email_verifications")
    .update({ used_at: new Date().toISOString() })
    .eq("id", row.id);

  // ✅ علّم المتجر: email verified
  await supabase.from("store_settings").upsert(
    {
      store_id: row.store_id,
      slug: "auth.email_verified",
      type: "json",
      value: { verified: true, at: new Date().toISOString(), email: row.email },
    },
    { onConflict: "store_id,slug" }
  );

  // ✅ بعد التفعيل: ودّه لتسجيل الدخول (لو ما هو مسجل) وبعدين للوحة
  return NextResponse.redirect(`${origin}/login?next=/&email_verify=ok`);
}
