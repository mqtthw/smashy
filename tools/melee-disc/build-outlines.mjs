// Makes the tech-chase trainer's character outlines (round 973): for each character, every frame of its techs,
// tech rolls, missed-tech bounce, lying down, getups and getup attacks (and Marth's grab and down tilt, as the
// player), as flat side-on outlines. Matthew chose this on 2026-11-27, knowing the outlines are derived from
// Nintendo's models, and asked that they stay out of the public open-source copy: the files go to
// public/outlines/melee/, which tools/public-export leaves out. Shapes only: no texture, colour or material.
//
//   node tools/melee-disc/build-outlines.mjs "<path to the NTSC 1.02 disc image>" [out folder]
//
// Only what the game shows is drawn (ft/ftparts.c): Pl??.dat's ftData +0x08 lists, per costume, the model's parts
// at full detail (slot 0) and low detail (slot 1). The low-detail ones are hidden; a part with several variants
// (Peach's frying pan, golf club and racket) shows the one the action's script picks ("7C" in disc.mjs), else the
// character's own default, which each character's code sets when it starts (ftParts_80074A4C in the decompilation's
// ft/kinds/*/: ftfox.c, ftfalco.c, ftmars.c, ftseak.c, ftcaptain.c, ftpeach.c for costume 0, ftpurin.c); a part with
// no default shows nothing (-1).
// The model is scaled by the character's own model scaling (common attributes +0x8C), as in the game.
// Cloth the game moves with its own physics (ftData +0x2C: chains of bones) is drawn as animated where the animation
// moves it (Fox's tail, Peach's dress). Where it doesn't (Marth's cape), the chain hangs as it does when he stands,
// attached where it is: an approximation, since the game's cloth physics isn't run here.
//
// How a frame is made: the model (model.mjs) is posed with the animation (figatree.mjs) on that frame, seen from
// the side (the model's Z across, Y up; it faces right), filled into a grid at 6 cells a unit, traced and
// simplified to within 1.1 cells (under a fifth of a unit; a character is 10 to 20 units tall), specks under 6
// cells dropped, then stored in quarter units. The root joint's travel across (its Z) is left
// out of the pose: the trainer moves the figure by the roll's path (techChase.data.ts) instead. Frame k of a
// state is the animation's frame k, as the roll paths count them.
import fs from "node:fs";
import { actions, openDisc } from "./disc.mjs";
import { allTracks, valueAt } from "./figatree.mjs";
import { place, readModel, worldMatrices } from "./model.mjs";
import { area, simplify, trace } from "./outline.mjs";
import { fill } from "./raster.mjs";

const [iso, outDir = "public/outlines/melee"] = process.argv.slice(2);
if (!iso) throw new Error("Give the path to the disc image.");
const disc = openDisc(iso);
if (disc.id !== "GALE01" || disc.version !== 2) throw new Error(`This is ${disc.id} version byte ${disc.version}; expected NTSC 1.02.`);

const CHARS = { fox: "Fx", falco: "Fc", marth: "Ms", sheik: "Sk", "captain-falcon": "Ca", peach: "Pe", jigglypuff: "Pr" };
// The states drawn, by the game's names. Every opponent has the tech and getup ones; Marth also plays the player.
const VICTIM = ["Passive", "PassiveStandF", "PassiveStandB", "DownBoundU", "DownBoundD", "DownWaitU", "DownWaitD", "DownStandU", "DownStandD", "DownAttackU", "DownAttackD", "DownFowardU", "DownFowardD", "DownBackU", "DownBackD", "DamageFall", "Wait", "CaptureWaitHi", "DamageFlyN"];
const PLAYER = ["Catch", "CatchWait", "AttackLw3"];
// Poses held still in the trainer (falling in, standing, held, sent flying): their first frame only. Lying down:
// the first 40 frames (the trainer's wait is 10 to 40 frames).
const STILL = ["DamageFall", "Wait", "CaptureWaitHi", "DamageFlyN", "CatchWait"];
const KEEP = { DownWaitU: 40, DownWaitD: 40 };
// Some characters name standing "Wait1", some "Wait".
const ALIAS = { Wait: ["Wait1", "Wait"] };

// Each character's part defaults (costume 0), from those files.
const DEFAULT_PARTS = {
  fox: { 0: 0 },
  falco: { 0: 0 },
  marth: { 0: 0, 1: 0 },
  sheik: { 0: 0, 1: -1 },
  "captain-falcon": { 0: 0 },
  peach: { 0: 0, 1: 0, 2: 0, 3: -1, 4: 0, 5: -1, 6: 0 },
  jigglypuff: { 0: 0 },
};

const CELLS = 6; // grid cells a unit
const STORE = 4; // stored points a unit

