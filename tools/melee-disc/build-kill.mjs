// Makes what Does it kill? shows for Melee (round 1001, Matthew: "rework the Does it Kill? game to have accurate visuals
// for melee"), from the game itself (NTSC 1.02), the way the DI trainer's visuals are made (build-di.mjs,
// build-outlines.mjs):
// - the outlines (public/outlines/melee/kill/<who>.json, kept out of the public copy like the other outlines):
//   each attacker's kill moves (every frame), every character standing ("Wait", one frame), and each victim's hit
//   poses (lib/diVisuals.ts picks which one, as the game does) and tumble;
// - src/lib/killVisuals.data.ts (numbers only): for each move Does it kill? asks about (frameGames.ts killMoves),
//   the game's state, its length, and where its kill hitbox is on each frame it is out, as diVisuals.data.ts has it
//   for the DI trainer; and each stage's shape, from the stage file's collision ("coll_data", mp/types.h in the
//   decompilation: points, then lines of two points with links to the next line, in groups floor / ceiling / right
//   wall / left wall; a line flagged 0x100 is a platform you can drop through, 0x200 a ledge).
//
//   npx tsx tools/melee-disc/build-kill.mjs "<path to the NTSC 1.02 disc image>"
//
// (tsx, because the list of moves comes from src/lib/frameGames.ts.)
//
// The kill hitbox is the one Smashy's move data counts (build-moves.mjs: the strongest hit that sends by percent),
// found in the move's script by its damage, angle, growth and base; its place on a frame is its joint's world matrix
// on that frame of the animation applied to its offset, scaled by the model scaling, as in build-di.mjs. The root's
// travel across is left out of both the outline and the hitbox, as there.
//
// Stages: the shapes are drawn as they stand at the start. Left out because they move: Yoshi's Story's cloud
// (Randall) and Fountain of Dreams' three platforms (the stage moves them with its own code, grizumi.c). Pokémon
// Stadium is its neutral form (the main body plus the neutral floor and two platforms; the other forms swap these).
import fs from "node:fs";
import { actions, openDisc } from "./disc.mjs";
import { allTracks, valueAt } from "./figatree.mjs";
import { apply, place, readModel, worldMatrices } from "./model.mjs";
import { DEFAULT_PARTS, STORE, clothChains, deltas, frameOutline, hiddenMeshes, partTables } from "./outlineLib.mjs";
import { killMoves } from "../../src/lib/frameGames.ts";
import { DI_VICTIMS } from "../../src/lib/diSurvival.ts";

const iso = process.argv[2];
if (!iso) throw new Error("Give the path to the disc image.");
const disc = openDisc(iso);
if (disc.id !== "GALE01" || disc.version !== 2) throw new Error(`This is ${disc.id} version byte ${disc.version}; expected NTSC 1.02.`);

const CODES = { fox: "Fx", falco: "Fc", marth: "Ms", sheik: "Sk", "captain-falcon": "Ca", peach: "Pe", jigglypuff: "Pr", pikachu: "Pk", samus: "Ss", ganondorf: "Gn", luigi: "Lg", "dr-mario": "Dr" };
// Smashy's move names to the game's states (as build-moves.mjs reads them).
const STATES = { jab: "Attack11", dashAttack: "AttackDash", ftilt: "AttackS3S", utilt: "AttackHi3", dtilt: "AttackLw3", fsmash: "AttackS4", usmash: "AttackHi4", dsmash: "AttackLw4", nair: "AttackAirN", fair: "AttackAirF", bair: "AttackAirB", uair: "AttackAirHi", dair: "AttackAirLw" };
const HIT_POSES = ["DamageFlyHi", "DamageFlyN", "DamageFlyLw", "DamageFlyTop", "DamageFlyRoll", "DamageFall", "Fall"];
// Some characters name standing "Wait1", some "Wait".
const ALIAS = { Wait: ["Wait1", "Wait"] };
const STILL = ["Wait", "DamageFall", "Fall"]; // "Fall" (round 1005): in the air, before an aerial or a hit from below

