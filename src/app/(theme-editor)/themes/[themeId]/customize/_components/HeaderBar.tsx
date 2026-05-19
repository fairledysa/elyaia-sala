// apps/merchant/src/app/(theme-editor)/themes/[themeId]/customize/_components/HeaderBar.tsx
"use client";

export default function HeaderBar({
  statusLabel,
  device,
  onDeviceChange,
  sidebarOpen,
  onToggleSidebar,
}: {
  statusLabel: string;
  device: "desktop" | "mobile";
  onDeviceChange: (d: "desktop" | "mobile") => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}) {
  return (
    <header className="sticky top-0 z-50 border-b bg-white">
      <div className="mx-auto flex w-full max-w-[1900px] items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? "إغلاق القائمة" : "فتح القائمة"}
          </button>

          <div className="ml-2 flex items-center gap-1 rounded-lg border p-1">
            <button
              className={[
                "rounded-md px-3 py-1 text-sm",
                device === "desktop"
                  ? "bg-gray-900 text-white"
                  : "hover:bg-gray-50",
              ].join(" ")}
              onClick={() => onDeviceChange("desktop")}
            >
              سطح المكتب
            </button>
            <button
              className={[
                "rounded-md px-3 py-1 text-sm",
                device === "mobile"
                  ? "bg-gray-900 text-white"
                  : "hover:bg-gray-50",
              ].join(" ")}
              onClick={() => onDeviceChange("mobile")}
            >
              الجوال
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border px-3 py-1 text-sm">
            {statusLabel}
          </span>
          <button className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
            ⋯
          </button>
        </div>
      </div>
    </header>
  );
}
