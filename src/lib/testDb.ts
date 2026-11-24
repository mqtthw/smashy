// The test database (round 814, Louis's advice via Matthew): a second, free Supabase project that the
// database tests and an optional dev server use, so testing never writes into the live database.
// Its three keys live in `.env.test.local` (ignored by git, like .env.local). Plain logic, so it can be tested.

/** The live project's id: nothing in `.env.test.local` may point here. */
export const LIVE_PROJECT_REF = "pemwbclxvdjqbyomumjc";

/** The KEY=value lines of an env file, as a map (comments and blank lines skipped). */
export function parseEnvFile(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^"(.*)"$/, "$1");
  }
  return out;
}

/** The test project's settings, or why they can't be used. Only the database settings are taken. */
export function testDbSettings(env: Record<string, string>): { ok: Record<string, string> } | { problem: string } {
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!url || !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || !env.SUPABASE_SECRET_KEY) {
    return { problem: ".env.test.local needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY" };
  }
  if (url.includes(LIVE_PROJECT_REF)) return { problem: ".env.test.local points at the live database; it must be the test project's" };
  return {
    ok: {
      NEXT_PUBLIC_SUPABASE_URL: url,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      SUPABASE_SECRET_KEY: env.SUPABASE_SECRET_KEY,
    },
  };
}
