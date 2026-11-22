import type { SmashyTournament } from "./startgg";

/** Other upcoming tournaments to suggest on an event page (round 704): not this one, soonest first, at most `max`. */
export function nearbyPicks(list: SmashyTournament[], slug: string, max = 4): SmashyTournament[] {
  return list.filter((x) => x.slug !== slug).sort((a, b) => a.startAt - b.startAt).slice(0, max);
}
