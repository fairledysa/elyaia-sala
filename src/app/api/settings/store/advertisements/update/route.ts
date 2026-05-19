// FILE: apps/merchant/src/app/api/settings/store/advertisements/update/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type AnnouncementLinkType =
  | "none"
  | "product"
  | "category"
  | "discounts"
  | "external"
  | "page";

type AdvertisementSettings = {
  id: string;
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
  text: string;
  link: string;
  sort_order: number;
};

const DEFAULT_ADVERTISEMENT: AdvertisementSettings = {
  id: "",
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
  sort_order: 10,
};

function s(value: unknown) {
  return String(value ?? "").trim();
}

function bool(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const v = value.trim().toLowerCase();

    if (["true", "1", "yes", "on"].includes(v)) return true;
    if (["false", "0", "no", "off"].includes(v)) return false;
  }

  return fallback;
}

function safeObject(value: any): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {}
  }

  return {};
}

function normalizeStringArray(value: any): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => s(item)).filter(Boolean);
  }

  if (typeof value === "string") {
    const raw = s(value);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        return parsed.map((item) => s(item)).filter(Boolean);
      }
    } catch {}

    return raw
      .split(",")
      .map((item) => s(item))
      .filter(Boolean);
  }

  return [];
}

function normalizeLinkType(value: unknown): AnnouncementLinkType {
  const v = s(value);

  if (v === "product") return "product";
  if (v === "category") return "category";
  if (v === "discounts") return "discounts";
  if (v === "external") return "external";
  if (v === "page") return "page";

  return "none";
}

function makeId() {
  return randomUUID();
}

function normalizeAdvertisement(value: any, index = 0): AdvertisementSettings {
  const source = safeObject(value);

  const content = s(source.content) || s(source.text);
  const linkValue = s(source.link_value) || s(source.link);
  const sortOrder = Number(source.sort_order ?? source.sortOrder ?? 0);

  return {
    id: s(source.id) || makeId(),

    enabled: bool(source.enabled, DEFAULT_ADVERTISEMENT.enabled),

    icon: s(source.icon) || DEFAULT_ADVERTISEMENT.icon,
    title: s(source.title),
    content,

    link_type: normalizeLinkType(source.link_type),
    link_value: linkValue,
    link_label: s(source.link_label),

    ends_at: s(source.ends_at),
    pages: normalizeStringArray(source.pages),

    text_color: s(source.text_color) || DEFAULT_ADVERTISEMENT.text_color,
    background_color:
      s(source.background_color) || DEFAULT_ADVERTISEMENT.background_color,

    text: content,
    link: linkValue,

    sort_order:
      Number.isFinite(sortOrder) && sortOrder > 0 ? sortOrder : (index + 1) * 10,
  };
}

function hasAdvertisementContent(value: AdvertisementSettings) {
  return Boolean(
    value.enabled ||
      s(value.title) ||
      s(value.content) ||
      s(value.link_value) ||
      s(value.ends_at) ||
      value.pages.length > 0,
  );
}

function normalizeAdvertisements(value: any): AdvertisementSettings[] {
  const rawList = Array.isArray(value) ? value : [];

  return rawList
    .map((item: any, index: number) => normalizeAdvertisement(item, index))
    .filter(hasAdvertisementContent)
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
}

function firstLegacyAdvertisement(items: AdvertisementSettings[]) {
  return (
    items.find((item) => item.enabled && hasAdvertisementContent(item)) ||
    items.find(hasAdvertisementContent) ||
    DEFAULT_ADVERTISEMENT
  );
}

async function createAuthClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    },
  );
}

async function resolveStoreId(authUserId: string, email?: string | null) {
  const sb = supabaseAdmin();

  const byAuth = await sb
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", authUserId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (byAuth.data?.store_id) return String(byAuth.data.store_id);

  const cleanEmail = s(email).toLowerCase();
  if (!cleanEmail) return null;

  const byEmail = await sb
    .from("store_users")
    .select("store_id")
    .ilike("email", cleanEmail)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return byEmail.data?.store_id ? String(byEmail.data.store_id) : null;
}

