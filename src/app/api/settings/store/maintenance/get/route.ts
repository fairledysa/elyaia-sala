// FILE: apps/merchant/src/app/api/settings/store/maintenance/get/route.ts

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const DEFAULT_MAINTENANCE_SETTINGS = {
  enabled: false,
  title: "المتجر مغلق حاليًا",
  message:
    "عذرًا عزيزي العميل، المتجر حاليًا قيد الصيانة وسنعاود العمل خلال وقت قريب.",
  show_contact_methods: true,
};

async function resolveStoreId(
  supabase: any,
  authUserId: string,
  email?: string | null,
) {
  const r1 = await supabase
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", authUserId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (r1.data?.store_id) return r1.data.store_id as string;

  const e = String(email || "").toLowerCase().trim();
  if (!e) return null;

  const r2 = await supabase
    .from("store_users")
    .select("store_id")
    .ilike("email", e)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (r2.data?.store_id as string) || null;
}

function normalizeSettings(value: any) {
  const source = value && typeof value === "object" ? value : {};

  return {
    enabled: Boolean(source.enabled),
    title: String(source.title ?? DEFAULT_MAINTENANCE_SETTINGS.title),
    message: String(source.message ?? DEFAULT_MAINTENANCE_SETTINGS.message),
    show_contact_methods:
      typeof source.show_contact_methods === "boolean"
        ? source.show_contact_methods
        : DEFAULT_MAINTENANCE_SETTINGS.show_contact_methods,
  };
}

export async function GET() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
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

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHENTICATED" },
      { status: 401 },
    );
  }

  const store_id = await resolveStoreId(supabase, user.id, user.email);

  if (!store_id) {
    return NextResponse.json(
      { ok: false, error: "NO_STORE" },
      { status: 403 },
    );
  }

  const { data, error } = await supabase
    .from("store_settings")
    .select("value")
    .eq("store_id", store_id)
    .eq("slug", "maintenance")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      settings: normalizeSettings(data?.value),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}