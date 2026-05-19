// FILE: apps/merchant/src/app/(theme-editor)/themes/[themeId]/customize/header-and-footer/page.tsx
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useParams } from "next/navigation";
import Icon from "@/boltify/components/icon/Icon";
import { STATUS_ICONS as THEME_EDITOR_ICONS } from "@/lib/icons/status-icons";

type AnnouncementLinkType =
  | "none"
  | "product"
  | "category"
  | "discounts"
  | "external"
  | "page";

type StoreReferenceOption = {
  value: string;
  label: string;
  image_url?: string | null;
};

type HeaderAndFooterSettings = {
  header: {
    search_enabled: boolean;
    slogan_enabled: boolean;
    slogan_icon: string;
    slogan_text: string;
  };

  announcement: {
    enabled: boolean;
    icon: string;
    title: string;
    content: string;
    link_type: AnnouncementLinkType;
    link_value: string;
    link_label: string;
    ends_at: string;
    pages: string[];
    text_color: string;
    background_color: string;

    /**
     * دعم قديم عشان البيانات القديمة ما تنكسر.
     */
    text: string;
    link: string;
  };

  footer: {
    help_title: string;
    help_subtitle: string;

    /**
     * مركز المساعدة داخل شريط المساعدة العلوي في التذييل.
     */
    help_center_title: string;
    help_center_url: string;

    /**
     * ألوان شريط المساعدة العلوي.
     */
    help_background_color: string;
    help_text_color: string;

    copyright_text: string;
    commercial_register: string;
    tax_number: string;
    show_payments: boolean;
    show_apps: boolean;
    show_social: boolean;
  };

  business_certificate: {
    enabled: boolean;
    title: string;
    image_url: string;
    link: string;
  };
};

type ProfileState = {
  store_name: string;
  description: string;
  logo_url: string;
  favicon_url: string;
};

type SupportState = {
  phone: string;
  whatsapp: string;
  whatsapp_pending: string;
  whatsapp_verified_at: string | null;
  telegram: string;
  email: string;
};

type SocialState = {
  instagram: string;
  x: string;
  snapchat: string;
  tiktok: string;
  youtube: string;
  facebook: string;
};

type AppState = {
  ios: string;
  android: string;
};

type SectionKey =
  | "header"
  | "announcement"
  | "footer"
  | "support"
  | "business_certificate"
  | "social"
  | "app";

const DEFAULT_SETTINGS: HeaderAndFooterSettings = {
  header: {
    search_enabled: true,
    slogan_enabled: true,
    slogan_icon: "StarAward01",
    slogan_text: "موقع التسوق الأول لمنتجاتك المميزة",
  },

  announcement: {
    enabled: false,
    icon: "Notification01",
    title: "",
    content: "",
    link_type: "none",
    link_value: "",
    link_label: "",
    ends_at: "",
    pages: [],
    text_color: "#000000",
    background_color: "#b9f3e7",

    text: "",
    link: "",
  },

  footer: {
    help_title: "هل تحتاج مساعدة ؟",
    help_subtitle: "يمكنك الحصول على المساعدة من خلال وسائل المساعدة المختلفة",

    help_center_title: "مركز المساعدة",
    help_center_url: "help.niceonesa.com",

    help_background_color: "#9b7ad6",
    help_text_color: "#ffffff",

    copyright_text: "جميع الحقوق محفوظة",
    commercial_register: "",
    tax_number: "",
    show_payments: true,
    show_apps: true,
    show_social: true,
  },

  business_certificate: {
    enabled: false,
    title: "شهادة منصة الأعمال",
    image_url: "",
    link: "",
  },
};

const DEFAULT_PROFILE: ProfileState = {
  store_name: "",
  description: "",
  logo_url: "",
  favicon_url: "",
};

const DEFAULT_SUPPORT: SupportState = {
  phone: "",
  whatsapp: "",
  whatsapp_pending: "",
  whatsapp_verified_at: null,
  telegram: "",
  email: "",
};

const DEFAULT_SOCIAL: SocialState = {
  instagram: "",
  x: "",
  snapchat: "",
  tiktok: "",
  youtube: "",
  facebook: "",
};

const DEFAULT_APP: AppState = {
  ios: "",
  android: "",
};

function s(value: unknown) {
  return String(value ?? "").trim();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function safeObject(value: any): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  return {};
}

function normalizeStringArray(value: any): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((x) => String(x ?? "").trim())
    .filter(Boolean);
}

function normalizeLinkType(value: any): AnnouncementLinkType {
  const v = s(value);

  if (v === "product") return "product";
  if (v === "category") return "category";
  if (v === "discounts") return "discounts";
  if (v === "external") return "external";
  if (v === "page") return "page";

  return "none";
}

function makeSnapshot(args: {
  settings: HeaderAndFooterSettings;
  profile: ProfileState;
  support: SupportState;
  social: SocialState;
  app: AppState;
}) {
  return JSON.stringify({
    settings: args.settings,
    profile: args.profile,
    support: args.support,
    social: args.social,
    app: args.app,
  });
}

async function uploadThemeEditorFile(file: File): Promise<string> {
  const form = new FormData();
  form.append("kind", "theme-editor/image");
  form.append("file", file, file.name);

  const res = await fetch("/api/uploads/r2/put", {
    method: "POST",
    body: form,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok || !json?.ok || !json?.publicUrl) {
    throw new Error(json?.error || "UPLOAD_FAILED");
  }

  return String(json.publicUrl);
}

function themeIconLabel(value?: string | null) {
  const item = THEME_EDITOR_ICONS.find((x) => x.value === value);
  return item?.label || "اختر الأيقونة";
}

function ThemeIconPreview({ icon }: { icon?: string | null }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
      {icon ? <Icon icon={icon as any} className="text-lg" /> : null}
    </div>
  );
}

function ThemeIconPickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const PAGE_SIZE = 20;
  const totalPages = Math.max(
    1,
    Math.ceil(THEME_EDITOR_ICONS.length / PAGE_SIZE),
  );

  const currentItems = THEME_EDITOR_ICONS.slice(
    page * PAGE_SIZE,
    page * PAGE_SIZE + PAGE_SIZE,
  );

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const node = wrapRef.current;
      if (!node) return;
      if (node.contains(e.target as Node)) return;
      setOpen(false);
    }

    if (open) {
      document.addEventListener("mousedown", onDocClick);
    }

    return () => {
      document.removeEventListener("mousedown", onDocClick);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative space-y-2 text-right">
      <div className="text-sm font-medium text-slate-800">{label}</div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 w-full items-center justify-between rounded-2xl border border-slate-300 bg-white px-3 text-sm"
      >
        <span className="flex min-w-0 items-center gap-3">
          <ThemeIconPreview icon={value} />

          <span
            className={[
              "truncate",
              value ? "text-slate-900" : "text-slate-400",
            ].join(" ")}
          >
            {themeIconLabel(value)}
          </span>
        </span>

        <span className="text-slate-400">▾</span>
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+8px)] z-[10000] w-[320px] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40"
            >
              ‹
            </button>

            <div className="text-sm font-semibold text-slate-700">
              {page + 1} / {totalPages}
            </div>

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {currentItems.map((item) => {
              const selected = value === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  title={item.label}
                  onClick={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  className={[
                    "flex h-12 w-full items-center justify-center rounded-xl border transition",
                    selected
                      ? "border-[#7fe0d4] bg-[#dffaf5] text-[#0f766e]"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                >
                  <Icon icon={item.value as any} className="text-lg" />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function HeaderAndFooterEditorPage() {
  const params = useParams<{ themeId: string }>();
  const themeId = String(params?.themeId ?? "").trim();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selected, setSelected] = useState<SectionKey | null>(null);

  const [settings, setSettings] =
    useState<HeaderAndFooterSettings>(DEFAULT_SETTINGS);

  const [profile, setProfile] = useState<ProfileState>(DEFAULT_PROFILE);
  const [support, setSupport] = useState<SupportState>(DEFAULT_SUPPORT);
  const [social, setSocial] = useState<SocialState>(DEFAULT_SOCIAL);
  const [app, setApp] = useState<AppState>(DEFAULT_APP);

  const [storeProducts, setStoreProducts] = useState<StoreReferenceOption[]>(
    [],
  );

  const [storeCategories, setStoreCategories] = useState<
    StoreReferenceOption[]
  >([]);

  const themeOptionsRef = useRef<Record<string, any>>({});

  const initialSnapshotRef = useRef<string>(
    makeSnapshot({
      settings: DEFAULT_SETTINGS,
      profile: DEFAULT_PROFILE,
      support: DEFAULT_SUPPORT,
      social: DEFAULT_SOCIAL,
      app: DEFAULT_APP,
    }),
  );

  const canSave = useMemo(() => {
    if (loading || saving) return false;

    const current = makeSnapshot({
      settings,
      profile,
      support,
      social,
      app,
    });

    return current !== initialSnapshotRef.current;
  }, [settings, profile, support, social, app, loading, saving]);

  useEffect(() => {
    if (!themeId) return;

    let alive = true;

    async function load() {
      try {
        setLoading(true);

        const [themeRes, supportRes, socialRes, appRes, profileRes] =
          await Promise.all([
            fetch(`/api/themes/${themeId}/theme-options`, {
              method: "GET",
              cache: "no-store",
            }),

            fetch("/api/settings/store/support/get", {
              method: "GET",
              cache: "no-store",
            }),

            fetch("/api/settings/store/social/get", {
              method: "GET",
              cache: "no-store",
            }),

            fetch("/api/settings/store/app/get", {
              method: "GET",
              cache: "no-store",
            }),

            fetch("/api/settings/store/profile/get", {
              method: "GET",
              cache: "no-store",
            }),
          ]);

        const themeJson = await themeRes.json().catch(() => ({}));
        const supportJson = await supportRes.json().catch(() => ({}));
        const socialJson = await socialRes.json().catch(() => ({}));
        const appJson = await appRes.json().catch(() => ({}));
        const profileJson = await profileRes.json().catch(() => ({}));

        if (!alive) return;

        const themeOptions = safeObject(themeJson?.theme_options);
        themeOptionsRef.current = clone(themeOptions);

        setStoreProducts(
          Array.isArray(themeJson?.store_products)
            ? themeJson.store_products
            : [],
        );

        setStoreCategories(
          Array.isArray(themeJson?.store_categories)
            ? themeJson.store_categories
            : [],
        );

        const headerAndFooter = safeObject(themeOptions?.header_and_footer);

        const nextSettings: HeaderAndFooterSettings = {
          header: {
            search_enabled:
              typeof headerAndFooter?.header?.search_enabled === "boolean"
                ? headerAndFooter.header.search_enabled
                : DEFAULT_SETTINGS.header.search_enabled,

            slogan_enabled:
              typeof headerAndFooter?.header?.slogan_enabled === "boolean"
                ? headerAndFooter.header.slogan_enabled
                : DEFAULT_SETTINGS.header.slogan_enabled,

            slogan_icon:
              s(headerAndFooter?.header?.slogan_icon) ||
              s(headerAndFooter?.header?.slogan_icon_name) ||
              DEFAULT_SETTINGS.header.slogan_icon,

            slogan_text:
              s(headerAndFooter?.header?.slogan_text) ||
              DEFAULT_SETTINGS.header.slogan_text,
          },

          announcement: {
            enabled:
              typeof headerAndFooter?.announcement?.enabled === "boolean"
                ? headerAndFooter.announcement.enabled
                : DEFAULT_SETTINGS.announcement.enabled,

            icon:
              s(headerAndFooter?.announcement?.icon) ||
              DEFAULT_SETTINGS.announcement.icon,

            title: s(headerAndFooter?.announcement?.title),

            content:
              s(headerAndFooter?.announcement?.content) ||
              s(headerAndFooter?.announcement?.text),

            link_type: normalizeLinkType(
              headerAndFooter?.announcement?.link_type,
            ),

            link_value:
              s(headerAndFooter?.announcement?.link_value) ||
              s(headerAndFooter?.announcement?.link),

            link_label: s(headerAndFooter?.announcement?.link_label),

            ends_at: s(headerAndFooter?.announcement?.ends_at),

            pages: normalizeStringArray(headerAndFooter?.announcement?.pages),

            text_color:
              s(headerAndFooter?.announcement?.text_color) ||
              DEFAULT_SETTINGS.announcement.text_color,

            background_color:
              s(headerAndFooter?.announcement?.background_color) ||
              DEFAULT_SETTINGS.announcement.background_color,

            text:
              s(headerAndFooter?.announcement?.text) ||
              s(headerAndFooter?.announcement?.content),

            link:
              s(headerAndFooter?.announcement?.link) ||
              s(headerAndFooter?.announcement?.link_value),
          },

          footer: {
            help_title:
              s(headerAndFooter?.footer?.help_title) ||
              DEFAULT_SETTINGS.footer.help_title,

            help_subtitle:
              s(headerAndFooter?.footer?.help_subtitle) ||
              DEFAULT_SETTINGS.footer.help_subtitle,

            help_center_title:
              s(headerAndFooter?.footer?.help_center_title) ||
              DEFAULT_SETTINGS.footer.help_center_title,

            help_center_url:
              s(headerAndFooter?.footer?.help_center_url) ||
              DEFAULT_SETTINGS.footer.help_center_url,

            help_background_color:
              s(headerAndFooter?.footer?.help_background_color) ||
              DEFAULT_SETTINGS.footer.help_background_color,

            help_text_color:
              s(headerAndFooter?.footer?.help_text_color) ||
              DEFAULT_SETTINGS.footer.help_text_color,

            copyright_text:
              s(headerAndFooter?.footer?.copyright_text) ||
              DEFAULT_SETTINGS.footer.copyright_text,

            commercial_register: s(
              headerAndFooter?.footer?.commercial_register,
            ),

            tax_number: s(headerAndFooter?.footer?.tax_number),

            show_payments:
              typeof headerAndFooter?.footer?.show_payments === "boolean"
                ? headerAndFooter.footer.show_payments
                : DEFAULT_SETTINGS.footer.show_payments,

            show_apps:
              typeof headerAndFooter?.footer?.show_apps === "boolean"
                ? headerAndFooter.footer.show_apps
                : DEFAULT_SETTINGS.footer.show_apps,

            show_social:
              typeof headerAndFooter?.footer?.show_social === "boolean"
                ? headerAndFooter.footer.show_social
                : DEFAULT_SETTINGS.footer.show_social,
          },

          business_certificate: {
            enabled:
              typeof headerAndFooter?.business_certificate?.enabled ===
              "boolean"
                ? headerAndFooter.business_certificate.enabled
                : DEFAULT_SETTINGS.business_certificate.enabled,

            title:
              s(headerAndFooter?.business_certificate?.title) ||
              DEFAULT_SETTINGS.business_certificate.title,

            image_url: s(headerAndFooter?.business_certificate?.image_url),
            link: s(headerAndFooter?.business_certificate?.link),
          },
        };

        const nextProfile: ProfileState = {
          store_name: s(profileJson?.store?.name),
          description: s(profileJson?.profile?.description),
          logo_url: s(profileJson?.profile?.logo_url),
          favicon_url: s(profileJson?.profile?.favicon_url),
        };

        const nextSupport: SupportState = {
          phone: s(supportJson?.support?.phone),
          whatsapp: s(supportJson?.support?.whatsapp),
          whatsapp_pending: s(supportJson?.support?.whatsapp_pending),
          whatsapp_verified_at:
            supportJson?.support?.whatsapp_verified_at || null,
          telegram: s(supportJson?.support?.telegram),
          email: s(supportJson?.support?.email),
        };

        const nextSocial: SocialState = {
          instagram: s(socialJson?.social?.instagram),
          x: s(socialJson?.social?.x),
          snapchat: s(socialJson?.social?.snapchat),
          tiktok: s(socialJson?.social?.tiktok),
          youtube: s(socialJson?.social?.youtube),
          facebook: s(socialJson?.social?.facebook),
        };

        const nextApp: AppState = {
          ios: s(appJson?.app?.ios),
          android: s(appJson?.app?.android),
        };

        setSettings(nextSettings);
        setProfile(nextProfile);
        setSupport(nextSupport);
        setSocial(nextSocial);
        setApp(nextApp);

        initialSnapshotRef.current = makeSnapshot({
          settings: nextSettings,
          profile: nextProfile,
          support: nextSupport,
          social: nextSocial,
          app: nextApp,
        });
      } catch {
        themeOptionsRef.current = {};

        setSettings(DEFAULT_SETTINGS);
        setProfile(DEFAULT_PROFILE);
        setSupport(DEFAULT_SUPPORT);
        setSocial(DEFAULT_SOCIAL);
        setApp(DEFAULT_APP);
        setStoreProducts([]);
        setStoreCategories([]);

        initialSnapshotRef.current = makeSnapshot({
          settings: DEFAULT_SETTINGS,
          profile: DEFAULT_PROFILE,
          support: DEFAULT_SUPPORT,
          social: DEFAULT_SOCIAL,
          app: DEFAULT_APP,
        });
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load();

    return () => {
      alive = false;
    };
  }, [themeId]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("theme-editor:save-state", {
        detail: {
          pageKey: "header-and-footer",
          showSaveButton: true,
          label: selected ? "حفظ إعدادات القسم" : "حفظ إعدادات الرأس والتذييل",
          canSave,
          saving,
        },
      }),
    );
  }, [selected, canSave, saving]);

  useEffect(() => {
    function emitState() {
      window.dispatchEvent(
        new CustomEvent("theme-editor:save-state", {
          detail: {
            pageKey: "header-and-footer",
            showSaveButton: true,
            label: selected
              ? "حفظ إعدادات القسم"
              : "حفظ إعدادات الرأس والتذييل",
            canSave,
            saving,
          },
        }),
      );
    }

    function onRequestState() {
      emitState();
    }

    function onSave(e: Event) {
      const ce = e as CustomEvent<{ pageKey?: string }>;
      const pageKey = String(ce?.detail?.pageKey ?? "").trim();

      if (pageKey && pageKey !== "header-and-footer") return;

      void handleSave();
    }

    window.addEventListener(
      "theme-editor:save-state:request",
      onRequestState as EventListener,
    );

    window.addEventListener("theme-editor:save", onSave as EventListener);

    return () => {
      window.removeEventListener(
        "theme-editor:save-state:request",
        onRequestState as EventListener,
      );

      window.removeEventListener("theme-editor:save", onSave as EventListener);
    };
  }, [canSave, saving, selected, settings, profile, support, social, app]);

  function updateHeader(patch: Partial<HeaderAndFooterSettings["header"]>) {
    setSettings((prev) => ({
      ...prev,
      header: {
        ...prev.header,
        ...patch,
      },
    }));
  }

  function updateAnnouncement(
    patch: Partial<HeaderAndFooterSettings["announcement"]>,
  ) {
    setSettings((prev) => ({
      ...prev,
      announcement: {
        ...prev.announcement,
        ...patch,
      },
    }));
  }

  function updateFooter(patch: Partial<HeaderAndFooterSettings["footer"]>) {
    setSettings((prev) => ({
      ...prev,
      footer: {
        ...prev.footer,
        ...patch,
      },
    }));
  }

  function updateBusinessCertificate(
    patch: Partial<HeaderAndFooterSettings["business_certificate"]>,
  ) {
    setSettings((prev) => ({
      ...prev,
      business_certificate: {
        ...prev.business_certificate,
        ...patch,
      },
    }));
  }

  async function handleSave() {
    if (!themeId || loading || saving) return;

    try {
      setSaving(true);

      const nextThemeOptions = clone(themeOptionsRef.current || {});

      nextThemeOptions.header_and_footer = {
        ...(nextThemeOptions.header_and_footer || {}),
        ...settings,
      };

      const [themeRes, supportRes, socialRes, appRes, profileSaveRes] =
        await Promise.all([
          fetch(`/api/themes/${themeId}/theme-options`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              theme_options: nextThemeOptions,
            }),
          }),

          fetch("/api/settings/store/support/update", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              phone: support.phone,
              whatsapp: support.whatsapp,
              telegram: support.telegram,
              email: support.email,
            }),
          }),

          fetch("/api/settings/store/social/update", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              instagram: social.instagram,
              x: social.x,
              snapchat: social.snapchat,
              tiktok: social.tiktok,
              youtube: social.youtube,
              facebook: social.facebook,
            }),
          }),

          fetch("/api/settings/store/app/update", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ios: app.ios,
              android: app.android,
            }),
          }),

          fetch("/api/settings/store/profile/update", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              store_name: profile.store_name,
              description: profile.description,
              logo_url: profile.logo_url,
              favicon_url: profile.favicon_url,
            }),
          }),
        ]);

      if (!themeRes.ok) throw new Error("THEME_OPTIONS_SAVE_FAILED");
      if (!supportRes.ok) throw new Error("SUPPORT_SAVE_FAILED");
      if (!socialRes.ok) throw new Error("SOCIAL_SAVE_FAILED");
      if (!appRes.ok) throw new Error("APP_SAVE_FAILED");
      if (!profileSaveRes.ok) throw new Error("PROFILE_SAVE_FAILED");

      const themeJson = await themeRes.json().catch(() => ({}));

      const savedThemeOptions =
        themeJson?.theme_options && typeof themeJson.theme_options === "object"
          ? clone(themeJson.theme_options)
          : nextThemeOptions;

      themeOptionsRef.current = savedThemeOptions;

      initialSnapshotRef.current = makeSnapshot({
        settings,
        profile,
        support,
        social,
        app,
      });

      window.dispatchEvent(
        new CustomEvent("theme-editor:toast", {
          detail: {
            type: "success",
            message: "تم حفظ إعدادات الرأس والتذييل",
          },
        }),
      );
    } catch {
      window.alert("تعذر حفظ إعدادات الرأس والتذييل");
    } finally {
      setSaving(false);
    }
  }

  const selectedTitle = selected ? getSectionTitle(selected) : "";

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white/60 p-4 text-sm text-gray-500">
        جاري تحميل إعدادات رأس الصفحة والتذييل...
      </div>
    );
  }

  if (selected) {
    return (
      <SectionEditorShell
        title={selectedTitle}
        onBack={() => setSelected(null)}
      >
        {selected === "header" ? (
          <HeaderSettingsEditor
            value={settings.header}
            profile={profile}
            onChange={updateHeader}
            onProfileChange={setProfile}
          />
        ) : null}

        {selected === "announcement" ? (
          <AnnouncementEditor
            value={settings.announcement}
            products={storeProducts}
            categories={storeCategories}
            onChange={updateAnnouncement}
          />
        ) : null}

        {selected === "footer" ? (
          <FooterSettingsEditor
            value={settings.footer}
            app={app}
            onChange={updateFooter}
            onAppChange={setApp}
          />
        ) : null}

        {selected === "support" ? (
          <SupportEditor value={support} onChange={setSupport} />
        ) : null}

        {selected === "business_certificate" ? (
          <BusinessCertificateEditor
            value={settings.business_certificate}
            onChange={updateBusinessCertificate}
          />
        ) : null}

        {selected === "social" ? (
          <SocialEditor value={social} onChange={setSocial} />
        ) : null}

        {selected === "app" ? (
          <AppEditor value={app} onChange={setApp} />
        ) : null}
      </SectionEditorShell>
    );
  }

  return (
    <div className="space-y-3">
      <SectionRow
        title="إعدادات رأس الصفحة"
        description="الشعار، أيقونة المتجر، البحث، والنص بجانب شريط البحث"
        onOpen={() => setSelected("header")}
      />

      <SectionRow
        title="الشريط الإعلاني"
        description="عنوان الإعلان، المحتوى، الرابط، تاريخ الانتهاء، الألوان، وصفحات الظهور"
        onOpen={() => setSelected("announcement")}
      />

      <SectionRow
        title="إعدادات تذييل الصفحة"
        description="عنوان المساعدة، مركز المساعدة، لون الشريط، لون النص، الحقوق، السجل التجاري، والرقم الضريبي"
        onOpen={() => setSelected("footer")}
      />

      <SectionRow
        title="قنوات خدمة العملاء"
        description="رقم الجوال، الواتساب، التليجرام، والبريد الإلكتروني"
        onOpen={() => setSelected("support")}
      />

      <SectionRow
        title="شهادة منصة الأعمال"
        description="إظهار شهادة أو صورة اعتماد في التذييل"
        onOpen={() => setSelected("business_certificate")}
      />

      <SectionRow
        title="حسابات التواصل الاجتماعي"
        description="انستغرام، إكس، سناب شات، تيك توك، يوتيوب، فيسبوك"
        onOpen={() => setSelected("social")}
      />

      <SectionRow
        title="تطبيق المتجر"
        description="روابط تطبيق iOS وأندرويد"
        onOpen={() => setSelected("app")}
      />
    </div>
  );
}

