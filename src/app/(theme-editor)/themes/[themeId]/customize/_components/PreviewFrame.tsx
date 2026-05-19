// apps/merchant/src/app/(theme-editor)/themes/[themeId]/customize/_components/PreviewFrame.tsx
"use client";

export default function PreviewFrame({
  themeId,
  device,
  sidebarOpen,
  storefrontOrigin,
}: {
  themeId: string;
  device: "desktop" | "mobile";
  sidebarOpen: boolean;
  storefrontOrigin: string;
}) {
  const src = `${storefrontOrigin}/?themeEditor=1&runtimeThemeId=${encodeURIComponent(
    themeId,
  )}`;

  const mobileWidth = 420;

  return (
    <div className="relative flex h-[calc(100vh-56px)] w-full items-start justify-center bg-gray-50">
      <div
        className={[
          "relative mt-6 overflow-hidden rounded-2xl bg-white shadow-sm",
          device === "mobile" ? "border" : "",
        ].join(" ")}
        style={
          device === "mobile"
            ? { width: mobileWidth, height: "calc(100vh - 56px - 48px)" }
            : { width: "100%", height: "calc(100vh - 56px)" }
        }
      >
        <iframe
          id="store_preview"
          title="Store Preview"
          src={src}
          className="h-full w-full"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
        />
      </div>
    </div>
  );
}