// MADE BY tools/ikneedata/build.mjs: don't edit by hand. Melee characters' attributes (NTSC) from IKneeData's
// calculator data (https://ikneedata.com/calculator), shown with credit.
import type { CharacterStats } from "./characterStats";

export const MELEE_STATS: Record<string, CharacterStats> = {
  "bowser": { weight: 117, fallSpeed: 1.9, gravity: 0.13, airSpeed: 0.8 },
  "captain-falcon": { weight: 104, fallSpeed: 2.9, gravity: 0.13, airSpeed: 1.12 },
  "donkey-kong": { weight: 114, fallSpeed: 2.4, gravity: 0.1, airSpeed: 1 },
  "dr-mario": { weight: 100, fallSpeed: 1.7, gravity: 0.095, airSpeed: 0.9 },
  "falco": { weight: 80, fallSpeed: 3.1, gravity: 0.17, airSpeed: 0.83 },
  "fox": { weight: 75, fallSpeed: 2.8, gravity: 0.23, airSpeed: 0.83 },
  "ganondorf": { weight: 109, fallSpeed: 2, gravity: 0.13, airSpeed: 0.78 },
  "ice-climbers": { weight: 88, fallSpeed: 1.6, gravity: 0.1, airSpeed: 0.7 },
  "jigglypuff": { weight: 60, fallSpeed: 1.3, gravity: 0.064, airSpeed: 1.35 },
  "kirby": { weight: 70, fallSpeed: 1.6, gravity: 0.08, airSpeed: 0.78 },
  "link": { weight: 104, fallSpeed: 2.13, gravity: 0.11, airSpeed: 1 },
  "luigi": { weight: 100, fallSpeed: 1.6, gravity: 0.069, airSpeed: 0.68 },
  "mario": { weight: 100, fallSpeed: 1.7, gravity: 0.095, airSpeed: 0.86 },
  "marth": { weight: 87, fallSpeed: 2.2, gravity: 0.085, airSpeed: 0.9 },
  "mewtwo": { weight: 85, fallSpeed: 1.5, gravity: 0.082, airSpeed: 1.2 },
  "mr-game-and-watch": { weight: 60, fallSpeed: 1.7, gravity: 0.095, airSpeed: 1 },
  "ness": { weight: 94, fallSpeed: 1.83, gravity: 0.09, airSpeed: 0.93 },
  "peach": { weight: 90, fallSpeed: 1.5, gravity: 0.08, airSpeed: 1.1 },
  "pichu": { weight: 55, fallSpeed: 1.9, gravity: 0.11, airSpeed: 0.85 },
  "pikachu": { weight: 80, fallSpeed: 1.9, gravity: 0.11, airSpeed: 0.85 },
  "roy": { weight: 85, fallSpeed: 2.4, gravity: 0.114, airSpeed: 0.9 },
  "samus": { weight: 110, fallSpeed: 1.4, gravity: 0.066, airSpeed: 0.89 },
  "sheik": { weight: 90, fallSpeed: 2.13, gravity: 0.12, airSpeed: 0.8 },
  "yoshi": { weight: 108, fallSpeed: 1.93, gravity: 0.093, airSpeed: 1.2 },
  "young-link": { weight: 85, fallSpeed: 2.13, gravity: 0.11, airSpeed: 1 },
  "zelda": { weight: 90, fallSpeed: 1.4, gravity: 0.073, airSpeed: 0.95 },
};
