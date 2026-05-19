// apps/merchant/src/app/(app)/profile/_components/profile-client.tsx
"use client";

import { useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Container from "@/components/layout/Container";
import Tabs from "./tabs";
import ProfileTab from "./profile-tab";
import SecurityTab from "./security-tab";
import NotificationsTab from "./notifications-tab";

type TabKey = "profile" | "security" | "notifications";

export default function ProfileClient({
  initialEmail,
  initialName,
  emailVerified,
}: {
  initialEmail: string;
  initialName: string;
  emailVerified: boolean;
}) {
  const sp = useSearchParams();
  const router = useRouter();

  const tab = (sp.get("tab") as TabKey) || "profile";

  const setTab = (t: TabKey) => {
    const params = new URLSearchParams(sp.toString());
    params.set("tab", t);
    router.replace(`/profile?${params.toString()}`);
  };

  const content = useMemo(() => {
    if (tab === "profile") {
      return (
        <ProfileTab initialName={initialName} initialEmail={initialEmail} />
      );
    }
    if (tab === "security") {
      return (
        <SecurityTab
          initialEmail={initialEmail}
          emailVerified={emailVerified}
        />
      );
    }
    return <NotificationsTab />;
  }, [tab, initialName, initialEmail, emailVerified]);

  return (
    <Container className="p-8">
      {/* ✅ حط dir هنا بدل Container */}
      <div dir="rtl">
        <Tabs tab={tab} setTab={setTab} />
        <div className="mt-6">{content}</div>
      </div>
    </Container>
  );
}
