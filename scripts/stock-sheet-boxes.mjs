// Finds the icons on a sprite sheet: everything that isn't the sheet's background colour (taken from
// the top-left pixel), grouped into boxes, then rows, then character groups (icons close together).
//   node scripts/stock-sheet-boxes.mjs "<sheet.png>"  -> prints JSON rows of groups of boxes
import sharp from "sharp";

export async function findBoxes(file, { gap = 6 } = {}) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const px = (x, y) => (y * W + x) * 4;
  const bg = [data[0], data[1], data[2]];
  const isBg = (x, y) => {
    const i = px(x, y);
    return data[i + 3] < 20 || (Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]) < 24);
  };
  const seen = new Uint8Array(W * H);
  const boxes = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (seen[y * W + x] || isBg(x, y)) continue;
      let x0 = x, x1 = x, y0 = y, y1 = y, n = 0;
      const stack = [[x, y]];
      seen[y * W + x] = 1;
      while (stack.length) {
        const [cx, cy] = stack.pop();
        n++;
        if (cx < x0) x0 = cx; if (cx > x1) x1 = cx; if (cy < y0) y0 = cy; if (cy > y1) y1 = cy;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx] || isBg(nx, ny)) continue;
          seen[ny * W + nx] = 1;
          stack.push([nx, ny]);
        }
      }
      if (n > 40) boxes.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 });
    }
  // rows: boxes whose vertical centres are close
  boxes.sort((a, b) => a.y + a.h / 2 - (b.y + b.h / 2));
  const rows = [];
  for (const b of boxes) {
    const cy = b.y + b.h / 2;
    const row = rows.find((r) => Math.abs(r.cy - cy) < b.h / 2);
    if (row) row.boxes.push(b); else rows.push({ cy, boxes: [b] });
  }
  return rows.map((r) => {
    r.boxes.sort((a, b) => a.x - b.x);
    const groups = [];
    for (const b of r.boxes) {
      const g = groups.at(-1);
      const prev = g?.at(-1);
      if (prev && b.x - (prev.x + prev.w) <= gap) g.push(b); else groups.push([b]);
    }
    return groups;
  });
}

if (process.argv[1]?.includes("stock-sheet-boxes")) {
  const rows = await findBoxes(process.argv[2], { gap: Number(process.argv[3] ?? 6) });
  rows.forEach((r, i) => console.log(i, r.map((g) => `${g.length}@${g[0].x},${g[0].y} ${g[0].w}x${g[0].h}`).join(" | ")));
}
