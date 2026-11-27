// What build-outlines.mjs (the tech-chase and DI outlines) and build-kill.mjs (Does it kill?, round 1001) share: how a
// character's model is posed on a frame and traced into a flat side-on outline. Moved out of build-outlines.mjs
// unchanged in round 1001 (its files come out the same); see that file's header for how and why.
import { valueAt } from "./figatree.mjs";
import { place, worldMatrices } from "./model.mjs";
import { area, simplify, trace } from "./outline.mjs";
import { fill } from "./raster.mjs";

// Each character's part defaults (costume 0), from those files.
export const DEFAULT_PARTS = {
  fox: { 0: 0 },
  falco: { 0: 0 },
  marth: { 0: 0, 1: 0 },
  sheik: { 0: 0, 1: -1 },
  "captain-falcon": { 0: 0 },
  peach: { 0: 0, 1: 0, 2: 0, 3: -1, 4: 0, 5: -1, 6: 0 },
  jigglypuff: { 0: 0 },
  ganondorf: { 0: 0, 1: -1 }, // ftganon.c
  samus: { 0: 0 }, // ftsamus.c
  pikachu: { 0: 0, 1: 0 }, // ftpikachu.c (round 1001)
  luigi: { 0: 0 }, // ftluigi.c (round 1001)
  "dr-mario": { 0: 0 }, // ftdrmario.c (round 1001)
};

export const CELLS = 6; // grid cells a unit
export const STORE = 4; // stored points a unit

/** The model-part tables of costume 0: per slot, per part, its variants' mesh numbers. */
export function partTables(d) {
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
export function clothChains(d) {
  const root = Object.entries(d.roots).find(([n]) => n.startsWith("ftData"))[1];
  const dyn = d.u32(root + 0x2c);
  if (!dyn) return [];
  return Array.from({ length: d.u32(dyn) }, (_, i) => [d.u32(d.u32(dyn + 4) + i * 0x18), d.u32(d.u32(dyn + 4) + i * 0x18 + 8)]);
}

/** The meshes hidden on a frame: the low-detail copy, and the variants of each part that aren't picked. */
export function hiddenMeshes(parts, picked) {
  const hide = new Set(parts.low.flat(2));
  parts.full.forEach((variants, i) => variants.forEach((list, j) => j !== (picked[i] ?? -1) && list.forEach((m) => hide.add(m))));
  return hide;
}

export function frameOutline(model, tracks, f, hide, scale, hang) {
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
export const deltas = (flat) => flat.map((v, i) => (i < 2 ? v : v - flat[i - 2]));

