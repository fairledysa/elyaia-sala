// مثال: apps/merchant/src/app/(theme-editor)/themes/[themeId]/customize/menus/page.tsx
"use client";

export default function MenusEditorPage() {
  return (
    <div className="space-y-3">
      <Card title="القائمة الرئيسية" desc="روابط الهيدر الأساسية." />
      <Card title="قائمة الفوتر" desc="روابط التذييل." />
      <Card title="روابط سريعة" desc="روابط مختصرة حسب الثيم." />
    </div>
  );
}

function Card({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-xs text-gray-600">{desc}</div>
      <div className="mt-3 flex gap-2">
        <button className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
          تعديل
        </button>
        <button className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
          إدارة
        </button>
      </div>
    </div>
  );
}
