// Clears a login that no longer works (e.g. the account was deleted), then goes to sign-in.
// It only signs out a login that is actually broken: this is a plain link, so if it signed out
// anyone who opened it, posting the link somewhere would log out everyone who tapped it.
import { NextResponse, type NextRequest } from "next/server";
import { signinErrorPath } from "@/lib/authErrors";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (data.user && !error) return NextResponse.redirect(`${origin}/`); // a working login: leave it alone
  await supabase.auth.signOut({ scope: "local" });
  return NextResponse.redirect(`${origin}${signinErrorPath("again")}`);
}
