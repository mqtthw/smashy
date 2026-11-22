// Round 514: the browser gets only English built in; Spanish, Japanese and French load when someone
// uses them. All four together were 1 MB of script on every page. This walks the imports of every
// "use client" file and fails if any of them reaches a file that holds every language.
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const ROOT = resolve(__dirname, "../..");
const SRC = join(ROOT, "src");
// Files that bring in every language (client.tsx fetches es/ja/fr itself with import(), on demand).
const ALL_LANGUAGES = ["src/lib/i18n/core.ts", "src/lib/i18n/es.ts", "src/lib/i18n/ja.ts", "src/lib/i18n/fr.ts"];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}

function resolveImport(from: string, spec: string): string | null {
  const base = spec.startsWith("@/") ? join(SRC, spec.slice(2)) : spec.startsWith(".") ? resolve(dirname(from), spec) : null;
  if (!base) return null; // a package
  for (const c of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

/** Imports that end up in the browser bundle: not `import type`, not `import()` (loaded on demand). */
const importsOf = new Map<string, string[]>(); // each file read once, not once per browser file that reaches it
function bundledImports(file: string): string[] {
  const had = importsOf.get(file);
  if (had) return had;
  const code = readFileSync(file, "utf8");
  const out: string[] = [];
  const re = /^\s*(import|export)\s+(?!type\s)(?:[\s\S]*?\sfrom\s+)?["']([^"']+)["']/gm;
  for (const m of code.matchAll(re)) {
    const r = resolveImport(file, m[2]);
    if (r) out.push(r);
  }
  importsOf.set(file, out);
  return out;
}

const isClient = (code: string) => /^\s*(?:\/\/[^\n]*\n\s*)*["']use client["']/.test(code);
const isServerActions = (code: string) => /^\s*(?:\/\/[^\n]*\n\s*)*["']use server["']/.test(code);

describe("languages in the browser", () => {
  it("no browser file pulls in every language", () => {
    const rel = (p: string) => relative(ROOT, p).replaceAll("\\", "/");
    const bad: string[] = [];
    for (const start of files(SRC).filter((f) => isClient(readFileSync(f, "utf8")))) {
      const seen = new Map<string, string | null>([[start, null]]);
      const queue = [start];
      while (queue.length) {
        const f = queue.shift()!;
        if (ALL_LANGUAGES.includes(rel(f))) {
          const path: string[] = [];
          for (let at: string | null = f; at; at = seen.get(at) ?? null) path.unshift(rel(at));
          bad.push(path.join(" → "));
          break;
        }
        for (const next of bundledImports(f)) {
          if (seen.has(next)) continue;
          // Server actions reach the browser as references only; their own imports stay on the server.
          if (isServerActions(readFileSync(next, "utf8"))) continue;
          seen.set(next, f);
          queue.push(next);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
