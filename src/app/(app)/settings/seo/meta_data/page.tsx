// FILE: apps/merchant/src/app/(app)/settings/seo/meta_data/page.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";

type SeoMetaValue = {
  title?: string;
  description?: string;
  keywords?: string;
  url_mode?: 0 | 1 | 2;
};

type SeoUrlModeValue = {
  mode?: "short" | "named_ar" | "named_en";
};

async function getStoreIdFromSession() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
      },
    },
  );

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("UNAUTHENTICATED");

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", auth.user.id)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.store_id) throw new Error("STORE_NOT_FOUND");

  return data.store_id as string;
}

function modeNumToString(n: 0 | 1 | 2): "short" | "named_ar" | "named_en" {
  if (n === 1) return "named_ar";
  if (n === 2) return "named_en";
  return "short";
}

function modeStringToNum(s: any): 0 | 1 | 2 {
  if (s === "named_ar") return 1;
  if (s === "named_en") return 2;
  return 0;
}

async function loadSeoUrlMode(store_id: string): Promise<SeoUrlModeValue> {
  const sb = supabaseAdmin();
  const r = await sb
    .from("store_settings")
    .select("value,updated_at")
    .eq("store_id", store_id)
    .eq("slug", "seo.url_mode")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const v = (r.data?.value || {}) as SeoUrlModeValue;
  return { mode: v.mode };
}

async function loadSeoMeta(store_id: string): Promise<SeoMetaValue> {
  const sb = supabaseAdmin();
  const r = await sb
    .from("store_settings")
    .select("value,updated_at")
    .eq("store_id", store_id)
    .eq("slug", "seo.meta")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const v = (r.data?.value || {}) as SeoMetaValue;

  return {
    title: v.title || "",
    description: v.description || "",
    keywords: v.keywords || "",
    url_mode: (typeof v.url_mode === "number" ? v.url_mode : 0) as 0 | 1 | 2,
  };
}

async function saveSeoMeta(store_id: string, value: SeoMetaValue) {
  const sb = supabaseAdmin();
  const r = await sb.from("store_settings").upsert(
    {
      store_id,
      slug: "seo.meta",
      type: "json",
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "store_id,slug" },
  );

  if (r.error) throw r.error;
}

async function saveSeoUrlMode(
  store_id: string,
  mode: "short" | "named_ar" | "named_en",
) {
  const sb = supabaseAdmin();
  const r = await sb.from("store_settings").upsert(
    {
      store_id,
      slug: "seo.url_mode",
      type: "json",
      value: { mode },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "store_id,slug" },
  );

  if (r.error) throw r.error;
}

