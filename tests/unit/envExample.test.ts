// Every setting the code reads is described in .env.example (round 739). A setting missing on Vercel
// switches its feature off quietly, so the one list people set a server up from has to be complete.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
// Set by Node, Next or Vercel themselves, not by whoever sets Smashy up.
const PROVIDED = new Set(["NODE_ENV", "NEXT_RUNTIME", "PORT", "VERCEL_PROJECT_PRODUCTION_URL"]);

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name === "node_modules" || e.name.startsWith(".")) return [];
    const full = join(dir, e.name);
    return e.isDirectory() ? files(full) : /\.(ts|tsx|mjs)$/.test(e.name) ? [full] : [];
  });
}

describe(".env.example", () => {
  it("names every setting the code reads", () => {
    const example = new Set([...readFileSync(join(root, ".env.example"), "utf8").matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]));
    const used = new Set<string>();
    for (const f of [...files(join(root, "src")), ...files(join(root, "scripts")), join(root, "next.config.ts")]) {
      for (const m of readFileSync(f, "utf8").matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) used.add(m[1]);
    }
    const missing = [...used].filter((name) => !example.has(name) && !PROVIDED.has(name)).sort();
    expect(missing, "add these to .env.example with a line saying what each is for").toEqual([]);
  });
});
