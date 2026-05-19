// apps/merchant/src/app/(theme-editor)/themes/[themeId]/customize/layout.tsx
import { notFound } from "next/navigation";
import ThemeEditorShell from "./_components/ThemeEditorShell";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

async function resolveStoreIdAndSlug() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n: string) => cookieStore.get(n)?.value,
        set() {},
        remove() {},
      },
    },
  );

  const { data: au, error: auErr } = await supabase.auth.getUser();
  if (auErr || !au?.user) return { slug: null as string | null };

  const userId = au.user.id;
  const email = (au.user.email || "").toLowerCase();

  let { data: su } = await supabase
    .from("store_users")
    .select("store_id")
    .eq("auth_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!su?.store_id && email) {
    const r = await supabase
      .from("store_users")
      .select("store_id")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    su = r.data as any;
  }

  const storeId = su?.store_id || null;
  if (!storeId) return { slug: null as string | null };

  const { data: st, error: stErr } = await supabase
    .from("stores")
    .select("slug")
    .eq("id", storeId)
    .maybeSingle();

  if (stErr) throw stErr;

  const slug = String(st?.slug || "").trim();
  return { slug: slug || null };
}

export default async function ThemeEditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { slug } = await resolveStoreIdAndSlug();
  if (!slug) return notFound();

  // ✅ يبني: http://darb.localhost:3003
  const base =
    process.env.NEXT_PUBLIC_STOREFRONT_ORIGIN || "http://localhost:3003";
  const u = new URL(base);
  const storefrontOrigin = `${u.protocol}//${slug}.${u.hostname}${u.port ? `:${u.port}` : ""}`;

  return (
    <ThemeEditorShell storefrontOrigin={storefrontOrigin}>
      {children}
    </ThemeEditorShell>
  );
}
