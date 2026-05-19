// apps/merchant/src/app/(app)/onboarding/loading/page.tsx
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import LoadingClient from "./_components/loading-client";

export default async function OnboardingLoadingPage() {
  const supabase = await supabaseServer();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect("/login");

  const email = (user.email || "").toLowerCase();
  const { data: su } = await supabase
    .from("store_users")
    .select("store_id")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const store_id = su?.store_id;
  if (!store_id) redirect("/onboarding");

  const { data: settings } = await supabase
    .from("store_settings")
    .select("slug, value")
    .eq("store_id", store_id);

  const loadingFlag = (settings || []).find(
    (s: any) => s.slug === "onboarding.loading_pending"
  )?.value;
  const pending = Boolean(loadingFlag?.pending);

  // ✅ لو مو pending = ممنوع دخول loading (يرجع للوحة)
  if (!pending) redirect("/");

  return <LoadingClient />;
}
