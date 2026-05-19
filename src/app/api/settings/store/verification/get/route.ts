// FILE: apps/merchant/src/app/api/settings/store/verification/get/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function resolveStoreId(supabase: any, authUserId: string, email?: string | null) {
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

const DEFAULT_VALUE = {
  status: "incomplete",
  owner: {
    entity_type: "company", // company | individual
    id_number: "",
    dob: "",
    id_image_url: "",
  },
  cr: {
    cr_number: "",
    cr_image_url: "",
  },
  submitted_at: null,
};

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
    }
  );

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });

  const store_id = await resolveStoreId(supabase, user.id, user.email);
  if (!store_id) return NextResponse.json({ ok: false, error: "NO_STORE" }, { status: 403 });

  const { data, error } = await supabase
    .from("store_settings")
    .select("value")
    .eq("store_id", store_id)
    .eq("slug", "store.verification")
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    store_id,
    verification: data?.value || DEFAULT_VALUE,
  });
}
