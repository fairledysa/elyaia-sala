export type PlanKey = "basic" | "pro";
export type PlanDurationKey = "m" | "y" | "y2";

export type PlanDuration = {
  key: PlanDurationKey;
  label: string;
  priceNow: number;
  priceWas?: number;
  discountPercent?: number;
};

export type PlanFeature = {
  title: string;
  desc: string;
};

export type Plan = {
  key: PlanKey;
  title: string;
  subtitle: string;
  priceMonthly: number;
  badge?: string;
  highlights: string[];
  durations: PlanDuration[];
  features: PlanFeature[];
};

export const PLANS: Plan[] = [
  {
    key: "basic",
    title: "سلة بيس",
    subtitle: "الأفضل لإطلاق المتجر الصغير أو البدء بتجربة المنصة",
    priceMonthly: 99,
    highlights: [
      "عدد لا محدود من الطلبات",
      "تفعيل الدفع الإلكتروني عبر مدى وآبل باي وغيرها",
      "شحن محلي وعالمي مع أكثر من 100 شركة شحن",
      "حجز اسم دومين (رابط) مخصص لموقع متجرك",
      "مزايا أخرى +",
    ],
    durations: [
      { key: "y2", label: "سنتين", priceNow: 1980, priceWas: 2376, discountPercent: 16 },
      { key: "y", label: "سنة", priceNow: 990, priceWas: 1188, discountPercent: 16 },
      { key: "m", label: "شهر", priceNow: 99 },
    ],
    features: [
      { title: "إضافة كل أنواع المنتجات", desc: "إضافة كافة أنواع المنتجات" },
      { title: "تفعيل الدفع الإلكتروني عبر مدى وآبل باي وغيرها", desc: "فعّل الدفع الإلكتروني ووسّع خيارات الدفع" },
      { title: "شحن محلي وعالمي مع أكثر من 100 شركة شحن", desc: "اختيار شركات الشحن وربطها بالمتجر" },
      { title: "حجز اسم دومين (رابط) مخصص لموقع متجرك", desc: "اختيار رابط احترافي لمتجرك" },
      { title: "إطلاق عروض وخصومات", desc: "إنشاء عروض وقسائم خصم" },
      { title: "إحصائيات وتقارير بناء المتجر", desc: "تقارير أساسية لمتابعة الأداء" },
      { title: "تصميم واجهة المتجر", desc: "اختيار التصميم وتخصيصه" },
      { title: "إضافة صفحات تعريفية للمتجر", desc: "سياسات/تعريف/شروط" },
      { title: "استهداف السلات المتروكة", desc: "تذكير العملاء بالسلة المتروكة" },
      { title: "ربط الخدمات الإضافية", desc: "تكاملات إضافية حسب الحاجة" },
      { title: "تخصيص خيارات المتجر", desc: "خيارات أساسية لإعداد المتجر" },
      { title: "جرد المنتجات والمخزون", desc: "متابعة المخزون بشكل مبسط" },
      { title: "نظام التذاكر", desc: "دعم عبر التذاكر" },
    ],
  },
  {
    key: "pro",
    title: "سلة برو",
    subtitle: "الأفضل لتقديم الخدمات المتقدمة والمتوسطة",
    priceMonthly: 299,
    badge: "الأكثر شيوعًا",
    highlights: [
      "تفعيل فوري لضريبة القيمة المضافة",
      "تحسين SEO (الظهور في محركات البحث)",
      "الربط مع Google Tag Manager",
      "نظام دعم وتسويق متقدم",
      "مزايا أخرى +",
    ],
    durations: [
      { key: "y2", label: "سنتين", priceNow: 5980, priceWas: 7176, discountPercent: 16 },
      { key: "y", label: "سنة", priceNow: 2990, priceWas: 3588, discountPercent: 16 },
      { key: "m", label: "شهر", priceNow: 299 },
    ],
    features: [
      { title: "تفعيل فوري لضريبة القيمة المضافة", desc: "قبل إظهار السعر الضريبي واحتساب الضريبة تلقائيًا" },
      { title: "إضافة حسابات الموظفين وإدارة صلاحياتهم", desc: "نظام صلاحيات للفريق" },
      { title: "تخصيص كل عناصر تصميم المتجر عبر CSS أو JS", desc: "تحكم متقدم بالواجهة" },
      { title: "ربط المتجر بخدمات محاسبية ومالية متكاملة", desc: "تكاملات محاسبية" },
      { title: "التسويق عبر واتساب وتويتر وإنستجرام وجوجل", desc: "قنوات تسويق وربط" },
      { title: "تصنيف تلقائي لمجموعات العملاء", desc: "شرائح عملاء تلقائية" },
      { title: "الربط مع الخدمات الإعلانية", desc: "تكاملات حملات" },
      { title: "الربط مع الخدمات المحاسبية", desc: "تكامل محاسبي إضافي" },
      { title: "الربط مع الخدمات الإضافية", desc: "مركز خدمات موسع" },
      { title: "قيود الشحن والتوصيل", desc: "خيارات شحن متقدمة" },
      { title: "قيود الدفع والحماية من الاحتيال", desc: "حماية وتقليل المخاطر" },
      { title: "التسويق بالعمولة", desc: "نظام أفلييت" },
    ],
  },
];
