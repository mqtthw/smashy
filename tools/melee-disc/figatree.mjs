// Reads the movement out of a Melee animation (round 973): the numbers of one joint's position track on each frame.
// Read-only and numbers only, like disc.mjs: no model, mesh, texture or pose of the character is read or kept, just
// how far the character's root moves (for the tech-chase trainer's own drawing to travel the same way).
//
// The layouts (from the decompilation, github.com/doldecomp/melee: lb/lbanim.h, sysdolphin/baselib/fobj.c, jobj.h):
// - an animation (a figatree) is: type, flags, the frame count (float), a pointer to the number of tracks of each
//   joint (signed bytes, ended by -1), and a pointer to the tracks;
// - a track (12 bytes): the length of its key data, a start frame, what it animates (5/6/7: position X/Y/Z), the
//   value and slope formats, and a pointer to the key data;
// - the key data is a stream: a byte whose low four bits say how keys interpolate (1 constant, 2 linear, 3 spline
//   with no slope, 4 spline, 5 slope only, 6 key) and whose high bits (with more bytes when the top bit is set) say
//   how many keys follow; each key is a value (and for spline a slope; slope-only has just a slope), then a wait in
//   frames (7 bits a byte, low first) except after slope-only;
// - a value is a little-endian float, or a little-endian 8- or 16-bit number divided by 2^(low five bits).
import { parseDat } from "./disc.mjs";

const FRAC_FLOAT = 0, FRAC_S16 = 1, FRAC_U16 = 2, FRAC_S8 = 3, FRAC_U8 = 4;

function reader(buf, at) {
  let p = at;
  return {
    get pos() {
      return p;
    },
    byte: () => buf[p++],
    value(frac) {
      const kind = frac >>> 5;
      const denom = 2 ** (frac & 0x1f);
      if (kind === FRAC_FLOAT) {
        const v = buf.readFloatLE(p);
        p += 4;
        return v;
      }
      let n;
      if (kind === FRAC_S8) n = buf.readInt8(p++);
      else if (kind === FRAC_U8) n = buf[p++];
      else if (kind === FRAC_S16) {
        n = buf.readInt16LE(p);
        p += 2;
      }
      else if (kind === FRAC_U16) {
        n = buf.readUInt16LE(p);
        p += 2;
      }
      else return 0;
      return n / denom;
    },
    wait() {
      let w = 0;
      let shift = 0;
      let d;
      do {
        d = buf[p++];
        w |= (d & 0x7f) << shift;
        shift += 7;
      } while (d & 0x80);
      return w;
    },
    pack() {
      let d = buf[p++];
      let n = ((d >> 4) & 7) + 1;
      let shift = 3;
      if (!(d & 0x80)) return { op: d & 0xf, n };
      const op = d & 0xf;
      do {
        d = buf[p++];
        n += (d & 0x7f) << shift;
        shift += 7;
      } while (d & 0x80);
      return { op, n };
    },
  };
}

/** A track's keys: [{ frame, value, slope, op }]. */
function keys(data, track) {
  const r = reader(data, track.ad);
  const out = [];
  let frame = -track.start;
  let slope = 0;
  while (r.pos < track.ad + track.length) {
    const { op, n } = r.pack();
    for (let i = 0; i < n && r.pos < track.ad + track.length; i++) {
      if (op === 5) {
        slope = r.value(track.fracSlope);
        if (out.length) out[out.length - 1].slopeOut = slope;
        continue;
      }
      const value = r.value(track.fracValue);
      const s = op === 4 ? r.value(track.fracSlope) : 0;
      out.push({ frame, value, slopeIn: op === 4 ? s : slope, slopeOut: s, op });
      slope = 0;
      frame += r.wait();
    }
  }
  return out;
}

/** The value of a track at a frame, interpolating as the game does (constant, linear, or a Hermite spline). */
function at(ks, f) {
  if (!ks.length) return 0;
  if (f <= ks[0].frame) return ks[0].value;
  for (let i = 0; i < ks.length - 1; i++) {
    const a = ks[i];
    const b = ks[i + 1];
    if (f > b.frame) continue;
    const len = b.frame - a.frame;
    if (len <= 0) return b.value;
    const t = (f - a.frame) / len;
    if (b.op === 1) return f === b.frame ? b.value : a.value;
    if (b.op === 2) return a.value + (b.value - a.value) * t;
    // Hermite, with the slopes in value per frame.
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * a.value + (t3 - 2 * t2 + t) * len * a.slopeOut + (-2 * t3 + 3 * t2) * b.value + (t3 - t2) * len * b.slopeIn;
  }
  return ks[ks.length - 1].value;
}

/**
 * One animation's position tracks for a joint: per frame (0 = the first), the X, Y and Z of that joint (null where
 * the animation doesn't move it). `anim` is the animation's bytes as stored in Pl??AJ.dat.
 */
export function jointPositions(anim, joint) {
  const d = parseDat(anim);
  const root = Object.values(d.roots)[0];
  const frames = Math.round(d.f32(root + 8));
  const nodes = d.u32(root + 12);
  const tracks = d.u32(root + 16);
  let first = 0;
  let count = 0;
  for (let j = 0; ; j++) {
    const n = d.data.readInt8(nodes + j);
    if (n === -1) return null;
    if (j === joint) {
      count = n;
      break;
    }
    first += n;
  }
  const axes = { 5: null, 6: null, 7: null };
  for (let i = 0; i < count; i++) {
    const t = tracks + (first + i) * 12;
    const track = { length: d.data.readUInt16BE(t), start: d.data.readUInt16BE(t + 2), type: d.data[t + 4], fracValue: d.data[t + 5], fracSlope: d.data[t + 6], ad: d.u32(t + 8) };
    if (track.type in axes) axes[track.type] = keys(d.data, track);
  }
  const per = (ks) => (ks ? Array.from({ length: frames + 1 }, (_, f) => Math.round(at(ks, f) * 1000) / 1000) : null);
  return { frames, x: per(axes[5]), y: per(axes[6]), z: per(axes[7]) };
}

/**
 * Every joint's tracks in an animation (round 973, for posing a model): for each joint, its keys by what they
 * animate (1-3 rotation X/Y/Z, 5-7 position, 8-10 scale). Sample them with `valueAt`.
 */
export function allTracks(anim) {
  const d = parseDat(anim);
  const root = Object.values(d.roots)[0];
  const frames = d.f32(root + 8);
  const nodes = d.u32(root + 12);
  const tracks = d.u32(root + 16);
  const joints = [];
  let t = 0;
  for (let j = 0; ; j++) {
    const n = d.data.readInt8(nodes + j);
    if (n === -1) break;
    const mine = {};
    for (let i = 0; i < n; i++, t++) {
      const o = tracks + t * 12;
      const track = { length: d.data.readUInt16BE(o), start: d.data.readUInt16BE(o + 2), type: d.data[o + 4], fracValue: d.data[o + 5], fracSlope: d.data[o + 6], ad: d.u32(o + 8) };
      mine[track.type] = keys(d.data, track);
    }
    joints.push(mine);
  }
  return { frames, joints };
}
export const valueAt = at;
