// Supabase client for Server Components, Server Actions, and Route Handlers.
// Acts as the signed-in user (or a guest), so row-level security applies.
// Create a new client per request; never store it in a global.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { timedFetch } from "./timedFetch";

export async function createClient() {
  // Database reads depend on who's signed in, so they always happen at request time.
  await connection();
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      // Pages don't wait forever on a stalled database (see timedFetch.ts).
      global: { fetch: timedFetch() },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component, which can't set cookies.
            // Safe to ignore: proxy.ts refreshes sessions.
          }
        },
      },
    },
  );
}

/** The signed-in user's id, or null for guests. Verifies the session token. */
export async function getUserId(): Promise<string | null> {
  // Accounts not configured yet (no Supabase keys): everyone is a guest.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return null;
  // Login state is per-request; tell Next.js not to prerender anything after this point.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
}

/**
 * Like getUserId, but asks Supabase's sign-in service instead of only reading the session token.
 * A deleted or signed-out account fails right away (a token alone stays valid for up to an hour).
 * Use it for anything that changes data (server actions). It costs one extra network request.
 */
export async function getVerifiedUserId(): Promise<string | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return null;
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return error ? null : (data.user?.id ?? null);
}
