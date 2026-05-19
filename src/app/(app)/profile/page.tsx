// apps/merchant/src/app/(app)/profile/page.tsx
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import ProfileClient from "./_components/profile-client";

export default async function ProfilePage() {
  const supabase = await supabaseServer();

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) redirect("/login");

  const email = (user.email || "").toLowerCase();

  // store_id (حاليًا الربط بالإيميل)
  const { data: su } = await supabase
    .from("store_users")
    .select("store_id")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const store_id = su?.store_id ?? null;
  if (!store_id) redirect("/onboarding");

  // email verified flag (store_settings)
  const { data: settings } = await supabase
    .from("store_settings")
    .select("slug,value")
    .eq("store_id", store_id);

  const emailVerified = Boolean(
    (settings || []).find((s: any) => s.slug === "auth.email_verified")?.value
      ?.verified
  );

  const meta: any = user.user_metadata || {};
  const fullName = meta.full_name || user.user_metadata?.name || "";

  return (
    <ProfileClient
      initialEmail={email}
      initialName={fullName}
      emailVerified={emailVerified}
    />
  );
}
