// FILE: apps/merchant/src/app/(theme-editor)/themes/[themeId]/customize/theme-options/_components/defs.tsx
import React from "react";
import { SectionDef } from "./types";

function mapField(field: any): any {
  if (!field || typeof field !== "object") return null;

  const type = String(field.type ?? "").trim();
  const key = String(field.key ?? field.name ?? "").trim();
  const name = String(field.name ?? field.key ?? "").trim();

  if (!type || !key || !name) return null;

  const out: any = {
    type,
    key,
    name,
    label: String(field.label ?? "").trim(),
  };

  if (field.description != null) out.description = field.description;
  if (field.placeholder != null) out.placeholder = field.placeholder;
  if (field.defaultValue !== undefined) out.defaultValue = field.defaultValue;
  if (field.defaultChecked !== undefined)
    out.defaultChecked = !!field.defaultChecked;
  if (field.minLength !== undefined) out.minLength = Number(field.minLength);
  if (field.maxLength !== undefined) out.maxLength = Number(field.maxLength);

  if (Array.isArray(field.options)) {
    out.options = field.options.map((opt: any) => ({
      label: String(opt?.label ?? "").trim(),
      value: String(opt?.value ?? "").trim(),
    }));
  }

  return out;
}

function mapSection(section: any): SectionDef | null {
  if (!section || typeof section !== "object") return null;

  const sectionType = String(section.type ?? "").trim();

  if (sectionType === "divider") {
    return { type: "divider" };
  }

  if (sectionType === "section") {
    return {
      type: "section",
      title: String(section.title ?? "").trim(),
      fields: Array.isArray(section.fields)
        ? section.fields.map(mapField).filter(Boolean)
        : [],
    } as SectionDef;
  }

  if (sectionType === "repeatable") {
    return {
      type: "repeatable",
      title: String(section.title ?? "").trim(),
      key: String(section.key ?? "").trim(),
      initialItems: Number(section.initialItems ?? 1),
      template: Array.isArray(section.template)
        ? section.template.map(mapField).filter(Boolean)
        : [],
    } as SectionDef;
  }

  return null;
}

