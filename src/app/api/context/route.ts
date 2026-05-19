//apps/merchant/src/app/api/context/route.ts
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
        get: (name) => cookieStore.get(name)?.value,
      },
    },
  );

  // 1️⃣ المستخدم الحالي
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  // 2️⃣ ربطه بالمتجر
  const { data: storeUser, error } = await supabase
    .from("store_users")
    .select(
      `
      id,
      store_id,
      stores (
        id,
        slug,
        name
      )
    `,
    )
    .eq("auth_user_id", auth.user.id)
    .single();

  if (error || !storeUser) {
    return NextResponse.json({ error: "STORE_NOT_FOUND" }, { status: 403 });
  }

  return NextResponse.json({
    user: {
      id: auth.user.id,
      email: auth.user.email,
    },
    store: storeUser.stores,
  });
}
