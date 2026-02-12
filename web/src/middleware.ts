import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/forgot-password", "/terms", "/developer","/privacy", "/contact"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    pathname.startsWith("/invite/") ||
    /^\/[^/]+\/invite\//.test(pathname)
  ) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get("thebaycity_auth");
  if (!cookie?.value) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.svg).*)"],
};
