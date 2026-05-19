// apps/merchant/src/app/(theme-editor)/themes/[themeId]/customize/_components/QuickNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { EDITOR_NAV } from "../lib/editor-nav";

export default function QuickNav({ themeId }: { themeId: string }) {
  const pathname = usePathname();

  return (
    <nav className="sticky top-[56px] z-40 h-[calc(100vh-56px)] w-[64px] border-l bg-white">
      <ul className="flex flex-col items-center gap-2 px-2 py-3">
        {EDITOR_NAV.map((item) => {
          const href = `/themes/${themeId}/customize/${item.slug}`;
          const active = pathname?.includes(`/customize/${item.slug}`);
          return (
            <li key={item.slug} className="w-full">
              <Link
                href={href}
                className={[
                  "flex h-11 w-full items-center justify-center rounded-xl border text-sm",
                  active ? "bg-gray-900 text-white" : "hover:bg-gray-50",
                ].join(" ")}
                title={item.label}
              >
                {item.icon}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
