// apps/merchant/src/app/api/auth/email/update/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user)
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const nextEmail = String(body.email || "")
    .trim()
    .toLowerCase();

  if (!isValidEmail(nextEmail)) {
    return NextResponse.json({ error: "البريد غير صحيح." }, { status: 400 });
  }

  const currentEmail = (user.email || "").toLowerCase();
  if (!currentEmail)
    return NextResponse.json({ error: "لا يوجد بريد حالي." }, { status: 400 });

  if (nextEmail === currentEmail) {
    return NextResponse.json({ ok: true, email: nextEmail });
  }

  const { error: authErr } = await supabase.auth.updateUser({
    email: nextEmail,
  });

  if (authErr) {
    const m = (authErr.message || "").toLowerCase();
    if (
      m.includes("already") ||
      m.includes("exists") ||
      m.includes("registered")
    ) {
      return NextResponse.json(
        { error: "هذا البريد مستخدم مسبقًا." },
        { status: 400 }
      );
    }
    if (
      m.includes("confirm") ||
      m.includes("confirmation") ||
      m.includes("email change")
    ) {
      return NextResponse.json(
        {
          error:
            "تغيير البريد يتطلب تأكيد. تحقق من بريدك الجديد لإكمال التغيير.",
        },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: authErr.message }, { status: 400 });
  }

  // تحديث store_users لأن الربط الحالي عندنا بالإيميل
  await supabase
    .from("store_users")
    .update({ email: nextEmail })
    .eq("email", currentEmail);

  // رجّع email_verified = false (بريد جديد)
  const { data: su } = await supabase
    .from("store_users")
    .select("store_id")
    .eq("email", nextEmail)
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
        value: {
          verified: false,
          at: new Date().toISOString(),
          email: nextEmail,
        },
      },
      { onConflict: "store_id,slug" }
    );
  }

  return NextResponse.json({ ok: true, email: nextEmail });
}
