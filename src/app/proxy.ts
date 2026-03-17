import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const runtime = 'edge';

export async function proxy(request: NextRequest) {
  const session = await auth();
  const isLoginPage = request.nextUrl.pathname === "/login";
  const isPublicFile = request.nextUrl.pathname.match(/\.(png|jpg|jpeg|gif|ico|svg|css|js)$/);

  if (!session && !isLoginPage && !isPublicFile) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};