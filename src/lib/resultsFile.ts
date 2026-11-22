// Loads everything the public results file of a hosted event needs (see lib/openBracketFormat).
// Always read as a signed-out guest, whoever asks: the file is public and other sites keep copies,
// so it must only ever hold what the public bracket page shows (a player whose profile is hidden
// from guests has no name or Smashy id in it).
import "server-only";
import { GAMES } from "./games";
import { loadSetsWithGames } from "./hostedBracket";
import { getHostedEvent } from "./hostedEvents";
import { toOpenBracketFormat, type ObfPlayer, type ObfTournament } from "./openBracketFormat";
import { siteUrl } from "./siteMeta";
import { createGuestClient, hasSupabase } from "./supabase/guest";

type EntrantRow = { user_id: string; seed: number | null; created_at: string; profile: { tag: string; handle: string } | null };
type GuestRow = { id: string; tag: string; seed: number | null; created_at: string };

/**
 * The results file, or null when there isn't one: no such event, removed or canceled, or the
 * bracket hasn't started. Throws when the players or sets can't be read (better no file than one
 * with holes in it). `finished` says whether the bracket is over (it decides how long to cache).
 */
export async function getResultsFile(eventId: string): Promise<{ file: ObfTournament; finished: boolean } | null> {
  if (!hasSupabase()) return null;
  const guest = createGuestClient();
  const event = await getHostedEvent(eventId, guest);
  if (!event || event.removed || event.status === "canceled") return null;
  const [sets, entrants, walkIns] = await Promise.all([
    loadSetsWithGames(event.id, guest),
    guest.from("hosted_entrants").select("user_id, seed, created_at, profile:profiles!hosted_entrants_user_id_fkey ( tag, handle )").eq("event_id", event.id).limit(600),
    guest.from("hosted_guests").select("id, tag, seed, created_at").eq("event_id", event.id).limit(600),
  ]);
  if (entrants.error) throw entrants.error;
  if (walkIns.error) throw walkIns.error;
  if (sets.length === 0) return null;

  const players = new Map<string, ObfPlayer>();
  for (const g of (walkIns.data ?? []) as GuestRow[]) players.set(g.id, { tag: g.tag, handle: null, walkIn: true, seed: g.seed, joinedAt: g.created_at });
  for (const r of (entrants.data ?? []) as unknown as EntrantRow[]) {
    // No profile in a guest's read = hidden by the privacy rules (a teen, say): no name, no handle.
    players.set(r.user_id, { tag: r.profile?.tag ?? null, handle: r.profile?.handle ?? null, walkIn: false, seed: r.seed, joinedAt: r.created_at });
  }

  const file = toOpenBracketFormat({
    event: {
      id: event.id,
      name: event.name,
      gameName: GAMES[event.game].name,
      format: event.format,
      swissRounds: event.swissRounds,
      finalFormat: event.finalFormat,
      startsAt: event.startsAt,
      timezone: event.timezone,
      online: event.online,
      location: event.location,
      region: event.region,
      rulesetName: event.ruleset?.name ?? null,
      host: event.host ? { tag: event.host.tag, handle: event.host.handle } : null,
      challongeUrl: event.challongeUrl,
    },
    origin: siteUrl().origin,
    sets,
    players,
    generatedAt: new Date().toISOString(),
  });
  return { file, finished: file.event.other.status === "completed" };
}