const r2 = (v) => Math.round(v * 100) / 100;
const scaleOf = (code) => {
  const d = disc.dat(`Pl${code}.dat`);
  const root = Object.entries(d.roots).find(([n]) => n.startsWith("ftData"))[1];
  return d.f32(d.u32(root) + 0x8c);
};
/** Every joint's world matrix on frame `f` of an animation (the root's travel across left out, as in the outlines). */
function posed(model, anim, f) {
  const tracks = allTracks(anim);
  return worldMatrices(model.joints, (j) => {
    const t = tracks.joints[j];
    if (!t) return null;
    const jt = model.joints[j];
    const v = (type, def) => (t[type] ? valueAt(t[type], f) : def);
    const pos = [v(5, jt.pos[0]), v(6, jt.pos[1]), v(7, jt.pos[2])];
    if (j === 1) pos[2] = jt.pos[2];
    return { rot: [v(1, jt.rot[0]), v(2, jt.rot[1]), v(3, jt.rot[2])], pos, scale: [v(8, jt.scale[0]), v(9, jt.scale[1]), v(10, jt.scale[2])] };
  });
}
const side = (m, p, scale) => {
  const w = apply(m, p);
  return [r2(w[2] * scale), r2(w[1] * scale)];
};

// ---------- The moves' hitboxes ----------

const pool = killMoves();
const looks = {};
// Each box's hit (damage, angle, growth, base), by move, and the move's hits that send by percent, strongest first:
// if the strongest can never be the hit that lands (Jigglypuff's up smash: its 15% box is inside the 14% one, which
// is checked first), the setups below fall back to the next (round 1005).
const specOf = (e) => `${e.damage}|${e.angle}|${e.growth}|${e.base}`;
const boxSpecs = {};
const candidates = {};
const need = {}; // who -> the states to draw
for (const { char, move, data } of pool) {
  const code = CODES[char];
  const state = STATES[move];
  const k = data.kill;
  const scale = scaleOf(code);
  const model = readModel(disc.bytes(`Pl${code}Nr.dat`));
  const a = actions(disc, code).get(state);
  if (!a?.anim) throw new Error(`${char} ${move}: ${state} not found`);
  const frames = Math.round(allTracks(a.anim).frames);
  const mine = a.events.filter((e) => e.what === "hitbox" && e.set === 0 && e.damage === k.damage && e.angle === k.angle && e.growth === k.growth && e.base === k.base);
  if (!mine.length) throw new Error(`${char} ${move}: no hitbox like ${JSON.stringify(k)}`);
  const hit = Math.max(1, mine[0].frame);
  const box = mine.filter((b) => b.frame === mine[0].frame).sort((x, y) => y.size - x.size)[0];
  const clear = a.events.find((e) => e.what === "clear" && e.frame > mine[0].frame)?.frame ?? hit + 1;
  const boxes = [];
  for (let f = hit; f <= Math.max(hit, clear - 1); f++) {
    const world = posed(model, a.anim, f);
    const at = side(world[box.bone], box.offset, scale);
    const low = Math.min(...model.tris.flatMap((t) => t.map((v) => place(v, model.joints, world)[1]))) * scale;
    boxes.push([f, at[0], at[1], r2((box.size / 256) * scale), r2(low)]);
  }
  // Every hitbox out on each frame (round 1005, Matthew: "the correct hitbox matches up to the hurtbox, for example
  // marth tippers"), so the picture can be set up the way the game decides a hit: the first frame any of the move's
  // hitboxes touches, and of those touching on that frame, the lowest number. Each: [number, x, y, radius, 1 if it's
  // the kill hit]. A box made on frame F is out from F; "clear" on frame N takes them all away from N, "3C" one.
  const steps = a.events.filter((e) => ["hitbox", "clear", "clearOne", "resize", "redamage"].includes(e.what));
  const active = new Map();
  const all = [];
  let next = 0;
  // The hit window: a victim can only be hit once by the hitboxes out between two clears (a multi-hit move clears
  // and makes new ones to hit again), so each frame carries its window's number.
  let win = 0;
  let cleared = false;
  for (let f = Math.max(1, steps[0].frame); f <= frames; f++) {
    while (next < steps.length && steps[next].frame <= f) {
      const e = steps[next++];
      if (e.what === "hitbox") active.set(e.id, { e, size: e.size, kill: mine.includes(e) });
      else if (e.what === "clear") {
        active.clear();
        cleared = true;
      }
      else if (e.what === "clearOne") active.delete(e.id);
      else if (e.what === "resize" && active.has(e.id)) active.get(e.id).size = e.size;
      else if (e.what === "redamage" && active.has(e.id)) Object.assign(active.get(e.id), { kill: false, changed: true });
    }
    if (!active.size) {
      if (next >= steps.length) break;
      continue;
    }
    const world = posed(model, a.anim, f);
    const low = Math.min(...model.tris.flatMap((t) => t.map((v) => place(v, model.joints, world)[1]))) * scale;
    const sorted = [...active.entries()].sort(([x], [y]) => x - y);
    const list = sorted.map(([id, b]) => [id, ...side(world[b.e.bone], b.e.offset, scale), r2((b.size / 256) * scale), b.kill ? 1 : 0]);
    (boxSpecs[`${char}-${move}`] ??= []).push(sorted.map(([, b]) => (b.changed ? "" : specOf(b.e))));
    if (cleared && all.length) win++;
    cleared = false;
    all.push([f, r2(low), list, win]);
  }
  looks[`${char}-${move}`] = { who: char, state, frames, hit, aerial: state.startsWith("AttackAir"), boxes, shot: null, all };
  const seen = new Set();
  candidates[`${char}-${move}`] = a.events
    .filter((e) => e.what === "hitbox" && e.set === 0 && e.growth > 0)
    .sort((x, y) => y.damage - x.damage || y.base - x.base)
    .filter((e) => !seen.has(specOf(e)) && seen.add(specOf(e)))
    .map((e) => ({ spec: specOf(e), kill: { damage: e.damage, angle: e.angle, base: e.base, growth: e.growth } }));
  (need[char] ??= new Set(["Wait", "Fall"])).add(state);
}
for (const who of DI_VICTIMS) for (const s of ["Wait", ...HIT_POSES]) (need[who] ??= new Set()).add(s);

