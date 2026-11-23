// Imports every costume's stock icon (round 728), so a main can show the costume its player uses.
// The default costumes stay where they are (public/stock/<game>/<key>.webp, see import-stock-icons.mjs
// and import-sheet-stock-icons.mjs); this adds the others next to them:
//   public/stock/<game>/costumes/<key>-<n>.webp   (n = 2, 3, …; costume 1 is the default icon)
// and writes how many costumes each character has to src/lib/stockCostumes.ts.
// Same sources and credits as the default icons (public/stock/CREDITS.txt).
//
//   node scripts/import-stock-costumes.mjs "<Downloads folder>" "<folder of Ultimate PNGs>"
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { findBoxes } from "./stock-sheet-boxes.mjs";

const [dl, ultimateDir] = process.argv.slice(2);
if (!dl || !existsSync(dl) || !ultimateDir || !existsSync(ultimateDir)) {
  console.error("Pass the Downloads folder (with the sprite sheets) and the folder of Ultimate icon PNGs.");
  process.exit(1);
}

const toIcon = (img) => img.resize(64, 64, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 90 });
const counts = {};
const outDir = (game) => {
  const dir = `public/stock/${game}/costumes`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  return dir;
};

// ---------- Ultimate: one PNG per costume ("Bowser1.png" … "Bowser8.png") ----------
{
  const SPECIAL = { Rosalina: "rosalina-and-luma", Pyra: "pyra-and-mythra", IceClimbersPopo: "ice-climbers" };
  const SKIP = new Set(["Charizard", "Squirtle", "Ivysaur", "IceClimbersNana", "Mythra", "Mii"]);
  const toKey = (base) => SPECIAL[base] ?? base.replace(/([a-z])([A-Z])/g, "$1-$2").replace(/([A-Z])([A-Z][a-z])/g, "$1-$2").toLowerCase();
  const dir = outDir("ultimate");
  const files = readdirSync(ultimateDir).filter((f) => /\.png$/i.test(f));
  const bases = [...new Set(files.map((f) => f.replace(/\d*(\(\d+\))?\.png$/i, "")))];
  counts.ultimate = {};
  for (const base of bases) {
    if (SKIP.has(base)) continue;
    const numbered = files
      .filter((f) => f.startsWith(base) && /^\d+\.png$/i.test(f.slice(base.length)))
      .sort((a, b) => parseInt(a.slice(base.length)) - parseInt(b.slice(base.length)));
    // The default icon is "Base.png" when there is one, else the lowest number: the same pick as
    // import-stock-icons.mjs. The rest follow in the game's own order.
    const rest = files.includes(`${base}.png`) ? numbered : numbered.slice(1);
    if (!existsSync(`public/stock/ultimate/${toKey(base)}.webp`) || !rest.length) continue;
    let n = 1;
    for (const f of rest) await toIcon(sharp(join(ultimateDir, f))).toFile(join(dir, `${toKey(base)}-${++n}.webp`));
    counts.ultimate[toKey(base)] = n;
  }
}

// ---------- Melee and Brawl: sprite sheets, a character's costumes side by side ----------
const SHEETS = {
  melee: "GameCube - Super Smash Bros. Melee - Miscellaneous - Stock Icons.png",
  brawl: "Wii - Super Smash Bros. Brawl - Fighters - Stock Icons.png",
};
// Where each character's default icon starts: read from the default-costume importer, so the two agree.
const sheetSource = (await import("node:fs")).readFileSync("scripts/import-sheet-stock-icons.mjs", "utf8").split("\r").join("");
function defaultsFor(game) {
  const block = sheetSource.slice(sheetSource.indexOf(`  ${game}: {`));
  const at = block.slice(block.indexOf("at: {") + 5, block.indexOf("},\n  },"));
  const out = {};
  for (const m of at.matchAll(/"?([a-z0-9-]+)"?: \[(\d+), (\d+)\]/g)) out[m[1]] = [Number(m[2]), Number(m[3])];
  return out;
}
async function cut(file, b, bg) {
  const { data, info } = await sharp(file).extract({ left: b.x, top: b.y, width: b.w, height: b.h }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    if (Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]) < 24) data[i + 3] = 0;
  }
  return sharp(data, { raw: info });
}
for (const [game, name] of Object.entries(SHEETS)) {
  const file = join(dl, name);
  const dir = outDir(game);
  const { data } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bg = [data[0], data[1], data[2]];
  // Each row of the sheet, its icons left to right. A character's costumes follow its default icon,
  // close together (narrow icons like Mewtwo's sit a little further apart), until the next character.
  const rows = (await findBoxes(file)).map((groups) => groups.flat());
  const defaults = defaultsFor(game);
  const isAt = (b, [x, y]) => Math.abs(b.x - x) <= 3 && Math.abs(b.y - y) <= 4;
  const starts = Object.values(defaults);
  counts[game] = {};
  for (const [key, at] of Object.entries(defaults)) {
    const row = rows.find((r) => r.some((b) => isAt(b, at)));
    if (!row) throw new Error(`${game}: no icons found for ${key}`);
    const start = row.findIndex((b) => isAt(b, at));
    const rest = [];
    for (let i = start + 1; i < row.length; i++) {
      const prev = row[i - 1], b = row[i];
      if (b.x - (prev.x + prev.w) > 12 || Math.abs(b.h - row[start].h) > 4 || starts.some((s) => isAt(b, s))) break;
      rest.push(b);
    }
    let n = 1;
    for (const b of rest) await toIcon(await cut(file, b, bg)).toFile(join(dir, `${key}-${++n}.webp`));
    if (n > 1) counts[game][key] = n;
  }
}

// ---------- Smash 4: one file per costume (stock_90_<name>_01.png …) ----------
{
  const s4 = join(dl, "Wii U - Super Smash Bros. for Wii U - Fighters - Stock Icons/Super Smash Bros for Wii U/Stock Icons");
  const block = sheetSource.slice(sheetSource.indexOf("const SMASH4 = {"), sheetSource.indexOf("};", sheetSource.indexOf("const SMASH4 = {")));
  const names = Object.fromEntries([...block.matchAll(/([a-z0-9]+): "([a-z0-9-]+)"/g)].map((m) => [m[1], m[2]]));
  counts.smash4 = {};
  if (existsSync(s4)) {
    const dir = outDir("smash4");
    const files = readdirSync(s4);
    for (const [name, key] of Object.entries(names)) {
      let n = 1;
      for (let c = 2; c <= 16; c++) {
        const f = `stock_90_${name}_${String(c).padStart(2, "0")}.png`;
        if (!files.includes(f)) break;
        await toIcon(sharp(join(s4, f))).toFile(join(dir, `${key}-${++n}.webp`));
      }
      if (n > 1) counts.smash4[key] = n;
    }
  }
}

const body = Object.keys(counts).sort().map((g) => `  ${g}: ${JSON.stringify(Object.fromEntries(Object.entries(counts[g]).sort()))},`).join("\n");
writeFileSync(
  "src/lib/stockCostumes.ts",
  `// Generated by scripts/import-stock-costumes.mjs: how many costumes each character's stock icon has\n// (costume 1 is public/stock/<game>/<key>.webp; 2 and up are public/stock/<game>/costumes/<key>-<n>.webp).\nimport type { GameKey } from "./games";\n\nexport const STOCK_COSTUMES: Partial<Record<GameKey, Record<string, number>>> = {\n${body}\n};\n`,
);
console.log(Object.entries(counts).map(([g, c]) => `${g}: ${Object.keys(c).length} characters, ${Object.values(c).reduce((a, b) => a + b - 1, 0)} extra icons`).join("\n"));
