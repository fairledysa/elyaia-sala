// FILE: apps/merchant/src/app/api/settings/store/domains/route.ts

import { NextRequest, NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  generateDomainVerificationToken,
  normalizeCustomDomain,
} from "@/lib/domains/normalize-domain";
import {
  addDomainToVercelProject,
  buildDomainDnsRecords,
  getVercelDomainConfig,
  readVercelConfigured,
  readVercelVerified,
  vercelProjectIdForDb,
} from "@/lib/vercel/domains";

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

function domainStatus(args: {
  verified: boolean;
  configured: boolean;
  error?: string | null;
}) {
  if (args.error) return "failed";
  if (args.verified && args.configured) return "verified";
  if (!args.configured) return "needs_configuration";
  return "pending";
}

export async function GET() {
  try {
    const storeUser = await resolveStoreUser();

    if (!storeUser?.store_id) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
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
      return NextResponse.json(
        { error: "STORE_LOOKUP_FAILED", message: storeR.error.message },
        { status: 500 },
      );
    }

    if (domainsR.error) {
      return NextResponse.json(
        { error: "DOMAINS_LOOKUP_FAILED", message: domainsR.error.message },
        { status: 500 },
      );
    }

    const rootDomain = process.env.PLATFORM_ROOT_DOMAIN || "elyaia.com";
    const slug = String(storeR.data?.slug || "").trim();

    return NextResponse.json({
      ok: true,
      default_domain: slug ? `${slug}.${rootDomain}` : null,
      domains: Array.isArray(domainsR.data) ? domainsR.data : [],
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "DOMAINS_GET_FAILED", message: e?.message || "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const storeUser = await resolveStoreUser();

    if (!storeUser?.store_id) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const normalized = normalizeCustomDomain(body?.domain);

    if (!normalized.ok) {
      return NextResponse.json(
        { error: normalized.error, message: normalized.message },
        { status: 400 },
      );
    }

    const domain = normalized.domain;
    const admin: any = supabaseAdmin();

    const existsR = await admin
      .from("store_domains")
      .select("id,store_id,domain")
      .eq("domain", domain)
      .limit(1)
      .maybeSingle();

    if (existsR.error) {
      return NextResponse.json(
        { error: "DOMAIN_LOOKUP_FAILED", message: existsR.error.message },
        { status: 500 },
      );
    }

    if (existsR.data?.id) {
      return NextResponse.json(
        {
          error: "DOMAIN_ALREADY_EXISTS",
          message: "هذا الدومين مستخدم بالفعل في متجر آخر.",
        },
        { status: 409 },
      );
    }

    const verificationToken = generateDomainVerificationToken();

    const insertedR = await admin
      .from("store_domains")
      .insert({
        store_id: storeUser.store_id,
        domain,
        type: "custom",
        is_primary: false,
        status: "pending",
        dns_status: "pending",
        verification_token: verificationToken,
        vercel_project_id: vercelProjectIdForDb(),
        vercel_domain_name: domain,
        dns_records: [],
        dns_check_result: {},
      })
      .select("*")
      .single();

    if (insertedR.error || !insertedR.data?.id) {
      return NextResponse.json(
        {
          error: "DOMAIN_CREATE_FAILED",
          message: insertedR.error?.message || "تعذر حفظ الدومين.",
        },
        { status: 500 },
      );
    }

    let vercelDomain: any = null;
    let vercelConfig: any = null;
    let errorMessage: string | null = null;

    try {
      vercelDomain = await addDomainToVercelProject(domain);
    } catch (e: any) {
      errorMessage = e?.message || "تعذر إضافة الدومين في Vercel.";
    }

    try {
      vercelConfig = await getVercelDomainConfig(domain);
    } catch {
      //
    }

    const configured = readVercelConfigured(vercelConfig);
    const verified = readVercelVerified(vercelDomain);

    const dnsRecords = buildDomainDnsRecords({
      domain,
      projectDomain: vercelDomain,
      config: vercelConfig,
    });

    const status = domainStatus({
      verified,
      configured,
      error: errorMessage,
    });

    const updateR = await admin
      .from("store_domains")
      .update({
        status,
        dns_status: configured ? "configured" : "pending",
        vercel_verified: verified,
        vercel_configured: configured,
        dns_records: dnsRecords,
        dns_check_result: {
          source: "vercel",
          project_domain: vercelDomain,
          config: vercelConfig,
        },
        error_message: errorMessage,
        last_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        verified_at: verified && configured ? new Date().toISOString() : null,
      })
      .eq("id", insertedR.data.id)
      .eq("store_id", storeUser.store_id)
      .select("*")
      .single();

    if (updateR.error) {
      return NextResponse.json(
        {
          error: "DOMAIN_UPDATE_FAILED",
          message: updateR.error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      domain: updateR.data,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "DOMAIN_ADD_FAILED", message: e?.message || "Unknown error" },
      { status: 500 },
    );
  }
}