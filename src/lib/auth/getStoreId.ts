//lib/auth/getStoreId.ts

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function getStoreIdFromSession() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    },
  );

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("UNAUTHENTICATED");

  const { data: storeUser, error } = await supabase
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (error || !storeUser) throw new Error("STORE_NOT_FOUND");

  return storeUser.store_id as string;
}
