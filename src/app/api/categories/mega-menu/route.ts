// FILE: apps/merchant/src/app/api/categories/mega-menu/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";

type MegaMenuBanner = {
  id: string;
  title?: string;
  image_url: string;
  href?: string;
  sort_order: number;
  is_enabled: boolean;
};

type MegaMenuCategorySettings = {
  enabled: boolean;
  layout: "links_only" | "links_with_banners";
  banners: MegaMenuBanner[];
};

type MegaMenuValue = {
  categories: Record<string, MegaMenuCategorySettings>;
};

const SETTING_SLUG = "mega_menu";

function defaultValue(): MegaMenuValue {
  return {
    categories: {},
  };
}

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

  const { data, error } = await supabase
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (error || !data) throw new Error("STORE_NOT_FOUND");

  return data.store_id;
}

function cleanBanner(input: any, index: number): MegaMenuBanner | null {
  const imageUrl =
    typeof input?.image_url === "string" ? input.image_url.trim() : "";

  if (!imageUrl) return null;

  return {
    id:
      typeof input?.id === "string" && input.id.trim()
        ? input.id.trim()
        : crypto.randomUUID(),
    title: typeof input?.title === "string" ? input.title.trim() : "",
    image_url: imageUrl,
    href: typeof input?.href === "string" ? input.href.trim() : "",
    sort_order: Number.isFinite(Number(input?.sort_order))
      ? Number(input.sort_order)
      : index,
    is_enabled:
      typeof input?.is_enabled === "boolean" ? input.is_enabled : true,
  };
}

function cleanCategorySettings(input: any): MegaMenuCategorySettings {
  const layout =
    input?.layout === "links_with_banners" ? "links_with_banners" : "links_only";

  const banners = Array.isArray(input?.banners)
    ? input.banners
        .map((item: any, index: number) => cleanBanner(item, index))
        .filter(Boolean)
    : [];

  return {
    enabled: Boolean(input?.enabled),
    layout,
    banners: banners.sort(
      (a: MegaMenuBanner, b: MegaMenuBanner) =>
        (a.sort_order ?? 0) - (b.sort_order ?? 0),
    ),
  };
}

function cleanValue(input: any): MegaMenuValue {
  const categoriesInput =
    input && typeof input === "object" && input.categories
      ? input.categories
      : {};

  const categories: Record<string, MegaMenuCategorySettings> = {};

  for (const [categoryId, settings] of Object.entries(categoriesInput)) {
    if (!categoryId) continue;
    categories[categoryId] = cleanCategorySettings(settings);
  }

  return {
    categories,
  };
}

async function readMegaMenuSetting({
  sb,
  storeId,
}: {
  sb: ReturnType<typeof supabaseAdmin>;
  storeId: string;
}) {
  const { data, error } = await sb
    .from("store_settings")
    .select("id, value")
    .eq("store_id", storeId)
    .eq("slug", SETTING_SLUG)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return {
    id: data?.id ?? null,
    value: cleanValue(data?.value ?? defaultValue()),
  };
}

async function writeMegaMenuSetting({
  sb,
  storeId,
  value,
}: {
  sb: ReturnType<typeof supabaseAdmin>;
  storeId: string;
  value: MegaMenuValue;
}) {
  const current = await readMegaMenuSetting({ sb, storeId });
  const now = new Date().toISOString();

  if (current.id) {
    const { error } = await sb
      .from("store_settings")
      .update({
        value,
        type: "json",
        updated_at: now,
      })
      .eq("store_id", storeId)
      .eq("id", current.id);

    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await sb.from("store_settings").insert({
    store_id: storeId,
    slug: SETTING_SLUG,
    type: "json",
    value,
    created_at: now,
    updated_at: now,
  });

  if (error) throw new Error(error.message);
}

export async function GET() {
  try {
    const storeId = await getStoreIdFromSession();
    const sb = supabaseAdmin();

    const current = await readMegaMenuSetting({ sb, storeId });

    return NextResponse.json({
      data: current.value,
    });
  } catch (e: any) {
    const message = e?.message ?? "Unknown error";

    return NextResponse.json(
      { error: message },
      {
        status:
          message === "UNAUTHENTICATED"
            ? 401
            : message === "STORE_NOT_FOUND"
              ? 403
              : 500,
      },
    );
  }
}

export async function POST(req: Request) {
  try {
    const storeId = await getStoreIdFromSession();
    const body = await req.json();

    const sb = supabaseAdmin();

    const categoryId =
      typeof body?.category_id === "string" ? body.category_id.trim() : "";

    if (!categoryId) {
      return NextResponse.json(
        { error: "category_id required" },
        { status: 400 },
      );
    }

    const { data: category, error: categoryError } = await sb
      .from("categories")
      .select("id, parent_id")
      .eq("store_id", storeId)
      .eq("id", categoryId)
      .single();

    if (categoryError || !category) {
      return NextResponse.json(
        { error: "category not found" },
        { status: 404 },
      );
    }

    if (category.parent_id) {
      return NextResponse.json(
        { error: "Mega Menu only allowed for root categories" },
        { status: 400 },
      );
    }

    const current = await readMegaMenuSetting({ sb, storeId });

    const nextSettings = cleanCategorySettings(body?.settings ?? {});

    const nextValue: MegaMenuValue = {
      categories: {
        ...current.value.categories,
        [categoryId]: nextSettings,
      },
    };

    await writeMegaMenuSetting({
      sb,
      storeId,
      value: nextValue,
    });

    return NextResponse.json({
      data: nextValue,
      category: nextSettings,
    });
  } catch (e: any) {
    const message = e?.message ?? "Unknown error";

    return NextResponse.json(
      { error: message },
      {
        status:
          message === "UNAUTHENTICATED"
            ? 401
            : message === "STORE_NOT_FOUND"
              ? 403
              : 500,
      },
    );
  }
}