/** The model-part tables of costume 0: per slot, per part, its variants' mesh numbers. */
function partTables(d) {
  const root = Object.entries(d.roots).find(([n]) => n.startsWith("ftData"))[1];
  const x8 = d.u32(root + 8);
  const count = d.u32(x8);
  const row = d.u32(x8 + 4);
  const slot = (k) => {
    const lookup = d.u32(row + k * 4);
    if (!lookup) return [];
    return Array.from({ length: count }, (_, i) => {
      const n = d.u32(lookup + i * 8);
      const arr = d.u32(lookup + i * 8 + 4);
      return Array.from({ length: n }, (_, j) => [...d.data.subarray(d.u32(arr + j * 8 + 4), d.u32(arr + j * 8 + 4) + d.u32(arr + j * 8))]);
    });
  };
  return { full: slot(0), low: slot(1), scale: d.f32(d.u32(root) + 0x8c) };
}

/** The first bones of the character's physics chains: [bone, count]. */
function clothChains(d) {
  const root = Object.entries(d.roots).find(([n]) => n.startsWith("ftData"))[1];
  const dyn = d.u32(root + 0x2c);
  if (!dyn) return [];
  return Array.from({ length: d.u32(dyn) }, (_, i) => [d.u32(d.u32(dyn + 4) + i * 0x18), d.u32(d.u32(dyn + 4) + i * 0x18 + 8)]);
}

/** The meshes hidden on a frame: the low-detail copy, and the variants of each part that aren't picked. */
function hiddenMeshes(parts, picked) {
  const hide = new Set(parts.low.flat(2));
  parts.full.forEach((variants, i) => variants.forEach((list, j) => j !== (picked[i] ?? -1) && list.forEach((m) => hide.add(m))));
  return hide;
}

function frameOutline(model, tracks, f, hide, scale, hang) {
  const world = worldMatrices(model.joints, (j) => {
    const t = tracks.joints[j];
    if (hang.has(j)) return { hang: hang.get(j) };
    if (!t) return null;
    const jt = model.joints[j];
    const v = (type, def) => (t[type] ? valueAt(t[type], f) : def);
    const pos = [v(5, jt.pos[0]), v(6, jt.pos[1]), v(7, jt.pos[2])];
    if (j === 1) pos[2] = jt.pos[2]; // no travel across: the trainer moves the figure itself
    return { rot: [v(1, jt.rot[0]), v(2, jt.rot[1]), v(3, jt.rot[2])], pos, scale: [v(8, jt.scale[0]), v(9, jt.scale[1]), v(10, jt.scale[2])] };
  });
  const pts = model.tris.filter((t) => !hide.has(t.dobj)).map((t) => t.map((vx) => place(vx, model.joints, world).map((c) => c * scale)));
  const flat = pts.flat();
  const minX = Math.floor(Math.min(...flat.map((p) => p[2])) * CELLS) - 2;
  const maxX = Math.ceil(Math.max(...flat.map((p) => p[2])) * CELLS) + 2;
  const minY = Math.floor(Math.min(...flat.map((p) => p[1])) * CELLS) - 2;
  const maxY = Math.ceil(Math.max(...flat.map((p) => p[1])) * CELLS) + 2;
  const w = maxX - minX;
  const h = maxY - minY;
  const grid = fill(w, h, pts.map((t) => t.map((p) => [p[2] * CELLS - minX, maxY - p[1] * CELLS])));
  // Back to units (y up), then to stored quarter units: x across, y down from the floor (for the canvas).
  return trace(grid, w, h)
    .map((loop) => simplify(loop, 1.1))
    .filter((loop) => loop.length >= 3 && Math.abs(area(loop)) >= 6)
    .map((loop) => loop.flatMap(([gx, gy]) => [Math.round(((gx + minX) / CELLS) * STORE), Math.round(((gy - maxY) / CELLS) * STORE)]));
}

/** A loop as [x0, y0, dx1, dy1, ...]: smaller numbers to store. */
const deltas = (flat) => flat.map((v, i) => (i < 2 ? v : v - flat[i - 2]));

fs.mkdirSync(outDir, { recursive: true });
let bytes = 0;
for (const [who, code] of Object.entries(CHARS)) {
  const model = readModel(disc.bytes(`Pl${code}Nr.dat`));
  const acts = actions(disc, code);
  const pl = disc.dat(`Pl${code}.dat`);
  const parts = partTables(pl);
  const chains = clothChains(pl);
  const standing = worldMatrices(model.joints);
  const states = {};
  for (const name of [...VICTIM, ...(who === "marth" ? PLAYER : [])]) {
    const a = (ALIAS[name] ?? [name]).map((n) => acts.get(n)).find((x) => x?.anim);
    if (!a) throw new Error(`${who}: ${name} has no animation`);
    const tracks = allTracks(a.anim);
    const n = STILL.includes(name) ? 1 : Math.min(KEEP[name] ?? Infinity, Math.max(1, Math.round(tracks.frames)));
    // The part variants the script has picked by each frame.
    const picks = a.events.filter((e) => e.what === "part");
    // Cloth chains this animation doesn't move: hang as when standing.
    const hang = new Map(chains.filter(([b, n]) => Array.from({ length: n }, (_, i) => tracks.joints[b + i]).every((t) => !t || !Object.keys(t).length)).map(([b]) => [b, standing[b]]));
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
console.log("total", Math.round(bytes / 1024), "KB");
