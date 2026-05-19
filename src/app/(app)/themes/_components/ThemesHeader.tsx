export default function ThemesHeader() {
  return (
    <div className="container mx-auto px-4 mt-4">
      <div id="breadcrumbs" className="flex-1 mb-4">
        {/* مكان breadcrumbs عندك */}
        <div className="w-fit text-sm text-gray-500">
          / تصميم المتجر / إدارة الثيمات
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 my-6 min-h-[35px]">
        <h1 className="text-primary text-2xl font-bold">إدارة الثيمات</h1>

        <button
          className="text-sm px-3 py-2 rounded-full border border-gray-200 hover:bg-gray-50"
          type="button"
        >
          جهّز صفحة هبوط!
        </button>
      </div>
    </div>
  );
}
