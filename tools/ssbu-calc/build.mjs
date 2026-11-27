// Makes src/lib/ultimateKill.data.ts (round 963): Ultimate's fighters, kill moves and stages for the Arcade's
// "Does it kill?", from the Smash Ultimate Calculator by rubendal (https://github.com/rubendal/SSBU-Calculator,
// MIT licence), whose move data is Ultimate Hitboxes' (https://ultimate-hitboxes.com). Matthew approved it as the
// source on 2026-11-27, knowing its limits: the repo doesn't say which game patch its data is from, and its
// author warns that KO percents aren't exact because character models aren't part of the maths.
//
// Run by hand when the calculator's data changes:
//   git clone --depth 1 https://github.com/rubendal/SSBU-Calculator "$DIR"
//   node tools/ssbu-calc/build.mjs "$DIR"
// It only reads the clone's data files (JSON) and js/character.js as text; nothing from it is run.
import fs from "node:fs";

const dir = process.argv[2];
if (!dir) throw new Error("Give the folder of the SSBU-Calculator clone.");
const json = (p) => JSON.parse(fs.readFileSync(`${dir}/${p}`, "utf8").replace(/^﻿/, ""));
const list = (name) => JSON.parse(fs.readFileSync(`${dir}/js/character.js`, "utf8").match(new RegExp(`var ${name} = (\\[[^\\]]*\\]);`))[1]);
const display = list("displayNames");
const folders = list("gameNames");
const hitboxFiles = list("ultHitboxesFilenames");

// Smashy's own Ultimate fighters (src/lib/characters.ts), so every key here has a page and an icon.
const keyOf = (name) => name.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/\.(?=[a-z])/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const chars = fs.readFileSync("src/lib/characters.ts", "utf8");
const ours = new Set(chars.match(/const ULTIMATE = \[([\s\S]*?)\];/)[1].match(/"[^"]+"/g).map((s) => keyOf(s.slice(1, -1))));
const ALIAS = { "r-o-b": "rob", "pac-man": "pac-man" };

const MOVES = { "Forward Smash": "fsmash", "Up Smash": "usmash", "Down Smash": "dsmash", "Forward Tilt": "ftilt", "Up Tilt": "utilt", "Down Tilt": "dtilt", "Dash Attack": "dashAttack", "Neutral Air": "nair", "Forward Air": "fair", "Back Air": "bair", "Up Air": "uair", "Down Air": "dair" };
// How hard a hitbox sends a 100-weight fighter at 100%, to pick a move's strongest hit.
const strength = (h) => ((((100 + h.damage) / 10 + ((100 + h.damage) * h.damage) / 20) * 1.4 * 1 + 18) * h.kbg) / 100 + h.bkb;

const fighters = {};
const moves = {};
const skipped = [];
display.forEach((name, i) => {
  let key = keyOf(name);
  key = ALIAS[key] ?? key;
  if (!ours.has(key)) return skipped.push(name);
  const p = json(`Data/${folders[i]}/data.json`).Params;
  fighters[key] = { weight: p.Weight, gravity: p.Gravity, fallSpeed: p.FallSpeed, flyGravity: p.DamageFlyTopGravity, flyFallSpeed: p.DamageFlyTopFallSpeed };
  const file = json(`Data/ulthitboxes/${hitboxFiles[i]}.json`);
  const mine = {};
  for (const m of file.moves ?? []) {
    const id = MOVES[m.name];
    if (!id) continue;
    const hits = (m.hitboxes ?? [])
      .map((h) => ({ damage: +h.damage, angle: +h.angle, kbg: +h.kbg, bkb: +h.bkb, fkb: +h.fkb, setweight: h.setweight === "true", effect: h.effect ?? "" }))
      // A plain hit that sends by percent: no fixed or set-weight knockback, no bury/paralyse/sleep, no special angles (362+).
      .filter((h) => h.fkb === 0 && !h.setweight && h.kbg > 0 && h.damage > 0 && h.angle <= 361 && !/bury|paralyze|sleep|bind|stop|flower|saving/.test(h.effect));
    if (!hits.length) continue;
    const best = hits.sort((a, b) => strength(b) - strength(a))[0];
    mine[id] = [Math.round(best.damage * 100) / 100, best.angle, best.bkb, best.kbg];
  }
  if (Object.keys(mine).length) moves[key] = mine;
});

// Stages: blast lines from the calculator's stage file; where the main floor ends, read from the same file's collisions by a researcher (round 963).
const STAGES = { "Final Destination": 80, Battlefield: 80, "Small Battlefield": 80, "Pokémon Stadium 2": 93.78, Smashville: 70, "Town & City": 82.5, "Kalos Pokémon League": 80, "Yoshi's Story": 68, "Hollow Bastion": 80, "Northern Cave": 80 };
const all = json("Data/Stages/ssbustagedata.json");
const stages = Object.entries(STAGES).map(([name, edge]) => {
  const s = all.find((x) => x.stage === name);
  if (!s) throw new Error(`stage not found: ${name}`);
  const r = (v) => Math.round(v * 100) / 100;
  return { name, left: r(s.blast_zones[0]), right: r(s.blast_zones[1]), top: r(s.blast_zones[2]), bottom: r(s.blast_zones[3]), edge };
});

const line = (v) => JSON.stringify(v).replace(/"(\w+)":/g, "$1: ").replace(/,/g, ", ");
fs.writeFileSync(
  "src/lib/ultimateKill.data.ts",
  `// MADE BY tools/ssbu-calc/build.mjs: don't edit by hand. Ultimate's fighters, kill moves and stages for the Arcade's
// "Does it kill?", from the Smash Ultimate Calculator by rubendal (github.com/rubendal/SSBU-Calculator, MIT licence;
// its move data is Ultimate Hitboxes', ultimate-hitboxes.com). The repo doesn't say which game patch its data is from.
// A move is [damage, angle, base knockback, knockback growth] of its strongest hit that sends by percent (361 is
// the Sakurai angle). \`flyGravity\` / \`flyFallSpeed\`: the fall used while launched steeply upward.
export type UltFighter = { weight: number; gravity: number; fallSpeed: number; flyGravity: number; flyFallSpeed: number };
export type UltMove = [damage: number, angle: number, base: number, growth: number];
export type UltMoveKey = ${Object.values(MOVES).map((m) => JSON.stringify(m)).join(" | ")};
export type UltStage = { name: string; left: number; right: number; top: number; bottom: number; edge: number };

export const ULT_FIGHTERS: Record<string, UltFighter> = {
${Object.entries(fighters).map(([k, f]) => `  ${JSON.stringify(k)}: ${line(f)},`).join("\n")}
};

export const ULT_MOVES: Record<string, Partial<Record<UltMoveKey, UltMove>>> = {
${Object.entries(moves).map(([k, m]) => `  ${JSON.stringify(k)}: ${line(m)},`).join("\n")}
};

export const ULT_STAGES: UltStage[] = [
${stages.map((s) => `  ${line(s)},`).join("\n")}
];
`,
);
console.log(Object.keys(fighters).length, "fighters,", Object.values(moves).reduce((n, m) => n + Object.keys(m).length, 0), "moves,", stages.length, "stages; not Smashy fighters:", skipped.join(", "));
