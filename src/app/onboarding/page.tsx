// FILE: apps/merchant/src/app/(app)/onboarding/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import Card, { CardBody } from "@/components/ui/Card";
import Input from "@/components/form/Input";
import Button from "@/components/ui/Button";
import Label from "@/components/form/Label";
import classNames from "classnames";

type Form = {
  store_name: string;
  store_slug: string;
  country: "YE" | "SA" | "AE" | "OTHER";
  default_currency: "YER" | "SAR" | "AED" | "USD";
  legal_entity: "individual" | "establishment" | "company" | "ngo";
  business_stage: "existing" | "new";
  has_products: "yes" | "no";
  activity: "auto_parts" | "fashion" | "electronics" | "other";
};

const MIN_STORE_NAME = 3;
const MIN_SLUG = 3;

const optionBase =
  "w-full rounded-xl border px-4 py-4 text-right text-sm cursor-pointer select-none transition " +
  "hover:border-zinc-300 hover:bg-zinc-50 active:scale-[0.99] " +
  "focus:outline-none focus:ring-2 focus:ring-emerald-200";

const chipBase =
  "rounded-full border px-4 py-2 text-sm cursor-pointer select-none transition " +
  "hover:border-zinc-300 hover:bg-zinc-50 active:scale-[0.99] " +
  "focus:outline-none focus:ring-2 focus:ring-emerald-200";

const COUNTRY_CURRENCIES: Record<
  Form["country"],
  Array<{
    code: Form["default_currency"];
    name: string;
    symbol: string;
    hint: string;
  }>
> = {
  YE: [
    {
      code: "YER",
      name: "ريال يمني",
      symbol: "ر.ي",
      hint: "مناسب إذا كانت أسعارك ومحاسبتك بالريال اليمني.",
    },
    {
      code: "SAR",
      name: "ريال سعودي",
      symbol: "ر.س",
      hint: "مناسب إذا كانت مشترياتك أو تقاريرك الأساسية بالريال السعودي.",
    },
    {
      code: "USD",
      name: "دولار أمريكي",
      symbol: "$",
      hint: "مناسب إذا كنت تريد عملة أكثر ثباتًا للتقارير والمحاسبة.",
    },
  ],
  SA: [
    {
      code: "SAR",
      name: "ريال سعودي",
      symbol: "ر.س",
      hint: "العملة الرسمية للسعودية.",
    },
  ],
  AE: [
    {
      code: "AED",
      name: "درهم إماراتي",
      symbol: "د.إ",
      hint: "العملة الرسمية للإمارات.",
    },
  ],
  OTHER: [
    {
      code: "SAR",
      name: "ريال سعودي",
      symbol: "ر.س",
      hint: "عملة افتراضية مؤقتة ويمكن تغييرها قبل أول طلب.",
    },
    {
      code: "USD",
      name: "دولار أمريكي",
      symbol: "$",
      hint: "مناسب للتقارير والمحاسبة الدولية.",
    },
  ],
};

function defaultCurrencyForCountry(country: Form["country"]): Form["default_currency"] {
  if (country === "YE") return "YER";
  if (country === "SA") return "SAR";
  if (country === "AE") return "AED";
  return "SAR";
}

function normalizeStoreName(input: string) {
  return String(input || "").trim();
}

