// apps/merchant/src/app/(auth)/verify-phone/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import Card, { CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/form/Input";
import Label from "@/components/form/Label";
import Description from "@/components/form/Description";

function maskPhone(phone?: string | null) {
  if (!phone) return "+966*********";
  return phone.replace(/^(\+\d{3})(\d{2})\d+(\d{2})$/, "$1$2*****$3");
}

export default function VerifyPhonePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState<string | null>(null);

  // ✅ إذا ما فيه رقم: نعرض إدخال رقم
  const [phoneInput, setPhoneInput] = useState(""); // 9 أرقام بدون +966

  // ✅ مرحلة الكود
  const [digits, setDigits] = useState(["", "", "", ""]);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const [errorText, setErrorText] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const code = useMemo(() => digits.join(""), [digits]);

  const focusFirst = () => {
    setTimeout(() => inputsRef.current[0]?.focus(), 0);
  };

  const applyPastedCode = (text: string) => {
    const onlyDigits = String(text || "").replace(/\D/g, "").slice(0, 4);
    if (!onlyDigits) return;

    const next = ["", "", "", ""];
    for (let i = 0; i < onlyDigits.length; i++) next[i] = onlyDigits[i];

    setDigits(next);

    const nextIndex = Math.min(onlyDigits.length, 3);
    setTimeout(() => inputsRef.current[nextIndex]?.focus(), 0);
  };

  const onPasteCode = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    applyPastedCode(pasted);
  };

  // جلب رقم الجوال من user_metadata
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const json = await res.json().catch(() => ({}));
        setPhone(json?.phone ?? null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const requestCode = async () => {
    setErrorText(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/phone/request", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorText(json?.error || "فشل إرسال رمز التحقق.");
        return;
      }
      focusFirst();
    } finally {
      setSubmitting(false);
    }
  };

  const verify = async () => {
    setErrorText(null);

    if (code.length !== 4) {
      setErrorText("أدخل رمز مكوّن من 4 أرقام.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/phone/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorText(json?.error || "رمز غير صحيح.");
        return;
      }

      router.replace("/onboarding");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ إذا فيه رقم، اطلب كود تلقائي + فوكس أول خانة
  useEffect(() => {
    if (loading) return;
    if (!phone) return;
    requestCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, phone]);

  useEffect(() => {
    if (loading) return;
    if (!phone) return;
    focusFirst();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, phone]);

  const onChangeDigit = (i: number, v: string) => {
    const digitsOnly = v.replace(/\D/g, "");
    if (!digitsOnly) {
      setDigits((prev) => {
        const next = [...prev];
        next[i] = "";
        return next;
      });
      return;
    }

    // لو المستخدم كتب/لصق أكثر من رقم في نفس الخانة
    if (digitsOnly.length > 1) {
      applyPastedCode(digitsOnly);
      return;
    }

    const only = digitsOnly.slice(0, 1);
    setDigits((prev) => {
      const next = [...prev];
      next[i] = only;
      return next;
    });

    if (only && i < 3) inputsRef.current[i + 1]?.focus();
  };

  const onKeyDown = (i: number, e: any) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputsRef.current[i - 1]?.focus();
    }
    if (e.key === "Enter") verify();
  };

  // ✅ حفظ رقم جديد (نكتب في user_metadata ثم نطلب كود)
  const savePhone = async () => {
    setErrorText(null);

    const only = phoneInput.replace(/\D/g, "").slice(0, 9);
    if (only.length !== 9) {
      setErrorText("اكتب رقم الجوال بدون +966 (9 أرقام).");
      return;
    }

    setSubmitting(true);
    try {
      const fullPhone = `+966${only}`;

      const res = await fetch("/api/phone/set", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: fullPhone }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorText(json?.error || "فشل حفظ رقم الجوال.");
        return;
      }

      // ثبت الرقم ثم ارسل كود
      setPhone(fullPhone);
      setDigits(["", "", "", ""]);
      await requestCode();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh w-full bg-white" dir="ltr">
      <div className="min-h-dvh w-full grid grid-cols-1 lg:grid-cols-2">
        {/* يسار: نفس ستايل boltify */}
        <div className="hidden lg:block relative">
          <div className="absolute inset-0 bg-white" />
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(24,24,27,0.08) 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center px-16 py-10">
            <div className="w-full max-w-[760px] text-center" dir="rtl">
              <div className="relative mx-auto h-[280px] w-[280px] rounded-3xl bg-zinc-50 border border-zinc-200/70 flex items-center justify-center">
                <div className="h-[140px] w-[140px] rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <div className="h-[80px] w-[80px] rounded-2xl bg-emerald-200 flex items-center justify-center">
                    🔒
                  </div>
                </div>
              </div>

              <h2 className="mt-8 text-3xl font-bold text-zinc-900">
                أمان أكثر… تجربة أسهل
              </h2>
              <p className="mt-2 text-sm text-zinc-600 leading-6">
                قبل ما تكمل تجهيز متجرك، نحتاج تحقق من رقم الجوال — مثل سلة.
              </p>
            </div>
          </div>
        </div>

        {/* يمين: الكرت */}
        <div
          className="flex min-h-dvh items-center justify-center px-5 py-10 lg:px-16"
          dir="rtl"
        >
          <div className="relative w-full max-w-[520px]">
            <div className="absolute -top-16 right-0">
              <img
                src="/boltify/images/logo-light.svg"
                className="h-12 dark:hidden"
                alt="Boltify"
              />
            </div>

            <Card className="border border-zinc-200/70 shadow-sm">
              <CardBody className="p-8!">
                {!!errorText && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorText}
                  </div>
                )}

                {/* ✅ الحالة 1: لا يوجد رقم — أدخل رقم */}
                {!loading && !phone && (
                  <div className="grid gap-4">
                    <h1 className="text-2xl font-bold text-zinc-900">
                      أدخل رقم الجوال
                    </h1>
                    <p className="text-sm text-zinc-600">
                      ما عندنا رقم محفوظ. اكتب رقم جوالك عشان نرسل لك رمز التحقق.
                    </p>

                    <div>
                      <Label htmlFor="phone">رقم الجوال</Label>
                      <div className="relative">
                        <Input
                          id="phone"
                          name="phone"
                          className="bg-transparent! ps-[140px]!"
                          placeholder="5XXXXXXXX"
                          value={phoneInput}
                          onChange={(e: any) => {
                            const only = String(e.target.value)
                              .replace(/\D/g, "")
                              .slice(0, 9);
                            setPhoneInput(only);
                          }}
                          dir="ltr"
                          inputMode="numeric"
                          autoComplete="tel"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 border-r border-zinc-200/70 pr-3">
                          <span className="text-sm text-zinc-600">+966</span>
                        </div>
                      </div>
                      <Description id="phone-desc" className="mt-2">
                        اكتب الرقم بدون +966 (9 أرقام).
                      </Description>
                    </div>

                    <Button
                      variant="solid"
                      className="py-2.5! font-bold"
                      onClick={savePhone}
                      isDisable={submitting}
                    >
                      {submitting ? "جاري الحفظ..." : "إرسال رمز التحقق"}
                    </Button>
                  </div>
                )}

                {/* ✅ الحالة 2: يوجد رقم — أدخل الكود */}
                {!loading && phone && (
                  <div className="grid gap-4">
                    <h1 className="text-2xl font-bold text-zinc-900">
                      أدخل رمز التحقق
                    </h1>
                    <p className="text-sm text-zinc-600">
                      تم إرسال رمز التحقق إلى{" "}
                      <span className="font-semibold">{maskPhone(phone)}</span>
                    </p>

                    <div className="mt-2 flex gap-3 justify-start" onPaste={onPasteCode}>
                      {[0, 1, 2, 3].map((i) => (
                        <input
                          key={i}
                          ref={(el) => {
                            inputsRef.current[i] = el;
                          }}
                          value={digits[i]}
                          onChange={(e) => onChangeDigit(i, e.target.value)}
                          onKeyDown={(e) => onKeyDown(i, e)}
                          onPaste={onPasteCode}
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          className="h-14 w-14 rounded-xl border border-zinc-200 text-center text-2xl outline-none focus:border-emerald-400"
                        />
                      ))}
                    </div>

                    <div className="mt-2 flex gap-3">
                      <Button
                        variant="solid"
                        className="py-2.5! font-bold"
                        onClick={verify}
                        isDisable={submitting}
                      >
                        {submitting ? "جاري التحقق..." : "تحقق"}
                      </Button>

                      <Button
                        variant="outline"
                        color="zinc"
                        className="py-2.5! font-bold"
                        onClick={requestCode}
                        isDisable={submitting}
                      >
                        إعادة إرسال
                      </Button>

                      <Button
                        variant="outline"
                        color="zinc"
                        className="py-2.5! font-bold"
                        onClick={() => {
                          setPhone(null);
                          setPhoneInput("");
                          setDigits(["", "", "", ""]);
                          setErrorText(null);
                          setTimeout(() => {
                            const el = document.getElementById("phone") as HTMLInputElement | null;
                            el?.focus();
                          }, 0);
                        }}
                        isDisable={submitting}
                      >
                        تعديل الرقم
                      </Button>
                    </div>
                  </div>
                )}

                {loading && (
                  <div className="text-sm text-zinc-600">جاري التحميل...</div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
