// Safety rails from the 2026-11-22 review (round 727). Two lists are kept next to this file; a change
// that grows either one fails here until the list is updated on purpose:
//   UPDATE_GUARDS=1 npx vitest run tests/unit/guards.test.ts
//
// 1. Database migrations run in filename order. Their names are a counter that runs ahead of the
//    calendar (20270125…), so a file named after today's real date would sort BEFORE existing ones and
//    never run in the right place. A new migration must sort after every one already listed.
// 2. createAdminClient() reads and writes past every database rule. Each use was reviewed and found to
//    check who is asking first. A NEW file using it should be a decision, not an accident: say in the
//    round's SPEC entry why it's needed, then add the file to the list.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const update = process.env.UPDATE_GUARDS === "1";
const readList = (file: string) => readFileSync(join(__dirname, file), "utf8").split(/\r?\n/).filter(Boolean);
const writeList = (file: string, lines: string[]) => writeFileSync(join(__dirname, file), lines.join("\n") + "\n");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(e.name) ? [full] : [];
  });
}

describe("database migrations", () => {
  const files = readdirSync(join(root, "supabase", "migrations")).filter((f) => f.endsWith(".sql")).sort();
  it("are named <14 digits>_<name>.sql, each number used once", () => {
    for (const f of files) expect(f).toMatch(/^\d{14}_[a-z0-9_]+\.sql$/);
    const versions = files.map((f) => f.slice(0, 14));
    expect(new Set(versions).size).toBe(versions.length);
  });
  it("a new one sorts after every migration already known", () => {
    if (update) writeList("guards.migrations.txt", files);
    const known = readList("guards.migrations.txt");
    const last = known[known.length - 1];
    const added = files.filter((f) => !known.includes(f));
    for (const f of added) expect(f > last, `${f} sorts before ${last}: give it a number after the newest migration`).toBe(true);
    // A known migration that disappeared was renamed or deleted after it ran on the live database.
    for (const f of known) expect(files, `${f} is gone: applied migrations must not be renamed or removed`).toContain(f);
  });
});

describe("the rule-bypassing database client", () => {
  it("is only used in files already on the list", () => {
    const src = join(root, "src");
    const using = sourceFiles(src)
      .filter((f) => /\bcreateAdminClient\s*\(/.test(readFileSync(f, "utf8")))
      .map((f) => relative(root, f).replace(/\\/g, "/"))
      .filter((f) => f !== "src/lib/supabase/admin.ts")
      .sort();
    if (update) writeList("guards.adminClient.txt", using);
    const known = new Set(readList("guards.adminClient.txt"));
    const added = using.filter((f) => !known.has(f));
    expect(added, "new files use createAdminClient(): check each one confirms who is asking, then update the list (see the top of this file)").toEqual([]);
  });
});