// ---------- The outlines ----------

const outDir = "public/outlines/melee/kill";
fs.mkdirSync(outDir, { recursive: true });
let bytes = 0;
for (const [who, names] of Object.entries(need)) {
  const code = CODES[who];
  const model = readModel(disc.bytes(`Pl${code}Nr.dat`));
  const acts = actions(disc, code);
  const pl = disc.dat(`Pl${code}.dat`);
  const parts = partTables(pl);
  const chains = clothChains(pl);
  const standing = worldMatrices(model.joints);
  const states = {};
  for (const name of names) {
    const a = (ALIAS[name] ?? [name]).map((n) => acts.get(n)).find((x) => x?.anim);
    if (!a) throw new Error(`${who}: ${name} has no animation`);
    const tracks = allTracks(a.anim);
    const n = STILL.includes(name) ? 1 : Math.max(1, Math.round(tracks.frames));
    const picks = a.events.filter((e) => e.what === "part");
    const hang = new Map(chains.filter(([b, c]) => Array.from({ length: c }, (_, i) => tracks.joints[b + i]).every((t) => !t || !Object.keys(t).length)).map(([b]) => [b, standing[b]]));
    states[name] = Array.from({ length: n }, (_, i) => {
      const picked = { ...DEFAULT_PARTS[who] };
      for (const e of picks) if (e.frame <= i + 1) picked[e.part] = e.variant;
      return frameOutline(model, tracks, Math.min(i + 1, tracks.frames), hiddenMeshes(parts, picked), parts.scale, hang).map(deltas);
    });
  }
  const body = JSON.stringify({ v: 1, unit: STORE, states });
  fs.writeFileSync(`${outDir}/${who}.json`, body);
  bytes += body.length;
  console.log(who, Object.keys(states).length, "states,", Object.values(states).reduce((s, f) => s + f.length, 0), "frames,", Math.round(body.length / 1024), "KB");
}
console.log("outlines", Math.round(bytes / 1024), "KB");

// ---------- The stages ----------

