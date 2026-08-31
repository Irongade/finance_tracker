import { type NextRequest, NextResponse } from "next/server";

/**
 * Cheap cookie-presence gate at the edge; the real session check happens in
 * the (app) layout and every route handler. Public: auth pages, the auth API,
 * invite links and static assets.
 */
const PUBLIC = [
  /^\/login$/,
  /^\/register$/,
  /^\/forgot-password$/,
  /^\/reset-password$/,
  /^\/invite(\/.*)?$/,
  /^\/api\/auth(\/.*)?$/,
  /^\/api\/invites\/.+$/,
];

function hasSessionCookie(req: NextRequest): boolean {
  return req.cookies.has("better-auth.session_token") || req.cookies.has("__Secure-better-auth.session_token");
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC.some((p) => p.test(pathname));
  const signedIn = hasSessionCookie(req);

  if (!signedIn && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
    return NextResponse.redirect(url);
  }
  if (signedIn && (pathname === "/login" || pathname === "/register")) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|webmanifest)$).*)"],
};
