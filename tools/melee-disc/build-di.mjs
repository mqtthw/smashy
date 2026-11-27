// Makes src/lib/diVisuals.data.ts (round 977): where each of the DI trainer's moves hits, and each victim's hurtboxes,
// read from the game (NTSC 1.02), so the trainer can show the real move landing (Matthew: "we want accurate visuals
// for the DI survival game because the visual cues of seeing the move that you are DIing is essential"). Numbers only
// (positions and sizes in game units); the outlines themselves are build-outlines.mjs's, kept private.
//
//   node tools/melee-disc/build-di.mjs "<path to the NTSC 1.02 disc image>"
//
// How it's read (the decompilation, github.com/doldecomp/melee):
// - A hitbox command gives its bone (a joint of the model, as fp->parts is in model order), its size and its offset
//   from that bone in 1/256 units (lb/types.h spawn_hitbox_0..2). Its place on the frame it comes out is that joint's
//   world matrix on that frame of the animation (model.mjs, figatree.mjs) applied to the offset; the model scaling
//   (common attributes +0x8C) scales the place and the size, as the fighter's scale does in the game. Seen from the
//   side: the model's Z is across (facing right), Y up. Where a move makes several boxes of the move's damage on
//   that frame, the biggest is used, on every frame it is out (until the script clears it: a box cleared at frame N
//   is out up to N - 1).
// - The hurtboxes: Pl??.dat ftData +0x30 (ftData_x30: count, then 0x28-byte ftHurtboxInit: bone, height 0 low /
//   1 middle / 2 high, grabbable, two end points, radius), placed on the standing pose ("Wait", frame 1).
// - Samus's full Charge Shot is a projectile: it comes out on the first frame of "SpecialN" from her joint 50 moved 4
//   units along its Z (ftsamusspecialn.c), travels 3 units a frame at full charge (the item's attributes +0xC), and
//   its hitbox is the one of the item state for its charge level plus one (itsamuschargeshot.c, it_802B5CBC), so at
//   full charge (Samus's attributes +0x18: 7) state 8: 25% at angle 361, growth 72, base 50 (the trainer's numbers)
//   and 1200/256 units. Round 978: round 977 read state 7 (one level short: 21%, 900/256).
import fs from "node:fs";
import { actions, openDisc } from "./disc.mjs";
import { allTracks, valueAt } from "./figatree.mjs";
import { apply, place, readModel, worldMatrices } from "./model.mjs";

const iso = process.argv[2];
if (!iso) throw new Error("Give the path to the disc image.");
const disc = openDisc(iso);
if (disc.id !== "GALE01" || disc.version !== 2) throw new Error(`This is ${disc.id} version byte ${disc.version}; expected NTSC 1.02.`);

const CODES = { fox: "Fx", falco: "Fc", marth: "Ms", sheik: "Sk", "captain-falcon": "Ca", peach: "Pe", jigglypuff: "Pr", ganondorf: "Gn", samus: "Ss" };
// The trainer's moves (lib/diSurvival.ts MOVES): who, the game's state, and the damage of the hit the trainer uses.
const MOVES = {
  "fox-usmash": ["fox", "AttackHi4", 18],
  "fox-uair": ["fox", "AttackAirHi", 13],
  "marth-fsmash": ["marth", "AttackS4", 20],
  "falco-fsmash": ["falco", "AttackS4", 17],
  "falcon-knee": ["captain-falcon", "AttackAirF", 18],
  "puff-rest": ["jigglypuff", "SpecialLwR", 28],
  "sheik-fair": ["sheik", "AttackAirF", 13],
  "ganon-fair": ["ganondorf", "AttackAirF", 17],
  "samus-charge": ["samus", "SpecialN", null],
};
const VICTIMS = ["fox", "falco", "marth", "sheik", "captain-falcon", "peach", "jigglypuff"];

