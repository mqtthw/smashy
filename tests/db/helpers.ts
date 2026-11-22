// Helpers for database rule tests. These run against the real Supabase project (keys from
// .env.local), create throwaway accounts named "TestDb…", and delete everything they made.
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function loadEnv(): Record<string, string> {
  try {
    return Object.fromEntries(
      readFileSync(new URL("../../.env.local", import.meta.url), "utf8")
        .split(/\r?\n/)
        .filter((l) => /^[A-Z_]+=/.test(l))
        .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
    );
  } catch {
    return {};
  }
}

const env = { ...loadEnv(), ...process.env } as Record<string, string | undefined>;
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SECRET = env.SUPABASE_SECRET_KEY;

/** False when the keys aren't available (e.g. GitHub checks without secrets): the suites skip. */
export const hasDb = Boolean(URL_ && ANON && SECRET);

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
export const admin = (hasDb ? createClient(URL_!, SECRET!, opts) : null) as SupabaseClient;
export const guest = () => createClient(URL_!, ANON!, opts);

export type TestUser = { id: string; c: SupabaseClient };
const made: string[] = [];

/** A signed-in throwaway player. `teen` makes them 15. */
export async function makeUser(label: string, o: { teen?: boolean; city?: string; games?: string[] } = {}): Promise<TestUser> {
  const tag = `TestDb${label}`.slice(0, 30);
  const email = `smashy-testdb-${randomUUID().slice(0, 8)}@example.com`;
  const password = `Test-${randomUUID()}-A1!`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  made.push(data.user.id);
  const year = new Date().getUTCFullYear() - (o.teen ? 15 : 30);
  await admin.from("private_profile_data").insert({ user_id: data.user.id, date_of_birth: `${year}-01-01` });
  // Smashy can be invite-only: test accounts count as invited.
  await admin.from("invite_redemptions").insert({ user_id: data.user.id, code: null });
  const handle = `${label.toLowerCase().replace(/[^a-z0-9_]/g, "")}_${randomUUID().slice(0, 6)}`.slice(0, 20);
  const { error: pe } = await admin.from("profiles").insert({ id: data.user.id, tag, handle, games: o.games ?? ["melee"], home_city: o.city ?? null });
  if (pe) throw pe;
  const c = createClient(URL_!, ANON!, opts);
  const { error: se } = await c.auth.signInWithPassword({ email, password });
  if (se) throw se;
  return { id: data.user.id, c };
}

/** Deletes every account this test file made (their posts, likes, etc. go with them). */
export async function cleanup() {
  for (const id of made.splice(0)) await admin.auth.admin.deleteUser(id);
}
