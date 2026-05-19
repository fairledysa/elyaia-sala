// FILE: apps/merchant/src/app/(theme-editor)/themes/[themeId]/customize/_components/ThemeEditorShell.tsx
"use client";

import { useMemo, useState } from "react";
import { useParams, usePathname } from "next/navigation";

import HeaderBar from "./HeaderBar";
import QuickNav from "./QuickNav";
import SidebarShell from "./SidebarShell";
import PreviewFrame from "./PreviewFrame";
import AddComponentPanel from "./AddComponentPanel";

import { getEditorRouteMeta } from "../lib/editor-nav";

export default function ThemeEditorShell({
  children,
  storefrontOrigin,
}: {
  children: React.ReactNode;
  storefrontOrigin: string;
}) {
  const params = useParams<{ themeId: string }>();
  const pathname = usePathname();

  const meta = useMemo(() => getEditorRouteMeta(pathname), [pathname]);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [addPanelOpen, setAddPanelOpen] = useState(false);

  // ✅ يظهر الهيدر الداخلي (المعلومات الرئيسية/الدليل/+إضافة/بحث) فقط في homepage
  // ✅ لا نعتمد على meta هنا نهائياً عشان ما يتكرر بالغلط
  const isHomepage = useMemo(() => {
    if (!pathname) return false;
    return pathname.endsWith("/customize/homepage");
  }, [pathname]);

  // ✅ overlay فقط لو homepage و لوحة الإضافة مفتوحة
  const hasOverlay = isHomepage && addPanelOpen;

  return (
    <div
      dir="rtl"
      className={[
        "min-h-screen bg-white",
        sidebarOpen ? "has-sidebar--opened" : "has-sidebar--closed",
        hasOverlay ? "panel-is-opened" : "",
      ].join(" ")}
    >
      <HeaderBar
        statusLabel="منشور"
        device={device}
        onDeviceChange={setDevice}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      <div className="relative mx-auto flex w-full max-w-[1900px]">
        <QuickNav themeId={params.themeId} />

        <SidebarShell
          // ✅ هذا هو المفتاح: الهيدر الداخلي يظهر فقط بالهوم
          showHeader={isHomepage}
          title={isHomepage ? meta.title : ""}
          description={isHomepage ? meta.description : undefined}
          helpHref={isHomepage ? meta.helpHref : undefined}
          onOpenAddPanel={isHomepage ? () => setAddPanelOpen(true) : undefined}
        >
          {children}
        </SidebarShell>

        <div className="relative flex-1">
          <PreviewFrame
            themeId={params.themeId}
            device={device}
            sidebarOpen={sidebarOpen}
            storefrontOrigin={storefrontOrigin}
          />

          {hasOverlay ? (
            <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-[1px]" />
          ) : null}
        </div>
      </div>

      {/* ✅ لوحة الإضافة ممنوعة خارج homepage */}
      {isHomepage ? (
        <AddComponentPanel
          open={addPanelOpen}
          onClose={() => setAddPanelOpen(false)}
        />
      ) : null}
    </div>
  );
}
