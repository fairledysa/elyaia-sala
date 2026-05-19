// apps/merchant/src/app/(auth)/auth/reset-signup/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
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

  // لازم يكون مسجل عشان نقدر نعدّل metadata
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (user) {
    // ✅ أهم سطرين: ارجّع التحقق false وامسح رقم الجوال عشان يعيد إدخاله
    await supabase.auth.updateUser({
      data: {
        phone_verified: false,
        phone: null,
      },
    });
  }

  // ✅ خروج (يمسح session)
  await supabase.auth.signOut();

  // ✅ بعد الدخول يرجع للتحقق من الجوال مباشرة
  return NextResponse.redirect(`${origin}/login?next=/verify-phone&reset=1`);
}
