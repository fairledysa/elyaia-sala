// apps/merchant/src/app/(auth)/register/page.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import classNames from "classnames";

import Card, { CardBody } from "@/components/ui/Card";
import Input from "@/components/form/Input";
import Button from "@/components/ui/Button";
import FieldWrap from "@/components/form/FieldWrap";
import Label from "@/components/form/Label";
import Validation from "@/components/form/Validation";
import Progress from "@/components/ui/Progress";
import List, { Li } from "@/components/ui/List";
import { TColors } from "@/types/colors.type";

import { supabaseBrowser } from "@/lib/supabase/browser";

const passwordChecks = (password: string) => ({
  hasMinLength: password.length >= 8,
  hasUppercase: /[A-Z]/.test(password),
  hasLowercase: /[a-z]/.test(password),
  hasNumberOrSymbol: /[\d\s\W]/.test(password),
  hasNoRepeatingChars: password.length >= 3 && !/(.)\1{2,}/.test(password),
});

type IRegisterFormValues = {
  fullName: string;
  email: string;
  phone: string; // 9 أرقام فقط بدون +966
  newPassword: string;
  repeatPassword: string;
};

const validationSchema = Yup.object().shape({
  fullName: Yup.string().required("فضلاً ادخل اسمك للمتابعة."),
  email: Yup.string()
    .email("البريد الإلكتروني غير صحيح.")
    .required("البريد الإلكتروني مطلوب."),
  phone: Yup.string()
    .required("فضلاً ادخل رقم جوالك للمتابعة.")
    .matches(/^\d{9}$/, "اكتب رقم الجوال بدون +966 (9 أرقام)"),
  newPassword: Yup.string()
    .required("كلمة المرور مطلوبة")
    .min(8, "8 أحرف على الأقل")
    .matches(/[A-Z]/, "حرف كبير واحد على الأقل (A-Z)")
    .matches(/[a-z]/, "حرف صغير واحد على الأقل (a-z)")
    .matches(/[\d\s\W]/, "رقم/رمز واحد على الأقل")
    .test(
      "no-repeating-chars",
      "ممنوع تكرار نفس الحرف 3 مرات أو أكثر وراء بعض",
      (value) => !/(.)\1{2,}/.test(value || "")
    ),
  repeatPassword: Yup.string()
    .required("أكد كلمة المرور")
    .oneOf([Yup.ref("newPassword")], "كلمتا المرور غير متطابقتين"),
});

