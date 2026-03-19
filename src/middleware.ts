import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const runtime = "experimental-edge";

export default async function proxy(request: NextRequest) {
  const session = await auth();
  const isLoginPage = request.nextUrl.pathname === "/login";
  const isPublicFile = request.nextUrl.pathname.match(/\.(png|jpg|jpeg|gif|ico|svg|css|js)$/);
  const isApiAuth = request.nextUrl.pathname.startsWith("/api/auth");
  const isDebugAuth = request.nextUrl.pathname === "/api/debug-auth";
  const isStatic = request.nextUrl.pathname.startsWith("/_next") || request.nextUrl.pathname.includes("/favicon.ico");

  if (!session && !isLoginPage && !isPublicFile && !isApiAuth && !isDebugAuth && !isStatic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  
  return NextResponse.next();
}