function getSectionTitle(key: SectionKey) {
  if (key === "header") return "إعدادات رأس الصفحة";
  if (key === "announcement") return "الشريط الإعلاني";
  if (key === "footer") return "إعدادات تذييل الصفحة";
  if (key === "support") return "قنوات خدمة العملاء";
  if (key === "business_certificate") return "شهادة منصة الأعمال";
  if (key === "social") return "حسابات التواصل الاجتماعي";
  if (key === "app") return "تطبيق المتجر";
  return "";
}

function SectionRow({
  title,
  description,
  onOpen,
}: {
  title: string;
  description?: string;
  onOpen: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-3 py-3 shadow-sm">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-2 text-right"
      >
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50">
          ‹
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-gray-900">
            {title}
          </span>

          {description ? (
            <span className="mt-1 block truncate text-[12px] text-gray-500">
              {description}
            </span>
          ) : null}
        </span>
      </button>

      <button
        type="button"
        onClick={onOpen}
        className="mr-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
        title="إعدادات"
      >
        ⚙
      </button>
    </div>
  );
}

function SectionEditorShell({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          ← رجوع
        </button>

        <div className="text-right">
          <div className="text-xs text-slate-400">أنت الآن تخصص</div>
          <div className="text-lg font-bold text-slate-900">{title}</div>
          <div className="mt-1 text-sm leading-7 text-slate-500">
            عدّل البيانات ثم اضغط زر الحفظ الموجود أعلى محرر الثيم.
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-4">{children}</div>
      </div>
    </div>
  );
}

