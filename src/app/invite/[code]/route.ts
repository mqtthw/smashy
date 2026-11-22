// Invite links: /invite/SMASH-ABCDE remembers the code (in a cookie, for a week) and goes to sign-in.
// The code is checked and used when the person makes their profile on the Welcome page.
import { NextResponse, type NextRequest } from "next/server";
import { INVITE_COOKIE } from "@/lib/invites";

export async function GET(request: NextRequest, ctx: RouteContext<"/invite/[code]">) {
  const { code } = await ctx.params;
  const clean = decodeURIComponent(code).toUpperCase().trim();
  const res = NextResponse.redirect(new URL("/signin", request.url));
  if (/^[A-Z0-9-]{4,32}$/.test(clean)) {
    res.cookies.set(INVITE_COOKIE, clean, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  }
  return res;
}
