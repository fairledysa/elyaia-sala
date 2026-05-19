//apps/merchant/src/app/(theme-editor)/themes/[themeId]/customize/extra-services/page.tsx
"use client";

export default function ExtraServicesEditorPage() {
  return (
    <div className="space-y-3">
      <SectionRow title="خدمات إضافية" />
      <SectionRow title="خدمة الواتساب" />
      <SectionRow title="ربط خرائط قوقل" />
      <SectionRow title="المدونة" />
      <SectionRow title="الشريط الإعلاني المتحرك" />
    </div>
  );
}

function SectionRow({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-3 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          title="فتح"
        >
          ‹
        </button>
        <div className="text-[13px] font-semibold text-gray-900">{title}</div>
      </div>

      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
        title="إعدادات"
      >
        ⚙
      </button>
    </div>
  );
}
