// Runs before every database test file (vitest.db.config.mts, round 814). When `.env.test.local`
// exists, its test project's keys are put in place first, so every test file (and the site code they
// call) uses the test database instead of the live one. Without it, the tests use .env.local (the live
// database) as before, and say so.
import { existsSync, readFileSync } from "node:fs";
import { parseEnvFile, testDbSettings } from "../../src/lib/testDb";

const FILE = new URL("../../.env.test.local", import.meta.url);
const g = globalThis as { __smashyDbNotice?: boolean };

if (existsSync(FILE)) {
  const env = parseEnvFile(readFileSync(FILE, "utf8"));
  const settings = testDbSettings(env);
  // Pointing at the live project is a mistake to stop on. A file still being filled in (no secret key
  // yet) just isn't used: the tests carry on as before rather than failing for everyone mid-setup.
  if ("problem" in settings && env.NEXT_PUBLIC_SUPABASE_URL?.includes("pemwbclxvdjqbyomumjc")) throw new Error(`Test database: ${settings.problem}`);
  if ("problem" in settings) {
    if (!g.__smashyDbNotice) console.warn(`Database tests: .env.test.local isn't finished (${settings.problem}), so these run against the LIVE database`);
  } else {
    Object.assign(process.env, settings.ok);
    if (!g.__smashyDbNotice) console.log("Database tests: using the test project from .env.test.local");
  }
} else if (!g.__smashyDbNotice) {
  console.warn("Database tests: no .env.test.local, so these run against the LIVE database (see docs/test-database.md)");
}
g.__smashyDbNotice = true;
