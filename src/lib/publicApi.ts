// Smashy's public API (round 708): read-only, no key, only what a signed-out visitor can already see
// (src/proxy.ts drops sign-in cookies on /api/v1 and counts calls per address). These helpers shape the
// answers so the site's internal data can change without breaking apps that use the API. Docs: /developers.
import type { HostedEvent } from "./hostedEvents";
import type { Major } from "./majors";
import type { MajorEvent } from "./majorEvents";
import { channelUrl, clipUrl, type ReelPlatform } from "./reelLinks";
import type { StandingRow } from "./majorStandings";
import type { RulesetSummary, RulesetVersion } from "./scenes";
import { siteUrl } from "./siteMeta";
import type { SmashyTournament } from "./startgg";

export const API_VERSION = "v1";

const BASE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "X-Robots-Tag": "noindex",
};

/** How long Vercel's network keeps an answer: "live" for running brackets, "short" for lists that change through the day, "long" for history. */
export type ApiCache = "none" | "live" | "short" | "long";
const CACHE: Record<ApiCache, string> = {
  none: "no-store",
  live: "public, max-age=15, s-maxage=15, stale-while-revalidate=60",
  short: "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
  long: "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
};

export function apiJson(data: unknown, cache: ApiCache = "short", status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), { status, headers: { ...BASE_HEADERS, "Cache-Control": CACHE[cache] } });
}

export function apiError(status: number, message: string): Response {
  return apiJson({ error: message }, "none", status);
}

/** For a route's catch: logs it and says to try again, without the internal reason. */
export function apiFailed(what: string, e: unknown): Response {
  console.error(`public API: ${what} failed`, e instanceof Error ? e.message : e);
  return apiError(503, "Couldn't load this right now. Try again in a minute.");
}

const iso = (unixSeconds: number | null) => (unixSeconds == null ? null : new Date(unixSeconds * 1000).toISOString());
const site = (path: string) => new URL(path, siteUrl()).toString();

export function apiTournament(t: SmashyTournament) {
  return {
    slug: t.slug,
    name: t.name,
    url: site(`/events/${t.slug}`),
    startggUrl: t.startggUrl,
    startAt: iso(t.startAt),
    endAt: iso(t.endAt),
    timezone: t.timezone,
    city: t.city,
    venueName: t.venueName,
    venueAddress: t.venueAddress,
    region: t.region ?? null,
    attendees: t.numAttendees,
    registrationOpen: t.isRegistrationOpen,
    imageUrl: t.imageUrl,
    events: t.events.map((e) => ({ id: e.id, name: e.name, game: e.game, startAt: iso(e.startAt), entrants: e.numEntrants, state: e.state ?? null, online: !!e.online })),
    streams: t.streams,
  };
}

export function apiBracket(e: HostedEvent) {
  return {
    id: e.id,
    name: e.name,
    url: site(`/host/${e.id}`),
    resultsUrl: site(`/api/v1/brackets/${e.id}/results`),
    game: e.game,
    online: e.online,
    location: e.location,
    region: e.region,
    startsAt: e.startsAt,
    timezone: e.timezone,
    format: e.format,
    teamSize: e.teamSize,
    bestOf: e.bestOf,
    bestOfTop: e.bestOfTop,
    entrantCap: e.entrantCap,
    entrants: e.entrantCount,
    status: e.status,
    host: e.official ? { tag: "Smashy", handle: "smashyhq" } : e.host ? { tag: e.host.tag, handle: e.host.handle } : null,
    ruleset: e.ruleset ? { id: e.ruleset.id, name: e.ruleset.name, scene: e.ruleset.sceneName } : null,
  };
}

export function apiMajor(m: Major) {
  return {
    slug: m.slug,
    name: m.name,
    url: site(m.slug.startsWith("manual/") ? `/history/major/${m.slug.slice("manual/".length)}` : `/events/${m.slug}`),
    startAt: m.startAt,
    endAt: m.endAt,
    timezone: m.timezone,
    games: m.games,
    entrants: m.entrants,
    city: m.city,
    country: m.country,
    imageUrl: m.imageUrl,
    live: m.live,
  };
}

type Placing = { place: number; name: string; playerId: string | null; characters?: string[] };
const apiPlacing = (r: Placing) => ({ place: r.place, name: r.name, startggPlayerId: r.playerId, ...(r.characters?.length ? { characters: r.characters } : {}) });

/** A major's brackets with their top 8 and, where saved, standings to 64th. */
export function apiMajorEvents(events: MajorEvent[], standings: Map<string, StandingRow[]>) {
  return events.map((e) => ({
    id: e.eventId,
    name: e.name,
    game: e.game,
    entrants: e.entrants,
    teams: e.teams,
    online: e.online,
    top8: e.top8.map(apiPlacing),
    standings: (standings.get(e.eventId) ?? []).map(apiPlacing),
  }));
}

function apiVersion(v: RulesetVersion) {
  return { version: v.version, publishedAt: v.publishedAt, rules: v.rules, notes: v.notes, changelog: v.changelog };
}

export function apiRuleset(r: RulesetSummary, versions?: RulesetVersion[]) {
  return {
    id: r.id,
    name: r.name,
    game: r.game,
    url: site(`/rulesets/${r.id}`),
    scene: { slug: r.sceneSlug, name: r.sceneName, url: site(`/scenes/${r.sceneSlug}`) },
    latest: r.latest ? apiVersion(r.latest) : null,
    ...(versions ? { versions: versions.map(apiVersion) } : {}),
  };
}

/** A Reels clip as saved by Smashy (the reels table): a Twitch clip or a YouTube Short. */
export type ApiReelRow = {
  clip_id: string;
  platform: ReelPlatform;
  channel_login: string;
  channel_name: string | null;
  title: string;
  game: string;
  view_count: number;
  duration: number | null;
  thumbnail_url: string | null;
  created_at: string;
  like_count: number | null;
};
export const API_REEL_COLUMNS = "clip_id, platform, channel_login, channel_name, title, game, view_count, duration, thumbnail_url, created_at, like_count";

/** Only Twitch and YouTube clips: videos members attach to their own posts aren't in the API. Who shared a clip isn't either. */
export function apiReel(r: ApiReelRow) {
  return {
    clipId: r.clip_id,
    platform: r.platform,
    url: clipUrl({ platform: r.platform, clipId: r.clip_id }),
    smashyUrl: site(`/reels/${encodeURIComponent(r.clip_id)}`),
    title: r.title,
    game: r.game,
    channel: { login: r.channel_login, name: r.channel_name, url: channelUrl({ platform: r.platform, login: r.channel_login }) },
    views: r.view_count,
    likes: r.like_count ?? 0,
    durationSeconds: r.duration,
    thumbnailUrl: r.thumbnail_url,
    createdAt: r.created_at,
  };
}
