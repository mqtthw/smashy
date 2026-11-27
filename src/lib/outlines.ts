// The tech-chase characters' outlines (round 973), shared by the trainer and its card's picture (round 976): every
// frame of each tech, roll, bounce and getup (and each chaser's grab and hit), made from the game's own models and
// animations by tools/melee-disc/build-outlines.mjs and served from /outlines/melee/ (kept out of the public
// open-source copy: there, loading gives null and the plain shapes are drawn instead). Each frame is loops of points
// in quarter units, the first point whole and the rest as steps; x across (facing right), y down from the floor.
export type Outlines = { unit: number; states: Record<string, number[][][]>; marks?: { shine?: [number, number, number] } };

const files = new Map<string, Promise<Outlines | null>>();
/** A character's outlines (fetched once a page), or null when they aren't there. */
export function loadOutlines(who: string): Promise<Outlines | null> {
  if (!files.has(who)) files.set(who, fetch(`/outlines/melee/${who}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null));
  return files.get(who)!;
}

const paths = new Map<string, Path2D>();
/** One frame of a state as a path at `scale` pixels a stored point (frame 1 = the state's first), or null. */
export function outlinePath(o: Outlines | null | undefined, who: string, state: string, frame: number, scale: number): Path2D | null {
  const frames = o?.states[state];
  if (!frames?.length) return null;
  const i = Math.max(0, Math.min(frames.length, Math.round(frame)) - 1);
  const key = `${who}|${state}|${i}|${scale}`;
  let path = paths.get(key);
  if (!path) {
    path = new Path2D();
    for (const d of frames[i]) {
      let x = 0;
      let y = 0;
      for (let k = 0; k < d.length; k += 2) {
        x = k ? x + d[k] : d[k];
        y = k ? y + d[k + 1] : d[k + 1];
        if (k) path.lineTo(x * scale, y * scale);
        else path.moveTo(x * scale, y * scale);
      }
      path.closePath();
    }
    paths.set(key, path);
  }
  return path;
}
