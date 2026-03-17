import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;

  // 1. If not logged in and not on login page, redirect to login
  if (!isLoggedIn && nextUrl.pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // 2. Role protection
  const userRole = (req.auth?.user as any)?.role;
  const isAdminRoute = nextUrl.pathname.startsWith("/admin") || nextUrl.pathname.startsWith("/import");

  if (isAdminRoute && userRole !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard?error=unauthorized", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};