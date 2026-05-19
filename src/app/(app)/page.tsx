// apps/merchant/src/app/(app)/page.tsx
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

import EmailVerifyBanner from "./_components/home/email-verify-banner";
import HomeChecklist from "./_components/home/home-checklist";
import { getHomeData } from "./_components/home/home-data";

export default async function AppHomePage() {
  const supabase = await supabaseServer();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const home = await getHomeData(supabase, userData.user);

  if (!home.store) redirect("/onboarding");

  return (
    <div className="p-6" dir="rtl">
      <EmailVerifyBanner
        email={home.userEmail}
        emailVerified={home.emailVerified}
      />

      <div className="mt-4">
        <HomeChecklist progress={home.progress} tasks={home.tasks} />
      </div>
    </div>
  );
}
