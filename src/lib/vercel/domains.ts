// FILE: apps/merchant/src/lib/vercel/domains.ts

type VercelAny = Record<string, any>;

function requiredEnv(name: string) {
  const value = String(process.env[name] ?? "").trim();
  if (!value) throw new Error(`${name}_MISSING`);
  return value;
}

function optionalEnv(name: string) {
  return String(process.env[name] ?? "").trim();
}

function vercelProjectId() {
  return requiredEnv("VERCEL_PROJECT_ID");
}

function teamIdQuery() {
  const teamId = optionalEnv("VERCEL_TEAM_ID");
  return teamId ? `teamId=${encodeURIComponent(teamId)}` : "";
}

function appendTeamId(path: string) {
  const q = teamIdQuery();
  if (!q) return path;
  return path.includes("?") ? `${path}&${q}` : `${path}?${q}`;
}

async function vercelFetch<T = VercelAny>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = requiredEnv("VERCEL_TOKEN");

  const res = await fetch(`https://api.vercel.com${appendTeamId(path)}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      json?.error?.message ||
      json?.message ||
      `VERCEL_API_FAILED_${res.status}`;

    const error: any = new Error(message);
    error.status = res.status;
    error.response = json;
    throw error;
  }

  return json as T;
}

export function getFallbackDnsRecords(domain: string) {
  const apexA = String(process.env.VERCEL_APEX_A_RECORD || "76.76.21.21").trim();
  const cname = String(
    process.env.VERCEL_CNAME_RECORD || "cname.vercel-dns.com",
  ).trim();

  const parts = String(domain || "").split(".").filter(Boolean);
  const isApexLike = parts.length === 2;

  if (isApexLike) {
    return [
      {
        type: "A",
        host: "@",
        value: apexA,
        required: true,
        status: "pending",
        note: "اربط الدومين الرئيسي بمنصة المتجر.",
      },
      {
        type: "CNAME",
        host: "www",
        value: cname,
        required: false,
        status: "pending",
        note: "اختياري لربط www بنفس المتجر.",
      },
    ];
  }

  return [
    {
      type: "CNAME",
      host: parts[0] || "@",
      value: cname,
      required: true,
      status: "pending",
      note: "اربط هذا النطاق الفرعي بمنصة المتجر.",
    },
  ];
}

function normalizeVerificationRecords(domain: string, projectDomain: any) {
  const rows: any[] = [];

  const verification = Array.isArray(projectDomain?.verification)
    ? projectDomain.verification
    : [];

  for (const item of verification) {
    rows.push({
      type: String(item?.type || "TXT").toUpperCase(),
      host: String(item?.domain || item?.name || "_vercel").replace(
        `.${domain}`,
        "",
      ),
      value: String(item?.value || ""),
      required: true,
      status: "pending",
      note: "سجل مطلوب للتحقق من ملكية الدومين.",
    });
  }

  return rows.filter((row) => row.value);
}

export function buildDomainDnsRecords(args: {
  domain: string;
  projectDomain?: any;
  config?: any;
}) {
  const fallback = getFallbackDnsRecords(args.domain);
  const verification = normalizeVerificationRecords(
    args.domain,
    args.projectDomain,
  );

  return [...fallback, ...verification];
}

export async function addDomainToVercelProject(domain: string) {
  const projectId = encodeURIComponent(vercelProjectId());

  return await vercelFetch(`/v10/projects/${projectId}/domains`, {
    method: "POST",
    body: JSON.stringify({
      name: domain,
    }),
  });
}

export async function getVercelProjectDomain(domain: string) {
  const projectId = encodeURIComponent(vercelProjectId());
  const encodedDomain = encodeURIComponent(domain);

  return await vercelFetch(
    `/v9/projects/${projectId}/domains/${encodedDomain}`,
    { method: "GET" },
  );
}

export async function verifyVercelProjectDomain(domain: string) {
  const projectId = encodeURIComponent(vercelProjectId());
  const encodedDomain = encodeURIComponent(domain);

  return await vercelFetch(
    `/v9/projects/${projectId}/domains/${encodedDomain}/verify`,
    { method: "POST" },
  );
}

export async function getVercelDomainConfig(domain: string) {
  const encodedDomain = encodeURIComponent(domain);

  return await vercelFetch(`/v6/domains/${encodedDomain}/config`, {
    method: "GET",
  });
}

export function readVercelConfigured(config: any) {
  if (!config || typeof config !== "object") return false;

  if (typeof config.configured === "boolean") return config.configured;
  if (typeof config.misconfigured === "boolean") return !config.misconfigured;

  return false;
}

export function readVercelVerified(projectDomain: any) {
  return Boolean(projectDomain?.verified);
}

export function vercelProjectIdForDb() {
  return vercelProjectId();
}