function HeaderSettingsEditor({
  value,
  profile,
  onChange,
  onProfileChange,
}: {
  value: HeaderAndFooterSettings["header"];
  profile: ProfileState;
  onChange: (patch: Partial<HeaderAndFooterSettings["header"]>) => void;
  onProfileChange: (value: ProfileState) => void;
}) {
  return (
    <>
      <TextField
        label="اسم المتجر"
        value={profile.store_name}
        onChange={(v) =>
          onProfileChange({
            ...profile,
            store_name: v,
          })
        }
        placeholder="مثال: متجر درب"
      />

      <TextareaField
        label="وصف المتجر"
        value={profile.description}
        onChange={(v) =>
          onProfileChange({
            ...profile,
            description: v,
          })
        }
        placeholder="وصف مختصر يظهر في بيانات المتجر و SEO"
      />

      <ImageUploadField
        label="شعار المتجر"
        description="الصورة التي تظهر في رأس الصفحة."
        value={profile.logo_url}
        onChange={(url) =>
          onProfileChange({
            ...profile,
            logo_url: url,
          })
        }
      />

      <ImageUploadField
        label="أيقونة المتجر"
        description="الأيقونة الصغيرة favicon التي تظهر في تبويب المتصفح."
        value={profile.favicon_url}
        onChange={(url) =>
          onProfileChange({
            ...profile,
            favicon_url: url,
          })
        }
      />

      <SwitchField
        label="إظهار البحث"
        checked={value.search_enabled}
        onChange={(v) => onChange({ search_enabled: v })}
      />

      <SwitchField
        label="إظهار النص بجانب الهيدر"
        checked={value.slogan_enabled}
        onChange={(v) => onChange({ slogan_enabled: v })}
      />

      <ThemeIconPickerField
        label="أيقونة النص بجانب الهيدر"
        value={value.slogan_icon}
        onChange={(v) => onChange({ slogan_icon: v })}
      />

      <TextField
        label="النص بجانب الهيدر"
        value={value.slogan_text}
        onChange={(v) => onChange({ slogan_text: v })}
        placeholder="مثال: موقع التسوق الأول لمنتجاتك المميزة"
      />
    </>
  );
}

