// Cuts stock icons out of sprite sheets (The Spriters Resource rips; © Nintendo / HAL Laboratory) into
// public/stock/<game>/<character-key>.webp (64x64, default costume), and Smash 4's separate files.
// Then rewrites src/lib/stockIconKeys.ts (write-stock-icon-keys.mjs).
//
//   node scripts/import-sheet-stock-icons.mjs "<Downloads folder>"
//
// Each sheet entry names the top-left pixel of a character's first (default) icon; the script finds the
// icon box there (see stock-sheet-boxes.mjs) and makes the sheet background transparent.
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { findBoxes } from "./stock-sheet-boxes.mjs";
import { writeStockIconKeys } from "./write-stock-icon-keys.mjs";

const dl = process.argv[2];
if (!dl || !existsSync(dl)) {
  console.error("Pass the folder the sheets were downloaded to.");
  process.exit(1);
}

const SHEETS = {
  melee: {
    file: "GameCube - Super Smash Bros. Melee - Miscellaneous - Stock Icons.png",
    at: {
      mario: [5, 4], fox: [152, 4], "captain-falcon": [272, 4], "donkey-kong": [448, 4], kirby: [5, 41], bowser: [180, 40],
      link: [300, 40], sheik: [448, 40], ness: [46, 76], peach: [166, 76], "ice-climbers": [314, 76], pikachu: [434, 76],
      samus: [4, 113], yoshi: [152, 112], jigglypuff: [329, 112], mewtwo: [478, 112], luigi: [19, 148], marth: [138, 148],
      zelda: [286, 148], "young-link": [434, 148], "dr-mario": [47, 184], falco: [194, 184], pichu: [314, 185],
      "mr-game-and-watch": [434, 185], ganondorf: [10, 224], roy: [158, 224],
    },
  },
  brawl: {
    file: "Wii - Super Smash Bros. Brawl - Fighters - Stock Icons.png",
    at: {
      mario: [8, 5], "donkey-kong": [232, 5], link: [453, 5], samus: [678, 6], yoshi: [41, 51], kirby: [267, 51], fox: [489, 49],
      pikachu: [713, 49], luigi: [8, 93], "captain-falcon": [232, 93], ness: [453, 93], bowser: [678, 93], peach: [5, 137],
      zelda: [229, 137], sheik: [453, 137], "ice-climbers": [677, 137], marth: [8, 181], "mr-game-and-watch": [229, 184],
      falco: [453, 181], ganondorf: [678, 181], "meta-knight": [7, 227], pit: [229, 225], "zero-suit-samus": [453, 225],
      olimar: [677, 225], lucas: [45, 269], "diddy-kong": [266, 269], "pokemon-trainer": [489, 269], "king-dedede": [437, 313],
      lucario: [659, 313], ike: [135, 357], rob: [359, 361], jigglypuff: [585, 360], wario: [10, 401], "toon-link": [449, 402],
      wolf: [673, 401], snake: [39, 445], sonic: [263, 445],
    },
  },
  smash64: {
    file: "Nintendo 64 - Super Smash Bros. - Miscellaneous - Stock Icons.png",
    // Tiny 8x8 icons inside a framed table, so these are fixed boxes instead of found ones.
    box: {
      luigi: [11, 19, 8, 8], mario: [78, 19, 8, 8], "donkey-kong": [145, 19, 8, 8], link: [212, 19, 8, 8], samus: [279, 19, 8, 8],
      "captain-falcon": [346, 19, 8, 8], ness: [11, 32, 8, 8], yoshi: [78, 32, 8, 8], kirby: [145, 32, 8, 8],
      fox: [212, 31, 8, 10], pikachu: [279, 31, 8, 10], jigglypuff: [346, 31, 8, 10],
    },
  },
};

