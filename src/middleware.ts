import { NextResponse, type NextRequest } from "next/server";

function hasSessionCookie(req: NextRequest): boolean {
  const cookieNames = [
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
  ];
  return cookieNames.some((name) => req.cookies.get(name)?.value);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth/login/setup/public/api/static/_next routes
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/setup" ||
    pathname === "/create-account" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icon") ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$/)
  ) {
    return NextResponse.next();
  }

  // Not authenticated — redirect to login
  if (!hasSessionCookie(request)) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Session cookie exists — let the page-level requireRole guards handle
  // role enforcement. This avoids redirect loops from JWT decryption issues.
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|icon.svg).*)",
  ],
};
