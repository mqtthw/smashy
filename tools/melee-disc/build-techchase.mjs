// Makes src/lib/techChase.data.ts (round 954): each opponent's tech and getup frames for the Arcade's
// tech-chase trainer, read from a Melee disc image (see disc.mjs: numbers only, nothing from the disc is kept).
//
//   node tools/melee-disc/build-techchase.mjs "<path to the NTSC 1.02 disc image>"
//
// How the script's frames become the frames players count (checked for Fox, Falco, Marth, Sheik and Captain
// Falcon against fightcore.gg's tables, which match on every getup roll and getup attack):
// - a getup (entered by a button press while lying down): the state lasts one frame less than its animation,
//   intangibility that the script ends at frame N covers frames up to N - 1, and a hit that is cleared at
//   frame N is out up to N - 1;
// - a tech or the missed-tech bounce (entered on landing): the state lasts the animation's length and
//   intangibility ended at frame N covers frames up to N (26 or 40 frames, intangible 1-20, as SmashWiki and
//   fightcore.gg both give).
// - A roll's `path` (round 973): how far along the roll the character is on each of its frames (0 = where it
//   started, 1 = where it ends), from the movement of the animation's root joint (joint 1, "TransN", its Z
//   position: figatree.mjs), so the trainer's figure travels as the game's does. Frame k of the state is the
//   animation's frame k. Only the numbers of that one joint are read.
import fs from "node:fs";
import { actions, openDisc, windows } from "./disc.mjs";
import { jointPositions } from "./figatree.mjs";

const path = process.argv[2];
if (!path) throw new Error("Give the path to the disc image.");
const disc = openDisc(path);
if (disc.id !== "GALE01" || disc.version !== 2) throw new Error(`This is ${disc.id} version byte ${disc.version}; the numbers were checked for GALE01 version 2 (NTSC 1.02).`);

const CHARS = { fox: "Fx", falco: "Fc", marth: "Ms", sheik: "Sk", "captain-falcon": "Ca", peach: "Pe", jigglypuff: "Pr" };
const out = {};
for (const [who, code] of Object.entries(CHARS)) {
  const acts = actions(disc, code);
  const get = (name) => {
    const a = acts.get(name);
    if (!a || !a.frames) throw new Error(`${who}: ${name} not found`);
    return { frames: a.frames, ...windows(a) };
  };
  const landed = (name) => {
    const a = get(name);
    return { frames: a.frames, intangible: a.intangible ? [Math.max(1, a.intangible[0]), a.intangible[1]] : null };
  };
  // How far along the roll the character is on each frame of the state (frames 1..n), 0 to 1, two decimals.
  const path = (name, n) => {
    const a = acts.get(name);
    const z = a.anim && jointPositions(a.anim, 1)?.z;
    if (!z) throw new Error(`${who}: ${name} has no root movement`);
    const total = z[z.length - 1] - z[0];
    if (Math.abs(total) < 1) throw new Error(`${who}: ${name} doesn't travel`);
    return Array.from({ length: n }, (_, i) => Math.round(((z[Math.min(i + 1, z.length - 1)] - z[0]) / total) * 100) / 100);
  };
  const getup = (name) => {
    const a = get(name);
    return { frames: a.frames - 1, intangible: a.intangible ? [Math.max(1, a.intangible[0]), a.intangible[1] - 1] : null, ...(a.hits.length ? { hits: a.hits.map(([from, to]) => [from, to - 1]) } : {}) };
  };
  const rolled = (w, name) => ({ ...w, path: path(name, w.frames) });
  const side = (s) => ({ stand: getup(`DownStand${s}`), attack: getup(`DownAttack${s}`), forward: rolled(getup(`DownFoward${s}`), `DownFoward${s}`), back: rolled(getup(`DownBack${s}`), `DownBack${s}`) });
  const f = landed("PassiveStandF");
  const b = landed("PassiveStandB");
  if (JSON.stringify(f) !== JSON.stringify(b)) throw new Error(`${who}: forward and backward tech rolls differ`);
  out[who] = { tech: landed("Passive"), techRoll: { ...f, path: path("PassiveStandF", f.frames), pathBack: path("PassiveStandB", b.frames) }, bounce: { up: get("DownBoundU").frames, down: get("DownBoundD").frames }, up: side("U"), down: side("D") };
}

