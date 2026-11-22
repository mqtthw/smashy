// Upcoming in-person tournaments in a region (round 708), soonest first, from Smashy's saved lists
// (refreshed from start.gg every few hours). Never asks start.gg itself: a region nobody has opened on
// Smashy lately can come back empty.
import { getSavedUpcomingTournaments } from "@/lib/events";
import { isGameKey } from "@/lib/games";
import { apiError, apiFailed, apiJson, apiTournament } from "@/lib/publicApi";
import { isRegion } from "@/lib/regions";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const region = params.get("region") ?? "US-TX";
  const game = params.get("game");
  if (!isRegion(region)) return apiError(400, "Unknown region. See /api/v1/regions for the codes.");
  if (game !== null && !isGameKey(game)) return apiError(400, "Unknown game. See /api/v1/games for the keys.");
  try {
    const list = (await getSavedUpcomingTournaments(region))
      .filter((t) => !game || t.events.some((e) => e.game === game))
      .sort((a, b) => a.startAt - b.startAt);
    return apiJson({ region, game, tournaments: list.map(apiTournament) });
  } catch (e) {
    return apiFailed("events", e);
  }
}
