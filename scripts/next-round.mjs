// Prints the next round number: one more than the highest "## Round N" heading in SPEC.md.
// Several sessions push to main, and picking the number by eye kept colliding (eight "renumbered"
// commits by 2026-11-22). Run it right after `git pull`, just before writing the SPEC entry:
//   git pull && node scripts/next-round.mjs
import { readFileSync } from "node:fs";

const rounds = [...readFileSync("SPEC.md", "utf8").matchAll(/^## Round (\d+)\b/gm)].map((m) => Number(m[1]));
if (!rounds.length) {
  console.error("No '## Round N' headings found in SPEC.md.");
  process.exit(1);
}
console.log(Math.max(...rounds) + 1);
