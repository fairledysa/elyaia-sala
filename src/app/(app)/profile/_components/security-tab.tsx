// apps/merchant/src/app/(app)/profile/_components/security-tab.tsx
"use client";

import { useMemo, useState } from "react";

import Card, {
  CardBody,
  CardHeader,
  CardHeaderChild,
  CardTitle,
  CardSubTitle,
} from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/form/Input";
import Label from "@/components/form/Label";
import Description from "@/components/form/Description";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function SecurityTab({
  initialEmail,
  emailVerified,
}: {
  initialEmail: string;
  emailVerified: boolean;
}) {
  const [email, setEmail] = useState(initialEmail || "");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // ✅ مهم: نخلي التحقق state محلي عشان يتغير مباشرة بعد تحديث البريد
  const [verified, setVerified] = useState<boolean>(emailVerified);

  const invalid = useMemo(
    () => !isValidEmail(email.trim().toLowerCase()),
    [email]
  );

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

      setMsg("تم إرسال رابط التفعيل إلى بريدك.");
    } finally {
      setLoading(false);
    }
  };

  const updateEmail = async () => {
    setMsg(null);
    const next = email.trim().toLowerCase();

    if (!isValidEmail(next)) {
      setMsg("البريد غير صحيح.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/email/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: next }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(json?.error || "فشل تحديث البريد.");
        return;
      }

      // ✅ بما أن البريد تغيّر: لازم يرجع غير موثّق
      setVerified(false);

      // ✅ أرسل تفعيل مباشرة للإيميل الجديد (تحقق الملكية)
      await resend();

      setMsg("تم تحديث البريد. تم إرسال رابط التفعيل للبريد الجديد.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ✅ تأكيد/تعديل البريد مثل سلة */}
      <Card>
        <CardHeader>
          <CardHeaderChild>
            <CardTitle>
              <div>
                <div>الأمان</div>
                <CardSubTitle>
                  تأكيد البريد وتعديله + إعدادات الحساب الأساسية.
                </CardSubTitle>
              </div>
            </CardTitle>
          </CardHeaderChild>
        </CardHeader>

        <CardBody className="flex flex-col gap-4">
          {/* ✅ يظهر فقط إذا البريد غير مؤكد */}
          {!verified && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              بريدك غير مؤكد — فعّل البريد لإكمال التفعيل.
            </div>
          )}

          <div className="grid grid-cols-12 gap-4 items-end">
            <div className="col-span-12 lg:col-span-3 xl:col-span-2">
              <Label htmlFor="email">البريد</Label>
            </div>

            <div className="col-span-12 lg:col-span-9 xl:col-span-6">
              <Input
                id="email"
                name="email"
                type="email"
                dir="ltr"
                aria-describedby="security-email-desc"
                value={email}
                onChange={(e: any) => setEmail(e.target.value)}
              />
              <Description id="security-email-desc" className="mt-2">
                إذا كنت سجلت بريدًا خطأ، عدله هنا ثم أعد إرسال التفعيل.
              </Description>

              {invalid && (
                <div className="mt-2 text-xs text-red-600">
                  البريد غير صحيح.
                </div>
              )}

              {verified && (
                <div className="mt-2 text-xs font-semibold text-emerald-700">
                  البريد موثّق ✅
                </div>
              )}
            </div>

            <div className="col-span-12 lg:col-span-9 lg:col-start-4 xl:col-span-4 xl:col-start-9 flex gap-2">
              <Button
                variant="solid"
                aria-label="Update email"
                onClick={updateEmail}
                isDisable={loading || invalid}
              >
                تحديث البريد
              </Button>

              {/* ✅ زر إعادة الإرسال يظهر فقط إذا البريد غير موثّق */}
              {!verified && (
                <Button
                  variant="outline"
                  color="zinc"
                  aria-label="Resend"
                  onClick={resend}
                  isDisable={loading}
                >
                  إعادة الإرسال
                </Button>
              )}
            </div>
          </div>

          {msg && <div className="text-sm text-zinc-700">{msg}</div>}
        </CardBody>
      </Card>

      {/* ✅ تغيير كلمة المرور (UI الآن، الربط لاحقًا) */}
      <Card>
        <CardHeader>
          <CardHeaderChild>
            <CardTitle>
              <div>
                <div>تغيير كلمة المرور</div>
                <CardSubTitle>سيتم ربط التغيير الفعلي لاحقًا.</CardSubTitle>
              </div>
            </CardTitle>
          </CardHeaderChild>
        </CardHeader>

        <CardBody className="flex flex-col gap-4">
          <div className="grid grid-cols-12 gap-4 items-end">
            <div className="col-span-12 lg:col-span-3 xl:col-span-2">
              <Label htmlFor="newPassword">كلمة مرور جديدة</Label>
            </div>

            <div className="col-span-12 lg:col-span-9 xl:col-span-6">
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                aria-describedby="security-pass-desc"
                placeholder="••••••••"
              />
              <Description id="security-pass-desc" className="mt-2">
                اختر كلمة مرور قوية (سنطبق نفس شروط التسجيل لاحقًا).
              </Description>
            </div>

            <div className="col-span-12 lg:col-span-9 lg:col-start-4 xl:col-span-4 xl:col-start-9">
              <Button variant="solid" aria-label="Save password" isDisable>
                حفظ
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