function slugifyEnglishOnly(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

type SlugStatus =
  | "idle"
  | "checking"
  | "available"
  | "taken"
  | "too_short"
  | "error";

type NameStatus = "idle" | "too_short" | "ok";

export default function OnboardingPage() {
  const router = useRouter();

  const TOTAL_STEPS = 6;

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const [form, setForm] = useState<Form>({
    store_name: "",
    store_slug: "",
    country: "YE",
    default_currency: "YER",
    legal_entity: "individual",
    business_stage: "new",
    has_products: "no",
    activity: "auto_parts",
  });

  const [nameTouched, setNameTouched] = useState(false);

  const nameStatus: NameStatus = useMemo(() => {
    if (!nameTouched) return "idle";
    const n = normalizeStoreName(form.store_name);
    if (n.length > 0 && n.length < MIN_STORE_NAME) return "too_short";
    if (n.length >= MIN_STORE_NAME) return "ok";
    return "idle";
  }, [form.store_name, nameTouched]);

  const [slugTouched, setSlugTouched] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const [slugSuggestions, setSlugSuggestions] = useState<string[]>([]);
  const slugDebounceRef = useRef<number | null>(null);

  const storeNameLenOk =
    normalizeStoreName(form.store_name).length >= MIN_STORE_NAME;

  const slugLenOk = slugifyEnglishOnly(form.store_slug).length >= MIN_SLUG;

  const currencyOptions = COUNTRY_CURRENCIES[form.country];

  const canNext = useMemo(() => {
    if (step === 1) return true;
    if (step === 2) return true;
    if (step === 3) return true;
    if (step === 4) return true;
    if (step === 5) return true;

    if (step === 6) {
      return storeNameLenOk && slugLenOk && slugStatus === "available";
    }

    return false;
  }, [step, storeNameLenOk, slugLenOk, slugStatus]);

  const next = () => {
    if (!canNext) return;
    setErrorText(null);
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  };

  const prev = () => {
    setErrorText(null);
    setStep((s) => Math.max(1, s - 1));
  };

  const submit = async () => {
    setErrorText(null);
    setSaving(true);

    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          store_slug: slugifyEnglishOnly(form.store_slug),
          store_name: normalizeStoreName(form.store_name),
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorText(json?.error || "فشل حفظ بيانات المتجر.");
        return;
      }

      router.replace("/onboarding/loading");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const checkSlug = async (rawSlug: string) => {
    const s = slugifyEnglishOnly(rawSlug);

    if (!s) {
      setSlugStatus("idle");
      setSlugSuggestions([]);
      return;
    }

    if (s.length < MIN_SLUG) {
      setSlugStatus("too_short");
      setSlugSuggestions([]);
      return;
    }

    setSlugStatus("checking");
    setSlugSuggestions([]);

    try {
      const res = await fetch("/api/onboarding/check-slug", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: s }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        setSlugStatus("error");
        setSlugSuggestions([]);
        return;
      }

      if (json.available) {
        setSlugStatus("available");
        setSlugSuggestions([]);
      } else {
        setSlugStatus("taken");

        const year = new Date().getFullYear();
        const candidates = [
          `${s}1`,
          `${s}2`,
          `${s}3`,
          `${s}-${year}`,
          `${s}-${year.toString().slice(-2)}`,
        ];

        setSlugSuggestions(Array.from(new Set(candidates)).slice(0, 5));
      }
    } catch {
      setSlugStatus("error");
      setSlugSuggestions([]);
    }
  };

  useEffect(() => {
    if (step !== 6) return;
    if (!slugTouched) return;

    if (slugDebounceRef.current) {
      window.clearTimeout(slugDebounceRef.current);
    }

    const raw = form.store_slug;

    slugDebounceRef.current = window.setTimeout(() => {
      checkSlug(raw);
    }, 500);

    return () => {
      if (slugDebounceRef.current) {
        window.clearTimeout(slugDebounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.store_slug, step, slugTouched]);

  return (
    <div
      className="min-h-dvh bg-white flex items-center justify-center px-5 py-10"
      dir="rtl"
    >
      <div className="w-full max-w-[820px]">
        <Card className="border border-zinc-200/70 shadow-sm">
          <CardBody className="p-8!">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-zinc-900">
                  تجهيز المتجر
                </h1>

                <p className="mt-1 text-sm text-zinc-600">
                  كم خطوة بسيطة ونجهز لك لوحة التحكم.
                </p>

                <div className="mt-3 text-xs text-zinc-500">
                  إذا تذكرت أن رقم الجوال غير صحيح، اضغط{" "}
                  <Link
                    href="/auth/reset-signup"
                    className="font-semibold underline underline-offset-4 hover:opacity-80"
                  >
                    التراجع
                  </Link>{" "}
                  ثم سجّل دخولك لإعادة التحقق برقم صحيح.
                </div>
              </div>

              <div className="text-sm text-zinc-500">
                الخطوة <span className="font-bold text-zinc-900">{step}</span> /{" "}
                {TOTAL_STEPS}
              </div>
            </div>

            <div className="mt-6 h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
              />
            </div>

            {!!errorText && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorText}
              </div>
            )}

            {step === 1 && (
              <div className="mt-8 grid gap-4">
                <h2 className="text-lg font-bold text-zinc-900">
                  من أي دولة تسجّل متجرك؟
                </h2>

                <button
                  type="button"
                  className={classNames(
                    optionBase,
                    form.country === "YE"
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-zinc-200 bg-white",
                  )}
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      country: "YE",
                      default_currency: defaultCurrencyForCountry("YE"),
                    }))
                  }
                >
                  اليمن
                </button>

                {[
                  { v: "SA", t: "السعودية" },
                  { v: "AE", t: "الإمارات" },
                  { v: "OTHER", t: "دولة أخرى" },
                ].map((x) => (
                  <button
                    key={x.v}
                    type="button"
                    disabled
                    className={classNames(
                      "w-full rounded-xl border px-4 py-4 text-right text-sm select-none",
                      "border-zinc-200 bg-zinc-50 text-zinc-400",
                      "cursor-not-allowed",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span>{x.t}</span>
                      <span className="text-xs rounded-full border border-zinc-200 bg-white px-3 py-1 text-zinc-500">
                        سيتم الافتتاح قريبًا
                      </span>
                    </div>
                  </button>
                ))}

                <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <div className="mb-3">
                    <div className="text-sm font-extrabold text-zinc-900">
                      اختر العملة الأساسية للمتجر
                    </div>

                    <div className="mt-1 text-xs font-medium leading-6 text-zinc-600">
                      هذه العملة ستستخدم في التسعير والطلبات والفواتير والتقارير.
                      يمكن تغييرها لاحقًا فقط إذا لم توجد طلبات شراء.
                    </div>
                  </div>

                  <div className="grid gap-2">
                    {currencyOptions.map((currency) => {
                      const active = form.default_currency === currency.code;

                      return (
                        <button
                          key={currency.code}
                          type="button"
                          onClick={() =>
                            setForm((p) => ({
                              ...p,
                              default_currency: currency.code,
                            }))
                          }
                          className={classNames(
                            "w-full rounded-xl border px-4 py-3 text-right transition",
                            active
                              ? "border-emerald-500 bg-white shadow-sm"
                              : "border-zinc-200 bg-white/70 hover:border-zinc-300",
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-extrabold text-zinc-900">
                                {currency.name}{" "}
                                <span className="text-xs text-zinc-500">
                                  ({currency.code})
                                </span>
                              </div>

                              <div className="mt-1 text-xs leading-5 text-zinc-500">
                                {currency.hint}
                              </div>
                            </div>

                            <div
                              className={classNames(
                                "grid h-11 w-11 place-items-center rounded-xl border text-sm font-black",
                                active
                                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                  : "border-zinc-200 bg-zinc-50 text-zinc-500",
                              )}
                            >
                              {currency.symbol}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="mt-8 grid gap-4">
                <h2 className="text-lg font-bold text-zinc-900">
                  اختر كيانك القانوني
                </h2>

                {[
                  { v: "individual", t: "فرد" },
                  { v: "establishment", t: "مؤسسة" },
                  { v: "company", t: "شركة" },
                  { v: "ngo", t: "جمعية خيرية" },
                ].map((x) => (
                  <button
                    key={x.v}
                    type="button"
                    className={classNames(
                      optionBase,
                      form.legal_entity === x.v
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-zinc-200 bg-white",
                    )}
                    onClick={() =>
                      setForm((p) => ({ ...p, legal_entity: x.v as any }))
                    }
                  >
                    {x.t}
                  </button>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="mt-8 grid gap-4">
                <h2 className="text-lg font-bold text-zinc-900">
                  هل تجارتك قائمة؟
                </h2>

                {[
                  { v: "existing", t: "نعم، أبيع حاليًا" },
                  { v: "new", t: "لا، أنا بدأت للتو" },
                ].map((x) => (
                  <button
                    key={x.v}
                    type="button"
                    className={classNames(
                      optionBase,
                      form.business_stage === x.v
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-zinc-200 bg-white",
                    )}
                    onClick={() =>
                      setForm((p) => ({ ...p, business_stage: x.v as any }))
                    }
                  >
                    {x.t}
                  </button>
                ))}
              </div>
            )}

            {step === 4 && (
              <div className="mt-8 grid gap-4">
                <h2 className="text-lg font-bold text-zinc-900">
                  عندك منتجات للبيع؟
                </h2>

                {[
                  { v: "yes", t: "نعم، عندي منتجات جاهزة" },
                  { v: "no", t: "لا، لسا" },
                ].map((x) => (
                  <button
                    key={x.v}
                    type="button"
                    className={classNames(
                      optionBase,
                      form.has_products === x.v
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-zinc-200 bg-white",
                    )}
                    onClick={() =>
                      setForm((p) => ({ ...p, has_products: x.v as any }))
                    }
                  >
                    {x.t}
                  </button>
                ))}
              </div>
            )}

            {step === 5 && (
              <div className="mt-8 grid gap-4">
                <h2 className="text-lg font-bold text-zinc-900">
                  أخيرًا: ما هو نشاطك التجاري؟
                </h2>

                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    { v: "auto_parts", t: "قطع غيار سيارات" },
                    { v: "fashion", t: "أزياء" },
                    { v: "electronics", t: "إلكترونيات" },
                    { v: "other", t: "أخرى" },
                  ].map((x) => (
                    <button
                      key={x.v}
                      type="button"
                      className={classNames(
                        chipBase,
                        form.activity === x.v
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-zinc-200 bg-white",
                      )}
                      onClick={() =>
                        setForm((p) => ({ ...p, activity: x.v as any }))
                      }
                    >
                      {x.t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="mt-8 grid gap-5">
                <h2 className="text-lg font-bold text-zinc-900">
                  بيانات المتجر
                </h2>

                <div>
                  <Label htmlFor="store_name" className="w-auto!">
                    اسم المتجر
                  </Label>

                  <Input
                    id="store_name"
                    name="store_name"
                    className="bg-transparent!"
                    placeholder="مثال: متجر مدرار"
                    value={form.store_name}
                    onChange={(e: any) => {
                      setNameTouched(true);
                      setForm((p) => ({ ...p, store_name: e.target.value }));
                    }}
                    onBlur={() => setNameTouched(true)}
                  />

                  {nameTouched && nameStatus === "too_short" && (
                    <div className="mt-2 text-xs font-semibold text-red-600">
                      قصير جدًا ({MIN_STORE_NAME} أحرف على الأقل)
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="store_slug" className="w-auto!">
                    رابط المتجر (slug)
                  </Label>

                  <Input
                    id="store_slug"
                    name="store_slug"
                    className="bg-transparent!"
                    placeholder="مثال: ddd"
                    value={form.store_slug}
                    onChange={(e: any) => {
                      setSlugTouched(true);
                      setForm((p) => ({
                        ...p,
                        store_slug: slugifyEnglishOnly(e.target.value),
                      }));
                    }}
                    onBlur={() => setSlugTouched(true)}
                  />

                  <div className="mt-2 text-xs text-zinc-500">
                    يكون رابطك لاحقًا مثل:{" "}
                    <span className="font-mono">
                      {slugifyEnglishOnly(form.store_slug) || "yourstore"}
                      .elyaia.com
                    </span>
                  </div>

                  {slugTouched && (
                    <div
                      className={classNames(
                        "mt-2 text-xs font-semibold",
                        slugStatus === "checking" && "text-zinc-500",
                        slugStatus === "available" && "text-emerald-600",
                        (slugStatus === "taken" ||
                          slugStatus === "too_short" ||
                          slugStatus === "error") &&
                          "text-red-600",
                      )}
                    >
                      {slugStatus === "checking" && "جارٍ التحقق..."}
                      {slugStatus === "available" && "متاح ✅"}
                      {slugStatus === "taken" && "محجوز ❌"}
                      {slugStatus === "too_short" &&
                        `قصير جدًا (${MIN_SLUG} أحرف على الأقل)`}
                      {slugStatus === "error" && "تعذر التحقق"}
                    </div>
                  )}

                  {slugTouched &&
                    slugStatus === "taken" &&
                    slugSuggestions.length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs text-zinc-600 mb-2">
                          اقتراحات متاحة:
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {slugSuggestions.map((s) => (
                            <button
                              key={s}
                              type="button"
                              className={classNames(chipBase, "bg-white")}
                              onClick={() => {
                                setSlugTouched(true);
                                setForm((p) => ({
                                  ...p,
                                  store_slug: slugifyEnglishOnly(s),
                                }));
                              }}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}

            <div className="mt-10 flex items-center justify-between">
              <Button
                color="zinc"
                variant="outline"
                onClick={prev}
                isDisable={step === 1 || saving}
              >
                رجوع
              </Button>

              {step < TOTAL_STEPS ? (
                <Button
                  variant="solid"
                  className="font-bold"
                  onClick={next}
                  isDisable={!canNext || saving}
                >
                  متابعة
                </Button>
              ) : (
                <Button
                  variant="solid"
                  className="font-bold"
                  onClick={submit}
                  isDisable={
                    saving ||
                    !storeNameLenOk ||
                    !slugLenOk ||
                    slugStatus !== "available"
                  }
                >
                  {saving ? "جاري تجهيز متجرك..." : "ابدأ تجهيز متجرك"}
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}