// The Arcade's data: every game's majors from Smash history's saved results (winBrackets, which is shared
// between servers and refreshed every few hours), in the small shape the games need.
import "server-only";
import type { ArcadeMajor } from "./arcade";
import { GAME_KEYS } from "./games";
import { mainBrackets, winBrackets } from "./historyFirsts";
import { tagOnly } from "./majorSets";

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
