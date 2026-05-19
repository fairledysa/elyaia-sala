import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import crypto from "crypto";

function hashCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
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

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const { code } = await req.json().catch(() => ({}));
  if (!code || String(code).length !== 4) {
    return NextResponse.json({ error: "INVALID_CODE" }, { status: 400 });
  }

  const meta: any = user.user_metadata || {};
  const phone = meta.phone as string | undefined;
  if (!phone) return NextResponse.json({ error: "NO_PHONE" }, { status: 400 });

  const { data: rows, error } = await supabase
    .from("phone_verifications")
    .select("*")
    .eq("user_id", user.id)
    .eq("phone_e164", phone)
    .is("verified_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const row = rows?.[0];
  if (!row) return NextResponse.json({ error: "NO_REQUEST" }, { status: 400 });

  const expired = new Date(row.expires_at).getTime() < Date.now();
  if (expired) return NextResponse.json({ error: "EXPIRED" }, { status: 400 });

  if (row.attempts >= 5) return NextResponse.json({ error: "TOO_MANY_ATTEMPTS" }, { status: 429 });

  const ok = row.code_hash === hashCode(String(code));
  if (!ok) {
    await supabase
      .from("phone_verifications")
      .update({ attempts: row.attempts + 1 })
      .eq("id", row.id);

    return NextResponse.json({ error: "WRONG_CODE" }, { status: 400 });
  }

  await supabase
    .from("phone_verifications")
    .update({ verified_at: new Date().toISOString() })
    .eq("id", row.id);

  // علّم المستخدم في metadata أنه verified
  const { error: upErr } = await supabase.auth.updateUser({
    data: { phone_verified: true },
  });

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
