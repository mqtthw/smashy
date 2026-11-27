// Makes src/lib/ultimateMoves.data.ts (round 968): Ultimate's move frames for the Arcade's knowledge quizzes
// (Which is faster?, Guess the move, Which is safer on shield?), from the same approved source as
// ultimateKill.data.ts: the Smash Ultimate Calculator by rubendal (https://github.com/rubendal/SSBU-Calculator, MIT
// licence), whose per-fighter files (Data/<fighter>/data.json) come from Ultimate Hitboxes' Data Viewer scripts.
//
// Run by hand when the calculator's data changes:
//   git clone --depth 1 https://github.com/rubendal/SSBU-Calculator "$DIR"
//   node tools/ssbu-calc/build-frames.mjs "$DIR"
// It only reads the clone's JSON files and js/character.js as text; nothing from it is run.
//
// How the numbers are read (checked on 2026-11-27 against ultimateframedata.com for every Mario and Fox normal: the
// frames all agree; on shield, Mario's all agree and two of Fox's are a frame apart):
// - Frames and totals: Ultimate Hitboxes' file per fighter (Data/ulthitboxes/*.json), which every fighter has. A
//   hitbox lists the frames it is out on; its "faf" is the move's total frames. Only the plain move counts (by its
//   exact name: "Forward Smash", not "Forward Smash (Up)" or a fighter's special versions).
// - Landing lag: the fighter's own stats (Data/<fighter>/data.json, "NairLandingLag" and so on).
// - On shield (the calculator's own formula, js/formulas.js, ShieldAdvantage): shield stun is
//   floor(damage x 0.8 x m x the hit's own multiplier + 3) - 1, with m 0.725 for smash attacks, 0.33 for aerials,
//   1 otherwise (both sides' shield hitlag is the same, so it cancels). On the ground: the frame it hits - total
//   + shield stun. An aerial is taken as hitting just before it lands: shield stun - landing lag.
//   Given only for moves that are one swing (early and late parts with no gap between them), and since round 993
//   each move at its safest: on the ground, the best of every hitbox hitting on its last frame out with its own
//   damage; an aerial with its strongest part. (Until round 993 a ground move was counted from the first frame it
//   can hit, as ultimateframedata.com counts it; on 2026-11-27 that matched ultimateframedata.com for Mario, Fox,
//   Pikachu, Falco, Ganondorf and Bowser to within a frame, which checks the formula the safest numbers use too.)
//   A hit's own multiplier is only listed in the fuller move files (Data/<fighter>/data.json), which 20 fighters
//   have; among their normal moves only dash attacks and one forward smash (Corrin's) have one. Other fighters'
//   moves can have one too (Mega Man's down air: -9 by the formula, +1 on ultimateframedata.com), so since round 992
//   only those 20 fighters' moves get an on-shield number.
import fs from "node:fs";

const dir = process.argv[2];
if (!dir) throw new Error("Give the folder of the SSBU-Calculator clone.");
const json = (p) => JSON.parse(fs.readFileSync(`${dir}/${p}`, "utf8").replace(/^﻿/, ""));
const list = (name) => JSON.parse(fs.readFileSync(`${dir}/js/character.js`, "utf8").match(new RegExp(`var ${name} = (\\[[^\\]]*\\]);`))[1]);
const display = list("displayNames");
const folders = list("gameNames");
const hitboxFiles = list("ultHitboxesFilenames");