function AnnouncementEditor({
  value,
  products,
  categories,
  onChange,
}: {
  value: HeaderAndFooterSettings["announcement"];
  products: StoreReferenceOption[];
  categories: StoreReferenceOption[];
  onChange: (patch: Partial<HeaderAndFooterSettings["announcement"]>) => void;
}) {
  function updateLinkType(nextType: AnnouncementLinkType) {
    onChange({
      link_type: nextType,
      link_value: "",
      link_label: "",
      link: "",
    });
  }

  function updateLinkValue(nextValue: string, nextLabel = "") {
    onChange({
      link_value: nextValue,
      link_label: nextLabel,
      link: nextValue,
    });
  }

  return (
    <>
      <SwitchField
        label="تفعيل الشريط الإعلاني"
        checked={value.enabled}
        onChange={(v) => onChange({ enabled: v })}
      />

      <SelectField
        label="أيقونة الإعلان"
        value={value.icon}
        onChange={(v) => onChange({ icon: v })}
        options={[
          { value: "Notification01", label: "جرس / تنبيه" },
          { value: "Discount", label: "خصم" },
          { value: "SaleTag01", label: "وسم تخفيض" },
          { value: "Gift", label: "هدية" },
          { value: "TruckDelivery", label: "شحن" },
          { value: "InformationCircle", label: "معلومة" },
        ]}
      />

      <TextField
        label="عنوان الإعلان"
        value={value.title}
        onChange={(v) =>
          onChange({
            title: v,
          })
        }
        placeholder="مثال: إعلان جديد"
      />

      <TextareaField
        label="محتوى الإعلان"
        value={value.content}
        onChange={(v) =>
          onChange({
            content: v,
            text: v,
          })
        }
        placeholder="مثال: خصم 20% على منتجات مختارة"
      />

      <SelectField
        label="نوع الرابط"
        value={value.link_type}
        onChange={(v) => updateLinkType(v as AnnouncementLinkType)}
        options={[
          { value: "none", label: "بدون رابط" },
          { value: "product", label: "رابط منتج" },
          { value: "category", label: "رابط تصنيف" },
          { value: "discounts", label: "رابط التخفيضات" },
          { value: "external", label: "رابط خارجي" },
          { value: "page", label: "صفحة تعريفية" },
        ]}
      />

      {value.link_type === "product" ? (
        <SelectField
          label="اختر المنتج"
          value={value.link_value}
          onChange={(v) => {
            const item = products.find((x) => x.value === v);
            updateLinkValue(v, item?.label || "");
          }}
          options={[
            { value: "", label: "اختر منتج" },
            ...products.map((p) => ({
              value: p.value,
              label: p.label,
            })),
          ]}
        />
      ) : null}

      {value.link_type === "category" ? (
        <SelectField
          label="اختر التصنيف"
          value={value.link_value}
          onChange={(v) => {
            const item = categories.find((x) => x.value === v);
            updateLinkValue(v, item?.label || "");
          }}
          options={[
            { value: "", label: "اختر تصنيف" },
            ...categories.map((c) => ({
              value: c.value,
              label: c.label,
            })),
          ]}
        />
      ) : null}

      {value.link_type === "discounts" ? (
        <TextField
          label="رابط التخفيضات"
          value={value.link_value || "/discounts"}
          onChange={(v) => updateLinkValue(v)}
          placeholder="/discounts"
          dir="ltr"
        />
      ) : null}

      {value.link_type === "external" ? (
        <TextField
          label="الرابط الخارجي"
          value={value.link_value}
          onChange={(v) => updateLinkValue(v)}
          placeholder="https://example.com"
          dir="ltr"
        />
      ) : null}

      {value.link_type === "page" ? (
        <TextField
          label="رابط الصفحة التعريفية"
          value={value.link_value}
          onChange={(v) => updateLinkValue(v)}
          placeholder="/pages/about-us"
          dir="ltr"
        />
      ) : null}

      <TextField
        label="تاريخ انتهاء الإعلان"
        value={value.ends_at}
        onChange={(v) => onChange({ ends_at: v })}
        placeholder="2026-12-31"
        dir="ltr"
      />

      <CheckboxGroupField
        label="صفحات ظهور الإعلان"
        value={value.pages}
        onChange={(pages) => onChange({ pages })}
        options={[
          { value: "home", label: "الرئيسية" },
          { value: "category", label: "صفحات التصنيفات" },
          { value: "product", label: "صفحات المنتجات" },
          { value: "cart", label: "السلة" },
          { value: "account", label: "حساب العميل" },
        ]}
      />

      <ColorField
        label="لون الخط"
        value={value.text_color}
        onChange={(v) => onChange({ text_color: v })}
      />

      <ColorField
        label="لون الخلفية"
        value={value.background_color}
        onChange={(v) => onChange({ background_color: v })}
      />
    </>
  );
}

