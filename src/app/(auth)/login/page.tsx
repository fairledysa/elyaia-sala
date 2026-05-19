// FILE: apps/merchant/src/app/(auth)/login/page.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Card, { CardBody } from "@/components/ui/Card";
import Input from "@/components/form/Input";
import Button from "@/components/ui/Button";
import FieldWrap from "@/components/form/FieldWrap";
import Checkbox from "@/components/form/Checkbox";
import Label from "@/components/form/Label";
import Description from "@/components/form/Description";
import classNames from "classnames";

import { supabaseBrowser } from "@/lib/supabase/browser";

function AuthSwitchSallaLike() {
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  const isRegister = pathname === "/register";

  const activeStyle = "text-zinc-900 border-transparent shadow-sm";
  const inactiveStyle = "text-zinc-700 hover:opacity-90";

  return (
    <div className="mb-6">
      <div className="flex w-full overflow-hidden rounded-xl border border-zinc-200/60 bg-white">
        <Link
          href="/register"
          className={classNames(
            "flex-1 py-3 text-center text-sm font-semibold transition",
            isRegister ? activeStyle : inactiveStyle,
          )}
          style={
            isRegister
              ? { backgroundColor: "var(--color-primary-500)" }
              : undefined
          }
        >
          إنشاء حساب
        </Link>

        <Link
          href="/login"
          className={classNames(
            "flex-1 border-r border-zinc-200/60 py-3 text-center text-sm font-semibold transition",
            isLogin ? activeStyle : inactiveStyle,
          )}
          style={
            isLogin
              ? { backgroundColor: "var(--color-primary-500)" }
              : undefined
          }
        >
          تسجيل الدخول
        </Link>
      </div>
    </div>
  );
}

