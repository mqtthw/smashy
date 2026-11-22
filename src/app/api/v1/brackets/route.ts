// Upcoming brackets run on Smashy itself (round 708), soonest first.
import { isGameKey } from "@/lib/games";
import { getUpcomingHostedEvents } from "@/lib/hostedEvents";
import { apiBracket, apiError, apiFailed, apiJson } from "@/lib/publicApi";

export async function GET(request: Request) {
  const game = new URL(request.url).searchParams.get("game");
  if (game !== null && !isGameKey(game)) return apiError(400, "Unknown game. See /api/v1/games for the keys.");
  try {
    const events = await getUpcomingHostedEvents({ game: game ?? undefined, limit: 50 });
    return apiJson({ game, brackets: events.map(apiBracket) });
  } catch (e) {
    return apiFailed("brackets", e);
  }
}
