// Reads a Melee character model's skeleton and the positions of its triangles (round 973), so the tech-chase
// trainer can show each character's real outline, frame by frame. Matthew chose this on 2026-11-27 ("the outline has
// to be accurate to the animation because the point is to help players recognize the visual cues of each
// characters tech animations"), knowing the outlines are derived from Nintendo's models, and asked that the outline
// files be kept out of the public open-source copy. Only shapes are read: no texture, colour or material.
//
// The layouts (from the decompilation, github.com/doldecomp/melee: sysdolphin/baselib jobj.h, dobj.h, pobj.h, and
// the GX enums in libs/dolphin):
// - a joint (0x40 bytes): name, flags, child, next sibling, its mesh list, rotation, scale and position (3 floats
//   each), a pointer to its inverse bind matrix (3 x 4 floats), and one more pointer;
// - a mesh (DObj): name, next, material, a list of polygon objects (PObj);
// - a PObj: name, next, the vertex attribute list, flags (bits 12-13: 0 rigid, 1 shape animation, 2 envelope), the
//   display list's length in 32-byte blocks, the display list, and the joint it is bound to (rigid) or its
//   envelopes (a list of pointers to [joint, weight] lists ending with a null joint);
// - a vertex attribute (0x18 bytes): attribute (9 = position, 0 = matrix index), how it is given (1 direct,
//   2 an 8-bit index, 3 a 16-bit index), component count, component type (0 u8, 1 s8, 2 u16, 3 s16, 4 f32), the
//   fraction bits, the stride, and the array; the list ends with attribute 0xFF;
// - a display list: a byte for the primitive (0x80 quads, 0x90 triangles, 0x98 strip, 0xA0 fan), a 16-bit vertex
//   count, then each vertex's attributes in the list's order.
import { parseDat } from "./disc.mjs";

const POS = 9;
const PNMTXIDX = 0;

/** A 3 x 4 matrix as 12 numbers, row by row. */
export function mul(a, b) {
  const r = new Array(12);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 4; j++) {
      r[i * 4 + j] = a[i * 4] * b[j] + a[i * 4 + 1] * b[4 + j] + a[i * 4 + 2] * b[8 + j] + (j === 3 ? a[i * 4 + 3] : 0);
    }
  }
  return r;
}
export const apply = (m, [x, y, z]) => [m[0] * x + m[1] * y + m[2] * z + m[3], m[4] * x + m[5] * y + m[6] * z + m[7], m[8] * x + m[9] * y + m[10] * z + m[11]];
/** Scale, then rotate about X, Y, Z in turn, then move: as the game builds a joint's matrix. */
export function srt([sx, sy, sz], [rx, ry, rz], [tx, ty, tz]) {
  const [cx, snx, cy, sny, cz, snz] = [Math.cos(rx), Math.sin(rx), Math.cos(ry), Math.sin(ry), Math.cos(rz), Math.sin(rz)];
  // R = Rz * Ry * Rx
  const r = [
    cy * cz, cz * sny * snx - snz * cx, cz * sny * cx + snz * snx,
    cy * snz, snz * sny * snx + cz * cx, snz * sny * cx - cz * snx,
    -sny, cy * snx, cy * cx,
  ];
  return [r[0] * sx, r[1] * sy, r[2] * sz, tx, r[3] * sx, r[4] * sy, r[5] * sz, ty, r[6] * sx, r[7] * sy, r[8] * sz, tz];
}