function LeftSlider() {
  const slides = useMemo(
    () => [
      "/boltify/images/ss1.png",
      "/boltify/images/ss2.png",
      "/boltify/images/ss3.png",
      "/boltify/images/ss4.png",
    ],
    [],
  );

  const [idx, setIdx] = useState(0);

  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const lastXRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const clampIndex = (i: number) => {
    const n = slides.length;
    return (i + n) % n;
  };

  const goTo = (i: number) => setIdx(clampIndex(i));
  const next = () => goTo(idx + 1);
  const prev = () => goTo(idx - 1);

  useEffect(() => {
    if (isDragging) return;

    const t = setInterval(() => {
      setIdx((p) => (p + 1) % slides.length);
    }, 5000);

    return () => clearInterval(t);
  }, [slides.length, isDragging]);

  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    setIsDragging(true);
    startXRef.current = e.clientX;
    lastXRef.current = e.clientX;
    setDragX(0);

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;

    lastXRef.current = e.clientX;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
      const dx = lastXRef.current - startXRef.current;
      setDragX(dx * 0.9);
    });
  };

  const onPointerUp = () => {
    if (!draggingRef.current) return;

    draggingRef.current = false;

    const dx = dragX;
    setIsDragging(false);

    const TH = 70;

    if (dx <= -TH) {
      next();
    } else if (dx >= TH) {
      prev();
    }

    setDragX(0);
  };

  const activeDot = "bg-zinc-900";
  const idleDot = "bg-zinc-300";

  const CARD_W = 640;
  const GAP = 18;

  const trackTranslate = -(idx * (CARD_W + GAP)) + dragX;

  return (
    <div className="relative hidden lg:block">
      <div className="absolute inset-0 bg-zinc-50" />

      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(24,24,27,0.08) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center px-16 py-10">
        <div className="w-full max-w-[760px]">
          <div className="mb-6 text-center text-sm text-zinc-700" dir="rtl">
            خذ نظرة على آخر تحديثات المنصة
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[28px] bg-white/60 shadow-[0_18px_40px_rgba(0,0,0,0.06)]" />
            <div className="absolute -inset-10 rounded-[34px] bg-white/30" />

            <div className="relative overflow-hidden rounded-3xl border border-zinc-200/70 bg-white shadow-sm">
              <div className="relative h-[420px]">
                <div
                  className={classNames(
                    "absolute inset-0 select-none",
                    "touch-pan-y",
                    isDragging ? "cursor-grabbing" : "cursor-grab",
                  )}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                >
                  <div
                    className={classNames(
                      "absolute left-1/2 top-1/2 -translate-y-1/2",
                      "will-change-transform",
                    )}
                    style={{
                      transform: `translateX(calc(-50% + ${trackTranslate}px))`,
                      transition: isDragging
                        ? "none"
                        : "transform 420ms cubic-bezier(.2,.8,.2,1)",
                      display: "flex",
                      gap: `${GAP}px`,
                      padding: "28px",
                    }}
                  >
                    {slides.map((src, i) => {
                      const rel = i - idx;
                      const isActive = rel === 0;

                      const rotate = isActive
                        ? 0
                        : rel === 1
                          ? 3.5
                          : rel === -1
                            ? -3.5
                            : rel > 0
                              ? 6
                              : -6;

                      const scale = isActive
                        ? 1
                        : Math.max(
                            0.88,
                            1 - Math.min(0.12, Math.abs(rel) * 0.06),
                          );

                      const opacity = isActive
                        ? 1
                        : Math.max(0.35, 1 - Math.abs(rel) * 0.25);

                      return (
                        <div
                          key={src}
                          className="relative"
                          style={{
                            width: CARD_W,
                            flex: `0 0 ${CARD_W}px`,
                            transform: `rotate(${rotate}deg) scale(${scale})`,
                            opacity,
                            transition: isDragging
                              ? "none"
                              : "transform 420ms cubic-bezier(.2,.8,.2,1), opacity 420ms cubic-bezier(.2,.8,.2,1)",
                            zIndex: isActive ? 3 : 1,
                          }}
                        >
                          <div className="absolute inset-0 rounded-2xl bg-emerald-100/70" />

                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={src}
                            alt="slide"
                            draggable={false}
                            className="relative h-full w-full object-contain p-8"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />

                          <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.10)]" />
                        </div>
                      );
                    })}
                  </div>

                  <div className="pointer-events-none absolute bottom-3 left-5 text-[11px] text-zinc-500">
                    اسحب للتنقّل ✨
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 pb-4">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`slide-${i}`}
                    onClick={() => goTo(i)}
                    className={classNames(
                      "h-2 w-2 rounded-full transition",
                      i === idx ? activeDot : idleDot,
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 text-center" dir="rtl">
            <h2 className="text-3xl font-bold text-zinc-900">
              كل ما تحتاجه لتنمو بتجارتك
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-600">
              لوحة تحكم احترافية، إدارة منتجات وطلبات، وربط شحن ودفع — بأسلوب
              مرتب مثل سلة.
            </p>

            <button className="mt-6 text-sm font-semibold text-zinc-700 underline underline-offset-4 hover:opacity-80">
              عرض كل التحديثات
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [visibility, setVisibility] = useState<Record<string, boolean>>({});

  const toggleVisibility = (field: string) =>
    setVisibility((prev) => ({ ...prev, [field]: !prev[field] }));

  const [form, setForm] = useState({
    username: "",
    password: "",
    rememberMe: true,
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const nextParam = searchParams.get("next") || "/";
  const safeNext = nextParam.startsWith("/") ? nextParam : "/";

  const onSubmit = async () => {
    setErrorText(null);
    setSubmitting(true);

    try {
      const supabase = supabaseBrowser();
      const email = form.username.trim().toLowerCase();

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: form.password,
      });

      if (error) {
        const msg = error.message?.toLowerCase().includes(
          "invalid login credentials",
        )
          ? "بيانات الدخول غير صحيحة."
          : error.message || "تعذر تسجيل الدخول.";

        setErrorText(msg);
        return;
      }

      router.push(safeNext);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh w-full bg-white">
      <div
        className="grid min-h-dvh w-full grid-cols-1 lg:grid-cols-2"
        dir="ltr"
      >
        <LeftSlider />

        <div
          className="flex min-h-dvh items-center justify-center px-5 py-10 lg:px-16"
          dir="rtl"
        >
          <div className="relative w-full max-w-[520px]">
            <div className="absolute -top-16 right-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/boltify/images/logo-light.svg"
                className="h-12 dark:hidden"
                alt="Madrar"
              />

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/boltify/images/logo-dark.svg"
                className="hidden h-12 dark:block"
                alt="elyaia"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>

            <Card className="border border-zinc-200/70 shadow-sm">
              <CardBody className="p-8!">
                <AuthSwitchSallaLike />

                {!!errorText && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorText}
                  </div>
                )}

                <div className="grid gap-y-4">
                  <div>
                    <Label htmlFor="username" className="w-auto!">
                      البريد الإلكتروني
                    </Label>

                    <Input
                      className="bg-transparent!"
                      id="username"
                      name="username"
                      autoComplete="username"
                      value={form.username}
                      onChange={(e: any) =>
                        setForm((p) => ({
                          ...p,
                          username: e.target.value,
                        }))
                      }
                      placeholder="ادخل البريد الإلكتروني"
                    />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between [&>*]:mb-0">
                      <Label htmlFor="password" className="w-auto!">
                        كلمة المرور
                      </Label>

                      <Description id="forgot-password-desc">
                        <Link
                          className="text-sm font-medium"
                          href="/forgot-password"
                        >
                          نسيت كلمة المرور؟
                        </Link>
                      </Description>
                    </div>

                    <FieldWrap
                      lastSuffix={
                        <Button
                          aria-label="إظهار/إخفاء"
                          color="zinc"
                          icon={visibility.password ? "View" : "ViewOffSlash"}
                          onClick={() => toggleVisibility("password")}
                          tabIndex={-1}
                        />
                      }
                    >
                      <Input
                        type={visibility.password ? "text" : "password"}
                        className="bg-transparent! font-mono placeholder-shown:font-sans"
                        id="password"
                        name="password"
                        autoComplete="current-password"
                        value={form.password}
                        onChange={(e: any) =>
                          setForm((p) => ({
                            ...p,
                            password: e.target.value,
                          }))
                        }
                        placeholder="ادخل كلمة المرور"
                        aria-describedby="forgot-password-desc"
                        onKeyDown={(e: any) => {
                          if (e.key === "Enter") onSubmit();
                        }}
                      />
                    </FieldWrap>
                  </div>

                  <div className="flex items-center">
                    <Checkbox
                      id="rememberMe"
                      name="rememberMe"
                      checked={form.rememberMe}
                      onChange={(e: any) =>
                        setForm((p) => ({
                          ...p,
                          rememberMe: e.target.checked,
                        }))
                      }
                      dimension="sm"
                      label="تذكرني"
                      color="emerald"
                    />
                  </div>

                  <Button
                    aria-label="متابعة"
                    variant="solid"
                    className="py-2.5! font-bold"
                    onClick={onSubmit}
                    isDisable={
                      submitting || !form.username.trim() || !form.password
                    }
                  >
                    {submitting ? "جاري تسجيل الدخول..." : "متابعة"}
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}