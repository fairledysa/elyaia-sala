// apps/merchant/src/app/(app)/_components/home/email-verify-banner.tsx
"use client";

import { useState } from "react";
import Link from "next/link";

export default function EmailVerifyBanner({
  email,
  emailVerified,
}: {
  email: string;
  emailVerified: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (emailVerified) return null;

  const resend = async () => {
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/email/verify/request", {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(json?.error || "فشل إرسال رسالة التأكيد.");
        return;
      }
      setMsg("تم إرسال رسالة التأكيد إلى بريدك.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="font-semibold">
            الرجاء تأكيد البريد الإلكتروني ({email})
          </div>

          <div className="mt-1 text-amber-800/80">
            ستصلك رسالة لتأكيد البريد الإلكتروني، في حال لم تصلك يرجى التحقق من
            البريد المهمل أو تعديل بريدك الإلكتروني{" "}
            <Link
              href="/profile?tab=security"
              className="font-semibold underline underline-offset-4 hover:opacity-80 cursor-pointer"
            >
              من هنا
            </Link>
            .
          </div>

          {msg && <div className="mt-2 text-xs text-amber-900">{msg}</div>}
        </div>

        <button
          onClick={resend}
          disabled={loading}
          className="shrink-0 rounded-xl bg-amber-700 px-4 py-2 text-white font-semibold hover:bg-amber-800 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? "جاري الإرسال..." : "إعادة الإرسال"}
        </button>
      </div>
    </div>
  );
}