// The characters you can chase as (round 974, Matthew: "let users play as captain falcon, sheik, fox, falco, and
// peach"), with Marth: their standing grab and the move each hits with, as Matthew picked ("for captain falcon use
// jab, for sheik use jab, for fox use up smash, for falco do shine, and peach do jab"; Marth's down tilt became his
// jab in round 975: "replace marth's down tilt with his jab").
// - Grab ("Catch"): the script makes its grab boxes at frame N and a command keeps them two frames, so they are out
//   on N+1 and N+2 (Marth: 7-8, as SmashWiki gives); the state lasts its animation (30 frames for all six).
// - The hit: entered by a button, so a box made at frame N is out from N (from frame 1 when N is 0) and a box
//   cleared at frame N is out up to N - 1 (as for getups); the move lasts until the frame before the script lets
//   the character act again ("5C"), or its animation less one when that comes later or never.
// - Falco's shine ("SpecialLwStart", 4 frames, out on frame 1) is counted as jump-cancelled: free on frame 4, when
//   the start ends and a jump can cancel it (held, it goes on into its loop and an 18-frame end).
const CHASERS = { marth: "Ms", "captain-falcon": "Ca", sheik: "Sk", fox: "Fx", falco: "Fc", peach: "Pe" };
const HIT = { marth: ["jab", "Attack11"], "captain-falcon": ["jab", "Attack11"], sheik: ["jab", "Attack11"], fox: ["usmash", "AttackHi4"], falco: ["shine", "SpecialLwStart"], peach: ["jab", "Attack11"] };
const chasers = {};
for (const [who, code] of Object.entries(CHASERS)) {
  const acts = actions(disc, code);
  const c = acts.get("Catch");
  const [move, state] = HIT[who];
  const t = acts.get(state);
  const box = c.events.find((e) => e.what === "hitbox")?.frame;
  const hit = t && windows(t).hits[0];
  if (!box || !hit) throw new Error(`${who}: grab or ${state} not read`);
  const free = t.events.find((e) => e.what === "free")?.frame;
  const total = move === "shine" ? t.frames - 1 : Math.min(free ? free - 1 : Infinity, t.frames - 1);
  chasers[who] = { grab: { active: [box + 1, box + 2], total: c.frames }, tilt: { active: [Math.max(1, hit[0]), Math.max(1, hit[1] - 1)], total }, move, state };
}

const line = (v) => JSON.stringify(v).replace(/"(\w+)":/g, "$1: ").replace(/,/g, ", ");
fs.writeFileSync(
  "src/lib/techChase.data.ts",
  `// MADE BY tools/melee-disc/build-techchase.mjs: don't edit by hand. Each opponent's tech and getup frames for
// the Arcade's tech-chase trainer, read from the game itself (NTSC 1.02). Frames are counted as players count
// them (1 = the state's first frame); \`up\` is lying on the back, \`down\` on the front; \`forward\` and \`back\`
// are the getup rolls; \`hits\` are the frames a getup attack hits on; a roll's \`path\` is how far along it the
// character is on each frame (0 to 1), from the animation's own movement (\`pathBack\`: the backward tech roll).
export type Win = { frames: number; intangible: [number, number] | null; hits?: [number, number][]; path?: number[]; pathBack?: number[] };
export type Getups = { stand: Win; attack: Win; forward: Win; back: Win };
export type TechData = { tech: Win; techRoll: Win; bounce: { up: number; down: number }; up: Getups; down: Getups };

export const TECH_VICTIMS = ${JSON.stringify(Object.keys(out))} as const;
export type TechVictim = (typeof TECH_VICTIMS)[number];

/** The characters you can play as, and their standing grab and down tilt: the frames each is out, and how long it lasts. */
export type ChaserMove = { active: [number, number]; total: number };
export const CHASERS = ${JSON.stringify(Object.keys(chasers))} as const;
export type Chaser = (typeof CHASERS)[number];
/** \`tilt\` is the move each hits with (\`move\` names it, \`state\` is the game's name for it). */
export const CHASER_MOVES: Record<Chaser, { grab: ChaserMove; tilt: ChaserMove; move: "dtilt" | "jab" | "usmash" | "shine"; state: string }> = {
${Object.entries(chasers).map(([who, m]) => `  ${JSON.stringify(who)}: ${line(m)},`).join("\n")}
};

export const TECH_DATA: Record<TechVictim, TechData> = {
${Object.entries(out)
  .map(([who, d]) => `  ${JSON.stringify(who)}: {\n    tech: ${line(d.tech)},\n    techRoll: ${line(d.techRoll)},\n    bounce: ${line(d.bounce)},\n    up: ${line(d.up)},\n    down: ${line(d.down)},\n  },`)
  .join("\n")}
};
`,
);
console.log("wrote", Object.keys(out).length, "characters");
