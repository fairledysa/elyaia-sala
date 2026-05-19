//apps/merchant/src/app/(theme-editor)/themes/[themeId]/customize/advertisements/page.tsx
"use client";

export default function AdvertisementsEditorPage() {
  return (
    <div className="space-y-3">
      <SectionRow title="إعلانات المتجر" />
      <SectionRow title="بنرات الصفحة الرئيسية" />
      <SectionRow title="إعلانات التصنيفات" />
      <SectionRow title="إعلانات صفحة المنتج" />
      <SectionRow title="نافذة منبثقة" />
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
