import { NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...nextauth]/route";

export const runtime = 'edge';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;
  const userRole = (req.auth?.user as any)?.role;

  // 1. If not logged in, redirect to login page (except for the login page itself)
  if (!isLoggedIn && nextUrl.pathname !== "/login") {
    return NextResponse.redirect(new URL("/layout", nextUrl));
  }

  // 2. Protect Admin & Import routes - Only ADMIN or MANAGER allowed
  const isRestrictedRoute = 
    nextUrl.pathname.startsWith("/admin") || 
    nextUrl.pathname.startsWith("/import");

  if (isRestrictedRoute && userRole === "USER") {
    // Redirect regular users back to the dashboard with an error
    return NextResponse.redirect(new URL("/dashboard?error=unauthorized", nextUrl));
  }

  return NextResponse.next();
});

// This "matcher" tells Next.js which routes to run the middleware on
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};