export default async function SeoMetaDataPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) || {};
  const savedVal = Array.isArray(sp.saved) ? sp.saved[0] : sp.saved;
  const saved = String(savedVal || "") === "1";

  const store_id = await getStoreIdFromSession();

  const currentMeta = await loadSeoMeta(store_id);
  const currentUrlMode = await loadSeoUrlMode(store_id);

  const currentModeNum: 0 | 1 | 2 =
    currentUrlMode?.mode != null
      ? modeStringToNum(currentUrlMode.mode)
      : typeof currentMeta.url_mode === "number"
        ? currentMeta.url_mode
        : 0;

  const current: SeoMetaValue = {
    title: currentMeta.title || "",
    description: currentMeta.description || "",
    keywords: currentMeta.keywords || "",
    url_mode: currentModeNum,
  };

  async function action(formData: FormData) {
    "use server";

    const store_id = await getStoreIdFromSession();

    const url_mode_raw = String(formData.get("url_mode") || "0");
    const url_mode = (
      ["0", "1", "2"].includes(url_mode_raw) ? Number(url_mode_raw) : 0
    ) as 0 | 1 | 2;

    const title = String(formData.get("title") || "").slice(0, 70);
    const description = String(formData.get("description") || "").slice(0, 300);
    const keywords = String(formData.get("keywords") || "").slice(0, 150);

    await saveSeoMeta(store_id, { title, description, keywords, url_mode });

    const mode = modeNumToString(url_mode);
    await saveSeoUrlMode(store_id, mode);

    redirect("/settings/seo/meta_data?saved=1");
  }

  return (
    <div className="adm-page__inner adm-seo-meta" dir="rtl">
      <section className="adm-hero">
        <div className="adm-hero__main">
          <div className="adm-hero__icon">SEO</div>

          <div className="adm-hero__text">
            <h1 className="adm-hero__title">تحسين محركات البحث SEO</h1>
            <p className="adm-hero__desc">
              تحكّم بتفاصيل ظهور الصفحة الرئيسية في نتائج البحث وطريقة روابط
              صفحات المتجر.
            </p>
          </div>
        </div>

        <div className="adm-hero__actions">
          <a href="/settings/seo" className="adm-btn adm-btn--secondary adm-seo-meta-back">
            رجوع
          </a>
        </div>
      </section>

      {saved ? (
        <div className="adm-seo-meta-alert">
          تم تحديث إعدادات SEO بنجاح.
        </div>
      ) : null}

      <form action={action} className="adm-card adm-card--lg adm-seo-meta-form">
        <div className="adm-card__head adm-card__head--border">
          <div className="adm-card__titleWrap">
            <h2 className="adm-card__title">تحسين محركات البحث SEO</h2>
            <p className="adm-card__desc">
              الحدود: العنوان 70 — الوصف 300 — الكلمات 150
            </p>
          </div>
        </div>

        <div className="adm-card__body">
          <div className="adm-seo-meta-fields">
            <FieldText
              name="title"
              label="عنوان الصفحة الرئيسية (Homepage title)"
              placeholder="أضف عنوانًا للصفحة الرئيسية لمتجرك"
              max={70}
              defaultValue={current.title || ""}
              icon="⌂"
            />

            <FieldTextarea
              name="description"
              label="وصف الصفحة الرئيسية (Meta Description)"
              placeholder="اكتب وصفًا جذابًا وفريدًا لمتجرك"
              max={300}
              rows={4}
              defaultValue={current.description || ""}
              icon="✎"
            />

            <FieldTextarea
              name="keywords"
              label="الكلمات الافتتاحية (Keywords)"
              placeholder="استهدف الكلمات المفتاحية المناسبة لمتجرك وافصل بينها بفواصل"
              max={150}
              rows={3}
              defaultValue={current.keywords || ""}
              icon="⌕"
            />
          </div>

          <div className="adm-seo-meta-layout">
            <div className="adm-seo-meta-box">
              <div className="adm-seo-meta-box__head">
                <h3 className="adm-seo-meta-box__title">
                  طريقة عرض روابط صفحات المتجر
                </h3>
                <p className="adm-seo-meta-box__desc">
                  اختر شكل روابط المنتجات والأقسام داخل واجهة المتجر.
                </p>
              </div>

              <div className="adm-seo-meta-radios">
                <RadioRow
                  name="url_mode"
                  value="0"
                  defaultChecked={current.url_mode === 0}
                  title="رابط مختصر"
                  example="https://name.com.sa/Nmsy"
                />

                <RadioRow
                  name="url_mode"
                  value="1"
                  defaultChecked={current.url_mode === 1}
                  title="رابط باسم الصفحة"
                  example="https://name.com.sa/اسم-المنتج/p123456"
                />

                <RadioRow
                  name="url_mode"
                  value="2"
                  defaultChecked={current.url_mode === 2}
                  title="رابط باسم الصفحة بالإنجليزي"
                  example="https://name.com.sa/product-name/p123456"
                />
              </div>
            </div>

            <div className="adm-seo-meta-note">
              <div className="adm-seo-meta-note__title">ملاحظات</div>

              <ul className="adm-seo-meta-note__list">
                <li>العنوان والوصف يساعدان على تحسين الظهور في Google.</li>
                <li>الكلمات المفتاحية لا تكثر منها.</li>
                <li>
                  خيار الروابط يستخدم لاحقًا في storefront لتوليد مسارات
                  المنتجات والأقسام.
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="adm-card__footer">
          <a href="/settings/seo" className="adm-btn adm-btn--secondary">
            إلغاء
          </a>

          <button type="submit" className="adm-btn adm-btn--primary">
            تحديث
          </button>
        </div>
      </form>
    </div>
  );
}

function FieldText({
  name,
  label,
  placeholder,
  max,
  defaultValue,
  icon,
}: {
  name: string;
  label: string;
  placeholder: string;
  max: number;
  defaultValue: string;
  icon: string;
}) {
  return (
    <div className="adm-seo-meta-field">
      <label className="adm-seo-meta-field__label">{label}</label>

      <div className="adm-seo-meta-field__control">
        <span className="adm-seo-meta-field__icon">{icon}</span>

        <input
          name={name}
          defaultValue={defaultValue}
          maxLength={max}
          placeholder={placeholder}
          className="adm-seo-meta-field__input"
        />
      </div>

      <div className="adm-seo-meta-field__hint">حد أقصى {max} حرف</div>
    </div>
  );
}

function FieldTextarea({
  name,
  label,
  placeholder,
  max,
  rows,
  defaultValue,
  icon,
}: {
  name: string;
  label: string;
  placeholder: string;
  max: number;
  rows: number;
  defaultValue: string;
  icon: string;
}) {
  return (
    <div className="adm-seo-meta-field">
      <label className="adm-seo-meta-field__label">{label}</label>

      <div className="adm-seo-meta-field__control adm-seo-meta-field__control--textarea">
        <span className="adm-seo-meta-field__icon">{icon}</span>

        <textarea
          name={name}
          defaultValue={defaultValue}
          maxLength={max}
          placeholder={placeholder}
          rows={rows}
          className="adm-seo-meta-field__textarea"
        />
      </div>

      <div className="adm-seo-meta-field__hint">حد أقصى {max} حرف</div>
    </div>
  );
}

function RadioRow({
  name,
  value,
  defaultChecked,
  title,
  example,
}: {
  name: string;
  value: string;
  defaultChecked?: boolean;
  title: string;
  example: string;
}) {
  return (
    <label className="adm-seo-meta-radio">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="adm-seo-meta-radio__input"
      />

      <span className="adm-seo-meta-radio__content">
        <span className="adm-seo-meta-radio__title">{title}</span>
        <span className="adm-seo-meta-radio__example" dir="ltr">
          {example}
        </span>
      </span>
    </label>
  );
}