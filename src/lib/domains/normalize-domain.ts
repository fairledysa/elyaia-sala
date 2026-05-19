// FILE: apps/merchant/src/lib/domains/normalize-domain.ts

import { domainToASCII } from "url";
import crypto from "crypto";

export type NormalizedDomainResult =
  | { ok: true; domain: string; isApexLike: boolean }
  | { ok: false; error: string; message: string };

const RESERVED_LABELS = new Set([
  "admin",
  "api",
  "app",
  "assets",
  "cdn",
  "checkout",
  "dashboard",
  "mail",
  "platform",
  "support",
  "www",
]);

function s(value: any) {
  return String(value ?? "").trim();
}

function stripProtocolAndPath(input: string) {
  const raw = s(input).toLowerCase();

  if (!raw) return "";

  try {
    const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)
      ? raw
      : `https://${raw}`;

    const url = new URL(withProtocol);
    return url.hostname || "";
  } catch {
    return raw
      .replace(/^https?:\/\//i, "")
      .split("/")[0]
      .split("?")[0]
      .split("#")[0]
      .replace(/:\d+$/, "");
  }
}

function isIpAddress(host: string) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host.includes(":");
}

function isProbablyApexDomain(host: string) {
  const parts = host.split(".").filter(Boolean);
  return parts.length === 2;
}

export function generateDomainVerificationToken() {
  return crypto.randomBytes(24).toString("hex");
}

export function normalizeCustomDomain(input: any): NormalizedDomainResult {
  const platformRoot = s(process.env.PLATFORM_ROOT_DOMAIN || "elyaia.com")
    .toLowerCase()
    .replace(/^www\./, "");

  let host = stripProtocolAndPath(String(input ?? ""));

  host = host
    .toLowerCase()
    .trim()
    .replace(/\.$/, "")
    .replace(/^www\.$/, "");

  const ascii = domainToASCII(host);
  if (ascii) host = ascii.toLowerCase();

  if (!host) {
    return {
      ok: false,
      error: "DOMAIN_REQUIRED",
      message: "أدخل اسم الدومين.",
    };
  }

  if (host.length > 253) {
    return {
      ok: false,
      error: "DOMAIN_TOO_LONG",
      message: "اسم الدومين طويل جدًا.",
    };
  }

  if (host.includes("*")) {
    return {
      ok: false,
      error: "WILDCARD_NOT_ALLOWED",
      message: "لا يمكن إضافة دومين Wildcard من هذه الصفحة.",
    };
  }

  if (host.includes("_")) {
    return {
      ok: false,
      error: "INVALID_DOMAIN",
      message: "الدومين غير صحيح.",
    };
  }

  if (host === "localhost" || host.endsWith(".localhost") || isIpAddress(host)) {
    return {
      ok: false,
      error: "LOCAL_DOMAIN_NOT_ALLOWED",
      message: "لا يمكن استخدام دومين محلي.",
    };
  }

  if (host === "vercel.app" || host.endsWith(".vercel.app")) {
    return {
      ok: false,
      error: "VERCEL_DOMAIN_NOT_ALLOWED",
      message: "لا يمكن استخدام دومينات Vercel كدومين خاص.",
    };
  }

  if (host === platformRoot || host.endsWith(`.${platformRoot}`)) {
    return {
      ok: false,
      error: "PLATFORM_DOMAIN_NOT_ALLOWED",
      message: "هذا الدومين تابع للمنصة ولا يمكن إضافته كدومين خاص.",
    };
  }

  const labels = host.split(".").filter(Boolean);

  if (labels.length < 2) {
    return {
      ok: false,
      error: "INVALID_DOMAIN",
      message: "أدخل دومين صحيح مثل example.com.",
    };
  }

  for (const label of labels) {
    if (!/^[a-z0-9-]+$/.test(label) || label.startsWith("-") || label.endsWith("-")) {
      return {
        ok: false,
        error: "INVALID_DOMAIN",
        message: "الدومين يحتوي على أحرف غير صحيحة.",
      };
    }
  }

  const first = labels[0];

  if (labels.length === 2 && RESERVED_LABELS.has(first)) {
    return {
      ok: false,
      error: "RESERVED_DOMAIN",
      message: "هذا الدومين محجوز ولا يمكن استخدامه.",
    };
  }

  return {
    ok: true,
    domain: host,
    isApexLike: isProbablyApexDomain(host),
  };
}