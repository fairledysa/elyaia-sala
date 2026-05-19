// FILE: apps/merchant/src/app/api/settings/seo/meta/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";

const SLUG = "seo.meta";

async function getStoreIdFromSession(): Promise<string> {
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
  if (!auth?.user) throw new Error("UNAUTHENTICATED");

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

function clampText(input: any, max: number) {
  const s = String(input ?? "").trim();
  if (!s) return "";
  return s.length > max ? s.slice(0, max) : s;
}

function parseUrlMode(input: any): 0 | 1 | 2 {
  const n = Number(input);
  if (n === 1) return 1;
  if (n === 2) return 2;
  return 0;
}

type SeoMetaValue = {
  title: string; // <= 70
  description: string; // <= 300
  keywords: string; // <= 150
  url_mode: 0 | 1 | 2;
};

function defaultSeoMeta(): SeoMetaValue {
  return {
    title: "",
    description: "",
    keywords: "",
    url_mode: 0,
  };
}

export async function GET() {
  try {
    const store_id = await getStoreIdFromSession();
    const sb = supabaseAdmin();

    const { data, error } = await sb
      .from("store_settings")
      .select("value,type,slug")
      .eq("store_id", store_id)
      .eq("slug", SLUG)
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    const base = defaultSeoMeta();
    const v = (
      data?.value && typeof data.value === "object" ? data.value : {}
    ) as Partial<SeoMetaValue>;

    const result: SeoMetaValue = {
      title: clampText(v.title, 70),
      description: clampText(v.description, 300),
      keywords: clampText(v.keywords, 150),
      url_mode: parseUrlMode(v.url_mode),
    };

    return NextResponse.json({ ok: true, data: result });
  } catch (e: any) {
    const msg = String(e?.message || "UNKNOWN_ERROR");
    const status =
      msg === "UNAUTHENTICATED" ? 401 : msg === "STORE_NOT_FOUND" ? 404 : 500;

    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const store_id = await getStoreIdFromSession();
    const body = await req.json().catch(() => ({}));

    const payload: SeoMetaValue = {
      title: clampText(body?.title, 70),
      description: clampText(body?.description, 300),
      keywords: clampText(body?.keywords, 150),
      url_mode: parseUrlMode(body?.url_mode),
    };

    const sb = supabaseAdmin();

    // ✅ يعتمد على unique(store_id, slug)
    const { data, error } = await sb
      .from("store_settings")
      .upsert(
        {
          store_id,
          slug: SLUG,
          type: "json",
          value: payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "store_id,slug" },
      )
      .select("slug,value,updated_at")
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ ok: true, data: data?.value ?? payload });
  } catch (e: any) {
    const msg = String(e?.message || "UNKNOWN_ERROR");
    const status =
      msg === "UNAUTHENTICATED" ? 401 : msg === "STORE_NOT_FOUND" ? 404 : 500;

    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