function FooterSettingsEditor({
  value,
  app,
  onChange,
  onAppChange,
}: {
  value: HeaderAndFooterSettings["footer"];
  app: AppState;
  onChange: (patch: Partial<HeaderAndFooterSettings["footer"]>) => void;
  onAppChange: (value: AppState) => void;
}) {
  return (
    <>
      <TextField
        label="عنوان قسم المساعدة"
        value={value.help_title}
        onChange={(v) => onChange({ help_title: v })}
        placeholder="هل تحتاج مساعدة ؟"
      />

      <TextareaField
        label="وصف قسم المساعدة"
        value={value.help_subtitle}
        onChange={(v) => onChange({ help_subtitle: v })}
        placeholder="يمكنك الحصول على المساعدة من خلال وسائل المساعدة المختلفة"
      />

      <TextField
        label="عنوان مركز المساعدة"
        value={value.help_center_title}
        onChange={(v) => onChange({ help_center_title: v })}
        placeholder="مركز المساعدة"
      />

      <TextField
        label="رابط مركز المساعدة"
        value={value.help_center_url}
        onChange={(v) => onChange({ help_center_url: v })}
        placeholder="help.niceonesa.com"
        dir="ltr"
      />

      <ColorField
        label="لون شريط المساعدة"
        value={value.help_background_color}
        onChange={(v) => onChange({ help_background_color: v })}
      />

      <ColorField
        label="لون نص شريط المساعدة"
        value={value.help_text_color}
        onChange={(v) => onChange({ help_text_color: v })}
      />

      <TextField
        label="نص الحقوق"
        value={value.copyright_text}
        onChange={(v) => onChange({ copyright_text: v })}
        placeholder="جميع الحقوق محفوظة"
      />

      <TextField
        label="رقم السجل التجاري"
        value={value.commercial_register}
        onChange={(v) => onChange({ commercial_register: v })}
        placeholder="1010705691"
        dir="ltr"
      />

      <TextField
        label="الرقم الضريبي"
        value={value.tax_number}
        onChange={(v) => onChange({ tax_number: v })}
        placeholder="310534949600003"
        dir="ltr"
      />

      <SwitchField
        label="إظهار شعارات طرق الدفع"
        checked={value.show_payments}
        onChange={(v) => onChange({ show_payments: v })}
      />

      <SwitchField
        label="إظهار روابط التطبيق"
        checked={value.show_apps}
        onChange={(v) => onChange({ show_apps: v })}
      />

      <SwitchField
        label="إظهار حسابات التواصل"
        checked={value.show_social}
        onChange={(v) => onChange({ show_social: v })}
      />

      <TextField
        label="رابط تطبيق iOS"
        value={app.ios}
        onChange={(v) => onAppChange({ ...app, ios: v })}
        placeholder="https://apps.apple.com/..."
        dir="ltr"
      />

      <TextField
        label="رابط تطبيق أندرويد"
        value={app.android}
        onChange={(v) => onAppChange({ ...app, android: v })}
        placeholder="https://play.google.com/..."
        dir="ltr"
      />
    </>
  );
}

