import { NextRequest, NextResponse } from "next/server";

const ADMIN_AUTH_ROUTES = new Set(["/admin/login", "/admin/signup"]);
const USER_AUTH_ROUTES = new Set(["/login", "/signup"]);
const USER_PROTECTED_PREFIXES = ["/", "/profile"];

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (isStaticPath(pathname)) {
    return NextResponse.next();
  }

  const role = request.cookies.get("studyflow_role")?.value;

  if (pathname.startsWith("/admin")) {
    if (ADMIN_AUTH_ROUTES.has(pathname)) {
      if (role === "admin") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
      return NextResponse.next();
    }

    if (role !== "admin") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    return NextResponse.next();
  }

  const requiresUser = USER_PROTECTED_PREFIXES.some((prefix) => {
    if (prefix === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(prefix);
  });

  if (requiresUser) {
    if (!role) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (role === "admin") {
      const isAdminReviewRoot =
        pathname === "/" && searchParams.has("reviewCurriculumId");
      if (isAdminReviewRoot) {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }

    return NextResponse.next();
  }

  if (USER_AUTH_ROUTES.has(pathname)) {
    if (role === "user") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

function isStaticPath(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".webp") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".js")
  );
}

export const config = {
  matcher: ["/:path*"],
};
