// `npm run dev:testdb` (round 814): the dev server on the test database. Settings already in the
// environment win over .env.local in Next, so the test project's three keys are passed in and every
// other setting (start.gg, Twitch…) still comes from .env.local. Nothing is printed from the files.
import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";

const LIVE = "pemwbclxvdjqbyomumjc";
if (!existsSync(".env.test.local")) {
  console.error("No .env.test.local yet: see docs/test-database.md.");
  process.exit(1);
}
const env = {};
for (const line of readFileSync(".env.test.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|SUPABASE_SECRET_KEY)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^"(.*)"$/, "$1");
}
if (Object.keys(env).length < 3) {
  console.error(".env.test.local needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY.");
  process.exit(1);
}
if (env.NEXT_PUBLIC_SUPABASE_URL.includes(LIVE)) {
  console.error(".env.test.local points at the live database. Use the test project's settings.");
  process.exit(1);
}
console.log("Dev server on the TEST database.");
const child = spawn(process.platform === "win32" ? "npx.cmd" : "npx", ["next", "dev", ...process.argv.slice(2)], { stdio: "inherit", env: { ...process.env, ...env }, shell: process.platform === "win32" });
child.on("exit", (code) => process.exit(code ?? 0));
