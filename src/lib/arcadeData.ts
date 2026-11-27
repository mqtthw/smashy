// The Arcade's data: every game's majors from Smash history's saved results (winBrackets, which is shared
// between servers and refreshed every few hours), in the small shape the games need.
import "server-only";
import type { ArcadeMajor, HlCard } from "./arcade";
import { GAME_KEYS, type GameKey } from "./games";
import { arcadePlayers, mainBrackets, winBrackets } from "./historyFirsts";
import { tagOnly } from "./majorSets";
import { playersHidingStats } from "./playerStats";

/**
 * Higher or lower's player cards: each game's best-known players (the most top 8s, and a major win or six top
 * 8s), without anyone who hides their stats. One shared, cached list per game, so this adds no load of its own
 * beyond the one check of who hides their stats.
 */
export async function arcadeHlPlayers(games: readonly GameKey[], perGame = 40): Promise<HlCard[]> {
  const lists = await Promise.all(games.map(async (game) => ((await arcadePlayers(game).catch(() => null)) ?? []).filter((p) => (p.wins >= 1 || p.top8s >= 6) && !/^deleted user$/i.test(p.name)).slice(0, perGame).map((p) => ({ p, game }))));
  const rows = lists.flat();
  // When the check fails, no players at all (as in Guess the player): never show someone who hides their stats.
  const hidden = await playersHidingStats(rows.flatMap(({ p }) => (p.playerId ? [p.playerId] : []))).catch(() => null);
  if (!hidden) return [];
  return rows
    .filter(({ p }) => !p.playerId || !hidden.has(p.playerId))
    .map(({ p, game }) => ({ id: `p:${game}:${p.key}`, name: tagOnly(p.name), game, year: null, wins: p.wins, top8s: p.top8s }));
}

/** Each major's main bracket of each game: its name, date, size and top 8 names (sponsors left off). */
export async function arcadeMajors(): Promise<ArcadeMajor[]> {
  const perGame = await Promise.all(GAME_KEYS.map(async (game) => mainBrackets(await winBrackets(game), game).map((b) => ({ b, game }))));
  return perGame.flat().map(({ b, game }) => ({
    slug: b.majorSlug,
    name: b.majorName,
    game,
    date: b.startAt,
    entrants: b.entrants,
    top8: b.top8.filter((r) => r.place <= 8 && !r.name.includes(" / ")).slice(0, 8).map((r) => tagOnly(r.name)),
  }));
}
