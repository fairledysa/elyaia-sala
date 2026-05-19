// FILE: apps/merchant/src/app/(app)/settings/component/basic/page.tsx
"use client";

import { useEffect, useState } from "react";

import Card, { CardBody } from "@/components/ui/Card";

import PreviewPanel from "./_components/preview-panel";
import StoreInfoSection from "./_components/store-info-section";
import CustomerSupportSection from "./_components/customer-support-section";
import SocialAccountsSection from "./_components/social-accounts-section";
import StoreAppSection from "./_components/store-app-section";

type StoreProfile = {
  description: string;
  logo_url: string;
  favicon_url: string;
};

type ActiveKey = "store" | "support" | "social" | "app";

const ACTIVE_KEYS = new Set<ActiveKey>(["store", "support", "social", "app"]);

function isActiveKey(value: unknown): value is ActiveKey {
  return typeof value === "string" && ACTIVE_KEYS.has(value as ActiveKey);
}

export default function BasicStoreSettingsPage() {
  const [activeKey, setActiveKey] = useState<ActiveKey>("store");

  const [storeName, setStoreName] = useState<string>("");
  const [storeSlug, setStoreSlug] = useState<string>("");
  const [profile, setProfile] = useState<StoreProfile>({
    description: "",
    logo_url: "",
    favicon_url: "",
  });

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings/store/profile/get");
        const json = await res.json().catch(() => ({}));

        if (!res.ok) return;

        setStoreName(String(json?.store?.name ?? ""));
        setStoreSlug(String(json?.store?.slug ?? ""));
        setProfile({
          description: String(json?.profile?.description ?? ""),
          logo_url: String(json?.profile?.logo_url ?? ""),
          favicon_url: String(json?.profile?.favicon_url ?? ""),
        });
      } finally {
        setIsLoadingProfile(false);
      }
    })();
  }, []);

  useEffect(() => {
    let raf = 0;

    const getSections = () => {
      return Array.from(
        document.querySelectorAll<HTMLElement>(
          ".adm-basic-section[data-section-key]",
        ),
      ).filter((section) => isActiveKey(section.dataset.sectionKey));
    };

    const updateActiveSection = () => {
      window.cancelAnimationFrame(raf);

      raf = window.requestAnimationFrame(() => {
        const sections = getSections();
        if (!sections.length) return;

        const targetY = Math.max(140, window.innerHeight * 0.28);

        let nextKey: ActiveKey = "store";
        let bestScore = Number.POSITIVE_INFINITY;

        for (const section of sections) {
          const key = section.dataset.sectionKey;
          if (!isActiveKey(key)) continue;

          const rect = section.getBoundingClientRect();

          const isVisible = rect.bottom > 120 && rect.top < window.innerHeight;
          if (!isVisible) continue;

          const score = Math.abs(rect.top - targetY);

          if (score < bestScore) {
            bestScore = score;
            nextKey = key;
          }
        }

        setActiveKey((prev) => (prev === nextKey ? prev : nextKey));
      });
    };

    updateActiveSection();

    window.addEventListener("scroll", updateActiveSection, {
      passive: true,
      capture: true,
    });

    window.addEventListener("resize", updateActiveSection, {
      passive: true,
    });

    const timer = window.setTimeout(updateActiveSection, 350);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);

      window.removeEventListener("scroll", updateActiveSection, {
        capture: true,
      } as AddEventListenerOptions);

      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  return (
    <div className="adm-page__inner adm-basic-settings" dir="rtl">
      <section className="adm-hero">
        <div className="adm-hero__main">
          <div className="adm-hero__icon">⚙</div>

          <div className="adm-hero__text">
            <h1 className="adm-hero__title">الإعدادات الأساسية</h1>
            <p className="adm-hero__desc">
              إدارة بيانات المتجر الأساسية، معلومات الدعم، حسابات التواصل،
              وتطبيقات المتجر من صفحة واحدة.
            </p>
          </div>
        </div>
      </section>

      <div className="adm-basic-settings__layout">
        <div className="adm-basic-settings__main">
          <Card className="adm-basic-settings__card">
            <CardBody className="adm-basic-settings__cardBody">
              <div className="adm-card__head adm-card__head--border adm-basic-settings__head">
                <div className="adm-card__titleWrap">
                  <h2 className="adm-card__title">بيانات المتجر</h2>
                  <p className="adm-card__desc">
                    إعدادات المتجر / الرئيسية / الإعدادات الأساسية
                  </p>
                </div>
              </div>

              <div className="adm-basic-settings__sections">
                <StoreInfoSection
                  id="store"
                  storeName={storeName}
                  storeSlug={storeSlug}
                  profileInitial={profile}
                  isLoadingProfile={isLoadingProfile}
                  onProfileSaved={(value) => setProfile(value)}
                  onStoreNameSaved={(name) => setStoreName(name)}
                />

                <CustomerSupportSection id="sec-support" />
                <SocialAccountsSection id="sec-social" />
                <StoreAppSection id="sec-app" />
              </div>
            </CardBody>
          </Card>
        </div>

        <aside className="adm-basic-settings__preview">
          <div className="adm-basic-settings__previewSticky">
            <PreviewPanel activeKey={activeKey} />
          </div>
        </aside>
      </div>
    </div>
  );
}