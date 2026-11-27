// Makes src/lib/meleeMoves.data.ts (round 955): the frames and knockback of twelve characters' ground moves,
// aerials and grabs, for the Arcade's knowledge games, read from a Melee disc image (see disc.mjs: numbers only,
// nothing from the disc is kept).
//
//   node tools/melee-disc/build-moves.mjs "<path to the NTSC 1.02 disc image>"
//
// How a move's script becomes the frames players count (checked against SmashWiki and fightcore.gg for Fox's up
// smash, up air and jab, Marth's down tilt and grab, the knee, and Sheik's and Ganondorf's forward airs):
// - a hitbox made at script frame N is out on frame N, and hitboxes cleared at frame N were last out on N - 1;
// - "free to act" at script frame N means the move keeps the character busy for N - 1 frames; without it (or when
//   it comes after the animation ends) the move lasts one frame less than its animation;
// - a grab's boxes are out one frame after the script makes them, for two frames, and the grab lasts its whole
//   animation (Marth: 7-8 of 30).
// `kill` is the move's strongest hit that sends by percent (not a fixed, weight-set knockback); smash attacks
// are uncharged.
import fs from "node:fs";
import { actions, openDisc } from "./disc.mjs";

const path = process.argv[2];
if (!path) throw new Error("Give the path to the disc image.");
const disc = openDisc(path);
if (disc.id !== "GALE01" || disc.version !== 2) throw new Error(`This is ${disc.id} version byte ${disc.version}; the numbers were checked for GALE01 version 2 (NTSC 1.02).`);

const CHARS = { fox: "Fx", falco: "Fc", marth: "Ms", sheik: "Sk", "captain-falcon": "Ca", peach: "Pe", jigglypuff: "Pr", pikachu: "Pk", samus: "Ss", ganondorf: "Gn", luigi: "Lg", "dr-mario": "Dr" };
const MOVES = { jab: "Attack11", dashAttack: "AttackDash", ftilt: "AttackS3S", utilt: "AttackHi3", dtilt: "AttackLw3", fsmash: "AttackS4", usmash: "AttackHi4", dsmash: "AttackLw4", nair: "AttackAirN", fair: "AttackAirF", bair: "AttackAirB", uair: "AttackAirHi", dair: "AttackAirLw", grab: "Catch", dashGrab: "CatchDash" };

const out = {};
for (const [who, code] of Object.entries(CHARS)) {
  const acts = actions(disc, code);
  out[who] = {};
  for (const [key, action] of Object.entries(MOVES)) {
    const a = acts.get(action);
    const hits = a?.events.filter((e) => e.what === "hitbox") ?? [];
    if (!a?.frames || !hits.length) continue; // e.g. a move made of several actions
    const start = hits[0].frame;
    if (key === "grab" || key === "dashGrab") {
      out[who][key] = { start: start + 1, end: start + 2, total: a.frames, damage: 0, kill: null };
      continue;
    }
    const free = a.events.find((e) => e.what === "free")?.frame;
    const total = Math.min(a.frames - 1, free ? free - 1 : Infinity);
    const lastClear = a.events.filter((e) => e.what === "clear").at(-1)?.frame;
    const end = Math.min(total, lastClear && lastClear > start ? lastClear - 1 : total);
    const byPercent = hits.filter((h) => h.set === 0 && h.growth > 0).sort((x, y) => y.damage - x.damage || y.base - x.base)[0];
    out[who][key] = {
      start,
      end,
      total,
      damage: Math.max(...hits.map((h) => h.damage)),
      kill: byPercent ? { damage: byPercent.damage, angle: byPercent.angle, base: byPercent.base, growth: byPercent.growth } : null,
    };
  }
}

const line = (v) => JSON.stringify(v).replace(/"(\w+)":/g, "$1: ").replace(/,/g, ", ");
fs.writeFileSync(
  "src/lib/meleeMoves.data.ts",
  `// MADE BY tools/melee-disc/build-moves.mjs: don't edit by hand. Twelve characters' moves as the game has them
// (NTSC 1.02), for the Arcade's knowledge games. \`start\`-\`end\`: the frames the move can hit on; \`total\`: the
// frames it keeps the character busy (in the air: without landing); \`damage\`: its strongest hit; \`kill\`: that
// hit's knockback numbers when it sends by percent (\`angle\` 361 is the Sakurai angle). Smash attacks uncharged.
export type KillData = { damage: number; angle: number; base: number; growth: number };
export type MoveData = { start: number; end: number; total: number; damage: number; kill: KillData | null };

export const MOVE_KEYS = ${JSON.stringify(Object.keys(MOVES))} as const;
export type MoveKey = (typeof MOVE_KEYS)[number];
export const MOVE_CHARS = ${JSON.stringify(Object.keys(out))} as const;
export type MoveChar = (typeof MOVE_CHARS)[number];

export const MELEE_MOVES: Record<MoveChar, Partial<Record<MoveKey, MoveData>>> = {
${Object.entries(out)
  .map(([who, moves]) => `  ${JSON.stringify(who)}: {\n${Object.entries(moves).map(([k, m]) => `    ${k}: ${line(m)},`).join("\n")}\n  },`)
  .join("\n")}
};
`,
);
console.log(Object.entries(out).map(([w, m]) => `${w} ${Object.keys(m).length}`).join(", "));
