import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const runtime = 'edge';

export function middleware(request: NextRequest) {
  // We'll skip the complex auth check here for a moment 
  // just to see if the site boots up.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};