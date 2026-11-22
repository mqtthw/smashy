// WCAG contrast check (npm run check:contrast). Exits with an error if any pair is too low.
let low = 0;
// WCAG contrast check for Smashy's color tokens (read from globals.css), light and dark.
import { readFileSync } from "node:fs";
const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
// Blend a color over a background at an opacity (for "bg-brand/15" badges and see-through colors).
const mix = (fg, bg, a) => "#" + [1, 3, 5].map((i) => Math.round(parseInt(fg.slice(i, i + 2), 16) * a + parseInt(bg.slice(i, i + 2), 16) * (1 - a)).toString(16).padStart(2, "0")).join("");
const block = (start) => {
  const i = css.indexOf(start);
  // Read up to the block's end, or up to a block nested inside it (like the board's "@media print"),
  // whichever comes first: colors in a nested block are for another situation (paper), not the screen.
  const from = i + start.length;
  const ends = [css.indexOf("}", from), css.indexOf("{", from)].filter((n) => n !== -1);
  const body = css.slice(i, Math.min(...ends));
  const out = Object.fromEntries([...body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
  // See-through colors ("--surface: rgb(255 255 255 / 0.55)", the glossy redesign) are checked as they
  // look: blended over the block's background (round 602; the check had crashed on them since).
  for (const m of body.matchAll(/--([a-z0-9-]+):\s*rgb\((\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+)\)/gi)) {
    const hex = "#" + [m[2], m[3], m[4]].map((n) => Number(n).toString(16).padStart(2, "0")).join("");
    if (out.background) out[m[1]] = mix(hex, out.background, Number(m[5]));
  }
  return out;
};
const light = block(":root {");
const dark = { ...light, ...block(':root[data-theme="dark"] {') };
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const pairs = [
  ["foreground", "background", 4.5, "body text"],
  ["muted", "background", 4.5, "secondary text (times, counts)"],
  ["muted", "surface", 4.5, "secondary text on hover/panels"],
  ["brand", "background", 4.5, "links & red text"],
  ["on-brand", "brand", 3, "text on red buttons (bold)"],
  ["danger", "background", 4.5, "error messages"],
  ["success", "background", 4.5, "success messages"],
  ["warning", "background", 4.5, "warnings"],
  ["repost", "background", 3, "repost icon/count"],
  ["player-2", "background", 4.5, "second player's name (stage striking)"],
];
for (const [name, t] of [["LIGHT", light], ["DARK", dark]]) {
  console.log(`== ${name}`);
  for (const [fg, bg, min, use] of pairs) {
    const r = ratio(t[fg], t[bg]);
    if (r < min) low++;
    console.log(`${r >= min ? "ok  " : "LOW "} ${r.toFixed(2)}:1  ${fg} on ${bg}  (${use}, needs ${min})`);
  }
  for (const g of ["melee", "ultimate", "pplus", "smash64", "brawl", "smash4", "success", "warning"]) {
    const bg = mix(t[g], t.background, 0.15);
    const r = ratio(t[g], bg);
    if (r < 4.5) low++;
    console.log(`${r >= 4.5 ? "ok  " : "LOW "} ${r.toFixed(2)}:1  badge text ${g} on its 15% tint`);
  }
}
for (const [name, t] of [["LIGHT", light], ["DARK", dark]]) for (const g of ["brand", "success"]) {
  const r = ratio(t[g], mix(t[g], t.background, 0.1));
  if (r < 4.5) low++;
  console.log(`${r >= 4.5 ? "ok  " : "LOW "} ${r.toFixed(2)}:1  ${name} badge text ${g} on its 10% tint`);
}
// The scoreboard panel ("board"): a dark island with its own values for the neutral and brand
// colors, on a background that differs per theme (--board).
const onBoard = block("@utility board {");
for (const [name, t] of [["LIGHT", light], ["DARK", dark]]) {
  console.log(`== BOARD (${name} theme)`);
  const bg = t.board;
  for (const [fg, min, use] of [
    ["foreground", 4.5, "text on a board"],
    ["muted", 4.5, "labels on a board"],
    ["brand", 4.5, "red text on a board (\"You\", links)"],
    ["danger", 4.5, "warnings on a board (needs help, long waits)"],
    ["success", 4.5, "success text on a board"],
    ["warning", 4.5, "warning text on a board"],
    ["line-strong", 3, "outlines on a board (outline buttons, pills)"],
  ]) {
    const r = ratio(onBoard[fg], bg);
    if (r < min) low++;
    console.log(`${r >= min ? "ok  " : "LOW "} ${r.toFixed(2)}:1  ${fg} on board  (${use}, needs ${min})`);
  }
  const live = ratio(t["on-brand"], onBoard.brand);
  if (live < 3) low++;
  console.log(`${live >= 3 ? "ok  " : "LOW "} ${live.toFixed(2)}:1  on-brand on the board's brand  (LIVE badge, bold, needs 3)`);
  const action = ratio(bg, onBoard.foreground);
  if (action < 4.5) low++;
  console.log(`${action >= 4.5 ? "ok  " : "LOW "} ${action.toFixed(2)}:1  board on foreground  (the white "Open my set" button, needs 4.5)`);
}
if (low) {
  console.error(`${low} color pair(s) are below the WCAG minimum.`);
  process.exit(1);
}