function buildLegacyThemeOptionsDefs(): SectionDef[] {
  return [
    // ====== إعدادات عامة (Top switches) ======
    {
      type: "section",
      title: "إعدادات عامة",
      fields: [
        {
          type: "switch",
          key: "arabic_numbers",
          name: "arabic_numbers",
          label: "استخدام الأرقام العربية",
        },
        {
          type: "switch",
          key: "content_copyright",
          name: "content_copyright",
          label: "حماية محتوى المتجر",
          description: "احم محتوى متجرك عبر منع حفظ الصور أو نسخ وصف المنتجات",
        },
        {
          type: "switch",
          key: "display_copyright",
          name: "display_copyright",
          label: 'عرض عبارة "صنع بإتقان على منصة سلة"',
        },
        {
          type: "switch",
          key: "is_breadcrumbs",
          name: "is_breadcrumbs",
          label: "ميزة مسار التنقل",
          defaultChecked: true,
        },
        {
          type: "switch",
          key: "is_equal_cart_height",
          name: "is_equal_cart_height",
          label: "توحيد ارتفاع المنتجات في الرئيسية والتصنيفات",
          defaultChecked: true,
        },
        {
          type: "dropdown",
          key: "equal_cart_height_type",
          name: "equal_cart_height_type",
          label: "عرض صورة المنتج",
          options: [
            { label: "عرض كامل الصورة", value: "full" },
            { label: "قص الصورة (Cover)", value: "cover" },
            { label: "احتواء الصورة (Contain)", value: "contain" },
          ],
          defaultValue: "full",
        },
      ],
    },

    { type: "divider" },

    {
      type: "static",
      node: (
        <div className="space-y-2">
          <div className="overflow-hidden rounded-2xl">
            <div
              className="flex items-center justify-center gap-4 p-4 text-white"
              style={{ backgroundColor: "#17005a" }}
            >
              <div className="text-center">
                <div className="text-3xl font-extrabold">سـيليا ✨</div>
                <div className="mt-1 text-lg opacity-95">
                  استمتع بتصميم متجرك
                </div>
              </div>
              <a
                target="_blank"
                rel="noreferrer"
                href="https://seliaagency.notion.site/1643f9b703604d219cd689a166de3b08?v=faffbb5ea45f42dabb4ab8136cf90ac2"
                className="hidden sm:block"
              >
                <img
                  src="https://cdn.salla.sa/form-builder/8PrN0KQctlXB2okFUqsywMU27S8lu0EJCAvimF9E.png"
                  width={130}
                  height={90}
                  className="rounded-xl"
                  alt="Selia"
                />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <a
              target="_blank"
              rel="noreferrer"
              href="https://wa.me/201118411959"
              className="rounded-2xl px-4 py-3 text-center font-semibold text-white"
              style={{ backgroundColor: "#17005a" }}
            >
              تواصل معنا
            </a>
            <a
              target="_blank"
              rel="noreferrer"
              href="https://salla.sa/dev-flormi3pb6t1cfo7"
              className="rounded-2xl px-4 py-3 text-center font-semibold text-white"
              style={{ backgroundColor: "#17005a" }}
            >
              متجر المعاينة
            </a>

            <a
              target="_blank"
              rel="noreferrer"
              href="https://seliaagency.notion.site/1643f9b703604d219cd689a166de3b08?v=faffbb5ea45f42dabb4ab8136cf90ac2"
              className="rounded-2xl px-4 py-3 text-center font-semibold text-white"
              style={{ backgroundColor: "#17005a" }}
            >
              دليل المستخدم
            </a>
            <a
              target="_blank"
              rel="noreferrer"
              href="https://selia-tech.com/uploader"
              className="rounded-2xl px-4 py-3 text-center font-semibold text-white"
              style={{ backgroundColor: "#17005a" }}
            >
              ارفع فيديو
            </a>

            <a
              target="_blank"
              rel="noreferrer"
              href="https://selia-tech.com"
              className="rounded-2xl px-4 py-3 text-center font-semibold text-white sm:col-span-2"
              style={{ backgroundColor: "#17005a" }}
            >
              الموقع الرسمي للثيم
            </a>
          </div>
        </div>
      ),
    },

    {
      type: "section",
      title: "خيارات واجهة المتجر",
      fields: [
        {
          type: "switch",
          key: "trans_header",
          name: "trans_header",
          label: "دمج أعلى الصفحة مع العنصر الأول في الصفحة الرئيسية",
          description:
            "يفضل تفعيل الميزة في حالة ان اول عنصر في الصفحة الرئيسية هو سلايدر متقدم او بنرات متحركة او بانر ديناميكي او صور متحركة",
        },
        {
          type: "switch",
          key: "slider_has_overlay",
          name: "slider_has_overlay",
          label: "انشاء طبقة شفافة داكنة على السلايدر المتقدم والهيدر",
          description:
            "في حالة تفعيل هذا الخيار سيتم تغيير لون محتوى السلايدر المتقدم والهيدر من اللون الاسود الى الابيض، لذلك يفضل تفعيله فقط عند تعارض الألوان.",
          defaultChecked: true,
        },
        {
          type: "image",
          key: "reversed_logo",
          name: "reversed_logo",
          label: "شعار بديل",
          description:
            "في حال تعارضت الألوان مع الشعار الخاص بك يمكنك تحميل شعار آخر مع ألوان معكوسة (أبيض/أسود).",
        },
        {
          type: "switch",
          key: "show_reversed_logo",
          name: "show_reversed_logo",
          label: "تثبيت الشعار البديل على السلايدر المتقدم",
          defaultChecked: true,
        },
        {
          type: "switch",
          key: "show_reversed_logo_in_footer",
          name: "show_reversed_logo_in_footer",
          label: "عرض الشعار البديل في الفوتر",
          defaultChecked: true,
        },
        {
          type: "switch",
          key: "show_original_logo_on_scroll",
          name: "show_original_logo_on_scroll",
          label: "عرض الشعار الاساسي في الهيدر عند السكرول في الصفحة الرئيسية",
          defaultChecked: true,
        },
        {
          type: "switch",
          key: "animate_blocks",
          name: "animate_blocks",
          label: "تفعيل انيميشن عناصر الصفحة الرئيسية",
          description: "ميزة تجريبية: يفضل تعطيلها إذا تعارضت مع العناصر",
        },
        {
          type: "switch",
          key: "enable_second_reviews",
          name: "enable_second_reviews",
          label: "تفعيل الشكل المحسن لآراء العملاء",
          defaultChecked: true,
        },
        {
          type: "switch",
          key: "enhanced_products_slider",
          name: "enhanced_products_slider",
          label: "تفعيل الشكل المحسن لعنصر المنتجات المتحركة",
          description: "شكل مختلف للعنوان وزر عرض الكل",
          defaultChecked: true,
        },
        {
          type: "switch",
          key: "hide_products_slider_controls",
          name: "hide_products_slider_controls",
          label: "اخفاء الأسهم في عنصر المنتجات المتحركة",
        },
        {
          type: "switch",
          key: "enhanced_blocks_titles",
          name: "enhanced_blocks_titles",
          label: "تفعيل الشكل المحسن لعناوين عناصر الصفحة الرئيسية",
          defaultChecked: true,
        },
        {
          type: "switch",
          key: "mobile_small_blocks_titles",
          name: "mobile_small_blocks_titles",
          label: "تصغير عناوين عناصر الصفحة الرئيسية في الجوال",
          defaultChecked: true,
        },
        {
          type: "switch",
          key: "disable_right_click",
          name: "disable_right_click",
          label: "تعطيل نسخ النصوص وحفظ الصور",
          description:
            "ميزة تجريبية: منع نسخ النصوص وحفظ الصور وتعطيل زر الفأرة الأيمن",
        },
        {
          type: "switch",
          key: "is_more_button_enabled",
          name: "is_more_button_enabled",
          label: "عرض (زر الكل) في الصفحة الرئيسية",
          defaultChecked: true,
        },
      ],
    },

    {
      type: "section",
      title: "خطوط المتجر",
      fields: [
        {
          type: "switch",
          key: "enable_fonts",
          name: "enable_fonts",
          label: "تفعيل خطوط المتجر",
        },
      ],
    },

    {
      type: "section",
      title: "اعلان ترويجي متحرك أعلى المتجر",
      fields: [
        {
          type: "text",
          key: "promotion_text",
          name: "promotion_text",
          label: "نص الإعلان المتحرك",
          description: "يجب ألا يقل عن 15 حرف ولا يزيد عن 100 حرف",
          placeholder: "تخفيضات الصيف خصم ٣٠٪",
          minLength: 15,
          maxLength: 100,
        },
        {
          type: "url",
          key: "promo_link",
          name: "promo_link",
          label: "رابط الإعلان الترويجي (إختياري)",
          placeholder: "e.g. https://salla.sa",
          defaultValue: "https://salla.sa/blackveil/offers",
        },
        {
          type: "color",
          key: "pormotion_bg",
          name: "pormotion_bg",
          label: "لون خلفية الأعلان الترويجي",
          defaultValue: "#d3c5a9",
        },
        {
          type: "color",
          key: "promotion_color",
          name: "promotion_color",
          label: "لون نص الإعلان الترويجي",
          defaultValue: "#000000",
        },
        {
          type: "switch",
          key: "fixed_promotion",
          name: "fixed_promotion",
          label: "تثبيت الإعلان عند السكرول في جميع الصفحات",
        },
        {
          type: "switch",
          key: "can_close_promotion",
          name: "can_close_promotion",
          label: "تمكين العميل من اغلاق الإعلان الترويجي",
        },
      ],
    },

    {
      type: "section",
      title: "خيارات بطاقة المنتج",
      fields: [
        {
          type: "number",
          key: "product_image_height",
          name: "product_image_height",
          label: "ارتفاع صور المنتجات العمودية (كل وحدة = 16px)",
          description: "الافتراضي 17 (272px) | الحد الأدنى 5 | الحد الأقصى 30",
          defaultValue: 30,
        },
        {
          type: "number",
          key: "products_per_row",
          name: "products_per_row",
          label: "عدد المنتجات في الصف الواحد (كمبيوتر فقط)",
          description: "الافتراضي 4 | أقل 2 | أعلى 8",
          defaultValue: 4,
        },
        {
          type: "switch",
          key: "enable_switch_image_on_hover",
          name: "enable_switch_image_on_hover",
          label: "تغيير الصورة عند التمرير على بطاقة المنتج",
          description: "ميزة تجريبية",
        },
        {
          type: "switch",
          key: "productcard_options",
          name: "productcard_options",
          label: "عرض خيارات المنتج في بطاقة المنتج",
          description: "ميزة تجريبية",
        },
        {
          type: "dropdown",
          key: "hover_style",
          name: "hover_style",
          label:
            "عرض ازرار بطاقة المنتج (الإضافة للسلة - المفضلة - العرض السريع)",
          options: [
            {
              label: "عرض الازرار على صورة المنتج عند التمرير",
              value: "on_image_hover",
            },
            { label: "عرض الازرار دائماً", value: "always" },
            { label: "إخفاء الازرار", value: "hidden" },
          ],
          defaultValue: "on_image_hover",
        },
        {
          type: "switch",
          key: "fit_slider_products",
          name: "fit_slider_products",
          label: "توحيد ارتفاع المنتجات المتحركة",
          defaultChecked: true,
        },
        {
          type: "switch",
          key: "disable_products_lazyload",
          name: "disable_products_lazyload",
          label: "تعطيل خاصية تحميل صور المنتجات تدريجيا",
        },
        {
          type: "switch",
          key: "show_normal_countdown",
          name: "show_normal_countdown",
          label: "اظهار العد التنازلي على المنتجات التي تحتوي على خصم",
          description:
            "ميزة تجريبية — ويتطلب تحديد تاريخ نهاية التخفيض من بيانات المنتج",
        },
        {
          type: "switch",
          key: "enable_shine_animation",
          name: "enable_shine_animation",
          label: "تفعيل أنيميشن صور المنتجات عند التمرير",
        },
        {
          type: "switch",
          key: "enable_zoom_animation",
          name: "enable_zoom_animation",
          label: "تفعيل الزوم على صور المنتجات عند التمرير",
          defaultChecked: true,
        },
        {
          type: "switch",
          key: "mobile_mini_products",
          name: "mobile_mini_products",
          label: "تصغير المنتجات في الجوال",
          description: "عرض مبسط ومصغر لعرض منتجات أكثر",
          defaultChecked: true,
        },
        {
          type: "switch",
          key: "one_line_name",
          name: "one_line_name",
          label: "عرض اسم المنتج في سطر واحد في حالة تصغير المنتجات",
          defaultChecked: true,
        },
        {
          type: "switch",
          key: "show_subtitle_on_mini",
          name: "show_subtitle_on_mini",
          label: "عرض العنوان الفرعي في حالة تصغير المنتجات",
        },
        {
          type: "switch",
          key: "mini_top_promotion",
          name: "mini_top_promotion",
          label: "عرض العنوان الترويجي أعلى صورة المنتج في حالة تصغير المنتجات",
        },
        {
          type: "switch",
          key: "free_images_height",
          name: "free_images_height",
          label: "الغاء توحيد ارتفاع الصور في حالة تصغير المنتجات",
          description: "مفيدة في حالة الصور الطولية مثل العبايات والفساتين",
        },
        {
          type: "switch",
          key: "enhanced_add_btn_in_mobile",
          name: "enhanced_add_btn_in_mobile",
          label: "تفعيل العرض المحسن لزر الاضافة للسلة في الجوال",
          description: "ميزة تجريبية",
          defaultChecked: true,
        },
        {
          type: "color",
          key: "enhanced_add_btn_bg",
          name: "enhanced_add_btn_bg",
          label: "لون خلفية زر الاضافة للسلة",
          defaultValue: "#d5c4a8",
        },
        {
          type: "color",
          key: "enhanced_add_btn_color",
          name: "enhanced_add_btn_color",
          label: "لون زر الاضافة للسلة",
          defaultValue: "#000000",
        },
        {
          type: "switch",
          key: "hide_quickview_on_mobile",
          name: "hide_quickview_on_mobile",
          label: "إخفاء زر العرض السريع والاضافة للمفضلة في الجوال",
        },
        {
          type: "switch",
          key: "auto_play_products_slider",
          name: "auto_play_products_slider",
          label: "جعل المنتجات متحركة تلقائياً في جميع الصفحات",
          description: "سيتم تطبيقها على سلايدر آراء العملاء أيضاً",
          defaultChecked: true,
        },
        {
          type: "switch",
          key: "vertical_fixed_products",
          name: "vertical_fixed_products",
          label:
            "وضع عمودي للمنتجات في مربع المنتجات الثابتة في الصفحة الرئيسية",
          defaultChecked: true,
        },
        {
          type: "switch",
          key: "rounded_cards",
          name: "rounded_cards",
          label: "حواف دائرية لبطاقات المنتج",
          defaultChecked: true,
        },
        {
          type: "switch",
          key: "show_discount",
          name: "show_discount",
          label: "عرض نسبة الخصم على المنتجات التي تحتوي على خصم",
        },
        {
          type: "switch",
          key: "show_rating",
          name: "show_rating",
          label: "عرض التقييم على بطاقات المنتجات",
          defaultChecked: true,
        },
        {
          type: "switch",
          key: "show_rating_count",
          name: "show_rating_count",
          label: "عرض عدد التقييمات بجانب التقييم",
        },
        {
          type: "switch",
          key: "disable_out_products",
          name: "disable_out_products",
          label: "الغاء تأثير (نفذت الكمية) من المنتجات التي نفذت كميتها",
        },
        {
          type: "switch",
          key: "products_has_border",
          name: "products_has_border",
          label: "إضافة إطار للمنتجات العمودية",
          defaultChecked: true,
        },
        {
          type: "color",
          key: "product_border_color",
          name: "product_border_color",
          label: "لون إطار المنتجات",
          defaultValue: "#d5c4a8",
        },
        {
          type: "switch",
          key: "primary_product_buttons",
          name: "primary_product_buttons",
          label:
            "جعل أيقونات الأزرار الدائرية على بطاقة المنتج باللون الأساسي للمتجر",
          defaultChecked: true,
        },
      ],
    },

    {
      type: "section",
      title: "ألوان المتجر",
      fields: [
        {
          type: "switch",
          key: "dark_mode_switcher",
          name: "dark_mode_switcher",
          label: "تفعيل زر التنقل بين الوضع الداكن والوضع الفاتح",
          description: "ميزة تجريبية: يفضل رفع شعار بديل للوضع الداكن",
        },
        {
          type: "switch",
          key: "dark_mode",
          name: "dark_mode",
          label: "تثبيت الوضع الداكن للمتجر",
          description: "تنبيه: عطله إذا كنت تريد تفعيل زر الوضع الداكن للعملاء",
        },
        {
          type: "color",
          key: "store_bg",
          name: "store_bg",
          label: "لون خلفية المتجر (أساسي)",
          defaultValue: "#ffffff",
        },
        {
          type: "color",
          key: "store_bg_secondary",
          name: "store_bg_secondary",
          label: "لون خلفية المتجر (ثانوي)",
          defaultValue: "#ffffff",
        },
        {
          type: "color",
          key: "store_text_color",
          name: "store_text_color",
          label: "لون النصوص الرئيسية",
          description: "العناوين واسماء المنتجات والتصنيفات…",
          defaultValue: "#000000",
        },
        {
          type: "color",
          key: "store_text_color_secondary",
          name: "store_text_color_secondary",
          label: "لون النصوص الفرعية",
          description: "العناوين الفرعية ومكونات الصفحة…",
          defaultValue: "#292929",
        },
        {
          type: "color",
          key: "header_bg",
          name: "header_bg",
          label: "لون خلفية أعلى الصفحة (الهيدر)",
          defaultValue: "#ffffff",
        },
        {
          type: "color",
          key: "header_text_color",
          name: "header_text_color",
          label: "لون نصوص أعلى الصفحة (الهيدر)",
          defaultValue: "#000000",
        },
        {
          type: "color",
          key: "product_bg",
          name: "product_bg",
          label: "لون خلفية بطاقة المنتج",
          defaultValue: "#ffffff",
        },
        {
          type: "color",
          key: "product_promo_bg",
          name: "product_promo_bg",
          label: "لون خلفية العنوان الترويجي للمنتجات",
          defaultValue: "#000000",
        },
      ],
    },

    {
      type: "section",
      title: "ألوان الوضع الداكن",
      fields: [
        {
          type: "color",
          key: "store_bg_dark",
          name: "store_bg_dark",
          label: "لون خلفية المتجر (أساسي) في الوضع الداكن",
          defaultValue: "#00333a",
        },
        {
          type: "color",
          key: "store_bg_secondary_dark",
          name: "store_bg_secondary_dark",
          label: "لون خلفية المتجر (ثانوي) في الوضع الداكن",
          defaultValue: "#005840",
        },
        {
          type: "color",
          key: "store_text_color_dark",
          name: "store_text_color_dark",
          label: "لون النصوص الرئيسية في الوضع الداكن",
          defaultValue: "#48342e",
        },
        {
          type: "color",
          key: "store_text_color_secondary_dark",
          name: "store_text_color_secondary_dark",
          label: "لون النصوص الفرعية في الوضع الداكن",
          defaultValue: "#4d3932",
        },
        {
          type: "color",
          key: "header_bg_dark",
          name: "header_bg_dark",
          label: "لون خلفية أعلى الصفحة (الهيدر) في الوضع الداكن",
          defaultValue: "#4d3932",
        },
        {
          type: "color",
          key: "header_text_color_dark",
          name: "header_text_color_dark",
          label: "لون نصوص أعلى الصفحة (الهيدر) في الوضع الداكن",
          defaultValue: "#005840",
        },
        {
          type: "color",
          key: "footer_bg_dark",
          name: "footer_bg_dark",
          label: "لون خلفية أسفل الصفحة (الفوتر) في الوضع الداكن",
          defaultValue: "#4d3932",
        },
        {
          type: "color",
          key: "footer_text_color_dark",
          name: "footer_text_color_dark",
          label: "لون نصوص أسفل الموقع",
          defaultValue: "#6bbcc6",
        },
        {
          type: "color",
          key: "bottom_footer_bg_dark",
          name: "bottom_footer_bg_dark",
          label:
            "لون خلفية الشريط السفلي (الحقوق ووسائل الدفع) في الوضع الداكن",
          defaultValue: "#000000",
        },
        {
          type: "color",
          key: "product_bg_dark",
          name: "product_bg_dark",
          label: "لون خلفية بطاقة المنتج في الوضع الداكن",
          defaultValue: "#0e0f0f",
        },
      ],
    },

    {
      type: "section",
      title: "خيارات إضافية",
      fields: [
        {
          type: "switch",
          key: "force_text_color",
          name: "force_text_color",
          label: "تطبيق لون النصوص الرئيسي على تفاصيل المنتج والصفحات والمدونة",
          description:
            "تنبيه: سيتم تجاهل التنسيقات المدخلة يدوياً عند تفعيل هذا الخيار",
          defaultChecked: true,
        },
        {
          type: "switch",
          key: "discount_popup_enabled",
          name: "discount_popup_enabled",
          label: "نافذة خصم سيليا",
        },
        {
          type: "switch",
          key: "enable_loading",
          name: "enable_loading",
          label: "صفحة التحميل",
        },
        {
          type: "switch",
          key: "enable_pattern",
          name: "enable_pattern",
          label: "خلفية المتجر (باترن)",
        },
      ],
    },

    {
      type: "section",
      title: "زر الرجوع للأعلى",
      fields: [
        {
          type: "switch",
          key: "scroll_top_enabled",
          name: "scroll_top_enabled",
          label: "تفعيل زر الرجوع للأعلى",
          defaultChecked: true,
        },
        {
          type: "dropdown",
          key: "scroll_top_position",
          name: "scroll_top_position",
          label: "تحديد مكان زر الرجوع للأعلى",
          options: [
            { label: "يسار", value: "left" },
            { label: "يمين", value: "right" },
          ],
          defaultValue: "left",
        },
      ],
    },

    {
      type: "section",
      title: "زر واتساب سيليا",
      fields: [
        {
          type: "switch",
          key: "wa_enabled",
          name: "wa_enabled",
          label: "تفعيل زر واتساب",
          defaultChecked: true,
        },
        {
          type: "text",
          key: "wa_number",
          name: "wa_number",
          label: "رقم واتساب للتواصل",
          description: 'اكتب الرقم مع المفتاح الدولي بدون مسافات وبدون "+"',
          placeholder: "966567896743",
          defaultValue: "966556676831",
        },
        {
          type: "color",
          key: "wa_btn_bg",
          name: "wa_btn_bg",
          label: "لون خلفية زر الواتساب",
          defaultValue: "#22c55e",
        },
        {
          type: "color",
          key: "wa_btn_text_color",
          name: "wa_btn_text_color",
          label: "لون محتوى زر الواتساب",
          defaultValue: "#ffffff",
        },
        {
          type: "text",
          key: "wa_btn_text",
          name: "wa_btn_text",
          label: "نص الزر",
          placeholder: "تواصل معنا",
        },
        {
          type: "switch",
          key: "interactive_wa",
          name: "interactive_wa",
          label: "تفعيل ميزة الزر التفاعلي",
          description: "إضافة رسالة جاهزة + رابط المنتج/الطلب بحسب الصفحة",
        },
        {
          type: "dropdown",
          key: "wa_position",
          name: "wa_position",
          label: "تحديد مكان زر الواتساب",
          description: "تأكد ألا يتعارض مع زر الرجوع للأعلى",
          options: [
            { label: "يمين", value: "right" },
            { label: "يسار", value: "left" },
          ],
          defaultValue: "right",
        },
      ],
    },

    {
      type: "section",
      title: "زر جوال سيليا",
      fields: [
        {
          type: "switch",
          key: "phone_btn_enabled",
          name: "phone_btn_enabled",
          label: "تفعيل زر الجوال",
        },
      ],
    },

    {
      type: "section",
      title: "خيارات صفحات التصنيفات",
      fields: [
        {
          type: "switch",
          key: "enable_autoload",
          name: "enable_autoload",
          label: "تحميل المنتجات تلقائياً عند الوصول لنهاية الصفحة",
          description: "سيتم إلغاء زر تحميل المزيد عند التفعيل",
          defaultChecked: true,
        },
        {
          type: "switch",
          key: "show_cat_banner",
          name: "show_cat_banner",
          label: "عرض بانر اعلاني موحد أعلى صفحة التصنيف",
          description: "عطله إذا تريد بانر/صورة مصغرة لكل تصنيف",
        },
      ],
    },

    {
      type: "repeatable",
      title: "تخصيص صفحات التصنيفات (cats_content)",
      key: "cats_content",
      initialItems: 1,
      template: [
        {
          type: "dropdown",
          key: "cats_content.page_type",
          name: "cats_content.page_type",
          label: "نوع الصفحة *",
          options: [
            { label: "تصنيف", value: "category" },
            { label: "صفحة", value: "page" },
            { label: "رابط خارجي", value: "external" },
          ],
          defaultValue: "category",
        },
        {
          type: "dropdown",
          key: "cats_content.cat_id",
          name: "cats_content.cat_id",
          label: "اختر التصنيف",
          options: [{ label: "اختر ...", value: "" }],
          defaultValue: "",
        },
        {
          type: "image",
          key: "cats_content.banner",
          name: "cats_content.banner",
          label: "بانر التصنيف",
        },
        {
          type: "image",
          key: "cats_content.image",
          name: "cats_content.image",
          label: "صورة مصغرة للتصنيف",
          description: "إذا رفعتها هنا سيتم تجاهل الصورة من لوحة التحكم",
        },
        {
          type: "text",
          key: "cats_content.title",
          name: "cats_content.title",
          label: "العنوان",
          placeholder: "أضف نص..",
        },
        {
          type: "text",
          key: "cats_content.subtitle",
          name: "cats_content.subtitle",
          label: "الوصف",
          placeholder: "أضف نص..",
        },
        {
          type: "radio",
          key: "cats_content.conent_style",
          name: "cats_content.conent_style",
          label: "طريقة عرض المحتوى *",
          description: "اختر الشكل المناسب للمحتوى",
          options: [
            { label: "عرض البانر فوق الوصف", value: "cats_style_1" },
            { label: "عرض البانر بجانب الوصف", value: "cats_style_2" },
            { label: "عرض البانر كخلفية للوصف", value: "cats_style_3" },
            { label: "عرض البانر أسفل الوصف", value: "cats_style_4" },
          ],
          defaultValue: "cats_style_1",
        },
        {
          type: "switch",
          key: "cats_content.show_cat_image",
          name: "cats_content.show_cat_image",
          label: "عرض صورة التصنيف المصغرة أعلى العنوان",
        },
        {
          type: "switch",
          key: "cats_content.hide_cat_name",
          name: "cats_content.hide_cat_name",
          label: "اخفاء اسم التصنيف الإفتراضي",
        },
        {
          type: "switch",
          key: "cats_content.full_width",
          name: "cats_content.full_width",
          label: "جعل المحتوى بكامل عرض الشاشة",
        },
        {
          type: "dropdown",
          key: "cats_content.text_align",
          name: "cats_content.text_align",
          label: "مكان النصوص *",
          options: [
            { label: "بداية الصفحة", value: "start" },
            { label: "وسط", value: "center" },
            { label: "نهاية الصفحة", value: "end" },
          ],
          defaultValue: "start",
        },
      ],
    },

    {
      type: "section",
      title: "إعدادات إضافية للتصنيفات",
      fields: [
        {
          type: "switch",
          key: "show_sub_cats",
          name: "show_sub_cats",
          label: "عرض التصنيفات الفرعية لكل تصنيف رئيسي",
          defaultChecked: true,
        },
        {
          type: "switch",
          key: "enable_menu_images",
          name: "enable_menu_images",
          label: "عرض الصور المصغرة في القائمة الجانبية في الجوال",
          description:
            "إذا تم رفع صور للأقسام من لوحة التحكم سيتم تجاهل الصور هنا",
        },
        {
          type: "switch",
          key: "banner_after_cats",
          name: "banner_after_cats",
          label: "عرض التصنيفات الفرعية أعلى البانر / المحتوى",
          defaultChecked: true,
        },
        {
          type: "dropdown",
          key: "sub_cats_icon",
          name: "sub_cats_icon",
          label: "أيقونة التصنيفات الفرعية",
          description: "تظهر إذا لم يتم رفع صورة مصغرة للتصنيف",
          options: [
            { label: "sicon-clothes-hanger", value: "sicon-clothes-hanger" },
            { label: "sicon-tag", value: "sicon-tag" },
            { label: "sicon-grid", value: "sicon-grid" },
          ],
          defaultValue: "sicon-clothes-hanger",
        },
      ],
    },

    {
      type: "section",
      title: "خيارات صفحة السلة",
      fields: [
        {
          type: "switch",
          key: "show_cart_banner",
          name: "show_cart_banner",
          label: "عرض بانر اعلاني أعلى صفحة السلة",
        },
        {
          type: "switch",
          key: "show_cart_products",
          name: "show_cart_products",
          label: "عرض قائمة منتجات بعنوان (قد يعجبك أيضا) أسفل صفحة السلة",
          defaultChecked: true,
        },
        {
          type: "url",
          key: "cart_display_all",
          name: "cart_display_all",
          label: "رابط عرض الكل (اختياري) لقائمة المنتجات",
          placeholder: "e.g. https://salla.sa",
        },
        {
          type: "dropdown",
          key: "cart_products",
          name: "cart_products",
          label: "برجاء اختيار المنتجات",
          options: [{ label: "اختر ...", value: "" }],
          defaultValue: "",
        },
      ],
    },

    {
      type: "section",
      title: "خيارات صفحات العميل",
      fields: [
        {
          type: "image",
          key: "profile_bg",
          name: "profile_bg",
          label: "صورة خلفية صفحات العميل",
          description:
            "سيتم عرض لون المتجر الرئيسي مع شعار المتجر في المنتصف كخلفية افتراضية في حال عدم رفع صورة",
        },
      ],
    },

    {
      type: "section",
      title: "خيارات أعلى الصفحة",
      fields: [
        {
          type: "number",
          key: "header_logo_width",
          name: "header_logo_width",
          label: "عرض شعار الموقع (px)",
          description: "أقصى عرض 300px",
          defaultValue: 0,
        },
        {
          type: "number",
          key: "header_logo_height",
          name: "header_logo_height",
          label: "طول شعار الموقع (px)",
          description: "أقصى طول 120px",
          defaultValue: 48,
        },
        {
          type: "switch",
          key: "enable_desktop_sidemenu",
          name: "enable_desktop_sidemenu",
          label: "تفعيل القائمة الجانبية في متصفح الكمبيوتر",
          description: "ميزة تجريبية",
        },
        {
          type: "switch",
          key: "centered_logo",
          name: "centered_logo",
          label: "توسيط الشعار أعلى الصفحة",
          defaultChecked: true,
        },
        {
          type: "switch",
          key: "mobile_only_centered_logo",
          name: "mobile_only_centered_logo",
          label: "توسيط الشعار أعلى الصفحة في الجوال فقط",
          defaultChecked: true,
        },
        {
          type: "switch",
          key: "header_is_sticky",
          name: "header_is_sticky",
          label: "تثبيت القائمة الرئيسية أعلى الصفحة عند التمرير",
          defaultChecked: true,
        },
        {
          type: "switch",
          key: "hide_topnav",
          name: "hide_topnav",
          label: "إخفاء الشريط العلوي",
          description: "عند التفعيل سيتم عرض العملات واللغات في أسفل الصفحة",
        },
        {
          type: "switch",
          key: "hide_topnav_links",
          name: "hide_topnav_links",
          label: "إخفاء الروابط الهامة من الشريط العلوي",
        },
        {
          type: "switch",
          key: "hide_topnav_contacts",
          name: "hide_topnav_contacts",
          label: "إخفاء وسائل التواصل من الشريط العلوي",
        },
        {
          type: "switch",
          key: "topnav_is_dark",
          name: "topnav_is_dark",
          label: "شريط علوي داكن",
        },
        {
          type: "switch",
          key: "activate_default_menu",
          name: "activate_default_menu",
          label: "تفعيل القائمة الافتراضية",
        },
      ],
    },

    {
      type: "section",
      title: "خيارات أسفل الصفحة",
      fields: [
        {
          type: "number",
          key: "footer_logo_width",
          name: "footer_logo_width",
          label: "عرض شعار أسفل الموقع (px)",
          description: "أقصى عرض 300px",
          defaultValue: 0,
        },
        {
          type: "number",
          key: "footer_logo_height",
          name: "footer_logo_height",
          label: "طول شعار أسفل الموقع (px)",
          description: "أقصى طول 120px",
          defaultValue: 64,
        },
        {
          type: "switch",
          key: "enable_bottom_nav",
          name: "enable_bottom_nav",
          label: "تفعيل القائمة السفلية",
        },
        {
          type: "switch",
          key: "footer_is_dark",
          name: "footer_is_dark",
          label: "تثبيت الوضع الداكن (للفوتر)",
        },
        {
          type: "color",
          key: "footer_bg",
          name: "footer_bg",
          label: "لون خلفية أسفل الموقع",
          defaultValue: "#3b3b3b",
        },
        {
          type: "color",
          key: "footer_text_color",
          name: "footer_text_color",
          label: "لون نصوص أسفل الموقع",
          defaultValue: "#ffffff",
        },
        {
          type: "color",
          key: "bottom_footer_bg",
          name: "bottom_footer_bg",
          label: "لون خلفية الشريط السفلي (الحقوق ووسائل الدفع)",
          defaultValue: "#1c1c1c",
        },
        {
          type: "switch",
          key: "show_basic_footer",
          name: "show_basic_footer",
          label: "تفعيل العرض التقليدي للفوتر",
        },
        {
          type: "switch",
          key: "enhanced_links",
          name: "enhanced_links",
          label: "عرض الروابط الهامة أسفل الصفحة على عمودين",
          defaultChecked: true,
        },
        {
          type: "switch",
          key: "links_with_bullits",
          name: "links_with_bullits",
          label: "عرض الروابط الهامة أسفل الصفحة مع نقاط",
        },
        {
          type: "switch",
          key: "enhanced_social_icons",
          name: "enhanced_social_icons",
          label: "تفعيل العرض المحسن لأيقونات وسائل التواصل",
          defaultChecked: true,
        },
        {
          type: "switch",
          key: "rounded_contacts",
          name: "rounded_contacts",
          label: "جعل أيقونات وسائل التواصل دائرية",
          defaultChecked: true,
        },
        {
          type: "switch",
          key: "mini_sbc",
          name: "mini_sbc",
          label: "عرض أيقونة توثيق منصة الأعمال بشكل مصغر",
        },
        {
          type: "switch",
          key: "footer_show_newsletter",
          name: "footer_show_newsletter",
          label: "عرض النشرة البريدية",
        },
        {
          type: "switch",
          key: "show_footer_logos",
          name: "show_footer_logos",
          label: "إضافة شعارات في الفوتر",
        },
      ],
    },

    {
      type: "section",
      title: "خيارات صفحة المنتج",
      fields: [
        {
          type: "switch",
          key: "show_singleSelection",
          name: "show_singleSelection",
          label: "تفعيل الشكل المحسن لحقل (الاختيار الواحد)",
        },
        {
          type: "switch",
          key: "show_multipleOption",
          name: "show_multipleOption",
          label: "تفعيل الشكل المحسن لحقل (الاختيار المتعدد)",
        },
        {
          type: "switch",
          key: "enable_add_product_toast",
          name: "enable_add_product_toast",
          label: "تفعيل إشعار الإضافة للسلة المحسن",
          defaultChecked: true,
        },
        {
          type: "switch",
          key: "activate_zoom",
          name: "activate_zoom",
          label: "تفعيل خاصية الزوم على صورة المنتج عند التمرير",
          description: "تعمل على الكمبيوتر فقط ويتم تعطيلها في الجوال",
        },
        {
          type: "switch",
          key: "enhanced_brand_senction",
          name: "enhanced_brand_senction",
          label: "تفعيل الشكل المحسن لقسم الماركة التجارية",
          description: "يعرض (أصلي 100%) مع نقل زر المشاركة/الأمنيات",
        },
        {
          type: "switch",
          key: "thumbs_bottom",
          name: "thumbs_bottom",
          label: "عرض صور المنتج أسفل الصورة الأساسية في الكمبيوتر",
          defaultChecked: true,
        },
        {
          type: "switch",
          key: "disable_thumbs_in_mobile",
          name: "disable_thumbs_in_mobile",
          label: "اخفاء الصور المصغرة في الجوال واظهار النقاط بدلا منها",
        },
        {
          type: "switch",
          key: "show_payments_in_product_single",
          name: "show_payments_in_product_single",
          label: "عرض وسائل الدفع في صفحة المنتج",
          defaultChecked: true,
        },
        {
          type: "switch",
          key: "show_category_in_product_single",
          name: "show_category_in_product_single",
          label: "عرض تصنيف المنتج في صفحة المنتج",
        },
        {
          type: "switch",
          key: "hide_ratings",
          name: "hide_ratings",
          label: "اخفاء تقييمات العملاء من صفحة تفاصيل المنتج",
        },
        {
          type: "switch",
          key: "replace_slider_text",
          name: "replace_slider_text",
          label: "استبدال (منتجات قد تعجبك) بـ (عادة ما يتم شراؤه مع)",
          defaultChecked: true,
        },
        {
          type: "switch",
          key: "hide_countdown",
          name: "hide_countdown",
          label: "اخفاء العد التنازلي للمنتجات التي تحتوي على خصم",
        },
        {
          type: "switch",
          key: "show_discounted_amount",
          name: "show_discounted_amount",
          label: "عرض المبلغ المخفض بجانب السعر عند وجود خصم",
          defaultChecked: true,
        },
        {
          type: "switch",
          key: "update_both_prices",
          name: "update_both_prices",
          label: "تحديث السعر العلوي والسفلي عند تغيير سعر المنتج",
          description:
            "عند تعطيله يتم تحديث السعر السفلي فقط عند تغيير الكمية/الخيارات",
        },
        {
          type: "switch",
          key: "hide_top_price",
          name: "hide_top_price",
          label: "إخفاء السعر العلوي",
        },
        {
          type: "switch",
          key: "top_details_tabs",
          name: "top_details_tabs",
          label: "عرض تفاصيل المنتج بجانب صور المنتج",
          defaultChecked: true,
        },
        {
          type: "switch",
          key: "mini_offers_box",
          name: "mini_offers_box",
          label: "عرض مربع العروض الخاصة بشكل مصغر أسفل صور المنتج",
          defaultChecked: true,
        },
        {
          type: "switch",
          key: "show_product_features",
          name: "show_product_features",
          label: "عرض مميزات المتجر في صفحة المنتج",
        },
        {
          type: "switch",
          key: "show_sidebar",
          name: "show_sidebar",
          label: "اظهار القائمة الجانبية في صفحة المنتج",
        },
        {
          type: "switch",
          key: "show_sticky_product",
          name: "show_sticky_product",
          label: "اظهار البطاقة المصغرة للمنتج بعد الوصول لمنتصف الصفحة",
          defaultChecked: true,
        },
        {
          type: "switch",
          key: "sticky_add_to_cart",
          name: "sticky_add_to_cart",
          label: "تثبيت زر الإضافة والكمية أسفل شاشة الجوال",
          defaultChecked: true,
        },
        {
          type: "switch",
          key: "show_tags",
          name: "show_tags",
          label: "اظهار الوسوم",
          defaultChecked: true,
        },
        {
          type: "dropdown",
          key: "slider_background_size",
          name: "slider_background_size",
          label: "طريقة عرض الصور في سليدر صور المنتج",
          options: [
            {
              label: "Cover (تغطية الصورة كامل المساحة مع المحافظة على النسبة)",
              value: "cover",
            },
            { label: "Contain (احتواء)", value: "contain" },
            { label: "Fill (تمديد)", value: "fill" },
          ],
          defaultValue: "cover",
        },
      ],
    },
  ];
}

export function buildThemeOptionsDefs(schema?: any): SectionDef[] {
  const dynamicSections = Array.isArray(schema?.sections)
    ? schema.sections.map(mapSection).filter(Boolean)
    : [];

  if (dynamicSections.length > 0) {
    return dynamicSections as SectionDef[];
  }

  return buildLegacyThemeOptionsDefs();
}