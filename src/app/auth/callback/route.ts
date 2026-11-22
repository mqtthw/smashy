// Where Discord sign-in and email links send people back to.
// Exchanges the one-time code (or email token) for a login session.
import { getLang } from "@/lib/i18n/server";
import { authErrorCode, signinErrorPath } from "@/lib/authErrors";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Only allow redirects within Smashy (prevents "open redirect" tricks). */
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/welcome";
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Changing email (round 685): the first of the two links comes back with only a "message" (Supabase
  // waits for the other link). Say on the profile that one is done, rather than treat it as a failure.
  if (!code && !tokenHash && !searchParams.get("error_description") && searchParams.get("message") && next.startsWith("/profile")) {
    return NextResponse.redirect(`${origin}/profile?email_change=half#signin-methods`);
  }

  const supabase = await createClient();
  let error: { message: string } | null = null;

  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && type) {
    ({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }));
  } else {
    error = { message: searchParams.get("error_description") ?? "Missing sign-in code" };
  }

  if (error) {
    console.error("auth callback:", error.message);
    // The second email-change link opened in another browser (round 685): Supabase has already made the
    // change before sending them here; only this browser's sign-in step fails. The profile shows the result.
    if (code && next.startsWith("/profile?email_change=done")) return NextResponse.redirect(`${origin}${next}`);
    // Connecting Google or Discord from the profile (round 684): the player is still signed in, so the
    // message belongs back on the profile, not on the sign-in page (which would send them away again).
    if (next.startsWith("/profile")) {
      return NextResponse.redirect(`${origin}/profile?signin_link_error=${authErrorCode(error.message)}#signin-methods`);
    }
    return NextResponse.redirect(`${origin}${signinErrorPath(authErrorCode(error.message))}`);
  }
  // Alerts in the language they're using, if they haven't picked one (never blocks signing in).
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) await supabase.from("profiles").update({ lang: await getLang() }).eq("id", auth.user.id).is("lang", null);
  } catch {}
  return NextResponse.redirect(`${origin}${next}`);
}
