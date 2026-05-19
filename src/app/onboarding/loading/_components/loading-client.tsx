// FILE: apps/merchant/src/app/(app)/onboarding/loading/_components/loading-client.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Card, { CardBody } from "@/components/ui/Card";

export default function LoadingClient() {
  const router = useRouter();
  const [p, setP] = useState(0);

  // ✅ منع تكرار تشغيل الإرسال أثناء نفس الـ mount
  const emailRanRef = useRef(false);

  const steps = useMemo(
    () => [
      { at: 8, text: "نضبط إعدادات المتجر الأساسية..." },
      { at: 22, text: "نجهز الأقسام الافتراضية حسب نشاطك..." },
      { at: 42, text: "نربط إعدادات الدفع والشحن المبدئية..." },
      { at: 64, text: "ننشئ صفحات المتجر والتهيئة الأولية..." },
      { at: 86, text: "نرتب لوحة التحكم ونجهز التقارير..." },
      { at: 98, text: "لمسات أخيرة..." },
    ],
    []
  );

  const currentText = useMemo(() => {
    const found = [...steps].reverse().find((s) => p >= s.at);
    return found?.text ?? "جاري تجهيز متجرك...";
  }, [p, steps]);

  useEffect(() => {
    const t = setInterval(() => {
      setP((x) => {
        if (x >= 100) return 100;
        const jump = Math.ceil(Math.random() * 6);
        return Math.min(100, x + jump);
      });
    }, 180);

    return () => clearInterval(t);
  }, []);

  // ✅ إرسال بريد التفعيل تلقائيًا مرة واحدة عند دخول صفحة loading
  useEffect(() => {
    if (emailRanRef.current) return;
    emailRanRef.current = true;

    // مرة واحدة على الجهاز (وفي نفس الوقت API عندك فيه rate-limit الآن)
    const key = "madrar_email_verify_autosent_v1";

    try {
      if (typeof window !== "undefined" && localStorage.getItem(key) === "1") {
        return;
      }
    } catch {
      // تجاهل أي خطأ (private mode / blocked storage)
    }

    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch("/api/auth/email/verify/request", {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: controller.signal,
        });

        // حتى لو فشل parse ما يهم
        const json = await res.json().catch(() => ({} as any));

        // لو نجح (حتى لو skipped) نخزّن عشان ما نكرر
        if (res.ok) {
          try {
            if (typeof window !== "undefined") localStorage.setItem(key, "1");
          } catch {}
        } else {
          // لو فشل بسبب NO_STORE مثلًا (نادر هنا)، ما نخزّن عشان نجرب لاحقًا عند الدخول مرة ثانية
          // لكن ما نزعج المستخدم ولا نوقف الـ flow
          // console.log("email verify request failed", json);
        }
      } catch {
        // إلغاء / شبكة
      }
    })();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (p < 100) return;

    (async () => {
      // ✅ "استهلك" صفحة التحميل مرة واحدة
      await fetch("/api/onboarding/loading/consume", { method: "POST" }).catch(
        () => {}
      );
      router.replace("/");
      router.refresh();
    })();
  }, [p, router]);

  return (
    <div className="min-h-dvh w-full bg-white" dir="rtl">
      <div className="min-h-dvh w-full flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-[980px]">
          <Card className="border border-zinc-200/70 shadow-sm overflow-hidden">
            <CardBody className="p-0!">
              <div className="bg-emerald-50 px-8 py-10">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-zinc-900">
                    أسعد العملاء بأسهل تجربة شراء
                  </h1>

                  <div className="mt-8 flex items-center justify-center">
                    <div className="relative h-[220px] w-[520px] rounded-2xl bg-white/60 border border-emerald-100 shadow-sm flex items-center justify-center">
                      <div className="relative h-[160px] w-[160px] rounded-full bg-emerald-200/60 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-[18px] border-emerald-300/70" />
                        <div className="relative text-5xl font-extrabold text-zinc-900">
                          {p}%
                        </div>
                      </div>

                      <div className="absolute left-10 top-10 rounded-lg bg-white border border-zinc-200 px-3 py-2 text-xs text-zinc-700 shadow-sm">
                        Google Pay
                      </div>
                      <div className="absolute left-24 top-20 rounded-lg bg-white border border-zinc-200 px-3 py-2 text-xs text-zinc-700 shadow-sm">
                         Pay
                      </div>
                      <div className="absolute right-10 top-12 rounded-lg bg-white border border-zinc-200 px-3 py-2 text-xs text-zinc-700 shadow-sm">
                        Checkout
                      </div>

                      <div className="absolute bottom-6 rounded-full bg-emerald-700 text-white px-5 py-2 text-sm font-semibold shadow-sm">
                        ثقة أعلى لمتجرك
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-8 py-8">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm font-semibold text-zinc-800">
                    {currentText}
                  </div>
                  <div className="text-xs text-zinc-500">قد تأخذ لحظات...</div>
                </div>

                <div className="mt-4 h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all duration-200"
                    style={{ width: `${p}%` }}
                  />
                </div>

                <div className="mt-3 text-xs text-zinc-500">
                  لا تغلق الصفحة — جاري تجهيز ملفات المتجر وإعداداته.
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
