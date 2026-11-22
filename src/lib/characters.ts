// Character rosters per game. Keys are stable slugs used in the database and URLs
// (e.g. /games/melee/fox in the resource hub). Shared by server and browser.
import type { GameKey } from "./games";

const MELEE = [
  "Dr. Mario", "Mario", "Luigi", "Bowser", "Peach", "Yoshi", "Donkey Kong", "Captain Falcon", "Ganondorf",
  "Falco", "Fox", "Ness", "Ice Climbers", "Kirby", "Samus", "Zelda", "Sheik", "Link", "Young Link",
  "Pichu", "Pikachu", "Jigglypuff", "Mewtwo", "Mr. Game & Watch", "Marth", "Roy",
];

const ULTIMATE = [
  "Mario", "Donkey Kong", "Link", "Samus", "Dark Samus", "Yoshi", "Kirby", "Fox", "Pikachu", "Luigi", "Ness",
  "Captain Falcon", "Jigglypuff", "Peach", "Daisy", "Bowser", "Ice Climbers", "Sheik", "Zelda", "Dr. Mario",
  "Pichu", "Falco", "Marth", "Lucina", "Young Link", "Ganondorf", "Mewtwo", "Roy", "Chrom", "Mr. Game & Watch",
  "Meta Knight", "Pit", "Dark Pit", "Zero Suit Samus", "Wario", "Snake", "Ike", "Pokémon Trainer", "Diddy Kong",
  "Lucas", "Sonic", "King Dedede", "Olimar", "Lucario", "R.O.B.", "Toon Link", "Wolf", "Villager", "Mega Man",
  "Wii Fit Trainer", "Rosalina & Luma", "Little Mac", "Greninja", "Mii Brawler", "Mii Swordfighter", "Mii Gunner",
  "Palutena", "Pac-Man", "Robin", "Shulk", "Bowser Jr.", "Duck Hunt", "Ryu", "Ken", "Cloud", "Corrin", "Bayonetta",
  "Inkling", "Ridley", "Simon", "Richter", "King K. Rool", "Isabelle", "Incineroar", "Piranha Plant", "Joker",
  "Hero", "Banjo & Kazooie", "Terry", "Byleth", "Min Min", "Steve", "Sephiroth", "Pyra & Mythra", "Kazuya", "Sora",
];

const PPLUS = [
  "Mario", "Luigi", "Peach", "Bowser", "Donkey Kong", "Diddy Kong", "Yoshi", "Wario", "Link", "Toon Link", "Zelda",
  "Sheik", "Ganondorf", "Samus", "Zero Suit Samus", "Pit", "Ike", "Marth", "Roy", "Fox", "Falco", "Wolf",
  "Captain Falcon", "Pikachu", "Jigglypuff", "Squirtle", "Ivysaur", "Charizard", "Lucario", "Mewtwo", "Kirby",
  "Meta Knight", "King Dedede", "Ness", "Lucas", "Ice Climbers", "Olimar", "Mr. Game & Watch", "R.O.B.", "Snake",
  "Sonic", "Knuckles",
];

const SMASH64 = [
  "Mario", "Donkey Kong", "Link", "Samus", "Yoshi", "Kirby", "Fox", "Pikachu", "Luigi", "Ness", "Captain Falcon", "Jigglypuff",
];

const BRAWL = [
  "Mario", "Luigi", "Peach", "Bowser", "Donkey Kong", "Diddy Kong", "Yoshi", "Wario", "Link", "Zelda", "Sheik",
  "Ganondorf", "Toon Link", "Samus", "Zero Suit Samus", "Pit", "Ice Climbers", "R.O.B.", "Kirby", "Meta Knight",
  "King Dedede", "Olimar", "Fox", "Falco", "Wolf", "Captain Falcon", "Pikachu", "Pokémon Trainer", "Lucario",
  "Jigglypuff", "Marth", "Ike", "Ness", "Lucas", "Mr. Game & Watch", "Snake", "Sonic",
];

const SMASH4 = [
  "Mario", "Luigi", "Peach", "Bowser", "Yoshi", "Rosalina & Luma", "Bowser Jr.", "Wario", "Mr. Game & Watch",
  "Donkey Kong", "Diddy Kong", "Link", "Zelda", "Sheik", "Ganondorf", "Toon Link", "Samus", "Zero Suit Samus", "Pit",
  "Palutena", "Marth", "Ike", "Robin", "Duck Hunt", "Kirby", "King Dedede", "Meta Knight", "Little Mac", "Fox",
  "Falco", "Pikachu", "Charizard", "Lucario", "Jigglypuff", "Greninja", "R.O.B.", "Ness", "Captain Falcon", "Villager",
  "Olimar", "Wii Fit Trainer", "Shulk", "Dr. Mario", "Dark Pit", "Lucina", "Pac-Man", "Mega Man", "Sonic", "Mewtwo",
  "Lucas", "Roy", "Ryu", "Cloud", "Corrin", "Bayonetta", "Mii Brawler", "Mii Swordfighter", "Mii Gunner",
];

export type Character = { key: string; name: string };

export function characterKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // é -> e
    .replace(/\.(?=[a-z])/g, "") // R.O.B. -> rob (but "Dr. Mario" -> dr-mario)
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const toList = (names: string[]): Character[] =>
  names.map((name) => ({ key: characterKey(name), name })).sort((a, b) => a.name.localeCompare(b.name));

export const CHARACTERS: Record<GameKey, Character[]> = {
  melee: toList(MELEE),
  ultimate: toList(ULTIMATE),
  pplus: toList(PPLUS),
  smash64: toList(SMASH64),
  brawl: toList(BRAWL),
  smash4: toList(SMASH4),
};

export function characterName(game: GameKey, key: string | null | undefined): string | null {
  if (!key) return null;
  return CHARACTERS[game].find((c) => c.key === key)?.name ?? null;
}


export type Main = { game: GameKey; character: string };
export const MAX_MAINS = 3;

/** Reads a saved or submitted list of mains, keeping only real characters (up to 3, no repeats). */
export function parseMains(raw: unknown): Main[] {
  let list: unknown = raw;
  if (typeof raw === "string") {
    try {
      list = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  const out: Main[] = [];
  for (const m of list) {
    const game = (m as Main)?.game;
    const character = (m as Main)?.character;
    if (typeof game !== "string" || !(game in CHARACTERS) || typeof character !== "string") continue;
    if (!CHARACTERS[game as GameKey].some((c) => c.key === character)) continue;
    if (out.some((o) => o.game === game && o.character === character)) continue;
    out.push({ game: game as GameKey, character });
    if (out.length >= MAX_MAINS) break;
  }
  return out;
}
