// Makes src/lib/characterStats.ts from KuroganeHammer.com's Ultimate attribute tables (round 925; Matthew:
// "use https://kuroganehammer.com/ wherever needed"). The numbers are measured values from the game, kept
// by KuroganeHammer; Smashy shows them with credit and a link.
//
// Run it by hand when the tables change (they rarely do now):
//   1. Save the seven pages into a folder, one request each, e.g.
//        for t in Weight FallSpeed RunSpeed WalkSpeed AirSpeed DashSpeed AirAcceleration; do
//          curl -sL "https://kuroganehammer.com/Ultimate/$t" -o "$DIR/$t.html"; sleep 1; done
//   2. node tools/kuroganehammer/build.mjs "$DIR"
// It never fetches anything itself, and it stops if a table doesn't look the way it expects.
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) throw new Error("Give the folder with the saved pages.");

// table file -> [our field, the column's heading on the page]
const TABLES = {
  Weight: ["weight", "WEIGHT"],
  FallSpeed: ["fallSpeed", "MAX FALL SPEED"],
  RunSpeed: ["runSpeed", "MAX RUN SPEED"],
  WalkSpeed: ["walkSpeed", "MAX WALK SPEED"],
  AirSpeed: ["airSpeed", "MAX AIR SPEED"],
  DashSpeed: ["dashSpeed", "INITIAL DASH"],
};

// The same slug rule as src/lib/characters.ts.
const keyOf = (name) =>
  name.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/\.(?=[a-z])/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
// Names the tables spell differently from Smashy, including the site's joke names for the echo fighters.
// The Ice Climbers take Popo's numbers (the one you control). Pokémon Trainer's three Pokémon and Pyra and
// Mythra are separate rows there and one character here, so they're left out.
const ALIAS = {
  rosalina: "rosalina-and-luma",
  "banjo-kazooie": "banjo-and-kazooie",
  "banjo-andaacute-kazooie": "banjo-and-kazooie",
  "game-and-watch": "mr-game-and-watch",
  "m-game-and-watch": "mr-game-and-watch",
  "educated-mario": "dr-mario",
  "pit-but-edgy": "dark-pit",
  "dank-samus": "dark-samus",
  "mii-swordspider": "mii-swordfighter",
  "ice-climbers-popo": "ice-climbers",
  popo: "ice-climbers",
};

const src = fs.readFileSync("src/lib/characters.ts", "utf8");
const roster = new Set(src.match(/const ULTIMATE = \[([\s\S]*?)\];/)[1].match(/"[^"]+"/g).map((s) => keyOf(s.slice(1, -1))));

const cells = (row) => [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((m) => m[1].replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").trim());
const stats = {};
const skipped = new Set();
for (const [file, [field, heading]] of Object.entries(TABLES)) {
  const html = fs.readFileSync(path.join(dir, `${file}.html`), "utf8");
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => cells(m[1]));
  const head = rows.find((r) => r.includes("CHARACTER"));
  if (!head) throw new Error(`${file}: no CHARACTER column`);
  const nameAt = head.indexOf("CHARACTER");
  const valueAt = head.findIndex((h) => h.toUpperCase().startsWith(heading));
  if (valueAt < 0) throw new Error(`${file}: no "${heading}" column (found: ${head.join(" | ")})`);
  let n = 0;
  for (const r of rows) {
    if (r === head || r.length <= valueAt) continue;
    const value = Number(r[valueAt]);
    if (!r[nameAt] || !Number.isFinite(value)) continue;
    const k = keyOf(r[nameAt]);
    const key = ALIAS[k] ?? k;
    if (!roster.has(key)) { skipped.add(r[nameAt]); continue; }
    (stats[key] ??= {})[field] = value;
    n++;
  }
  if (n < 60) throw new Error(`${file}: only ${n} characters read`);
  console.log(`${file}: ${n} characters`);
}
console.log("Not on Smashy's roster under that name (left out):", [...skipped].join(", ") || "none");
console.log("On the roster with no numbers:", [...roster].filter((k) => !stats[k]).join(", ") || "none");

const order = Object.values(TABLES).map(([f]) => f);
const lines = Object.keys(stats).sort().map((k) => `  ${JSON.stringify(k)}: { ${order.filter((f) => stats[k][f] !== undefined).map((f) => `${f}: ${stats[k][f]}`).join(", ")} },`);
fs.writeFileSync(
  "src/lib/characterStats.ts",
  `// MADE BY tools/kuroganehammer/build.mjs: don't edit by hand. Ultimate characters' measured attributes from
// KuroganeHammer.com's tables (https://kuroganehammer.com/Ultimate/Attributes), shown with credit.
export type CharacterStats = { ${order.map((f) => `${f}?: number`).join("; ")} };

export const ULTIMATE_STATS: Record<string, CharacterStats> = {
${lines.join("\n")}
};
`,
);
console.log(`Wrote ${lines.length} characters.`);
