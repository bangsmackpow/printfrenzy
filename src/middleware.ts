import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isRateLimited } from "@/utils/rateLimiter";

export const runtime = "experimental-edge";

export default async function proxy(request: NextRequest) {
  const isLoginPage = request.nextUrl.pathname === "/login";
  const isCredentialsLogin = request.nextUrl.pathname === "/api/auth/callback/credentials" && request.method === "POST";

  // Rate limit credentials login
  if (isCredentialsLogin) {
    const db = (process.env as unknown as { DB: D1Database }).DB;
    if (db) {
      const limited = await isRateLimited(db, request, "login", 5, 60); // 5 attempts per 60s
      if (limited) {
        return new NextResponse(JSON.stringify({ error: "Too many login attempts. Please try again in a minute." }), {
          status: 429,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
  }

  const session = await auth();

  // Redirect to login if unauthenticated (and not accessing login page/login action)
  if (!session && !isLoginPage && !isCredentialsLogin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Protect admin routes from non-admin/non-manager roles
  if (session && request.nextUrl.pathname.startsWith("/admin")) {
    const role = (session.user as { role?: string })?.role;
    if (role !== "ADMIN" && role !== "MANAGER") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/dashboard',
    '/orders/:path*',
    '/admin/:path*',
    '/import',
    '/settings',
    '/api/auth/callback/credentials'
  ],
};
