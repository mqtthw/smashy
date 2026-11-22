// One major from Smash history (round 708): its brackets, each with the top 8 and, where saved, standings
// to 64th. Players who asked not to be listed are left out of the standings, and their characters out of
// the top 8, as on the site; if that can't be checked, nothing is sent.
import { getMajorEvents } from "@/lib/majorEvents";
import { getMajorStandings } from "@/lib/majorStandings";
import { getMajor } from "@/lib/majors";
import { playersHidingStats } from "@/lib/playerStats";
import { apiError, apiFailed, apiJson, apiMajor, apiMajorEvents } from "@/lib/publicApi";

export async function GET(_request: Request, { params }: RouteContext<"/api/v1/majors/[...slug]">) {
  const slug = (await params).slug.join("/");
  if (!/^((parrygg|manual)\/)?[a-z0-9-]{1,120}$/i.test(slug)) return apiError(400, "That isn't a major's slug.");
  try {
    const major = await getMajor(slug);
    if (!major) return apiError(404, "No such major in Smash history.");
    const [events, standings] = await Promise.all([getMajorEvents([slug]).then((m) => m.get(slug) ?? []), getMajorStandings(slug)]);
    const ids = [...events.flatMap((e) => e.top8), ...[...standings.values()].flat()].flatMap((r) => (r.playerId ? [r.playerId] : []));
    const hidden = await playersHidingStats(ids);
    const shownEvents = events.map((e) => ({ ...e, top8: e.top8.map((r) => (r.playerId && hidden.has(r.playerId) ? { ...r, characters: undefined } : r)) }));
    const shownStandings = new Map([...standings].map(([id, rows]) => [id, rows.filter((r) => !r.playerId || !hidden.has(r.playerId))]));
    return apiJson({ major: { ...apiMajor(major), brackets: apiMajorEvents(shownEvents, shownStandings) } }, major.live ? "short" : "long");
  } catch (e) {
    return apiFailed("major", e);
  }
}
