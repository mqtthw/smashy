// A year's finished majors from Smash history (round 708), newest first. ?game= narrows it to one game.
import { isGameKey } from "@/lib/games";
import { HISTORY_FIRST_YEAR, getPastMajors } from "@/lib/majors";
import { apiError, apiFailed, apiJson, apiMajor } from "@/lib/publicApi";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const thisYear = new Date().getUTCFullYear();
  const year = Number(params.get("year") ?? thisYear);
  const game = params.get("game");
  if (!Number.isInteger(year) || year < HISTORY_FIRST_YEAR || year > thisYear) return apiError(400, `year must be between ${HISTORY_FIRST_YEAR} and ${thisYear}.`);
  if (game !== null && !isGameKey(game)) return apiError(400, "Unknown game. See /api/v1/games for the keys.");
  try {
    const majors = (await getPastMajors(year)).filter((m) => !game || m.games.includes(game));
    return apiJson({ year, game, majors: majors.map(apiMajor) }, year < thisYear ? "long" : "short");
  } catch (e) {
    return apiFailed("majors", e);
  }
}
