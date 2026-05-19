// FILE: apps/merchant/src/app/(app)/themes/page.tsx

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import ThemesPageClient from "./_components/ThemesPageClient";

export const dynamic = "force-dynamic";

type SearchParams = { storeId?: string };

async function getStoreIdFromSession() {
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
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) return null;

  const { data: byAuthUser } = await supabase
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (byAuthUser?.store_id) return String(byAuthUser.store_id);

  const email = (user.email || "").toLowerCase();
  if (!email) return null;

  const { data: byEmail } = await supabase
    .from("store_users")
    .select("store_id")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return byEmail?.store_id ? String(byEmail.store_id) : null;
}

export default async function ThemesPage(props: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const sp = props.searchParams
    ? await Promise.resolve(props.searchParams)
    : {};

  const storeIdFromQuery = String(sp?.storeId || "").trim();
  const storeIdFromSession = await getStoreIdFromSession();
  const storeId = storeIdFromQuery || storeIdFromSession || "";

  if (!storeId) {
    return (
      <section dir="rtl" className="adm-page">
        <div className="adm-page__inner">
          <div className="adm-card">
            <div className="adm-card__body">
              <div className="adm-alert adm-alert--danger">
                storeId غير موجود. تأكد أن المستخدم مربوط بمتجر داخل جدول
                store_users.
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return <ThemesPageClient storeId={storeId} />;
}