// Smashy's own Ultimate fighters (src/lib/characters.ts), the same way build.mjs matches them.
const keyOf = (name) => name.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/\.(?=[a-z])/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const chars = fs.readFileSync("src/lib/characters.ts", "utf8");
const ours = new Set(chars.match(/const ULTIMATE = \[([\s\S]*?)\];/)[1].match(/"[^"]+"/g).map((s) => keyOf(s.slice(1, -1))));
const ALIAS = { "r-o-b": "rob" };

const NAMES = { "Jab 1": "jab", "Dash Attack": "dashAttack", "Forward Tilt": "ftilt", "Up Tilt": "utilt", "Down Tilt": "dtilt", "Forward Smash": "fsmash", "Up Smash": "usmash", "Down Smash": "dsmash", "Neutral Air": "nair", "Forward Air": "fair", "Back Air": "bair", "Up Air": "uair", "Down Air": "dair", Grab: "grab", "Dash Grab": "dashGrab" };
// The fuller files' names for the same moves, for the shield-stun multipliers.
const TYPES = { "Dash Attack": "dashAttack", Ftilt: "ftilt", Utilt: "utilt", Dtilt: "dtilt", Fsmash: "fsmash", Usmash: "usmash", Dsmash: "dsmash", Nair: "nair", Fair: "fair", Bair: "bair", Uair: "uair", Dair: "dair" };
const AERIAL_LAG = { nair: "NairLandingLag", fair: "FairLandingLag", bair: "BairLandingLag", uair: "UairLandingLag", dair: "DairLandingLag" };
const SMASH = ["fsmash", "usmash", "dsmash"];
const r2 = (v) => Math.round(v * 100) / 100;
const shieldStun = (damage, mult, kind) => Math.floor(damage * 0.8 * (kind === "smash" ? 0.725 : kind === "aerial" ? 0.33 : 1) * mult + 3) - 1;
/** Runs of following frames: [1,2,3,7,8] -> [[1,3],[7,8]]. */
const runs = (frames) => {
  const out = [];
  for (const f of [...frames].sort((a, b) => a - b)) {
    const last = out.at(-1);
    if (last && f <= last[1] + 1) last[1] = Math.max(last[1], f);
    else out.push([f, f]);
  }
  return out;
};

const out = {};
const skipped = [];
let fuller = 0;
display.forEach((name, i) => {
  let key = keyOf(name);
  key = ALIAS[key] ?? key;
  if (!ours.has(key)) return skipped.push(name);
  const data = json(`Data/${folders[i]}/data.json`);
  const params = data.Params;
  // Shield-stun multipliers, where the fuller file has the moves: the strongest box's, per move.
  const mults = {};
  for (const t of data.MoveTypes ?? []) {
    const id = TYPES[t.Type];
    if (!id) continue;
    const boxes = t.Moves.filter((m) => !/angled|landing/i.test(m.Name?.EN ?? "")).flatMap((m) => m.Hitboxes);
    if (boxes.length) mults[id] = boxes.reduce((a, b) => (b.Damage > a.Damage ? b : a)).ShieldstunMultiplier ?? 1;
  }
  const known = Object.keys(mults).length > 0;
  if (known) fuller++;
  const file = json(`Data/ulthitboxes/${hitboxFiles[i]}.json`);
  const mine = {};
  for (const m of file.moves ?? []) {
    const id = NAMES[m.name];
    if (!id || mine[id]) continue;
    const total = Number(m.faf);
    if (!(total > 0)) continue;
    if (id === "grab" || id === "dashGrab") {
      const frames = (m.grabs ?? []).flatMap((g) => g.frames ?? []);
      if (!frames.length) continue;
      const [[from, to]] = runs(frames);
      mine[id] = { start: from, end: to, total, damage: 0, hits: [[from, to, 0]], landing: null, shield: null };
      continue;
    }
    // Each run of frames a box is out on, with its strongest box; overlapping runs become one hit.
    const windows = [];
    for (const h of m.hitboxes ?? []) {
      const damage = Number(h.damage);
      if (!(damage > 0) || !h.frames?.length) continue;
      for (const [from, to] of runs(h.frames)) windows.push({ from, to, damage });
    }
    if (!windows.length) continue;
    const hits = [];
    for (const w of windows.sort((a, b) => a.from - b.from || a.to - b.to)) {
      const last = hits.at(-1);
      if (last && w.from <= last.to) {
        last.to = Math.max(last.to, w.to);
        last.damage = Math.max(last.damage, w.damage);
      } else hits.push({ ...w });
    }
    const kind = AERIAL_LAG[id] ? "aerial" : SMASH.includes(id) ? "smash" : "ground";
    const landing = kind === "aerial" ? (params[AERIAL_LAG[id]] ?? null) : null;
    const oneSwing = hits.every((h, j) => j === 0 || h.from === hits[j - 1].to + 1);
    const top = hits.reduce((a, b) => (b.damage > a.damage ? b : a));
    let shield = null;
    // Only fighters whose fuller file lists the multipliers (round 992): Mega Man's down air was given -9 with no
    // multiplier to see, where ultimateframedata.com says +1. Others get no on-shield number, not a guessed one.
    const mult = known ? (mults[id] ?? 1) : null;
    if (oneSwing && id !== "jab" && mult !== null) {
      if (kind === "aerial") {
        // At its safest: the strongest part, just before landing.
        shield = landing === null ? null : shieldStun(top.damage, mult, kind) - landing;
      } else {
        // At its safest (round 993, Matthew: "the safest/best spacing possible hit of each move"): of every hitbox,
        // the one and the frame that leave the attacker least behind, so a box's last frame out ("meaty") with its
        // own damage. Each box's own window, not the merged hits, so a strong early part isn't counted late.
        shield = Math.max(...windows.map((w) => w.to - total + shieldStun(w.damage, mult, kind)));
      }
    }
    mine[id] = { start: hits[0].from, end: hits.at(-1).to, total, damage: r2(top.damage), hits: hits.map((h) => [h.from, h.to, r2(h.damage)]), landing, shield };
  }
  if (Object.keys(mine).length) out[key] = mine;
});
const notes = [`${fuller} fighters with shield-stun multipliers`];

// Written short, one move a line: [total, landing lag, on shield, hits]; the first and last frame and the damage
// follow from the hits (ultimateFrames.ts unpacks them).
const tuple = (v) => JSON.stringify([v.total, v.landing, v.shield, v.hits]);
fs.writeFileSync(
  "src/lib/ultimateMoves.data.ts",
  `// MADE BY tools/ssbu-calc/build-frames.mjs: don't edit by hand. Ultimate's move frames for the Arcade's knowledge
// quizzes, from the Smash Ultimate Calculator by rubendal (github.com/rubendal/SSBU-Calculator, MIT licence; its data
// is Ultimate Hitboxes'). The repo doesn't say which game patch its data is from. Each move is
// [total, landing, shield, hits]: \`total\` the frames it keeps the fighter busy (in the air: without landing);
// \`landing\` an aerial's landing lag; \`shield\` the frames ahead (+) or behind (-) after it hits a shield (see the
// tool for how), null when it isn't one swing; \`hits\` each separate hit [first frame, last frame, damage]. Smash
// attacks uncharged; grabs have damage 0.
import type { MoveHit, MoveKey } from "./meleeMoves.data";

export type UltPackedMove = [total: number, landing: number | null, shield: number | null, hits: MoveHit[]];

export const ULT_FRAME_MOVES: Record<string, Partial<Record<MoveKey, UltPackedMove>>> = {
${Object.entries(out).map(([k, m]) => `  ${JSON.stringify(k)}: {\n${Object.entries(m).map(([id, v]) => `    ${id}: ${tuple(v)},`).join("\n")}\n  },`).join("\n")}
};
`,
);

const n = Object.values(out).reduce((a, m) => a + Object.keys(m).length, 0);
const s = Object.values(out).reduce((a, m) => a + Object.values(m).filter((v) => v.shield !== null).length, 0);
console.log(Object.keys(out).length, "fighters,", n, "moves,", s, "with an on-shield number; not Smashy fighters:", skipped.join(", "), notes.length ? `; ${notes.join("; ")}` : "");
