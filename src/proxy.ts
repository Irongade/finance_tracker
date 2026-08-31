import { type NextRequest, NextResponse } from "next/server";

/**
 * Cheap cookie-presence gate at the edge; the real session check happens in
 * the (app) layout and every route handler. Public: auth pages, the auth API,
 * invite links and static assets.
 */
const PUBLIC = [
  /^\/$/,
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
  // Never bounce visitors off /login for merely having a session cookie: after a
  // database reset the cookie is stale but present, and the app layout (which
  // checks the real session) sends them back here - an infinite redirect loop.
  // Signing in again simply overwrites the stale cookie.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|webmanifest)$).*)"],
};
