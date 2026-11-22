// A year's head-to-head grid for one game from Smash history (round 708): the year's most successful
// players at majors and their sets against each other. ?player= (a start.gg player id) adds that player's
// record for the year.
import { isGameKey } from "@/lib/games";
import { ARCHIVE_FIRST_YEAR } from "@/lib/majors";
import { apiError, apiFailed, apiJson } from "@/lib/publicApi";
import { getYearGrid } from "@/lib/yearHeadToHead";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const thisYear = new Date().getUTCFullYear();
  const year = Number(params.get("year") ?? thisYear);
  const game = params.get("game") ?? "melee";
  const player = params.get("player");
  if (!Number.isInteger(year) || year < ARCHIVE_FIRST_YEAR || year > thisYear) return apiError(400, `year must be between ${ARCHIVE_FIRST_YEAR} and ${thisYear}.`);
  if (!isGameKey(game)) return apiError(400, "Unknown game. See /api/v1/games for the keys.");
  if (player !== null && !/^\d{1,12}$/.test(player)) return apiError(400, "player must be a start.gg player id (digits).");
  try {
    const grid = await getYearGrid(year, game, player);
    if (!grid) return apiError(503, "Couldn't load this right now. Try again in a minute.");
    return apiJson(
      {
        year,
        game,
        majors: grid.majors,
        majorsWithSets: grid.withSets,
        players: grid.players.map((p) => ({ startggPlayerId: p.playerId, name: p.name, ...grid.totals[p.playerId] })),
        records: grid.cells,
        ...(grid.record ? { player: { startggPlayerId: grid.record.playerId, name: grid.record.name, wins: grid.record.wins, losses: grid.record.losses } } : {}),
      },
      year < thisYear ? "long" : "short",
    );
  } catch (e) {
    return apiFailed("head-to-head", e);
  }
}