function SupportEditor({
  value,
  onChange,
}: {
  value: SupportState;
  onChange: (value: SupportState) => void;
}) {
  return (
    <>
      <TextField
        label="رقم الجوال"
        value={value.phone}
        onChange={(v) => onChange({ ...value, phone: v })}
        placeholder="0500000000"
        dir="ltr"
      />

      <TextField
        label="رقم واتساب"
        value={value.whatsapp}
        onChange={(v) => onChange({ ...value, whatsapp: v })}
        placeholder="+966500000000"
        dir="ltr"
      />

      <TextField
        label="تيليجرام"
        value={value.telegram}
        onChange={(v) => onChange({ ...value, telegram: v })}
        placeholder="username أو رابط"
        dir="ltr"
      />

      <TextField
        label="البريد الإلكتروني"
        value={value.email}
        onChange={(v) => onChange({ ...value, email: v })}
        placeholder="cs@example.com"
        dir="ltr"
      />

      {value.whatsapp_pending ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-right text-sm text-amber-800">
          يوجد رقم واتساب بانتظار التحقق:{" "}
          <span dir="ltr">{value.whatsapp_pending}</span>
        </div>
      ) : null}
    </>
  );
}

function BusinessCertificateEditor({
  value,
  onChange,
}: {
  value: HeaderAndFooterSettings["business_certificate"];
  onChange: (
    patch: Partial<HeaderAndFooterSettings["business_certificate"]>,
  ) => void;
}) {
  return (
    <>
      <SwitchField
        label="إظهار شهادة منصة الأعمال"
        checked={value.enabled}
        onChange={(v) => onChange({ enabled: v })}
      />

      <TextField
        label="العنوان"
        value={value.title}
        onChange={(v) => onChange({ title: v })}
        placeholder="شهادة منصة الأعمال"
      />

      <ImageUploadField
        label="صورة الشهادة"
        description="ارفع صورة الشهادة أو الاعتماد."
        value={value.image_url}
        onChange={(url) => onChange({ image_url: url })}
      />

      <TextField
        label="رابط الشهادة"
        value={value.link}
        onChange={(v) => onChange({ link: v })}
        placeholder="https://..."
        dir="ltr"
      />
    </>
  );
}