async function resolvePublishedThemeVersion(storeId: string) {
  const sb = supabaseAdmin();

  const published = await sb
    .from("store_theme_versions")
    .select("id,store_id,theme_id,status,is_default,last_updated_at,created_at")
    .eq("store_id", storeId)
    .eq("status", "published")
    .order("is_default", { ascending: false })
    .order("last_updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!published.error && published.data?.id) {
    return published.data;
  }

  const fallback = await sb
    .from("store_theme_versions")
    .select("id,store_id,theme_id,status,is_default,last_updated_at,created_at")
    .eq("store_id", storeId)
    .order("is_default", { ascending: false })
    .order("last_updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!fallback.error && fallback.data?.id) {
    return fallback.data;
  }

  return null;
}

function themeOptionsSlug(versionId: string) {
  return `theme_version:${versionId}:theme_options`;
}

async function getThemeOptionsRow(storeId: string, versionId: string) {
  const sb = supabaseAdmin();
  const slug = themeOptionsSlug(versionId);

  const { data, error } = await sb
    .from("store_settings")
    .select("id,slug,value,updated_at,created_at")
    .eq("store_id", storeId)
    .eq("slug", slug)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data ?? null;
}

export async function POST(req: Request) {
  try {
    const auth = await createAuthClient();

    const {
      data: { user },
    } = await auth.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHENTICATED" },
        { status: 401 },
      );
    }

    const storeId = await resolveStoreId(user.id, user.email);

    if (!storeId) {
      return NextResponse.json(
        { ok: false, error: "NO_STORE" },
        { status: 403 },
      );
    }

    const version = await resolvePublishedThemeVersion(storeId);

    if (!version?.id) {
      return NextResponse.json(
        { ok: false, error: "THEME_VERSION_NOT_FOUND" },
        { status: 404 },
      );
    }

    const body = await req.json().catch(() => ({}));

    const bodyAdvertisements = Array.isArray(body?.advertisements)
      ? body.advertisements
      : Array.isArray(body?.items)
        ? body.items
        : [];

    const advertisements = normalizeAdvertisements(bodyAdvertisements);
    const announcement = firstLegacyAdvertisement(advertisements);

    const versionId = String(version.id);
    const slug = themeOptionsSlug(versionId);
    const existing = await getThemeOptionsRow(storeId, versionId);

    const currentThemeOptions = safeObject(existing?.value);
    const currentHeaderAndFooter = safeObject(
      currentThemeOptions.header_and_footer,
    );

    const nextThemeOptions = {
      ...currentThemeOptions,
      header_and_footer: {
        ...currentHeaderAndFooter,

        advertisements,
        announcement,
      },
    };

    const sb = supabaseAdmin();

    if (existing?.id) {
      const { error } = await sb
        .from("store_settings")
        .update({
          value: nextThemeOptions,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .eq("store_id", storeId);

      if (error) throw error;
    } else {
      const { error } = await sb.from("store_settings").insert({
        store_id: storeId,
        slug,
        type: "json",
        value: nextThemeOptions,
      });

      if (error) throw error;
    }

    const saved = await getThemeOptionsRow(storeId, versionId);
    const savedOptions = safeObject(saved?.value);
    const savedHeaderAndFooter = safeObject(savedOptions.header_and_footer);

    const savedAdvertisements = normalizeAdvertisements(
      Array.isArray(savedHeaderAndFooter.advertisements)
        ? savedHeaderAndFooter.advertisements
        : [],
    );

    const savedAnnouncement = firstLegacyAdvertisement(savedAdvertisements);

    return NextResponse.json(
      {
        ok: true,
        advertisements: savedAdvertisements,
        items: savedAdvertisements,
        announcement: savedAnnouncement,
        advertisement: savedAnnouncement,
        meta: {
          store_id: storeId,
          version_id: versionId,
          setting_slug: slug,
          updated_at: saved?.updated_at ?? null,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "UNKNOWN_ERROR" },
      { status: 500 },
    );
  }
}