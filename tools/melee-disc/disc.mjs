// Reads numbers out of a Super Smash Bros. Melee disc image (round 954). Matthew pointed at his own copy
// (NTSC 1.02) as a source for the Arcade's trainers: "it is the game itself". Read-only: the tools here open
// the image, read a few data files into memory and print or save NUMBERS (frame counts, speeds). Nothing from
// the disc (no file, model, texture, sound or text) is copied into the repo or written anywhere.
//
// The layouts used (worked out with the decompilation, github.com/doldecomp/melee):
// - the disc's file table is at the offset stored at 0x424 (12 bytes an entry, names after the entries);
// - a .dat is a 0x20 header, a data block, a relocation table, then named roots;
// - Pl??.dat's "ftData..." root: +0x04 the character's special attributes, +0x0C the action table (0x18 a row:
//   name, the animation's offset and size in Pl??AJ.dat, the script);
// - an animation's length in frames is the float at +8 of its figatree;
// - a script is a list of commands, 4 bytes each except effects and hitboxes (20), sounds (12) and jumps (8);
//   "08 NN" waits until frame NN, "04 NN" waits NN frames, "68 ...02" / "68 ...00" turns intangibility on / off,
//   "0C NN" starts a loop of NN turns and "10" ends it, "14"/"1C"/"18" jump, call and return;
//   "2C" makes a hitbox and "40" clears them, "5C" lets the character act again (the move can be interrupted),
//   "7C" shows one variant of a switchable model part (Marth's sword in his hand or in its sheath).
// - a hitbox command's five words (lb/types.h, spawn_hitbox_0..4): word 0 ends with the damage (10 bits); word 3
//   starts with the angle, knockback growth and weight-set knockback (9 bits each); word 4 starts with the base
//   knockback (9 bits).
import fs from "node:fs";

export function openDisc(path) {
  const fd = fs.openSync(path, "r");
  const read = (off, len) => {
    const b = Buffer.alloc(len);
    fs.readSync(fd, b, 0, len, off);
    return b;
  };
  const head = read(0, 0x440);
  const id = head.toString("latin1", 0, 6);
  const fst = read(head.readUInt32BE(0x424), head.readUInt32BE(0x428));
  const count = fst.readUInt32BE(8);
  const files = new Map();
  for (let i = 1; i < count; i++) {
    const e = i * 12;
    if (fst[e] === 1) continue; // a folder
    let end = count * 12 + (fst.readUInt32BE(e) & 0xffffff);
    const start = end;
    while (fst[end]) end++;
    files.set(fst.toString("latin1", start, end), { off: fst.readUInt32BE(e + 4), len: fst.readUInt32BE(e + 8) });
  }
  const bytes = (name) => {
    const f = files.get(name);
    if (!f) throw new Error(`${name} is not on the disc`);
    return read(f.off, f.len);
  };
  return { id, version: head[7], files, bytes, dat: (name) => parseDat(bytes(name)) };
}

export function parseDat(b) {
  const dataSize = b.readUInt32BE(4);
  const rootsAt = 0x20 + dataSize + b.readUInt32BE(8) * 4;
  const rootCount = b.readUInt32BE(12);
  const strAt = rootsAt + (rootCount + b.readUInt32BE(16)) * 8;
  const data = b.subarray(0x20, 0x20 + dataSize);
  const roots = {};
  for (let i = 0; i < rootCount; i++) {
    let end = strAt + b.readUInt32BE(rootsAt + i * 8 + 4);
    const start = end;
    while (b[end]) end++;
    roots[b.toString("latin1", start, end)] = b.readUInt32BE(rootsAt + i * 8);
  }
  return { data, roots, u32: (o) => data.readUInt32BE(o), s32: (o) => data.readInt32BE(o), f32: (o) => data.readFloatBE(o) };
}

