// Which sign-in options Supabase has switched on (round 658). The Google button shows only once Matthew
// turns Google on in Supabase (docs/google-signin-and-email-setup.md), with no code change or deploy.
// Supabase answers this at /auth/v1/settings with the public key; it's kept a few minutes for every server.
import "server-only";
import { cacheLife } from "next/cache";

export type AuthProviders = { google: boolean };

/** Reads Supabase's public settings; anything unexpected counts as "off" (never a broken button). */
export async function getAuthProviders(): Promise<AuthProviders> {
  "use cache: remote";
  cacheLife("minutes");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { google: false };
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return { google: false };
    const data = (await res.json()) as { external?: Record<string, unknown> };
    return { google: data.external?.google === true };
  } catch {
    return { google: false };
  }
}