// Smash 4: one file per costume, named by the game's internal names.
const SMASH4_DIR = "Wii U - Super Smash Bros. for Wii U - Fighters - Stock Icons/Super Smash Bros for Wii U/Stock Icons";
const SMASH4 = {
  bayonetta: "bayonetta", captain: "captain-falcon", cloud: "cloud", dedede: "king-dedede", diddy: "diddy-kong",
  donkey: "donkey-kong", drmario: "dr-mario", duckhunt: "duck-hunt", falco: "falco", fox: "fox", gamewatch: "mr-game-and-watch",
  ganon: "ganondorf", gekkouga: "greninja", ike: "ike", kamui: "corrin", kirby: "kirby", koopa: "bowser", koopajr: "bowser-jr",
  link: "link", littlemac: "little-mac", lizardon: "charizard", lucario: "lucario", lucas: "lucas", lucina: "lucina",
  luigi: "luigi", mario: "mario", marth: "marth", metaknight: "meta-knight", mewtwo: "mewtwo", miifighter: "mii-brawler",
  miigunner: "mii-gunner", miiswordsman: "mii-swordfighter", murabito: "villager", ness: "ness", pacman: "pac-man",
  palutena: "palutena", peach: "peach", pikachu: "pikachu", pikmin: "olimar", pit: "pit", pitb: "dark-pit", purin: "jigglypuff",
  reflet: "robin", robot: "rob", rockman: "mega-man", rosetta: "rosalina-and-luma", roy: "roy", ryu: "ryu", samus: "samus",
  sheik: "sheik", shulk: "shulk", sonic: "sonic", szerosuit: "zero-suit-samus", toonlink: "toon-link", wario: "wario",
  wiifit: "wii-fit-trainer", yoshi: "yoshi", zelda: "zelda",
};

const toIcon = (img, { pixel = false } = {}) =>
  img.resize(64, 64, { fit: "contain", kernel: pixel ? "nearest" : "lanczos3", background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 90, lossless: pixel });

// Crop a box and turn the sheet's background colour transparent.
async function cut(file, [x, y, w, h], bg) {
  const { data, info } = await sharp(file).extract({ left: x, top: y, width: w, height: h }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    if (Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]) < 24) data[i + 3] = 0;
  }
  return sharp(data, { raw: info });
}

const keys = {};
for (const [game, sheet] of Object.entries(SHEETS)) {
  const file = join(dl, sheet.file);
  const out = `public/stock/${game}`;
  mkdirSync(out, { recursive: true });
  const { data } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let boxes = sheet.box ?? {};
  if (sheet.at) {
    const all = (await findBoxes(file)).flat(2);
    boxes = {};
    for (const [key, [x, y]] of Object.entries(sheet.at)) {
      const b = all.find((b) => Math.abs(b.x - x) <= 3 && Math.abs(b.y - y) <= 4);
      if (!b) throw new Error(`${game}: no icon at ${x},${y} for ${key}`);
      boxes[key] = [b.x, b.y, b.w, b.h];
    }
  }
  // Background: for smash64 the mint table cell (an empty cell in Luigi's row); otherwise the sheet's corner.
  const bgAt = game === "smash64" ? (22 * (await sharp(file).metadata()).width + 53) * 4 : 0;
  const bg = [data[bgAt], data[bgAt + 1], data[bgAt + 2]];
  for (const [key, box] of Object.entries(boxes)) {
    await toIcon(await cut(file, box, bg), { pixel: game === "smash64" }).toFile(join(out, `${key}.webp`));
  }
  keys[game] = Object.keys(boxes).sort();
}

{
  const dir = join(dl, SMASH4_DIR);
  mkdirSync("public/stock/smash4", { recursive: true });
  const files = readdirSync(dir);
  for (const [name, key] of Object.entries(SMASH4)) {
    if (!files.includes(`stock_90_${name}_01.png`)) throw new Error(`smash4: missing ${name}`);
    await toIcon(sharp(join(dir, `stock_90_${name}_01.png`))).toFile(join("public/stock/smash4", `${key}.webp`));
  }
  keys.smash4 = Object.values(SMASH4).sort();
}

console.log(Object.entries(keys).map(([g, k]) => `${g}: ${k.length}`).join(", "));
writeStockIconKeys();
