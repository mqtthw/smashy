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
import fs from "node:fs";
import { actions, openDisc, windows } from "./disc.mjs";

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
  const getup = (name) => {
    const a = get(name);
    return { frames: a.frames - 1, intangible: a.intangible ? [Math.max(1, a.intangible[0]), a.intangible[1] - 1] : null, ...(a.hits.length ? { hits: a.hits.map(([from, to]) => [from, to - 1]) } : {}) };
  };
  const side = (s) => ({ stand: getup(`DownStand${s}`), attack: getup(`DownAttack${s}`), forward: getup(`DownFoward${s}`), back: getup(`DownBack${s}`) });
  const f = landed("PassiveStandF");
  const b = landed("PassiveStandB");
  if (JSON.stringify(f) !== JSON.stringify(b)) throw new Error(`${who}: forward and backward tech rolls differ`);
  out[who] = { tech: landed("Passive"), techRoll: f, bounce: { up: get("DownBoundU").frames, down: get("DownBoundD").frames }, up: side("U"), down: side("D") };
}

const line = (v) => JSON.stringify(v).replace(/"(\w+)":/g, "$1: ").replace(/,/g, ", ");
fs.writeFileSync(
  "src/lib/techChase.data.ts",
  `// MADE BY tools/melee-disc/build-techchase.mjs: don't edit by hand. Each opponent's tech and getup frames for
// the Arcade's tech-chase trainer, read from the game itself (NTSC 1.02). Frames are counted as players count
// them (1 = the state's first frame); \`up\` is lying on the back, \`down\` on the front; \`forward\` and \`back\`
// are the getup rolls; \`hits\` are the frames a getup attack hits on.
export type Win = { frames: number; intangible: [number, number] | null; hits?: [number, number][] };
export type Getups = { stand: Win; attack: Win; forward: Win; back: Win };
export type TechData = { tech: Win; techRoll: Win; bounce: { up: number; down: number }; up: Getups; down: Getups };

export const TECH_VICTIMS = ${JSON.stringify(Object.keys(out))} as const;
export type TechVictim = (typeof TECH_VICTIMS)[number];

export const TECH_DATA: Record<TechVictim, TechData> = {
${Object.entries(out)
  .map(([who, d]) => `  ${JSON.stringify(who)}: {\n    tech: ${line(d.tech)},\n    techRoll: ${line(d.techRoll)},\n    bounce: ${line(d.bounce)},\n    up: ${line(d.up)},\n    down: ${line(d.down)},\n  },`)
  .join("\n")}
};
`,
);
console.log("wrote", Object.keys(out).length, "characters");
