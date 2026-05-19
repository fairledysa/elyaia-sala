// FILE: apps/merchant/src/app/api/settings/store/size-guides/update/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const SETTING_SLUG = "store:size_guides";

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
  if (Array.isArray(value)) return value.map((item) => s(item)).filter(Boolean);
  return [];
}

function normalizeSizeGuide(value: any, fallbackIndex = 0) {
  const source = safeObject(value);
  const sortOrder = Number(source.sort_order ?? source.sortOrder ?? 0);

  return {
    id: s(source.id) || `size-guide-${Date.now()}-${fallbackIndex + 1}`,
    enabled: bool(source.enabled, true),
    title: s(source.title),
    content: s(source.content),
    category_ids: normalizeStringArray(
      source.category_ids ?? source.categoryIds ?? source.categories,
    ),
    category_labels: normalizeStringArray(
      source.category_labels ?? source.categoryLabels,
    ),
    sort_order:
      Number.isFinite(sortOrder) && sortOrder > 0
        ? sortOrder
        : (fallbackIndex + 1) * 10,
  };
}

function hasGuideContent(value: ReturnType<typeof normalizeSizeGuide>) {
  return Boolean(
    value.enabled ||
      s(value.title) ||
      s(value.content) ||
      value.category_ids.length > 0,
  );
}

function normalizeSizeGuides(value: any) {
  const source = safeObject(value);

  const rawList: any[] = Array.isArray(source.size_guides)
    ? source.size_guides
    : Array.isArray(source.guides)
      ? source.guides
      : Array.isArray(source.items)
        ? source.items
        : [];

  return rawList
    .map((item, index) => normalizeSizeGuide(item, index))
    .filter(hasGuideContent)
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
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

async function getSizeGuidesRow(storeId: string) {
  const sb = supabaseAdmin();

  const { data, error } = await sb
    .from("store_settings")
    .select("id,slug,value,updated_at,created_at")
    .eq("store_id", storeId)
    .eq("slug", SETTING_SLUG)
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

    const body = await req.json().catch(() => ({}));
    const sizeGuides = normalizeSizeGuides(body);

    const payload = {
      size_guides: sizeGuides,
      guides: sizeGuides,
      items: sizeGuides,
    };

    const existing = await getSizeGuidesRow(storeId);
    const sb = supabaseAdmin();

    if (existing?.id) {
      const { error } = await sb
        .from("store_settings")
        .update({
          value: payload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .eq("store_id", storeId);

      if (error) throw error;
    } else {
      const { error } = await sb.from("store_settings").insert({
        store_id: storeId,
        slug: SETTING_SLUG,
        type: "json",
        value: payload,
      });

      if (error) throw error;
    }

    const saved = await getSizeGuidesRow(storeId);
    const savedValue = safeObject(saved?.value);
    const savedGuides = normalizeSizeGuides(savedValue);

    return NextResponse.json(
      {
        ok: true,
        size_guides: savedGuides,
        guides: savedGuides,
        items: savedGuides,
        meta: {
          store_id: storeId,
          setting_slug: SETTING_SLUG,
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