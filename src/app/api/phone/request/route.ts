import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import crypto from "crypto";

function hashCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function random4() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

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

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const meta: any = user.user_metadata || {};
  const phone = meta.phone as string | undefined;
  if (!phone) return NextResponse.json({ error: "NO_PHONE" }, { status: 400 });

  const code = random4();
  const code_hash = hashCode(code);
  const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // احذف أي طلبات سابقة غير مؤكدة
  await supabase
    .from("phone_verifications")
    .delete()
    .eq("user_id", user.id)
    .is("verified_at", null);

  const { error } = await supabase.from("phone_verifications").insert({
    user_id: user.id,
    phone_e164: phone,
    code_hash,
    expires_at,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // للتطوير: اطبع الكود في سيرفر الكونسول
  console.log(`[OTP DEV] phone=${phone} code=${code} user=${user.id}`);

  return NextResponse.json({ ok: true });
}
