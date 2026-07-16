import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const runtime = "experimental-edge";

export default async function proxy(request: NextRequest) {
  const session = await auth();
  const isLoginPage = request.nextUrl.pathname === "/login";

  // Only protect the dashboard and order pages
  // API and Static files are excluded by the matcher
  if (!session && !isLoginPage) {
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
    /*
     * Match only the pages that need authentication.
     * This avoids loading the Auth stack for EVERY single API request or asset.
     */
    '/',
    '/dashboard',
    '/orders/:path*',
    '/admin/:path*',
    '/import',
    '/settings'
  ],
};
