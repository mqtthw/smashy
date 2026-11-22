// Deletes leftover DB-test accounts (smashy-testdb-…@example.com) that a rate-limited or interrupted
// test run didn't clean up. Touches nothing else. Reads keys from .env.local and never prints them.
// Usage: node scripts/cleanup-test-accounts.mjs            (lists what it would delete)
//        node scripts/cleanup-test-accounts.mjs --delete   (deletes them)
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^["']|["']$/g, "")]),
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const TEST = /^smashy-testdb-[0-9a-f]{8}@example\.com$/;

const found = [];
for (let page = 1; ; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  found.push(...data.users.filter((u) => TEST.test(u.email ?? "")));
  if (data.users.length < 1000) break;
}
console.log(`${found.length} leftover test account(s)`);
if (process.argv.includes("--delete")) {
  for (const u of found) {
    const { error } = await admin.auth.admin.deleteUser(u.id);
    console.log(error ? `failed: ${u.email} (${error.message})` : `deleted: ${u.email}`);
  }
}
