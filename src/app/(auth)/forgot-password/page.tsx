"use client";

import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">استرجاع كلمة المرور</h1>
        <p className="mt-1 text-sm text-gray-500">
          اكتب بريدك وسنرسل لك رابط إعادة تعيين كلمة المرور.
        </p>
      </div>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          // TODO: ربط API لاحقًا
          alert("جاهز للربط مع API استرجاع كلمة المرور.");
        }}
      >
        <div className="space-y-1">
          <label className="text-sm font-medium">البريد الإلكتروني</label>
          <input
            type="email"
            required
            className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
            placeholder="name@domain.com"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-black px-4 py-2.5 text-white hover:opacity-90"
        >
          إرسال رابط الاسترجاع
        </button>

        <p className="text-center text-sm text-gray-600">
          <Link className="hover:underline" href="/login">
            رجوع لتسجيل الدخول
          </Link>
        </p>
      </form>
    </div>
  );
}