/** The model in a Pl??Nr.dat: its joints (in the order animations number them) and its triangles. */
export function readModel(bytes) {
  const d = parseDat(bytes);
  const rootName = Object.keys(d.roots).find((n) => n.endsWith("_joint") && !n.includes("matanim"));
  const f = (o) => d.f32(o);
  const joints = [];
  const byPtr = new Map();
  const walk = (ptr, parent) => {
    for (let p = ptr; p; p = d.u32(p + 0x0c)) {
      const j = {
        index: joints.length,
        ptr: p,
        parent,
        flags: d.u32(p + 4),
        dobj: d.u32(p + 0x10),
        rot: [f(p + 0x14), f(p + 0x18), f(p + 0x1c)],
        scale: [f(p + 0x20), f(p + 0x24), f(p + 0x28)],
        pos: [f(p + 0x2c), f(p + 0x30), f(p + 0x34)],
        invBind: d.u32(p + 0x38) ? Array.from({ length: 12 }, (_, i) => f(d.u32(p + 0x38) + i * 4)) : null,
      };
      joints.push(j);
      byPtr.set(p, j.index);
      if (d.u32(p + 8)) walk(d.u32(p + 8), j.index);
    }
  };
  walk(d.roots[rootName], -1);

  // Triangles: each vertex is a position and how it is attached (one joint, or weighted joints).
  const tris = [];
  // The meshes in the order the game numbers them (joints in order, each joint's meshes in turn): the model-part
  // tables (build-outlines.mjs) hide and show them by these numbers.
  const dobjs = [];
  for (const j of joints) {
    for (let dobj = j.dobj; dobj; dobj = d.u32(dobj + 4)) {
      const di = dobjs.length;
      dobjs.push({ joint: j.index, ptr: dobj });
      for (let pobj = d.u32(dobj + 0x0c); pobj; pobj = d.u32(pobj + 4)) {
        const attrs = [];
        for (let a = d.u32(pobj + 8); d.u32(a) !== 0xff; a += 0x18) {
          attrs.push({ attr: d.u32(a), type: d.u32(a + 4), cnt: d.u32(a + 8), comp: d.u32(a + 12), frac: d.data[a + 16], stride: d.data.readUInt16BE(a + 18), array: d.u32(a + 20) });
        }
        const flags = d.data.readUInt16BE(pobj + 12);
        const blocks = d.data.readUInt16BE(pobj + 14);
        const dl = d.u32(pobj + 16);
        const kind = (flags >> 12) & 3;
        const u = d.u32(pobj + 20);
        // Envelopes: a list of pointers, each to [joint, weight] pairs ending with a null joint.
        const envelopes = [];
        if (kind === 2 && u) {
          for (let e = u; d.u32(e); e += 4) {
            const list = [];
            for (let w = d.u32(e); d.u32(w); w += 8) list.push([byPtr.get(d.u32(w)), f(w + 4)]);
            envelopes.push(list);
          }
        }
        const bound = kind === 0 && u ? byPtr.get(u) : null;
        if (kind === 1) continue; // shape animation (faces): skipped
        const readPos = (idx) => {
          const a = attrs.find((x) => x.attr === POS);
          const size = [1, 1, 2, 2, 4][a.comp];
          const n = a.cnt === 1 ? 3 : 2;
          const base = a.array + idx * a.stride;
          const out = [];
          for (let k = 0; k < n; k++) {
            const o = base + k * size;
            const v = a.comp === 4 ? d.data.readFloatBE(o) : a.comp === 0 ? d.data[o] : a.comp === 1 ? d.data.readInt8(o) : a.comp === 2 ? d.data.readUInt16BE(o) : d.data.readInt16BE(o);
            out.push(a.comp === 4 ? v : v / 2 ** a.frac);
          }
          if (n === 2) out.push(0);
          return out;
        };
        // Bytes a directly given attribute takes (only matrix indices are given directly in these models, mostly).
        const directSize = (a) => {
          if (a.attr === PNMTXIDX || (a.attr >= 1 && a.attr <= 8)) return 1;
          if (a.attr === 11 || a.attr === 12) return [2, 3, 4, 2, 3, 4][a.comp];
          const size = [1, 1, 2, 2, 4][a.comp] ?? 4;
          const n = a.attr === POS ? (a.cnt === 1 ? 3 : 2) : a.attr === 10 ? 3 : a.cnt === 1 ? 2 : 1;
          return size * n;
        };
        let p = dl;
        const end = dl + blocks * 32;
        while (p < end) {
          const op = d.data[p] & 0xf8;
          if (op === 0) break;
          const count = d.data.readUInt16BE(p + 1);
          p += 3;
          const verts = [];
          for (let v = 0; v < count; v++) {
            let pos = null;
            let mtx = null;
            for (const a of attrs) {
              let value;
              if (a.type === 1) {
                value = d.data[p];
                p += directSize(a);
              } else if (a.type === 2) value = d.data[p++];
              else if (a.type === 3) {
                value = d.data.readUInt16BE(p);
                p += 2;
              } else continue;
              if (a.attr === POS) pos = readPos(value);
              else if (a.attr === PNMTXIDX) mtx = value / 3;
            }
            verts.push({ pos, bind: kind === 2 ? envelopes[mtx ?? 0] ?? null : null, joint: kind === 0 ? (bound ?? j.index) : null, rigidOwn: kind === 0 && !u });
          }
          const tri = (a, b, c) => tris.push(Object.assign([verts[a], verts[b], verts[c]], { pobj, op, dobj: di }));
          if (op === 0x90) for (let i = 0; i + 2 < count; i += 3) tri(i, i + 1, i + 2);
          else if (op === 0x98) for (let i = 0; i + 2 < count; i++) tri(i, i + 1, i + 2);
          else if (op === 0xa0) for (let i = 1; i + 1 < count; i++) tri(0, i, i + 1);
          else if (op === 0x80) {
            for (let i = 0; i + 3 < count; i += 4) {
              tri(i, i + 1, i + 2);
              tri(i, i + 2, i + 3);
            }
          }
        }
      }
    }
  }
  return { joints, tris, dobjs };
}

/** Each joint's world matrix, given its rotation / scale / position (by default its own). */
export function worldMatrices(joints, pose = () => null) {
  const world = [];
  for (const j of joints) {
    const p = pose(j.index) ?? {};
    const local = srt(p.scale ?? j.scale, p.rot ?? j.rot, p.pos ?? j.pos);
    world[j.index] = j.parent < 0 ? local : mul(world[j.parent], local);
    // `hang`: keep this joint turned as in the matrix given (a world matrix), only moving with where it is attached.
    if (p.hang) {
      const m = world[j.index];
      world[j.index] = [p.hang[0], p.hang[1], p.hang[2], m[3], p.hang[4], p.hang[5], p.hang[6], m[7], p.hang[8], p.hang[9], p.hang[10], m[11]];
    }
  }
  return world;
}

/** A vertex in the world, for joints' world matrices `world`. */
export function place(v, joints, world) {
  if (v.bind) {
    // A vertex tied to one joint alone is stored in that joint's own space; a blended one in the model's.
    if (v.bind.length === 1) return apply(world[v.bind[0][0]], v.pos);
    const out = [0, 0, 0];
    for (const [ji, w] of v.bind) {
      const m = joints[ji].invBind ? mul(world[ji], joints[ji].invBind) : world[ji];
      const q = apply(m, v.pos);
      out[0] += q[0] * w;
      out[1] += q[1] * w;
      out[2] += q[2] * w;
    }
    return out;
  }
  return apply(world[v.joint], v.pos);
}
