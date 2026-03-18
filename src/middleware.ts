import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const runtime = 'edge';

export default async function middleware(request: NextRequest) {
  const session = await auth();
  const isLoginPage = request.nextUrl.pathname === "/login";
  const isPublicFile = request.nextUrl.pathname.match(/\.(png|jpg|jpeg|gif|ico|svg|css|js)$/);
  const isApiAuth = request.nextUrl.pathname.startsWith("/api/auth");
  const isDebugAuth = request.nextUrl.pathname === "/api/debug-auth";

  if (!session && !isLoginPage && !isPublicFile && !isApiAuth && !isDebugAuth) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
