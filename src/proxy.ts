/**
 * Auth gate (Next 16 "proxy", formerly middleware). Runs on the Edge, so it does
 * a cheap COOKIE-PRESENCE check only — the authoritative session lookup happens
 * in (app)/layout.tsx via getCurrentUser(). Keeps unauthenticated users out of
 * the app shell and signed-in users off the marketing/login pages.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/constants";

const PUBLIC_PATHS = ["/", "/signup", "/forgot-password"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (!hasSession && !isPublic) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (hasSession && pathname === "/") {
    return NextResponse.redirect(new URL("/home", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals, API routes, and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)"],
};
