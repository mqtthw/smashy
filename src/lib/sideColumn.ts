// What the desktop side column shows (round 500): events running now near the visitor, the next
// few coming up, and the next majors. Built from copies other pages already keep (the region's
// saved events and a shared majors snapshot), so asking for it costs no extra start.gg or database
// calls per visit.
import "server-only";
import { cacheLife } from "next/cache";
import { getRegionEvents } from "./events";
import { currentBracket, isRunning } from "./format";
import { bracketPath } from "./brackets/types";
import { onlineToday } from "./onlineToday";
import { getOnlineTournaments } from "./startgg";
import type { GameKey } from "./games";
import { getMajorsSnapshot, majorsFor } from "./majors";
import { regionName } from "./regions";

export type SideEvent = { slug: string; name: string; city: string | null; startAt: number; timezone: string | null; games: GameKey[] };
export type SideMajor = { slug: string; name: string; startAt: string; timezone: string | null; live: boolean; games: GameKey[]; entrants: number | null };
/** An online bracket today (round 813): `href` opens the bracket when it's live, else the tournament. */
export type SideOnline = { slug: string; name: string; href: string; live: boolean; start: number; timezone: string | null; games: GameKey[]; players: number | null };
export type SideData = { regionName: string; live: SideEvent[]; next: SideEvent[]; majors: SideMajor[]; online: SideOnline[] };

export async function getSideColumn(region: string): Promise<SideData> {
  // The finished column (a few KB) is kept and shared per region (round 680), so a visit doesn't pull
  // the region's whole saved event list (often 100 KB or more) out of the cache to pick ten items.
  "use cache: remote";
  const [events, majors, online] = await Promise.all([
    getRegionEvents(region).catch(() => null),
    getMajorsSnapshot().catch(() => null),
    getOnlineTournaments().catch(() => []),
  ]);
  // A minute, like the lists it's built from ("live" depends on the time); seconds when one failed.
  if (!events || !majors) cacheLife("seconds");
  else cacheLife({ stale: 30, revalidate: 60, expire: 300 });
  const tournaments = events?.tournaments ?? [];
  const toSide = (t: (typeof tournaments)[number]): SideEvent => ({
    slug: t.slug,
    name: t.name,
    city: t.city ?? null,
    startAt: t.startAt,
    timezone: t.timezone ?? null,
    games: [...new Set(t.events.map((e) => e.game))].slice(0, 2) as GameKey[],
  });
  const running = tournaments.filter((t) => isRunning(t));
  return {
    regionName: regionName(region),
    live: running.slice(0, 3).map(toSide),
    next: tournaments.filter((t) => !running.includes(t)).slice(0, 3).map(toSide),
    online: onlineToday(online).map(({ t, live, start }) => ({
      slug: t.slug,
      name: t.name,
      href: live && t.events.length ? bracketPath("startgg", (currentBracket(t) ?? [...t.events].sort((a, b) => (b.numEntrants ?? 0) - (a.numEntrants ?? 0))[0]).id) : `/events/${t.slug}`,
      live,
      start,
      timezone: t.timezone ?? null,
      games: [...new Set(t.events.map((e) => e.game))].slice(0, 2) as GameKey[],
      players: t.numAttendees ?? null,
    })),
    majors: majorsFor(majors ?? [], []).slice(0, 4).map((m) => ({
      slug: m.slug,
      name: m.name,
      startAt: m.startAt,
      timezone: m.timezone,
      live: m.live,
      games: m.games,
      entrants: m.entrants,
    })),
  };
}
