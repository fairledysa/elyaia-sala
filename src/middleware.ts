// apps/merchant/src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function isStaticPublicFile(pathname: string) {
  if (pathname.startsWith("/api/")) return true;
  if (pathname === "/logo-light.svg") return true;

  return (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/boltify") ||
    pathname.startsWith("/fonts") ||
    pathname.startsWith("/images") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".webp") ||
    pathname.endsWith(".gif") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".map")
  );
}

function isAuthPath(pathname: string) {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/auth/reset-signup") || // ✅ مهم
    pathname.startsWith("/verify-phone")
  );
}

function isPreStorePath(pathname: string) {
  return (
    pathname.startsWith("/onboarding") || pathname.startsWith("/onboarding/")
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isStaticPublicFile(pathname)) {
    return NextResponse.next();
  }

  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          res.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();

  // 1) غير مسجل
  if (!data.user) {
    if (isAuthPath(pathname)) return NextResponse.next();

    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    const nextPath = pathname.startsWith("/") ? pathname : "/";
    loginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginUrl);
  }

  // 2) تحقق الجوال
  const meta: any = data.user.user_metadata || {};
  const phoneVerified = Boolean(meta.phone_verified);
  const isVerifyPhonePath = pathname.startsWith("/verify-phone");

  if (!phoneVerified && !isVerifyPhonePath) {
    const url = req.nextUrl.clone();
    url.pathname = "/verify-phone";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (phoneVerified && isVerifyPhonePath) {
    const url = req.nextUrl.clone();
    url.pathname = "/onboarding";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // 3) إذا Session موجود لكن ما عنده متجر -> يسمح فقط (auth + onboarding)
  const email = (data.user.email || "").toLowerCase();
  if (email) {
    const { data: su } = await supabase
      .from("store_users")
      .select("store_id")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const hasStore = Boolean(su?.store_id);

    if (!hasStore) {
      if (isAuthPath(pathname) || isPreStorePath(pathname))
        return NextResponse.next();

      const url = req.nextUrl.clone();
      url.pathname = "/onboarding";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // 4) مسجل وجواله متحقق ويحاول يفتح صفحات auth
  if (phoneVerified && isAuthPath(pathname) && !isVerifyPhonePath) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
