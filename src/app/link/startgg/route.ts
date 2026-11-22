// Step 1 of "Link start.gg": send the signed-in user to start.gg's approval page.
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getUserId } from "@/lib/supabase/server";
import { STARTGG_STATE_COOKIE, startggAuthorizeUrl } from "@/lib/startggOAuth";

export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  if (!(await getUserId())) return NextResponse.redirect(`${origin}/signin`);
  if (!process.env.STARTGG_CLIENT_ID || !process.env.STARTGG_CLIENT_SECRET) {
    return NextResponse.redirect(`${origin}/profile?link_error=not_configured`);
  }

  // Random "state" proves the response we get back is for a request we started.
  const state = crypto.randomUUID();
  (await cookies()).set(STARTGG_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    secure: process.env.NODE_ENV === "production",
  });
  return NextResponse.redirect(startggAuthorizeUrl(origin, state));
}