function AuthSwitchSallaLike() {
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  const isRegister = pathname === "/register";

  const activeStyle = "text-zinc-900 border-transparent shadow-sm";
  const inactiveStyle = "text-zinc-700 hover:opacity-90";

  return (
    <div className="mb-6">
      <div className="flex w-full rounded-xl border border-zinc-200/60 overflow-hidden bg-white">
        <Link
          href="/register"
          className={classNames(
            "flex-1 text-center py-3 text-sm font-semibold transition",
            isRegister ? activeStyle : inactiveStyle
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
            "flex-1 text-center py-3 text-sm font-semibold transition border-r border-zinc-200/60",
            isLogin ? activeStyle : inactiveStyle
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

function SaudiPhoneField({
  value,
  onChange,
  onBlur,
  errorText,
}: {
  value: string;
  onChange: (next: string) => void;
  onBlur?: () => void;
  errorText?: string;
}) {
  const flag = "https://flagcdn.com/w20/sa.png";

  return (
    <div>
      <Label htmlFor="phone" className="w-auto!">
        رقم الجوال
      </Label>

      <div className="relative">
        <Input
          id="phone"
          name="phone"
          className="bg-transparent! ps-[140px]!"
          placeholder="5XXXXXXXX"
          value={value}
          onChange={(e: any) => {
            const onlyDigits = String(e.target.value)
              .replace(/\D/g, "")
              .slice(0, 9);
            onChange(onlyDigits);
          }}
          onBlur={onBlur as any}
          dir="ltr"
          inputMode="numeric"
          autoComplete="tel"
        />

        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 border-r border-zinc-200/70 pr-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={flag} alt="SA" className="h-4 w-6 rounded-sm" />
          <span className="text-sm text-zinc-600">+966</span>
        </div>
      </div>

      {!!errorText && <p className="mt-1 text-xs text-red-500">{errorText}</p>}
    </div>
  );
}

export default function RegisterPage() {
  const heroImage = useMemo(() => "/boltify/images/register.webp", []);
  const router = useRouter();

  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const toggleVisibility = (field: string) =>
    setVisibility((prev) => ({ ...prev, [field]: !prev[field] }));

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const formikRegister = useFormik<IRegisterFormValues>({
    initialValues: {
      fullName: "",
      email: "",
      phone: "",
      newPassword: "",
      repeatPassword: "",
    },
    validationSchema,
    onSubmit: async (values) => {
      setSubmitError(null);
      setSubmitting(true);

      try {
        const supabase = supabaseBrowser();

        const email = values.email.trim().toLowerCase();
        const fullPhone = `+966${values.phone}`;

        const { data, error } = await supabase.auth.signUp({
          email,
          password: values.newPassword,
          options: {
            data: {
              full_name: values.fullName,
              phone: fullPhone,
              phone_verified: false,
            },
            // ✅ ثابت: callback -> verify-phone
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/verify-phone`,
          },
        });

        if (error) {
          const msg =
            error.message?.toLowerCase().includes("already registered") ||
            error.message?.toLowerCase().includes("user already registered")
              ? "هذا البريد مسجل مسبقًا. جرّب تسجيل الدخول."
              : error.message || "تعذر إنشاء الحساب. حاول مرة ثانية.";
          setSubmitError(msg);
          return;
        }

        // ✅ لازم تكون session موجودة (Confirm email OFF) عشان نقدر نمشي تحقق الواتساب/الجوال
        if (!data.session) {
          setSubmitError(
            "تم إنشاء الحساب، لكن لا يمكن المتابعة قبل التفعيل. (تحقق: Confirm email لازم يكون OFF)."
          );
          return;
        }

        router.push("/verify-phone");
        router.refresh();
      } catch {
        setSubmitError("صار خطأ غير متوقع. جرّب مرة ثانية.");
      } finally {
        setSubmitting(false);
      }
    },
  });

  const checks = passwordChecks(formikRegister.values.newPassword);
  const passedCount = Object.values(checks).filter(Boolean).length;

  const colorMap: { [key: number]: TColors } = {
    0: "red",
    1: "red",
    2: "amber",
    3: "amber",
    4: "blue",
    5: "emerald",
  };
  const passwordStrengthColor: TColors = colorMap[passedCount] ?? "emerald";

  return (
    <div className="min-h-dvh w-full bg-white">
      <div
        className="min-h-dvh w-full grid grid-cols-1 lg:grid-cols-2"
        dir="ltr"
      >
        {/* العمود الأيسر: الصورة */}
        <div className="hidden lg:block relative">
          <div className="absolute inset-0 bg-zinc-50" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImage}
            alt="Register"
            className="absolute inset-0 h-full w-full object-contain px-16 py-10"
          />
          <div className="absolute inset-x-0 bottom-16 px-16">
            <div className="text-center" dir="rtl">
              <h2 className="text-3xl font-bold text-zinc-900">
                كل ما تحتاجه لتنمو بتجارتك
              </h2>
              <p className="mt-2 text-sm text-zinc-600 leading-6">
                لوحة تحكم احترافية، إدارة منتجات وطلبات، وربط شحن ودفع — بأسلوب
                مرتب مثل سلة.
              </p>
            </div>
          </div>
        </div>

        {/* العمود الأيمن: الفورم */}
        <div
          className="flex min-h-dvh items-center justify-center px-5 py-10 lg:px-16"
          dir="rtl"
        >
          <div className="relative w-full max-w-[520px]">
            {/* ✅ Logo (واحد فقط) */}
            <div className="absolute -top-16 right-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-light.svg"
                className="h-10"
                alt="elyaia"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>

            <Card className="border border-zinc-200/70 shadow-sm">
              <CardBody className="p-8!">
                <AuthSwitchSallaLike />

                {!!submitError && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {submitError}
                  </div>
                )}

                <form
                  onSubmit={formikRegister.handleSubmit}
                  className="grid gap-y-4"
                >
                  <div>
                    <Label htmlFor="fullName" className="w-auto!">
                      الاسم الكريم
                    </Label>
                    <Input
                      className="bg-transparent!"
                      id="fullName"
                      name="fullName"
                      value={formikRegister.values.fullName}
                      onChange={formikRegister.handleChange}
                      onBlur={formikRegister.handleBlur}
                      placeholder="ادخل الاسم الكريم"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="w-auto!">
                      البريد الإلكتروني
                    </Label>
                    <Input
                      className="bg-transparent!"
                      id="email"
                      name="email"
                      type="email"
                      value={formikRegister.values.email}
                      onChange={formikRegister.handleChange}
                      onBlur={formikRegister.handleBlur}
                      placeholder="ادخل البريد الإلكتروني"
                      autoComplete="email"
                    />
                  </div>

                  <SaudiPhoneField
                    value={formikRegister.values.phone}
                    onChange={(next) =>
                      formikRegister.setFieldValue("phone", next)
                    }
                    onBlur={() => formikRegister.setFieldTouched("phone", true)}
                    errorText={
                      formikRegister.touched.phone
                        ? (formikRegister.errors.phone as string)
                        : undefined
                    }
                  />

                  <div className="flex flex-col gap-4">
                    <div>
                      <Label htmlFor="newPassword">كلمة المرور</Label>
                      <Validation
                        isValid={formikRegister.isValid}
                        isTouched={formikRegister.touched.newPassword}
                        invalidFeedback={formikRegister.errors.newPassword}
                        validFeedback="ممتاز"
                      >
                        <FieldWrap
                          lastSuffix={
                            <Button
                              aria-label="إظهار/إخفاء"
                              color="zinc"
                              icon={
                                visibility.newPassword ? "View" : "ViewOffSlash"
                              }
                              onClick={() => toggleVisibility("newPassword")}
                              tabIndex={-1}
                            />
                          }
                        >
                          <Input
                            id="newPassword"
                            name="newPassword"
                            type={visibility.newPassword ? "text" : "password"}
                            className="font-mono select-none placeholder-shown:font-sans"
                            placeholder="ادخل كلمة المرور"
                            value={formikRegister.values.newPassword}
                            onChange={formikRegister.handleChange}
                            onBlur={formikRegister.handleBlur}
                            onCopy={(e) => e.preventDefault()}
                            onCut={(e) => e.preventDefault()}
                            autoComplete="new-password"
                          />
                        </FieldWrap>
                      </Validation>
                    </div>

                    <div>
                      <Validation
                        isValid={formikRegister.isValid}
                        isTouched={formikRegister.touched.repeatPassword}
                        invalidFeedback={formikRegister.errors.repeatPassword}
                        validFeedback="متطابقة"
                      >
                        <FieldWrap
                          lastSuffix={
                            <Button
                              aria-label="إظهار/إخفاء"
                              color="zinc"
                              icon={
                                visibility.repeatPassword
                                  ? "View"
                                  : "ViewOffSlash"
                              }
                              onClick={() => toggleVisibility("repeatPassword")}
                              tabIndex={-1}
                            />
                          }
                        >
                          <Input
                            id="repeatPassword"
                            name="repeatPassword"
                            type={
                              visibility.repeatPassword ? "text" : "password"
                            }
                            className="font-mono placeholder-shown:font-sans"
                            placeholder="أعد كتابة كلمة المرور"
                            value={formikRegister.values.repeatPassword}
                            onChange={formikRegister.handleChange}
                            onBlur={formikRegister.handleBlur}
                            onCopy={(e) => e.preventDefault()}
                            onCut={(e) => e.preventDefault()}
                            autoComplete="new-password"
                          />
                        </FieldWrap>
                      </Validation>
                    </div>

                    <div className="grid grid-cols-5 gap-2">
                      <Progress
                        value={passedCount > 0 ? 100 : 0}
                        color={passwordStrengthColor}
                      />
                      <Progress
                        value={passedCount > 1 ? 100 : 0}
                        color={passwordStrengthColor}
                      />
                      <Progress
                        value={passedCount > 2 ? 100 : 0}
                        color={passwordStrengthColor}
                      />
                      <Progress
                        value={passedCount > 3 ? 100 : 0}
                        color={passwordStrengthColor}
                      />
                      <Progress
                        value={passedCount > 4 ? 100 : 0}
                        color={passwordStrengthColor}
                      />
                    </div>

                    <List type="list-none" className="text-zinc-500">
                      <Li
                        iconProps={{
                          icon: checks.hasMinLength ? "Tick02" : "Cancel01",
                          color: checks.hasMinLength ? "emerald" : "red",
                        }}
                        className={classNames({
                          "text-emerald-500": checks.hasMinLength,
                        })}
                      >
                        8 أحرف على الأقل
                      </Li>
                      <Li
                        iconProps={{
                          icon: checks.hasUppercase ? "Tick02" : "Cancel01",
                          color: checks.hasUppercase ? "emerald" : "red",
                        }}
                        className={classNames({
                          "text-emerald-500": checks.hasUppercase,
                        })}
                      >
                        حرف كبير واحد على الأقل (A-Z)
                      </Li>
                      <Li
                        iconProps={{
                          icon: checks.hasLowercase ? "Tick02" : "Cancel01",
                          color: checks.hasLowercase ? "emerald" : "red",
                        }}
                        className={classNames({
                          "text-emerald-500!": checks.hasLowercase,
                        })}
                      >
                        حرف صغير واحد على الأقل (a-z)
                      </Li>
                      <Li
                        iconProps={{
                          icon: checks.hasNumberOrSymbol
                            ? "Tick02"
                            : "Cancel01",
                          color: checks.hasNumberOrSymbol ? "emerald" : "red",
                        }}
                        className={classNames({
                          "text-emerald-500!": checks.hasNumberOrSymbol,
                        })}
                      >
                        رقم/رمز واحد على الأقل
                      </Li>
                      <Li
                        iconProps={{
                          icon: checks.hasNoRepeatingChars
                            ? "Tick02"
                            : "Cancel01",
                          color: checks.hasNoRepeatingChars ? "emerald" : "red",
                        }}
                        className={classNames({
                          "text-emerald-500!": checks.hasNoRepeatingChars,
                        })}
                      >
                        ممنوع تكرار نفس الحرف 3 مرات أو أكثر وراء بعض
                      </Li>
                    </List>
                  </div>

                  <Button
                    variant="solid"
                    className="py-2.5! font-bold"
                    isDisable={submitting || passedCount < 4}
                    type="submit"
                  >
                    {submitting ? "جاري إنشاء الحساب..." : "تسجيل"}
                  </Button>

                  <p className="text-center text-xs text-zinc-500">
                    بالتسجيل فأنت توافق على اتفاقية الاستخدام وسياسة الخصوصية
                  </p>
                </form>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