/** A character's actions by name ("DownStandU", "Passive", ...): the animation's length and what its script does when. */
export function actions(disc, code) {
  const d = disc.dat(`Pl${code}.dat`);
  const aj = disc.bytes(`Pl${code}AJ.dat`);
  const root = Object.entries(d.roots).find(([n]) => n.startsWith("ftData"))[1];
  const table = d.u32(root + 0x0c);
  const out = new Map();
  for (let i = 0; i < 400; i++) {
    const e = table + i * 0x18;
    const namePtr = d.u32(e);
    if (!namePtr || namePtr >= d.data.length) continue;
    let end = namePtr;
    while (d.data[end]) end++;
    const m = d.data.toString("latin1", namePtr, end).match(/_ACTION_(\w+?)_figatree$/);
    if (!m || out.has(m[1])) continue; // the first row of a name is the fighter's own
    const animOff = d.u32(e + 4);
    const animSize = d.u32(e + 8);
    let frames = null;
    if (animSize) {
      try {
        const a = aj.subarray(animOff, animOff + animSize);
        const rootOff = a.readUInt32BE(0x20 + a.readUInt32BE(4) + a.readUInt32BE(8) * 4);
        frames = a.readFloatBE(0x20 + rootOff + 8);
      } catch {
        frames = null; // not an animation laid out this way
      }
    }
    // Walk the script, keeping the frame it has reached.
    const events = [];
    let frame = 0;
    // Loops ("0C NN" ... "10": repeat NN times) and subroutines are followed, so a drill's every hit is seen
    // (round 962: Jigglypuff's down air read as one hit, and Samus's forward air as two, because the loop wasn't run).
    const loops = [];
    const calls = [];
    for (let p = d.u32(e + 12), n = 0; p && n < 4000; n++) {
      if (p + 20 > d.data.length) break; // a jump out of the file: not a script this reader understands
      const w = d.u32(p);
      const cmd = w >>> 26;
      if (cmd === 0) break;
      if (cmd === 0x03) loops.push({ at: p + 4, left: w & 0xffffff });
      else if (cmd === 0x04) {
        const loop = loops.at(-1);
        if (loop && --loop.left > 0) {
          p = loop.at;
          continue;
        }
        loops.pop();
      } else if (cmd === 0x05) {
        p = d.u32(p + 4);
        continue;
      } else if (cmd === 0x07) {
        calls.push(p + 8);
        p = d.u32(p + 4);
        continue;
      } else if (cmd === 0x06) {
        if (!calls.length) break;
        p = calls.pop();
        continue;
      } else if (cmd === 0x02) frame = w & 0xffffff;
      else if (cmd === 0x01) frame += w & 0xffffff;
      else if (cmd === 0x1a) events.push({ frame, what: (w & 3) === 0 ? "vulnerable" : "intangible" });
      else if (cmd === 0x0b) {
        const w3 = d.u32(p + 12);
        events.push({ frame, what: "hitbox", damage: w & 0x3ff, angle: w3 >>> 23, growth: (w3 >>> 14) & 0x1ff, set: (w3 >>> 5) & 0x1ff, base: d.u32(p + 16) >>> 23 });
      } else if (cmd === 0x17) events.push({ frame, what: "free" });
      else if (cmd === 0x10) events.push({ frame, what: "clear" });
      // "7C": show one variant of a model part (lb/types.h set_dobj_flags: a 7-bit part, a 19-bit variant), round 973.
      else if (cmd === 0x1f) events.push({ frame, what: "part", part: (w << 6) >> 25, variant: (w << 13) >> 13 });
      p += cmd === 0x0a || cmd === 0x0b ? 20 : cmd === 0x11 ? 12 : 4;
    }
    // The animation's own bytes, for figatree.mjs to read movement from (round 973); kept in memory only.
    out.set(m[1], { frames, events, anim: animSize ? aj.subarray(animOff, animOff + animSize) : null });
  }
  return out;
}

/** The frames an action is intangible on and the frames it hits on, as its script has them (script frames). */
export function windows(action) {
  let on = null;
  let intangible = null;
  const hits = [];
  let hitOn = null;
  for (const e of action.events) {
    if (e.what === "intangible" && on === null) on = e.frame;
    else if (e.what === "vulnerable" && on !== null) {
      intangible = [on, e.frame];
      on = null;
    } else if (e.what === "hitbox" && hitOn === null) hitOn = e.frame;
    else if (e.what === "clear" && hitOn !== null) {
      hits.push([hitOn, e.frame]);
      hitOn = null;
    }
  }
  if (on !== null) intangible = [on, action.frames];
  return { intangible, hits };
}
