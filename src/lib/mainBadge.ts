// The little "main" badge next to a player's name: their main's stock icon, or a short code badge
// (FOX, CF, PCH) when there's no icon. Project+ borrows Brawl's icons (see BORROWED_ICONS). Safe in the browser.
//
// Stock icons (public/stock/<game>): Ultimate ones are recreations by Max_Hamm (r/smashbros, shared
// "use however you want, no credit required"); Smash 64, Melee, Brawl and Smash 4 ones are rips from
// The Spriters Resource (Storice, Cotton Candy 2C, Random Talking Bush). The characters and icon designs
// are © Nintendo / HAL Laboratory; Smashy isn't affiliated with Nintendo. To stop using the icons (e.g.
// if Nintendo asks), set STOCK_ICONS to false: every badge falls back to the code badge.
import { characterName, parseMains, type Main } from "./characters";
import { STOCK_ICON_KEYS } from "./stockIconKeys";
import { STOCK_COSTUMES } from "./stockCostumes";

export const STOCK_ICONS = true;

/** Which main to show: their first main that has a stock icon, otherwise their first main. */
export function badgeMain(mains: unknown): Main | null {
  const list = parseMains(mains);
  return list.find((m) => stockIconUrl(m)) ?? list[0] ?? null;
}

/**
 * Games with no icon set of their own borrow from others, in order. Project+ is built on Brawl, so it
 * uses Brawl's icons, then Melee's for Roy and Mewtwo and Smash 4's for Charizard. (Squirtle, Ivysaur
 * and Knuckles have none yet and keep the code badge.)
 */
const BORROWED_ICONS: Partial<Record<Main["game"], Main["game"][]>> = { pplus: ["brawl", "melee", "smash4"] };

export function stockIconUrl(main: Main): string | null {
  return costumeIcons(main)[(main.costume ?? 1) - 1] ?? costumeIcons(main)[0] ?? null;
}

/**
 * Every costume's icon for a character, the default first (round 728). One entry when only the default
 * was imported, none when the character has no icon at all. A main's `costume` is a position in this
 * list, counted from 1.
 */
export function costumeIcons(main: Pick<Main, "game" | "character">): string[] {
  if (!STOCK_ICONS) return [];
  for (const game of [main.game, ...(BORROWED_ICONS[main.game] ?? [])]) {
    if (!STOCK_ICON_KEYS[game]?.has(main.character)) continue;
    const count = STOCK_COSTUMES[game]?.[main.character] ?? 1;
    return [`/stock/${game}/${main.character}.webp`, ...Array.from({ length: count - 1 }, (_, i) => `/stock/${game}/costumes/${main.character}-${i + 2}.webp`)];
  }
  return [];
}

/** "Fox" -> FOX, "Captain Falcon" -> CF, "Mr. Game & Watch" -> MGW, "R.O.B." -> ROB. */
export function mainCode(main: Main): string {
  const name = characterName(main.game, main.character) ?? main.character;
  const words = name.replace(/[.&]/g, " ").split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words.map((w) => w[0]).join("") : words[0].slice(0, 3)).slice(0, 3).toUpperCase();
}