function SocialEditor({
  value,
  onChange,
}: {
  value: SocialState;
  onChange: (value: SocialState) => void;
}) {
  return (
    <>
      <TextField
        label="حساب انستغرام"
        value={value.instagram}
        onChange={(v) => onChange({ ...value, instagram: v })}
        placeholder="elyaia أو رابط الحساب"
        dir="ltr"
      />

      <TextField
        label="حساب إكس"
        value={value.x}
        onChange={(v) => onChange({ ...value, x: v })}
        placeholder="elyaia أو رابط الحساب"
        dir="ltr"
      />

      <TextField
        label="حساب سناب شات"
        value={value.snapchat}
        onChange={(v) => onChange({ ...value, snapchat: v })}
        placeholder="elyaia أو رابط الحساب"
        dir="ltr"
      />

      <TextField
        label="حساب تيك توك"
        value={value.tiktok}
        onChange={(v) => onChange({ ...value, tiktok: v })}
        placeholder="elyaia أو رابط الحساب"
        dir="ltr"
      />

      <TextField
        label="قناة يوتيوب"
        value={value.youtube}
        onChange={(v) => onChange({ ...value, youtube: v })}
        placeholder="رابط قناة يوتيوب"
        dir="ltr"
      />

      <TextField
        label="حساب فيسبوك"
        value={value.facebook}
        onChange={(v) => onChange({ ...value, facebook: v })}
        placeholder="رابط فيسبوك"
        dir="ltr"
      />
    </>
  );
}

function AppEditor({
  value,
  onChange,
}: {
  value: AppState;
  onChange: (value: AppState) => void;
}) {
  return (
    <>
      <TextField
        label="رابط تطبيق iOS"
        value={value.ios}
        onChange={(v) => onChange({ ...value, ios: v })}
        placeholder="https://apps.apple.com/..."
        dir="ltr"
      />

      <TextField
        label="رابط تطبيق أندرويد"
        value={value.android}
        onChange={(v) => onChange({ ...value, android: v })}
        placeholder="https://play.google.com/store/apps/details?id=..."
        dir="ltr"
      />
    </>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  dir = "rtl",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  dir?: "rtl" | "ltr";
}) {
  return (
    <div className="space-y-2 text-right">
      <div className="text-sm font-medium text-slate-800">{label}</div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir={dir}
        className={[
          "h-11 w-full rounded-xl border border-slate-300 px-3 outline-none",
          dir === "ltr" ? "text-left" : "text-right",
        ].join(" ")}
      />
    </div>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2 text-right">
      <div className="text-sm font-medium text-slate-800">{label}</div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[110px] w-full rounded-xl border border-slate-300 px-3 py-3 text-right outline-none"
      />
    </div>
  );
}

function SwitchField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex h-12 items-center justify-between rounded-xl border border-slate-300 bg-white px-3">
      <span className="text-sm text-slate-700">{label}</span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-2 text-right">
      <div className="text-sm font-medium text-slate-800">{label}</div>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-right outline-none"
      >
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function CheckboxGroupField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  options: Array<{ value: string; label: string }>;
}) {
  const current = Array.isArray(value) ? value : [];

  return (
    <div className="space-y-2 text-right">
      <div className="text-sm font-medium text-slate-800">{label}</div>

      <div className="space-y-2 rounded-xl border border-slate-300 bg-white p-3">
        {options.map((option) => {
          const checked = current.includes(option.value);

          return (
            <label
              key={`${label}-${option.value}`}
              className="flex items-center justify-between gap-3 rounded-lg px-2 py-1"
            >
              <span className="text-sm text-slate-700">{option.label}</span>

              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange([...current, option.value]);
                  } else {
                    onChange(current.filter((x) => x !== option.value));
                  }
                }}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2 text-right">
      <div className="text-sm font-medium text-slate-800">{label}</div>

      <input
        type="color"
        value={value || "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-2 py-1 outline-none"
      />
    </div>
  );
}

function ImageUploadField({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function onPickFile(file?: File | null) {
    if (!file) return;

    try {
      setUploading(true);
      const url = await uploadThemeEditorFile(file);
      onChange(url);
    } catch {
      window.alert("تعذر رفع الصورة");
    } finally {
      setUploading(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div className="space-y-2 text-right">
      <div className="text-sm font-medium text-slate-800">{label}</div>

      {description ? (
        <div className="text-xs leading-6 text-slate-500">{description}</div>
      ) : null}

      <div className="rounded-2xl border border-slate-300 bg-white p-3">
        {value ? (
          <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <img
              src={value}
              alt={label}
              className="h-40 w-full bg-white object-contain"
            />
          </div>
        ) : (
          <div className="mb-3 flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
            لا توجد صورة
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {uploading ? "جارٍ الرفع..." : value ? "تغيير الصورة" : "رفع صورة"}
          </button>

          {value ? (
            <button
              type="button"
              onClick={() => onChange("")}
              disabled={uploading}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-60"
            >
              حذف الصورة
            </button>
          ) : null}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void onPickFile(e.target.files?.[0] || null)}
        />

        {value ? (
          <div
            className="mt-3 break-all text-left text-xs leading-6 text-slate-500"
            dir="ltr"
          >
            {value}
          </div>
        ) : null}
      </div>
    </div>
  );
}