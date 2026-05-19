// FILE: apps/merchant/src/app/(app)/settings/domains/page.tsx

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

import DomainsClient, {
  type StoreDomainRow,
} from "./_components/DomainsClient";

export const dynamic = "force-dynamic";

async function resolveStoreUser() {
  const sb = await supabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user?.id) return null;

  const admin: any = supabaseAdmin();

  const r = await admin
    .from("store_users")
    .select("id,store_id,email,name,role,status")
    .eq("auth_user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (r.error || !r.data?.store_id) return null;

  return r.data;
}

function s(value: any) {
  return String(value ?? "").trim();
}

function UnauthorizedState() {
  return (
    <main className="adm-page adm-domains" dir="rtl">
      <div className="adm-page__inner adm-domains__inner">
        <section className="adm-domains-card adm-domains-dns">
          <div className="adm-domains-sectionHead">
            <div>
              <h2>غير مصرح</h2>
              <p>سجل الدخول إلى لوحة المتجر لعرض إعدادات النطاق.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <main className="adm-page adm-domains" dir="rtl">
      <div className="adm-page__inner adm-domains__inner">
        <section className="adm-domains-card adm-domains-dns">
          <div className="adm-domains-sectionHead">
            <div>
              <h2>تعذر تحميل إعدادات النطاق</h2>
              <p>{message}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default async function DomainsSettingsPage() {
  const storeUser = await resolveStoreUser();

  if (!storeUser?.store_id) {
    return <UnauthorizedState />;
  }

  const admin: any = supabaseAdmin();

  const [storeR, domainsR] = await Promise.all([
    admin
      .from("stores")
      .select("id,slug,name")
      .eq("id", storeUser.store_id)
      .limit(1)
      .maybeSingle(),

    admin
      .from("store_domains")
      .select(
        `
        id,
        store_id,
        domain,
        type,
        is_primary,
        verified_at,
        dns_status,
        status,
        updated_at,
        last_checked_at,
        vercel_project_id,
        vercel_domain_name,
        vercel_verified,
        vercel_configured,
        dns_records,
        dns_check_result,
        error_message,
        verification_token,
        created_at
      `,
      )
      .eq("store_id", storeUser.store_id)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  if (storeR.error) {
    return <ErrorState message={storeR.error.message} />;
  }

  if (domainsR.error) {
    return <ErrorState message={domainsR.error.message} />;
  }

  const store = storeR.data;

  const domains: StoreDomainRow[] = Array.isArray(domainsR.data)
    ? (domainsR.data as StoreDomainRow[])
    : [];

  const rootDomain = s(process.env.PLATFORM_ROOT_DOMAIN || "elyaia.com");
  const defaultDomain = store?.slug ? `${store.slug}.${rootDomain}` : null;

  return (
    <DomainsClient defaultDomain={defaultDomain} initialDomains={domains} />
  );
}