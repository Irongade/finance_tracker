import { NextResponse } from "next/server";
import { INVITE_COOKIE } from "@/server/auth/auth";
import { handler, type RouteParams } from "@/server/http";
import { getServices } from "@/server/services";

/**
 * Opening an invite link: validate the token, park it in a short-lived
 * httpOnly cookie, and send the invitee to the sign-up screen. The token
 * itself never appears in the sign-up form.
 */
export const GET = handler(async (req, { params }: RouteParams<"token">) => {
  const { token } = await params;
  const invite = await getServices().households.peekInvite(token);
  const url = new URL(invite ? "/invite" : "/invite?invalid=1", req.url);
  const res = NextResponse.redirect(url);
  if (invite) {
    res.cookies.set(INVITE_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: url.protocol === "https:",
      path: "/",
      maxAge: 60 * 60,
    });
  }
  return res;
});
