// Refreshes the Supabase login session on every request (called from src/proxy.ts).
// Pattern from Supabase's official Next.js guide. Guests are never redirected:
// Smashy is browsable without an account.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Supabase keeps a login in cookies named sb-<project>-auth-token (split into .0, .1… when long). */
export function hasAuthCookie(names: string[]): boolean {
  return names.some((n) => n.startsWith("sb-") && n.includes("-auth-token"));
}

/** Refreshes the session; `signedIn` is true only for a login Supabase verified (not just a cookie's name). */
export async function updateSession(request: NextRequest): Promise<{ response: NextResponse; signedIn: boolean }> {
  let supabaseResponse = NextResponse.next({ request });

  // Supabase not configured yet: let the app run without accounts.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return { response: supabaseResponse, signedIn: false };
  }
  // No login cookie (guests, crawlers, link previews): nothing to refresh or check (round 655). Most
  // requests are these, and setting up the client and checking the login was a third of Smashy's CPU.
  if (!hasAuthCookie(request.cookies.getAll().map((c) => c.name))) {
    return { response: supabaseResponse, signedIn: false };
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    },
  );

  // Don't add code between createServerClient and getClaims(): it can cause random logouts.
  const { data } = await supabase.auth.getClaims();

  // Return supabaseResponse as-is so the refreshed cookies reach the browser.
  return { response: supabaseResponse, signedIn: !!data?.claims?.sub };
}