// Which collision joints are drawn: the ones that stand still (see the header).
const STAGE_FILES = { fd: ["GrNLa.dat", [0]], battlefield: ["GrNBa.dat", [0]], yoshis: ["GrSt.dat", [1]], fountain: ["GrIz.dat", [3]], dreamland: ["GrOp.dat", [0, 1, 2, 3]], stadium: ["GrPs.dat", [6, 4]] };
const PLATFORM = 0x100;
const shapes = {};
for (const [key, [file, joints]] of Object.entries(STAGE_FILES)) {
  const d = disc.dat(file);
  const D = d.data;
  const c = d.roots.coll_data;
  const vp = d.u32(c);
  const lp = d.u32(c + 8);
  const jp = d.u32(c + 0x24);
  const vert = (i) => [r2(d.f32(vp + i * 8)), r2(d.f32(vp + i * 8 + 4))];
  const lines = [];
  for (const j of joints) {
    const o = jp + j * 0x28;
    for (let g = 0; g < 4; g++) {
      const start = D.readInt16BE(o + g * 4);
      const count = D.readInt16BE(o + g * 4 + 2);
      for (let i = start; i < start + count; i++) {
        const l = lp + i * 16;
        lines.push({ a: vert(D.readUInt16BE(l)), b: vert(D.readUInt16BE(l + 2)), platform: (D.readUInt16BE(l + 14) & PLATFORM) !== 0 });
      }
    }
  }
  const same = (p, q) => Math.abs(p[0] - q[0]) < 0.01 && Math.abs(p[1] - q[1]) < 0.01;
  // Platforms: their floor lines, joined end to end.
  const plats = [];
  for (const l of lines.filter((x) => x.platform)) {
    const run = plats.find((p) => same(p.at(-1), l.a));
    if (run) run.push(l.b);
    else plats.push([l.a, l.b]);
  }
  // The solid body: walk the other lines end to start; where two go on, the leftmost turn (the outside).
  const solid = lines.filter((x) => !x.platform);
  const used = new Set();
  const loops = [];
  for (const first of solid) {
    if (used.has(first)) continue;
    const loop = [first.a];
    let cur = first;
    while (cur && !used.has(cur)) {
      used.add(cur);
      loop.push(cur.b);
      const heading = Math.atan2(cur.b[1] - cur.a[1], cur.b[0] - cur.a[0]);
      const next = solid.filter((x) => !used.has(x) && same(x.a, cur.b));
      const turn = (x) => {
        let t = Math.atan2(x.b[1] - x.a[1], x.b[0] - x.a[0]) - heading;
        while (t <= -Math.PI) t += 2 * Math.PI;
        while (t > Math.PI) t -= 2 * Math.PI;
        return t;
      };
      cur = next.sort((x, y) => turn(y) - turn(x))[0];
    }
    if (loop.length >= 2) loops.push(loop);
  }
  // A stage with no bottom (Yoshi's Story, Fountain: the sides run down past the blast line) is two open runs: one
  // that ends where another starts is joined onto it.
  for (let joined = true; joined; ) {
    joined = false;
    for (const a of loops) {
      const b = loops.find((x) => x !== a && same(a.at(-1), x[0]));
      if (b && !same(a[0], a.at(-1))) {
        a.push(...b.slice(1));
        loops.splice(loops.indexOf(b), 1);
        joined = true;
        break;
      }
    }
  }
  // The biggest loop is the stage's body; little leftovers (a transformation's pit edges) are dropped.
  loops.sort((x, y) => y.length - x.length);
  const body = loops[0];
  shapes[key] = { body: same(body[0], body.at(-1)) ? body.slice(0, -1) : body, platforms: plats };
  console.log(key, "body", loops[0].length - 1, "points, platforms", plats.length, loops.length > 1 ? `(dropped ${loops.length - 1} small loops)` : "");
}

