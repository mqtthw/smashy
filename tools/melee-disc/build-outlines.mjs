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
import { readModel, worldMatrices } from "./model.mjs";
import { DEFAULT_PARTS, STORE, clothChains, deltas, frameOutline, hiddenMeshes, partTables } from "./outlineLib.mjs";

const [iso, outDir = "public/outlines/melee"] = process.argv.slice(2);
if (!iso) throw new Error("Give the path to the disc image.");
const disc = openDisc(iso);
if (disc.id !== "GALE01" || disc.version !== 2) throw new Error(`This is ${disc.id} version byte ${disc.version}; expected NTSC 1.02.`);

const CHARS = { fox: "Fx", falco: "Fc", marth: "Ms", sheik: "Sk", "captain-falcon": "Ca", peach: "Pe", jigglypuff: "Pr", ganondorf: "Gn", samus: "Ss" };
// The DI trainer (round 977, Matthew: "we want accurate visuals for the DI survival game because the visual cues of
// seeing the move that you are DIing is essential"): each attacker's move, and each victim's hit poses (which one
// the game plays is worked out by build-di.mjs and lib/diVisuals.ts). Ganondorf and Samus only attack.
const ATTACKS = { fox: ["AttackHi4", "AttackAirHi"], marth: ["AttackS4"], falco: ["AttackS4"], "captain-falcon": ["AttackAirF"], jigglypuff: ["SpecialLwR"], sheik: ["AttackAirF"], ganondorf: ["AttackAirF"], samus: ["SpecialN"] };
const HIT_POSES = ["DamageFlyHi", "DamageFlyN", "DamageFlyLw", "DamageFlyTop", "DamageFlyRoll"];
const ATTACK_ONLY = ["ganondorf", "samus"];
// The states drawn, by the game's names. Every opponent has the tech and getup ones; Marth also plays the player.
const VICTIM = ["Passive", "PassiveStandF", "PassiveStandB", "DownBoundU", "DownBoundD", "DownWaitU", "DownWaitD", "DownStandU", "DownStandD", "DownAttackU", "DownAttackD", "DownFowardU", "DownFowardD", "DownBackU", "DownBackD", "DamageFall", "Wait", "CaptureWaitHi", "DamageFlyN"];
const PLAYER = ["Catch", "CatchWait", "AttackLw3"];
// Each one's own hit (round 974): Marth's down tilt is AttackLw3 above.
const HITS = { marth: "Attack11", "captain-falcon": "Attack11", sheik: "Attack11", fox: "AttackHi4", falco: "SpecialLwStart", peach: "Attack11" };
// Who can be played as (round 974): their grab and down tilt are drawn too.
const PLAYABLE = ["marth", "captain-falcon", "sheik", "fox", "falco", "peach"];
// Poses held still in the trainer (falling in, standing, held, sent flying): their first frame only. Lying down:
// the first 40 frames (the trainer's wait is 10 to 40 frames).
const STILL = ["DamageFall", "Wait", "CaptureWaitHi", "CatchWait"];
// Rest: the hit and the first second of sleep (the state is 250 frames).
const KEEP = { DownWaitU: 40, DownWaitD: 40, SpecialLwR: 60 };
// Some characters name standing "Wait1", some "Wait".
const ALIAS = { Wait: ["Wait1", "Wait"] };

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
  const names = ATTACK_ONLY.includes(who) ? ["Wait", ...ATTACKS[who]] : [...VICTIM, ...HIT_POSES, ...(PLAYABLE.includes(who) ? PLAYER : []), ...(HITS[who] ? [HITS[who]] : []), ...(ATTACKS[who] ?? [])];
  for (const name of [...new Set(names)]) {
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
  // Falco's shine (round 975, Matthew: "show falco's shine"): the reflector's look isn't part of his model, so the
  // trainer draws a plain hexagon where its hitbox is: centred on the hitbox's bone on the shine's first frame,
  // with the hitbox's radius, both scaled by the model scaling as in the game. Stored as [x, y, radius].
  const marks = {};
  if (who === "falco") {
    const a = acts.get("SpecialLwStart");
    const box = a.events.find((e) => e.what === "hitbox");
    const tracks = allTracks(a.anim);
    const world = worldMatrices(model.joints, (j) => {
      const t = tracks.joints[j];
      if (!t) return null;
      const jt = model.joints[j];
      const v = (type, def) => (t[type] ? valueAt(t[type], 1) : def);
      const pos = [v(5, jt.pos[0]), v(6, jt.pos[1]), v(7, jt.pos[2])];
      if (j === 1) pos[2] = jt.pos[2];
      return { rot: [v(1, jt.rot[0]), v(2, jt.rot[1]), v(3, jt.rot[2])], pos, scale: [v(8, jt.scale[0]), v(9, jt.scale[1]), v(10, jt.scale[2])] };
    });
    const m = world[box.bone];
    marks.shine = [Math.round(m[11] * parts.scale * STORE), Math.round(-m[7] * parts.scale * STORE), Math.round((box.size / 256) * parts.scale * STORE)];
  }
  const body = JSON.stringify({ v: 1, unit: STORE, states, marks });
  fs.writeFileSync(`${outDir}/${who}.json`, body);
  bytes += body.length;
  console.log(who, Object.keys(states).length, "states,", Object.values(states).reduce((s, f) => s + f.length, 0), "frames,", Math.round(body.length / 1024), "KB");
}
console.log("total", Math.round(bytes / 1024), "KB");
