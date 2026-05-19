// FILE: apps/merchant/src/app/api/settings/store/domains/[id]/verify/route.ts

import { NextRequest, NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  buildDomainDnsRecords,
  getVercelDomainConfig,
  getVercelProjectDomain,
  readVercelConfigured,
  readVercelVerified,
  verifyVercelProjectDomain,
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

function nextStatus(args: {
  verified: boolean;
  configured: boolean;
  errorMessage?: string | null;
}) {
  if (args.errorMessage) return "needs_configuration";
  if (args.verified && args.configured) return "verified";
  if (!args.configured) return "needs_configuration";
  return "pending";
}

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const params = await ctx.params;
    const id = String(params?.id || "").trim();

    if (!id) {
      return NextResponse.json({ error: "MISSING_DOMAIN_ID" }, { status: 400 });
    }

    const storeUser = await resolveStoreUser();

    if (!storeUser?.store_id) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const admin: any = supabaseAdmin();

    const domainR = await admin
      .from("store_domains")
      .select("*")
      .eq("id", id)
      .eq("store_id", storeUser.store_id)
      .limit(1)
      .maybeSingle();

    if (domainR.error) {
      return NextResponse.json(
        { error: "DOMAIN_LOOKUP_FAILED", message: domainR.error.message },
        { status: 500 },
      );
    }

    if (!domainR.data?.id) {
      return NextResponse.json(
        { error: "DOMAIN_NOT_FOUND", message: "الدومين غير موجود." },
        { status: 404 },
      );
    }

    const domain = String(domainR.data.domain || "").trim().toLowerCase();

    let verifyResult: any = null;
    let projectDomain: any = null;
    let config: any = null;
    let errorMessage: string | null = null;

    try {
      verifyResult = await verifyVercelProjectDomain(domain);
    } catch (e: any) {
      errorMessage = e?.message || "تعذر التحقق من الدومين في Vercel.";
    }

    try {
      projectDomain = await getVercelProjectDomain(domain);
    } catch {
      //
    }

    try {
      config = await getVercelDomainConfig(domain);
    } catch {
      //
    }

    const verified =
      readVercelVerified(projectDomain) || readVercelVerified(verifyResult);

    const configured = readVercelConfigured(config);

    const dnsRecords = buildDomainDnsRecords({
      domain,
      projectDomain: projectDomain || verifyResult,
      config,
    });

    const status = nextStatus({
      verified,
      configured,
      errorMessage,
    });

    const now = new Date().toISOString();

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
          verify_result: verifyResult,
          project_domain: projectDomain,
          config,
        },
        error_message: errorMessage,
        last_checked_at: now,
        updated_at: now,
        verified_at: verified && configured ? now : domainR.data.verified_at,
      })
      .eq("id", id)
      .eq("store_id", storeUser.store_id)
      .select("*")
      .single();

    if (updateR.error) {
      return NextResponse.json(
        { error: "DOMAIN_UPDATE_FAILED", message: updateR.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      domain: updateR.data,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "DOMAIN_VERIFY_FAILED", message: e?.message || "Unknown error" },
      { status: 500 },
    );
  }
}