// ---------- Where the fighters stand (round 1005) ----------
// For every move and victim, the setup lib/killSetup.ts finds (the kill hitbox is the one that lands, the most spaced,
// an aerial as low as it can be; the victim in the air when nothing reaches them standing). Worked out here once, so
// the browser doesn't search: [attacker x, attacker y, facing, the frame it connects, the victim's height].
const { killSetup } = await import("../../src/lib/killSetup.ts");
const setups = {};
let airborne = 0;
const missing = [];
const hits = {};
for (const [key, look] of Object.entries(looks)) {
  // The strongest hit that lands on at least one victim; the quiz uses that hit's numbers (KILL_HITS) when it isn't
  // the move data's.
  for (const [i, c] of candidates[key].entries()) {
    const tried = i === 0 ? look : { ...look, all: look.all.map(([f, low, boxes, w], k) => [f, low, boxes.map((b, j) => [...b.slice(0, 4), boxSpecs[key][k][j] === c.spec ? 1 : 0]), w]) };
    if (!tried.all.some(([, , boxes]) => boxes.some((b) => b[4] === 1))) continue;
    const found = DI_VICTIMS.map((v) => [v, killSetup(tried, v)]).filter(([, s]) => s);
    if (!found.length) continue;
    if (i > 0) {
      looks[key] = tried;
      hits[key] = c.kill;
      console.log(key, "uses its", c.kill.damage + "% hit: the stronger one never lands first");
    }
    for (const [v, s] of found) {
      if (s.vy > 0) airborne++;
      setups[`${key}|${v}`] = [s.ax, s.ay, s.face, s.frame, s.vy];
    }
    break;
  }
  for (const v of DI_VICTIMS) if (!setups[`${key}|${v}`]) missing.push(`${key} on ${v}`);
}
fs.writeFileSync(
  "src/lib/killSetups.data.ts",
  `// MADE BY tools/melee-disc/build-kill.mjs: don't edit by hand. Where Does it kill?'s fighters stand for each move
// ("<attacker>-<move>|<victim>"), worked out by lib/killSetup.ts from the game's hitboxes and hurtboxes:
// [attacker x, attacker y, facing (1: toward the victim), the frame the kill hit connects, the victim's height].
// The victim stands at x 0. A move missing for a victim has no spacing where its kill hit lands on them.
export type KillSetupRow = [ax: number, ay: number, face: 1 | -1, frame: number, vy: number];
export const KILL_SETUPS: Record<string, KillSetupRow> = ${JSON.stringify(setups).replace(/\],"/g, '],\n  "').replace(/^\{/, "{\n  ").replace(/\}$/, ",\n}")};

/** Moves whose strongest hit can never be the one that lands first: the hit the quiz uses instead. */
export const KILL_HITS: Record<string, { damage: number; angle: number; base: number; growth: number }> = ${JSON.stringify(hits)};
`,
);
console.log(Object.keys(setups).length, "setups,", airborne, "with the victim in the air; none for:", missing.join(", ") || "-");

// ---------- The data file ----------

const line = (v) => JSON.stringify(v).replace(/"(\w+)":/g, "$1: ").replace(/,/g, ", ");
fs.writeFileSync(
  "src/lib/killVisuals.data.ts",
  `// MADE BY tools/melee-disc/build-kill.mjs: don't edit by hand. What Does it kill? shows for Melee, read from the game
// (NTSC 1.02), in game units seen from the side (x across, y up). KILL_LOOKS: each move it asks about, in the DI
// trainer's shape (diVisuals.data.ts): the game's state and its length, the frame its kill hitbox comes out, whether
// it's done in the air, and the hitbox on each frame it is out ([frame, x, y, radius, the body's lowest point], from
// the attacker's feet, facing right). STAGE_SHAPES: each stage's body (a closed outline) and its platforms (lines),
// from its collision, as it stands at the start (moving parts left out: see the builder).
import type { DiMoveLook } from "./diVisuals.data";

/** Every hitbox out on each frame of a move: [frame, the body's lowest point, [number, x, y, radius, 1 if the kill hit][],
 *  the hit window (a victim is hit at most once a window; a multi-hit move's windows are split by clears)]. */
export type HitFrame = [frame: number, low: number, boxes: [id: number, x: number, y: number, radius: number, kill: 0 | 1][], window: number];
export type KillLook = DiMoveLook & { all: HitFrame[] };

export const KILL_LOOKS: Record<string, KillLook> = {
${Object.entries(looks).map(([k, m]) => `  ${JSON.stringify(k)}: ${line(m)},`).join("\n")}
};

export type StageShape = { body: [number, number][]; platforms: [number, number][][] };
export const STAGE_SHAPES: Record<string, StageShape> = {
${Object.entries(shapes).map(([k, s]) => `  ${k}: ${JSON.stringify(s)},`).join("\n")}
};
`,
);
console.log(Object.keys(looks).length, "moves");
