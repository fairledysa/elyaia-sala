import { NextRequest, NextResponse } from "next/server";

const BASE_DOMAIN = process.env.BASE_DOMAIN || "madrar.com";

function getHost(req: NextRequest) {
  const host =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  return host.split(":")[0].toLowerCase();
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = getHost(req);

  // استثناء ملفات ثابتة و API
  if (
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/favicon") ||
    url.pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  res.headers.set("x-store-host", host);

  // subdomain storeSlug
  if (host.endsWith(`.${BASE_DOMAIN}`)) {
    const sub = host.slice(0, -`.${BASE_DOMAIN}`.length);

    // استثناء admin / m
    if (sub && sub !== "admin" && sub !== "m") {
      res.headers.set("x-store-slug", sub);
      return res;
    }
  }

  // custom domain
  if (!host.endsWith(`.${BASE_DOMAIN}`)) {
    res.headers.set("x-store-hostname", host);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
