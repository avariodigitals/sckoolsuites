import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { roleDefaultRoute } from "@/lib/constants";

const routeRoleMap: { pattern: RegExp; roles: string[] }[] = [
  { pattern: /^\/admin(\/|$)/, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "RECEPTIONIST"] },
  { pattern: /^\/super-admin(\/|$)/, roles: ["SUPER_ADMIN"] },
  { pattern: /^\/accountant(\/|$)/, roles: ["ACCOUNTANT", "SCHOOL_ADMIN", "SUPER_ADMIN"] },
  { pattern: /^\/registrar(\/|$)/, roles: ["REGISTRAR", "SCHOOL_ADMIN", "SUPER_ADMIN"] },
  { pattern: /^\/teacher(\/|$)/, roles: ["TEACHER"] },
  { pattern: /^\/parent(\/|$)/, roles: ["PARENT"] },
  { pattern: /^\/student(\/|$)/, roles: ["STUDENT"] },
];

export async function middleware(request: Request) {
  const { pathname } = new URL(request.url);

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

  const token = await getToken({ req: request as any });

  // Not authenticated — redirect to login
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const role = (token.role as string) ?? "";

  // Find matching route rule
  for (const rule of routeRoleMap) {
    if (rule.pattern.test(pathname)) {
      if (!rule.roles.includes(role)) {
        // Redirect to their own portal
        const fallback = roleDefaultRoute[role] ?? "/login";
        const redirectUrl = new URL(fallback, request.url);
        return NextResponse.redirect(redirectUrl);
      }
      break;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|icon.svg).*)",
  ],
};
