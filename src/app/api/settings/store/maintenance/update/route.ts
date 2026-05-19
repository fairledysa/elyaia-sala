// FILE: apps/merchant/src/app/api/settings/store/maintenance/update/route.ts

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type MaintenanceBody = {
  enabled?: boolean;
  title?: string;
  message?: string;
  show_contact_methods?: boolean;
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

function cleanText(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

export async function POST(req: Request) {
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

  const body = (await req.json().catch(() => null)) as MaintenanceBody | null;

  if (!body) {
    return NextResponse.json(
      { ok: false, error: "INVALID_BODY" },
      { status: 400 },
    );
  }

  const title = cleanText(body.title, 120);
  const message = cleanText(body.message, 700);

  if (!title || !message) {
    return NextResponse.json(
      { ok: false, error: "TITLE_AND_MESSAGE_REQUIRED" },
      { status: 400 },
    );
  }

  const value = {
    enabled: Boolean(body.enabled),
    title,
    message,
    show_contact_methods: Boolean(body.show_contact_methods),
  };

  const now = new Date().toISOString();

  const { data: existing, error: existingError } = await supabase
    .from("store_settings")
    .select("id")
    .eq("store_id", store_id)
    .eq("slug", "maintenance")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      { ok: false, error: existingError.message },
      { status: 500 },
    );
  }

  if (existing?.id) {
    const { error } = await supabase
      .from("store_settings")
      .update({
        type: "json",
        value,
        updated_at: now,
      })
      .eq("id", existing.id)
      .eq("store_id", store_id);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase.from("store_settings").insert({
    store_id,
    slug: "maintenance",
    type: "json",
    value,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}