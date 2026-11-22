// Imports Ultimate stock icons (recreations by Max_Hamm, r/smashbros, shared "use however you want,
// no credit required"; the characters and original icon designs are © Nintendo) into
// public/stock/ultimate/<character-key>.webp at 64x64, default costume only, and writes the list of
// characters that have one to src/lib/stockIconKeys.ts (write-stock-icon-keys.mjs).
//
//   node scripts/import-stock-icons.mjs "<folder with Mario.png, Bowser1.png, ...>"
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { writeStockIconKeys } from "./write-stock-icon-keys.mjs";

const src = process.argv[2];
if (!src || !existsSync(src)) {
  console.error("Pass the folder of icon PNGs.");
  process.exit(1);
}
const out = "public/stock/ultimate";
mkdirSync(out, { recursive: true });

// File names are CamelCase ("DonkeyKong1.png"); Smashy keys are kebab-case ("donkey-kong").
const SPECIAL = { Rosalina: "rosalina-and-luma", Pyra: "pyra-and-mythra", IceClimbersPopo: "ice-climbers" };
// Icons in the set that aren't separate characters on Smashy (Pokémon Trainer's Pokémon, Nana, Mythra, plain Mii).
const SKIP = new Set(["Charizard", "Squirtle", "Ivysaur", "IceClimbersNana", "Mythra", "Mii"]);
const toKey = (base) => SPECIAL[base] ?? base.replace(/([a-z])([A-Z])/g, "$1-$2").replace(/([A-Z])([A-Z][a-z])/g, "$1-$2").toLowerCase();

const files = readdirSync(src).filter((f) => /\.png$/i.test(f));
const bases = [...new Set(files.map((f) => f.replace(/\d*(\(\d+\))?\.png$/i, "")))];
const keys = [];
for (const base of bases) {
  if (SKIP.has(base)) continue;
  // The default costume ("Mario.png" or "Bowser1.png"); if it's missing, the lowest-numbered one.
  const numbered = files
    .filter((f) => f.startsWith(base) && /^\d+\.png$/i.test(f.slice(base.length)))
    .sort((a, b) => parseInt(a.slice(base.length)) - parseInt(b.slice(base.length)));
  const pick = files.includes(`${base}.png`) ? `${base}.png` : numbered[0];
  if (!pick) continue;
  const key = toKey(base);
  await sharp(join(src, pick)).resize(64, 64, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 90 }).toFile(join(out, `${key}.webp`));
  keys.push(key);
}
writeStockIconKeys();
console.log(`${keys.length} icons written`);
