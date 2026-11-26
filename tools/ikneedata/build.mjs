// Makes src/lib/characterStats.melee.ts from IKneeData's Melee calculator data (round 936): each character's
// weight, fall speed, gravity and air speed, as the game has them. IKneeData (Schmoo and GentleFox) is
// already one of Smashy's listed Melee essentials; the numbers show with credit and a link.
//
// Run by hand if the data ever changes:
//   curl -sL "https://ikneedata.com/charAttributes.js" -o "$DIR/charAttributes.js"
//   node tools/ikneedata/build.mjs "$DIR/charAttributes.js"
// The file is read as text and picked apart with patterns; it is never run.
import fs from "node:fs";

const file = process.argv[2];
if (!file) throw new Error("Give the saved charAttributes.js.");
const text = fs.readFileSync(file, "utf8");

// IKneeData's short names -> Smashy's character keys. Giga Bowser and Nana are left out (Popo stands for
// the Ice Climbers, as he's the one you control).
const KEY = {
  Bowser: "bowser", DK: "donkey-kong", Samus: "samus", Ganon: "ganondorf", Yoshi: "yoshi", Falcon: "captain-falcon",
  Link: "link", Doc: "dr-mario", Luigi: "luigi", Mario: "mario", Ness: "ness", Peach: "peach", Sheik: "sheik",
  Zelda: "zelda", Popo: "ice-climbers", Marth: "marth", Mewtwo: "mewtwo", Roy: "roy", "Y.Link": "young-link",
  Falco: "falco", Pika: "pikachu", Fox: "fox", Kirby: "kirby", Puff: "jigglypuff", "MrG&W": "mr-game-and-watch", Pichu: "pichu",
};
// our field -> their name
const FIELDS = { weight: "NTSCweight", fallSpeed: "terminalVelocity", gravity: "gravity", airSpeed: "driftMax" };

const stats = {};
for (const m of text.matchAll(/^\s*"([^"]+)":\s*\{(.*)$/gm)) {
  const key = KEY[m[1]];
  if (!key) continue;
  const row = {};
  for (const [ours, theirs] of Object.entries(FIELDS)) {
    const v = m[2].match(new RegExp(`\\b${theirs}\\s*:\\s*(-?[0-9.]+)`));
    if (v && Number.isFinite(Number(v[1]))) row[ours] = Number(v[1]);
  }
  if (row.weight === undefined || row.fallSpeed === undefined) throw new Error(`${m[1]}: weight or fall speed not found`);
  stats[key] = row;
}
const missing = Object.values(KEY).filter((k) => !stats[k]);
if (missing.length) throw new Error(`Not found: ${missing.join(", ")}`);

const order = Object.keys(FIELDS);
const lines = Object.keys(stats).sort().map((k) => `  ${JSON.stringify(k)}: { ${order.filter((f) => stats[k][f] !== undefined).map((f) => `${f}: ${stats[k][f]}`).join(", ")} },`);
fs.writeFileSync(
  "src/lib/characterStats.melee.ts",
  `// MADE BY tools/ikneedata/build.mjs: don't edit by hand. Melee characters' attributes (NTSC) from IKneeData's
// calculator data (https://ikneedata.com/calculator), shown with credit.
import type { CharacterStats } from "./characterStats";

export const MELEE_STATS: Record<string, CharacterStats> = {
${lines.join("\n")}
};
`,
);
console.log(`Wrote ${lines.length} characters.`);
