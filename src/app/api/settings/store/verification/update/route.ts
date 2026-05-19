// FILE: apps/merchant/src/app/api/settings/store/verification/update/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

// ✅ UPDATED: نخزن full_name/phone/notes عشان تظهر في صفحة verify
const DEFAULT_VALUE = {
  status: "incomplete",
  owner: {
    entity_type: "company",
    full_name: "",
    phone: "",
    id_number: "",
    dob: "",
    id_image_url: "",
  },
  cr: {
    cr_number: "",
    cr_image_url: "",
  },
  notes: "",
  submitted_at: null,
};

function mergeDeep(base: any, patch: any) {
  if (!patch || typeof patch !== "object") return base;
  const out = Array.isArray(base) ? [...base] : { ...(base || {}) };
  for (const k of Object.keys(patch)) {
    const v = patch[k];
    if (v && typeof v === "object" && !Array.isArray(v)) out[k] = mergeDeep(out[k], v);
    else out[k] = v;
  }
  return out;
}

// ✅ الإجباري يبقى مثل ما هو (رقم الهوية + تاريخ الميلاد + صورة الهوية)
// ما نخلي الاسم والجوال إجباريين
function ownerComplete(v: any) {
  const id = String(v?.owner?.id_number || "").trim();
  const dob = String(v?.owner?.dob || "").trim();
  const img = String(v?.owner?.id_image_url || "").trim();
  return id.length >= 6 && dob.length >= 6 && img.length >= 10;
}

type Body =
  | { action: "save"; patch: any }
  | { action: "submit"; patch?: any };

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
    return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const store_id = await resolveStoreId(supabase, user.id, user.email);
  if (!store_id) {
    return NextResponse.json({ ok: false, error: "NO_STORE" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.action) {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  // اقرأ القيمة الحالية
  const cur = await supabase
    .from("store_settings")
    .select("value")
    .eq("store_id", store_id)
    .eq("slug", "store.verification")
    .maybeSingle();

  // ✅ دمج DEFAULT_VALUE مع القيمة الحالية حتى لا يضيع شكل الحقول الجديدة
  const currentValue = mergeDeep(DEFAULT_VALUE, cur.data?.value || {});
  let next = currentValue;

  if (body.action === "save") {
    next = mergeDeep(currentValue, body.patch);
    // status يبقى incomplete طالما ما تم submit
    next.status = "incomplete";
  }

  if (body.action === "submit") {
    if (body.patch) next = mergeDeep(currentValue, body.patch);

    if (!ownerComplete(next)) {
      return NextResponse.json(
        {
          ok: false,
          error: "OWNER_REQUIRED_FIELDS_MISSING",
          hint: "رقم الهوية + تاريخ الميلاد + صورة الهوية مطلوبة قبل الإرسال",
        },
        { status: 400 },
      );
    }

    next.status = "pending";
    next.submitted_at = new Date().toISOString();
  }

  const { error: upErr } = await supabase.from("store_settings").upsert(
    {
      store_id,
      slug: "store.verification",
      type: "json",
      value: next,
    },
    { onConflict: "store_id,slug" },
  );

  if (upErr) {
    return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, store_id, verification: next });
}