const r2 = (v) => Math.round(v * 100) / 100;
const scaleOf = (code) => {
  const d = disc.dat(`Pl${code}.dat`);
  const root = Object.entries(d.roots).find(([n]) => n.startsWith("ftData"))[1];
  return { d, root, scale: d.f32(d.u32(root) + 0x8c) };
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
/** A point in a joint's space, seen from the side: [across, up], scaled. */
const side = (m, p, scale) => {
  const w = apply(m, p);
  return [r2(w[2] * scale), r2(w[1] * scale)];
};

const moves = {};
for (const [key, [who, state, damage]] of Object.entries(MOVES)) {
  const code = CODES[who];
  const { d, root, scale } = scaleOf(code);
  const model = readModel(disc.bytes(`Pl${code}Nr.dat`));
  const a = actions(disc, code).get(state);
  if (!a?.anim) throw new Error(`${key}: ${state} not found`);
  const frames = Math.round(allTracks(a.anim).frames);
  if (damage === null) {
    // Samus's Charge Shot.
    const world = posed(model, a.anim, 1);
    const spawn = side(world[50], [0, 0, 4], scale);
    const items = d.u32(root + 0x48);
    const art = d.u32(items + 4);
    const speed = d.f32(d.u32(art + 4) + 0xc);
    const states = d.u32(art + 12);
    const fullCharge = Math.round(d.f32(d.u32(root + 4) + 0x18));
    const script = d.u32(states + (fullCharge + 1) * 0x10 + 12);
    const radius = (d.u32(script + 4) >>> 16) / 256;
    const damage = d.u32(script) & 0x3ff;
    if (damage !== 25) throw new Error(`full Charge Shot: ${damage}%, the trainer uses 25%`);
    moves[key] = { who, state, frames, hit: 1, aerial: false, boxes: [], shot: { from: spawn, speed: r2(speed), radius: r2(radius) } };
    continue;
  }
  const boxes = a.events.filter((e) => e.what === "hitbox" && e.damage === damage);
  if (!boxes.length) throw new Error(`${key}: no ${damage}% hitbox`);
  const hit = boxes[0].frame;
  const box = boxes.filter((b) => b.frame === hit).sort((x, y) => y.size - x.size)[0];
  const clear = a.events.find((e) => e.what === "clear" && e.frame > hit)?.frame ?? hit + 1;
  const out = [];
  for (let f = Math.max(1, hit); f <= Math.max(Math.max(1, hit), clear - 1); f++) {
    const world = posed(model, a.anim, f);
    const at = side(world[box.bone], [box.offset[0], box.offset[1], box.offset[2]], scale);
    // The lowest point of the body on that frame (an aerial is kept above the floor by it).
    const low = Math.min(...model.tris.flatMap((t) => t.map((v) => place(v, model.joints, world)[1]))) * scale;
    out.push([f, at[0], at[1], r2((box.size / 256) * scale), r2(low)]);
  }
  moves[key] = { who, state, frames, hit: Math.max(1, hit), aerial: state.startsWith("AttackAir"), boxes: out, shot: null };
}

const hurtboxes = {};
for (const who of VICTIMS) {
  const code = CODES[who];
  const { d, root, scale } = scaleOf(code);
  const model = readModel(disc.bytes(`Pl${code}Nr.dat`));
  const acts = actions(disc, code);
  const wait = acts.get("Wait1") ?? acts.get("Wait");
  const world = posed(model, wait.anim, 1);
  const x30 = d.u32(root + 0x30);
  const list = [];
  for (let i = 0; i < d.u32(x30); i++) {
    const o = d.u32(x30 + 4) + i * 0x28;
    const bone = d.u32(o);
    const f = (k) => d.f32(o + k);
    const a = side(world[bone], [f(0xc), f(0x10), f(0x14)], scale);
    const b = side(world[bone], [f(0x18), f(0x1c), f(0x20)], scale);
    list.push([a[0], a[1], b[0], b[1], r2(f(0x24) * scale), d.u32(o + 4)]);
  }
  hurtboxes[who] = list;
}

// The common rules for which hit pose plays (PlCo.dat common data, ftCo_Damage.c): launched between these angles,
// "DamageFlyTop"; else at or above this percent, "DamageFlyRoll" this often.
const co = disc.dat("PlCo.dat");
const common = co.u32(co.roots[Object.keys(co.roots).find((n) => n.startsWith("ftLoadCommonData"))]);
const rules = { topFrom: r2((co.f32(common + 0x234) * 180) / Math.PI), topTo: r2((co.f32(common + 0x238) * 180) / Math.PI), rollFrom: co.s32(common + 0x23c), rollChance: r2(co.f32(common + 0x240)) };

const line = (v) => JSON.stringify(v).replace(/"(\w+)":/g, "$1: ").replace(/,/g, ", ");
fs.writeFileSync(
  "src/lib/diVisuals.data.ts",
  `// MADE BY tools/melee-disc/build-di.mjs: don't edit by hand. Where the DI trainer's moves hit and the victims'
// hurtboxes, read from the game (NTSC 1.02), in game units, seen from the side, facing right (x across, y up from the
// floor). A move: the game's state and its length, the frame it hits, whether it's done in the air, its hitbox on that
// frame and each frame after while it's out ([frame, x, y, radius, the body's lowest point], from the attacker's feet),
// or for Samus's Charge
// Shot where the ball comes out, its speed and its radius. Hurtboxes on the standing pose: [x1, y1, x2, y2, radius, height] with height 0 low, 1 middle, 2 high.
export type DiMoveLook = { who: string; state: string; frames: number; hit: number; aerial: boolean; boxes: [frame: number, x: number, y: number, radius: number, low: number][]; shot: { from: [number, number]; speed: number; radius: number } | null };
export type Hurtbox = [x1: number, y1: number, x2: number, y2: number, radius: number, height: 0 | 1 | 2];

export const MOVE_LOOKS: Record<string, DiMoveLook> = {
${Object.entries(moves).map(([k, m]) => `  ${JSON.stringify(k)}: ${line(m)},`).join("\n")}
};

export const HURTBOXES: Record<string, Hurtbox[]> = {
${Object.entries(hurtboxes).map(([k, h]) => `  ${JSON.stringify(k)}: ${JSON.stringify(h)},`).join("\n")}
};

/** Which hit pose plays (ftCo_Damage.c with PlCo.dat's numbers). */
export const HIT_POSE_RULES = ${line(rules)};
`,
);
console.log(JSON.stringify(moves, null, 0));
console.log(rules);
