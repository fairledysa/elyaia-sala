// FILE: apps/merchant/src/app/(app)/home/_components/home-data.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type HomeStore = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  default_currency: string;
};

export type HomeTask = {
  key: string;
  title: string;
  desc: string;
  href: string;
  done: boolean;

  stepsTotal: number;
  stepsDone: number;
  steps: Array<{
    title: string;
    done: boolean;
    href?: string;
    actionLabel?: string;
  }>;
};

function pct(done: number, total: number) {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
}

export async function getHomeData(supabase: SupabaseClient, user: any) {
  const userEmail = (user.email || "").toLowerCase();

  // store_id عبر store_users (حسب شغلك الحالي)
  const { data: su } = await supabase
    .from("store_users")
    .select("store_id")
    .eq("email", userEmail)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!su?.store_id) {
    return {
      store: null as HomeStore | null,
      userEmail,
      emailVerified: false,
      productsCount: 0,
      tasks: [] as HomeTask[],
      progress: { done: 0, total: 0, percent: 0 },
    };
  }

  const store_id = su.store_id as string;

  const { data: storeRow } = await supabase
    .from("stores")
    .select("id,name,slug,plan,default_currency")
    .eq("id", store_id)
    .maybeSingle();

  const store: HomeStore | null = storeRow
    ? {
        id: storeRow.id,
        name: storeRow.name,
        slug: storeRow.slug,
        plan: storeRow.plan,
        default_currency: storeRow.default_currency,
      }
    : null;

  const { data: settings } = await supabase
    .from("store_settings")
    .select("slug,value")
    .eq("store_id", store_id);

  const getSetting = (slug: string) =>
    (settings || []).find((s: any) => s.slug === slug)?.value ?? null;

  const emailVerified = Boolean(getSetting("auth.email_verified")?.verified);

  const onboardingDone = Boolean(getSetting("onboarding.done")?.done);

  const marketplaceVisited = Boolean(
    getSetting("onboarding.marketplace_visited")?.visited
  );

  const { count: productsCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("store_id", store_id);

  const { count: themesCount } = await supabase
    .from("store_themes")
    .select("id", { count: "exact", head: true })
    .eq("store_id", store_id);

  // flags بسيطة من settings
  const shippingEnabled = Boolean(getSetting("shipping.enabled")?.enabled);

  // ✅ NEW: تحديد موقع الاستلام من store_settings
  const pickup = getSetting("shipping.pickup_location");
  const pickupDone =
    !!pickup &&
    typeof pickup === "object" &&
    !!pickup.city_id &&
    !!pickup.district_id &&
    !!String(pickup.street || "").trim() &&
    !!String(pickup.landmark || "").trim();

  // ✅ NEW: اختيار شركات الشحن = وجود carrier واحد مفعّل على الأقل
  const { count: enabledCarriersCount } = await supabase
    .from("store_shipping_carriers")
    .select("id", { count: "exact", head: true })
    .eq("store_id", store_id)
    .eq("enabled", true)
    .eq("status", "active");

  const carriersDone = (enabledCarriersCount ?? 0) > 0;

  // ✅ اليمن: شرط الحسابات البنكية
  const { count: bankAccountsCount } = await supabase
    .from("store_bank_accounts")
    .select("id", { count: "exact", head: true })
    .eq("store_id", store_id);

  const bankDone = (bankAccountsCount ?? 0) > 0;

  // ✅ اليمن: تفعيل المدفوعات = (حساب بنكي واحد يكفي) أو (تفعيل أي مزود واحد)
  const { count: enabledProvidersCount } = await supabase
    .from("store_payment_methods")
    .select("id", { count: "exact", head: true })
    .eq("store_id", store_id)
    .eq("enabled", true);

  const paymentsEnabled = bankDone || (enabledProvidersCount ?? 0) > 0;

  // =========================
  // القوائم: فقط للأربع مهام
  // =========================

  // 1) أضف أول منتج (1/0)
  const firstProductDone = (productsCount ?? 0) > 0;
  const firstProductSteps = [
    {
      title: "أضف أول منتج",
      done: firstProductDone,
      href: "/dashboard/products/new",
      actionLabel: "إضافة منتج",
    },
  ];

  // 2) الشحن (2/0)
  const shippingSteps = [
    {
      title: "حدد موقع استلام الشحنات",
      done: pickupDone, // ✅ يعتمد على pickup_location
      href: "/settings/shipping",
      actionLabel: pickupDone ? "عرض" : "تحديد الموقع",
    },
    {
      title: "اختر شركات الشحن",
      done: carriersDone, // ✅ بدل shipping.enabled
      href: "/settings/shipping",
      actionLabel: carriersDone ? "عرض" : "تحديد الشركات",
    },
  ];

  // 3) المدفوعات (2/2)
  const paymentsSteps = [
    {
      title: bankDone ? "الحسابات البنكية (تمت الإضافة)" : "أضف حساب بنكي",
      done: bankDone,
      href: "/settings/payment",
      actionLabel: bankDone ? "عرض" : "إضافة",
    },
    {
      title: paymentsEnabled ? "فعل المدفوعات الإلكترونية (مفعّل)" : "فعل المدفوعات الإلكترونية",
      done: paymentsEnabled,
      href: "/settings/payment",
      actionLabel: paymentsEnabled ? "عرض" : "تفعيل",
    },
  ];

  // 4) التصميم (1/1)
  const themeDone = (themesCount ?? 0) > 0;
  const themeSteps = [
    {
      title: "خصص التصميم",
      done: themeDone,
      href: "/dashboard/settings/theme",
      actionLabel: "تخصيص التصميم",
    },
  ];

  const tasks: HomeTask[] = [
    // ❌ بدون قوائم
    {
      key: "store_info",
      title: "أضف معلومات متجرك",
      desc: "اسم المتجر، الرابط، والبيانات الأساسية.",
      href: "/settings/component/basic",
      done: onboardingDone,
      stepsTotal: 0,
      stepsDone: 0,
      steps: [],
    },

    // ✅ قائمة
    {
      key: "first_product",
      title: "أضف أول منتج لمتجرك",
      desc: "أضف أول منتج",
      href: "/dashboard/products/new",
      done: firstProductDone,
      stepsTotal: 1,
      stepsDone: firstProductSteps.filter((s) => s.done).length,
      steps: firstProductSteps,
    },

    // ✅ قائمة
    {
      key: "shipping",
      title: "فعل خيار الشحن",
      desc: "حدد موقع استلام الشحنات واختر شركات الشحن",
      href: "/dashboard/settings/shipping",
      done: shippingSteps.every((s) => s.done),
      stepsTotal: 2,
      stepsDone: shippingSteps.filter((s) => s.done).length,
      steps: shippingSteps,
    },

    // ✅ قائمة — اليمن
    {
      key: "payments",
      title: "فعل المدفوعات الإلكترونية",
      desc: "أضف حساب بنكي ثم فعّل أي مزود دفع (يكفي واحد).",
      href: "/settings/payment",
      done: paymentsEnabled, // ✅ يكفي حساب بنكي أو مزود واحد
      stepsTotal: 2,
      stepsDone: paymentsSteps.filter((s) => s.done).length,
      steps: paymentsSteps,
    },

    // ✅ قائمة
    {
      key: "theme",
      title: "اختر تصميم متجرك",
      desc: "خصص التصميم",
      href: "/dashboard/settings/theme",
      done: themeSteps.every((s) => s.done),
      stepsTotal: 1,
      stepsDone: themeSteps.filter((s) => s.done).length,
      steps: themeSteps,
    },

    // ❌ بدون قوائم
    {
      key: "plans",
      title: "اكتشف الباقات والمزايا",
      desc: "ترقيات اختيارية: دومين مخصص، تقارير متقدمة…",
      href: "/marketplace",
      done: marketplaceVisited,
      stepsTotal: 0,
      stepsDone: 0,
      steps: [],
    },
  ];

  const done = tasks.filter((t) => t.done).length;
  const total = tasks.length;

  return {
    store,
    userEmail,
    emailVerified,
    productsCount: productsCount ?? 0,
    tasks,
    progress: { done, total, percent: pct(done, total) },
  };
}
