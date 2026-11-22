// A region's tournaments as a calendar people subscribe to: /events/calendar.ics?region=US-TX&game=melee.
// Calendar apps check back every few hours, so new tournaments show up on their own. It reads the same
// saved list as the Events page (no extra start.gg requests while that copy is fresh). Only tournaments
// posted on start.gg are in it, not predicted weeklies (those are guesses).
import { calendarFeed } from "@/lib/rsvps";
import { getRegionEvents } from "@/lib/events";
import { GAMES, isGameKey } from "@/lib/games";
import { HOME_REGION, isRegion, regionName } from "@/lib/regions";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const regionParam = url.searchParams.get("region");
  const region = isRegion(regionParam) ? regionParam : HOME_REGION;
  const gameParam = url.searchParams.get("game");
  const game = isGameKey(gameParam) ? gameParam : null;
  const events = await getRegionEvents(region).catch(() => null);
  if (!events) return new Response("Couldn't load events right now", { status: 503, headers: { "Retry-After": "600" } });
  const tournaments = events.tournaments.filter((t) => !game || t.events.some((e) => e.game === game));
  const body = calendarFeed(
    `Smash in ${regionName(region)}${game ? ` (${GAMES[game].short})` : ""} · Smashy`,
    tournaments.map((t) => ({
      uid: `tournament-${t.id}`,
      name: t.name,
      startAt: t.startAt,
      endAt: t.endAt,
      location: t.venueAddress ?? t.venueName ?? t.city,
      url: `${url.origin}/events/${t.slug}`,
      description: `Sign up: ${t.registerUrl}`,
    })),
  );
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="smashy-${region.toLowerCase()}${game ? `-${game}` : ""}.ics"`,
      "Cache-Control": "public, max-age=900, s-maxage=1800",
    },
  });
}
