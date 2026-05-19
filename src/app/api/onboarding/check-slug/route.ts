// apps/merchant/src/app/api/onboarding/check-slug/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function slugify(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildSuggestions(base: string) {
  // اقتراحات بسيطة مثل Gmail: أرقام وتواريخ قصيرة
  const year = new Date().getFullYear();
  const candidates = [
    `${base}1`,
    `${base}2`,
    `${base}3`,
    `${base}-1`,
    `${base}-${year}`,
    `${base}-${year.toString().slice(-2)}`,
  ];
  // إزالة التكرار
  return Array.from(new Set(candidates)).slice(0, 6);
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
    }
  );

  const body = await req.json().catch(() => ({}));
  const raw = String(body.slug || "");
  const slug = slugify(raw);

  if (slug.length < 3) {
    return NextResponse.json({
      ok: true,
      slug,
      available: false,
      reason: "TOO_SHORT",
      suggestions: [],
    });
  }

  // فحص هل الـ slug موجود في stores (unique عندك)
  const { data: existing, error } = await supabase
    .from("stores")
    .select("id")
    .eq("slug", slug)
    .limit(1);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  const taken = (existing?.length ?? 0) > 0;

  // نجهز اقتراحات
  const suggestions = buildSuggestions(slug);

  // نفلتر الاقتراحات: نشيل اللي محجوزة
  const { data: takenOnes } = await supabase
    .from("stores")
    .select("slug")
    .in("slug", suggestions);

  const takenSet = new Set((takenOnes || []).map((r: any) => r.slug));
  const filteredSuggestions = suggestions.filter((s) => !takenSet.has(s));

  return NextResponse.json({
    ok: true,
    slug,
    available: !taken,
    suggestions: taken ? filteredSuggestions : [],
  });
}
