// FILE: apps/merchant/src/app/(theme-editor)/themes/[themeId]/customize/lib/editor-nav.ts

export const EDITOR_NAV = [
  { slug: "homepage", label: "الرئيسية", icon: "🏠" },
  { slug: "main-info", label: "المعلومات", icon: "ℹ️" },
  { slug: "header-and-footer", label: "الهيدر/الفوتر", icon: "🧩" },
  { slug: "menus", label: "القوائم", icon: "📋" },
  { slug: "marketing", label: "التسويق", icon: "🎯" },
  { slug: "theme-options", label: "خيارات الثيم", icon: "⚙️" },
  { slug: "customization", label: "التخصيص", icon: "🎨" },
  { slug: "extra-services", label: "خدمات إضافية", icon: "✨" },
  { slug: "advertisements", label: "الإعلانات", icon: "📣" },
] as const;

const META: Record<
  string,
  { title: string; description?: string; helpHref?: string }
> = {
  homepage: {
    title: "الصفحة الرئيسية",
    description: "خصص عناصر الصفحة الرئيسية لمتجرك ورتّبها بسهولة.",
    helpHref: "#",
  },
  "main-info": {
    title: "المعلومات الرئيسية",
    description: "إعدادات عامة لمتجرك.",
    helpHref: "#",
  },
  "header-and-footer": {
    title: "الهيدر والفوتر",
    description: "تحكم بعناصر الرأس والتذييل.",
    helpHref: "#",
  },
  menus: {
    title: "القوائم",
    description: "إدارة القوائم والروابط.",
    helpHref: "#",
  },
  marketing: {
    title: "التسويق",
    description: "أدوات تسويقية تتحكم بما يظهر داخل واجهة المتجر.",
    helpHref: "#",
  },
  "theme-options": {
    title: "خيارات الثيم",
    description: "خيارات عامة للثيم.",
    helpHref: "#",
  },
  customization: {
    title: "التخصيص",
    description: "ألوان، خطوط، بطاقات…",
    helpHref: "#",
  },
  "extra-services": {
    title: "خدمات إضافية",
    description: "خدمات وويدجت إضافية.",
    helpHref: "#",
  },
  advertisements: {
    title: "الإعلانات",
    description: "بنرات وإعلانات داخل المتجر.",
    helpHref: "#",
  },
};

export function getEditorRouteMeta(pathname: string | null) {
  const slug =
    (pathname || "").split("/customize/")[1]?.split("/")[0] || "homepage";

  return META[slug] || META.homepage;
}