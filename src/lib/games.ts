// Games Smashy supports, mapped to their start.gg videogame IDs.
//
// Main games (Melee, Ultimate, P+) show everywhere. Older games (64, Brawl, Smash 4) have smaller
// scenes, so they only show in tabs and lists for people who play them (picked on their profile),
// and are one tap away for everyone else (Resources → More games, game pickers).
export type GameKey = "melee" | "ultimate" | "pplus" | "smash64" | "brawl" | "smash4";

export const GAMES: Record<GameKey, { name: string; short: string; startggIds: number[]; legacy: boolean }> = {
  melee: { name: "Super Smash Bros. Melee", short: "Melee", startggIds: [1], legacy: false },
  ultimate: { name: "Super Smash Bros. Ultimate", short: "Ultimate", startggIds: [1386], legacy: false },
  // Project M (start.gg's game 2, before Project+ took over in 2016) is filed under P+ (Matthew,
  // 2026-11-16): its majors, brackets and players' old results count as P+ history.
  pplus: { name: "Project+", short: "P+", startggIds: [33602, 2], legacy: false },
  smash64: { name: "Super Smash Bros. (64)", short: "64", startggIds: [4], legacy: true },
  brawl: { name: "Super Smash Bros. Brawl", short: "Brawl", startggIds: [5], legacy: true },
  // Smash 4 ran on Wii U and 3DS; start.gg lists them separately.
  smash4: { name: "Super Smash Bros. for Wii U / 3DS", short: "Smash 4", startggIds: [3, 29], legacy: true },
};

/** Every game, main games first. */
export const GAME_KEYS = Object.keys(GAMES) as GameKey[];
export const MAIN_GAME_KEYS = GAME_KEYS.filter((g) => !GAMES[g].legacy);
export const LEGACY_GAME_KEYS = GAME_KEYS.filter((g) => GAMES[g].legacy);

export function isGameKey(value: unknown): value is GameKey {
  return typeof value === "string" && (GAME_KEYS as string[]).includes(value);
}

export function gameKeyFromStartggId(id: number | string): GameKey | null {
  return GAME_KEYS.find((key) => GAMES[key].startggIds.includes(Number(id))) ?? null;
}

/**
 * Many P+ tournaments file their events under start.gg's Brawl game (P+ is built on Brawl) and name them
 * '"Brawl" Singles', in quotes, or "Brawl :)" (round 652: 8 P+ majors showed as Brawl in history). A Brawl
 * event whose name says so counts as P+.
 */
export function brawlEventIsPplus(name: string | null | undefined): boolean {
  if (!name) return false;
  return /["“”']brawl["“”']|brawl\s*:\)|\bP\+|\bproject\s*(\+|plus|m\b)/i.test(name);
}

/** The game of a start.gg event: its videogame, with P+ events filed under Brawl counted as P+. */
export function gameOfEvent(e: { videogame?: { id: string | number } | null; name?: string | null } | null | undefined): GameKey | null {
  const game = e?.videogame ? gameKeyFromStartggId(e.videogame.id) : null;
  return game === "brawl" && brawlEventIsPplus(e?.name) ? "pplus" : game;
}

/** The games to show someone in tabs: the main games plus any older games they play. */
export function gamesFor(playerGames: readonly string[] | null | undefined): GameKey[] {
  const mine = new Set(playerGames ?? []);
  return GAME_KEYS.filter((g) => !GAMES[g].legacy || mine.has(g));
}
