// Turns a filled grid into outlines (round 973): marching squares gives the edges between filled and empty cells,
// they are joined into closed loops (outer edges and holes alike), and each loop is simplified (Douglas-Peucker).
// Drawn with the even-odd rule, holes stay holes.

/** Closed loops of [x, y] grid-corner points around the filled cells. */
export function trace(g, w, h) {
  const at = (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? g[y * w + x] : 0);
  // Each edge goes from one corner to the next with the filled cell on its left; keyed by its start corner.
  const next = new Map();
  const key = (x, y) => y * (w + 1) + x;
  const add = (x0, y0, x1, y1) => {
    const k = key(x0, y0);
    const list = next.get(k) ?? [];
    list.push([x1, y1]);
    next.set(k, list);
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!at(x, y)) continue;
      if (!at(x, y - 1)) add(x, y, x + 1, y);
      if (!at(x + 1, y)) add(x + 1, y, x + 1, y + 1);
      if (!at(x, y + 1)) add(x + 1, y + 1, x, y + 1);
      if (!at(x - 1, y)) add(x, y + 1, x, y);
    }
  }
  const loops = [];
  for (const [k0, list0] of next) {
    while (list0.length) {
      const loop = [];
      let k = k0;
      let [x, y] = [k0 % (w + 1), Math.floor(k0 / (w + 1))];
      for (let guard = 0; guard < 1e6; guard++) {
        loop.push([x, y]);
        const list = next.get(k);
        if (!list || !list.length) break;
        [x, y] = list.pop();
        k = key(x, y);
        if (k === k0) break;
      }
      if (loop.length > 2) loops.push(loop);
    }
  }
  return loops;
}

/** The loop with fewer points, none further than `tol` from where the loop was. */
export function simplify(loop, tol) {
  if (loop.length < 4) return loop;
  const keep = new Uint8Array(loop.length);
  // Split at the point furthest from the first, so the closed loop becomes two open runs.
  let far = 0;
  let farD = -1;
  for (let i = 1; i < loop.length; i++) {
    const d = (loop[i][0] - loop[0][0]) ** 2 + (loop[i][1] - loop[0][1]) ** 2;
    if (d > farD) {
      farD = d;
      far = i;
    }
  }
  const run = (a, b) => {
    const stack = [[a, b]];
    while (stack.length) {
      const [i, j] = stack.pop();
      const [ax, ay] = loop[i];
      const [bx, by] = loop[j % loop.length];
      const len = Math.hypot(bx - ax, by - ay) || 1;
      let best = -1;
      let bestD = tol;
      for (let k = i + 1; k < j; k++) {
        const [px, py] = loop[k];
        const d = Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len;
        if (d > bestD) {
          bestD = d;
          best = k;
        }
      }
      if (best >= 0) {
        keep[best] = 1;
        stack.push([i, best], [best, j]);
      }
    }
  };
  keep[0] = 1;
  keep[far] = 1;
  run(0, far);
  run(far, loop.length);
  return loop.filter((_, i) => keep[i]);
}

/** Area of a loop (positive or negative by direction). */
export const area = (loop) => loop.reduce((s, [x, y], i) => {
  const [x2, y2] = loop[(i + 1) % loop.length];
  return s + x * y2 - x2 * y;
}, 0) / 2;
