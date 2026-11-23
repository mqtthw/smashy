// Player stats from start.gg set history: win/loss record, characters played, rivals, and
// head-to-head between two players. Based on a player's most recent 100 sets (cached for hours,
// and the cached copy is shared by every server).
import "server-only";
import { cacheLife } from "next/cache";
import { ageFromBirthdate } from "./age";
import { gameOfEvent, type GameKey } from "./games";
import { hiddenPlayers, rememberPlayers } from "./playerIndex";
import type { SeenPlayer } from "./playerSearch";
import { isTooComplex, startggQuery } from "./startgg";
import { createAdminClient } from "./supabase/admin";
import { big, bigs } from "@/lib/supabase/loose";

// start.gg returns at most 1000 objects per request, and each set with its games and characters can be
// ~50 objects, so 25 sets per page went over for players with long sets. 15 x 7 = the last ~105 sets.
const PAGES = 7;
const PER_PAGE = 15;

export type PlayerSet = {
  id: string;
  completedAt: number | null;
  game: GameKey | null;
  tournamentName: string;
  tournamentSlug: string | null;
  eventName: string;
  round: string;
  myScore: number | null;
  oppScore: number | null;
  opp: { playerId: string; tag: string };
  won: boolean;
  dq: boolean; // someone was disqualified (doesn't count toward records)
  myCharacters: string[];
  oppCharacters: string[];
};

type RawPlayerSet = {
  id: string | number;
  completedAt: number | null;
  winnerId: string | number | null;
  fullRoundText: string | null;
  event: { name: string; videogame: { id: string | number } | null; tournament: { name: string; slug: string } | null } | null;
  slots: { entrant: { id: string | number; participants: { player: { id: string | number; gamerTag: string; prefix?: string | null } | null }[] | null } | null; standing: { stats: { score: { value: number | null } | null } | null } | null }[] | null;
  games: { selections: { entrant: { id: string | number } | null; character: { name: string } | null }[] | null }[] | null;
};

const QUERY = `query PlayerSets($p: ID!, $page: Int!, $per: Int!) { player(id: $p) { sets(page: $page, perPage: $per) { nodes {
  id completedAt winnerId fullRoundText
  event { name videogame { id } tournament { name slug } }
  slots { entrant { id participants { player { id gamerTag prefix } } } standing { stats { score { value } } } }
  games { selections { entrant { id } character { name } } }
} } } }`;

/** One player's most recent finished 1v1 sets (singles only), newest first. */
export async function getRecentSets(playerId: string): Promise<PlayerSet[]> {
  // Shared across server instances: one player's history is up to 7 start.gg requests, and a plain
  // "use cache" lives in one instance's memory, so each instance asked again (start.gg allows 80
  // requests a minute for the whole site).
  "use cache: remote";
  cacheLife("hours");
  if (!/^\d+$/.test(playerId)) return [];
  const out: PlayerSet[] = [];
  const seen: SeenPlayer[] = []; // both players of every set, for Smashy's saved list of players
  const ask = async (page: number, per: number) => {
    const data = await startggQuery<{ player: { sets: { nodes: RawPlayerSet[] | null } | null } | null }>(QUERY, { p: playerId, page, per });
    // A known player whose sets come back empty-handed is start.gg failing part of the answer (seen 15 times in a
    // week as "reading 'nodes' of null"). Fail the lookup rather than return no sets: an error isn't kept, an
    // empty list would be kept for hours (round 698).
    if (data.player && !data.player.sets) throw new Error("start.gg request failed: no sets in the reply (PlayerSets)");
    return data.player?.sets?.nodes ?? [];
  };
  // A page of long sets (many games, each with characters) can pass start.gg's 1,000-object cap
  // (round 517): then the same sets come as three pages of 5.
  const fetchPage = (page: number) =>
    ask(page, PER_PAGE).catch(async (e) => {
      if (!isTooComplex(e)) throw e;
      const parts = await Promise.all([0, 1, 2].map((i) => ask((page - 1) * 3 + i + 1, PER_PAGE / 3)));
      return parts.flat();
    });
  // Page 1 first; if it's full, the other pages at once (one after another took ~3 s on set pages).
  const first = await fetchPage(1);
  const pages = first.length < PER_PAGE ? [first] : [first, ...(await Promise.all(Array.from({ length: PAGES - 1 }, (_, i) => fetchPage(i + 2))))];
  for (const nodes of pages) {
    for (const s of nodes) {
      const slots = s.slots ?? [];
      if (slots.length !== 2 || !s.winnerId) continue;
      const players = slots.map((sl) => (sl.entrant?.participants?.length === 1 ? sl.entrant.participants[0].player : null));
      const mine = players.findIndex((p) => p && String(p.id) === playerId);
      if (mine === -1 || !players[1 - mine]) continue; // doubles, or not this player
      const theirs = 1 - mine;
      for (const p of players) if (p) seen.push({ playerId: String(p.id), tag: p.gamerTag, prefix: p.prefix ?? null });
      const myEntrant = String(slots[mine].entrant!.id);
      const oppEntrant = String(slots[theirs].entrant!.id);
      const myScore = slots[mine].standing?.stats?.score?.value ?? null;
      const oppScore = slots[theirs].standing?.stats?.score?.value ?? null;
      const chars = (entrant: string) => [
        ...new Set((s.games ?? []).flatMap((g) => (g.selections ?? []).filter((x) => x.entrant && String(x.entrant.id) === entrant && x.character).map((x) => x.character!.name))),
      ];
      out.push({
        id: String(s.id),
        completedAt: s.completedAt,
        game: gameOfEvent(s.event),
        tournamentName: s.event?.tournament?.name ?? "",
        tournamentSlug: s.event?.tournament?.slug.replace(/^tournament\//, "") ?? null,
        eventName: s.event?.name ?? "",
        round: s.fullRoundText ?? "",
        myScore,
        oppScore,
        opp: { playerId: String(players[theirs]!.id), tag: players[theirs]!.gamerTag },
        won: String(s.winnerId) === myEntrant,
        dq: myScore === -1 || oppScore === -1,
        myCharacters: chars(myEntrant),
        oppCharacters: chars(oppEntrant),
      });
    }
    if (nodes.length < PER_PAGE) break;
  }
  await rememberPlayers(seen);
  return out;
}

export type PlayerStats = {
  sets: number; // counted sets (DQs left out)
  wins: number;
  losses: number;
  characters: { game: GameKey | null; name: string; sets: number; share: number }[]; // share = % of sets with character data
  rivals: { playerId: string; tag: string; wins: number; losses: number }[];
};

/** Record, characters and most-played opponents from a list of sets. */
/**
 * A player's recent sets as shown to others: opponents who hide their stats on Smashy (an opt-out, or a
 * teen's default) keep their tag, as on the bracket, but lose the link to their page and their
 * characters, and don't count as rivals (round 633; records and search already left them out).
 * Throws when it can't tell who hides them: not knowing must never show a hidden player.
 */
export async function getVisibleRecentSets(playerId: string): Promise<PlayerSet[]> {
  const sets = await getRecentSets(playerId);
  const hidden = await playersHidingStats(sets.map((s) => s.opp.playerId));
  if (!hidden.size) return sets;
  return sets.map((s) => (hidden.has(s.opp.playerId) ? { ...s, opp: { ...s.opp, playerId: "" }, oppCharacters: [] } : s));
}

export function computeStats(sets: PlayerSet[]): PlayerStats {
  const counted = sets.filter((s) => !s.dq);
  const wins = counted.filter((s) => s.won).length;
  const withChars = counted.filter((s) => s.myCharacters.length);
  const charCount = new Map<string, { game: GameKey | null; name: string; sets: number }>();
  for (const s of withChars) {
    for (const name of s.myCharacters) {
      const key = `${s.game}:${name}`;
      const cur = charCount.get(key) ?? { game: s.game, name, sets: 0 };
      cur.sets++;
      charCount.set(key, cur);
    }
  }
  const rivals = new Map<string, { playerId: string; tag: string; wins: number; losses: number }>();
  for (const s of counted) {
    if (!s.opp.playerId) continue; // a player who hides their stats (getVisibleRecentSets)
    const r = rivals.get(s.opp.playerId) ?? { playerId: s.opp.playerId, tag: s.opp.tag, wins: 0, losses: 0 };
    if (s.won) r.wins++;
    else r.losses++;
    rivals.set(s.opp.playerId, r);
  }
  return {
    sets: counted.length,
    wins,
    losses: counted.length - wins,
    characters: [...charCount.values()]
      .sort((a, b) => b.sets - a.sets)
      .slice(0, 5)
      .map((c) => ({ ...c, share: withChars.length ? Math.round((c.sets / withChars.length) * 100) : 0 })),
    rivals: [...rivals.values()].filter((r) => r.wins + r.losses >= 2).sort((a, b) => b.wins + b.losses - (a.wins + a.losses)).slice(0, 5),
  };
}

export type HeadToHead = { wins: number; losses: number; sets: PlayerSet[] };

/** One player's record against another, from the first player's recent sets. */
export function headToHead(sets: PlayerSet[], opponentPlayerId: string, excludeSetId?: string): HeadToHead {
  const meetings = sets.filter((s) => s.opp.playerId === opponentPlayerId && s.id !== excludeSetId);
  const counted = meetings.filter((s) => !s.dq);
  const wins = counted.filter((s) => s.won).length;
  return { wins, losses: counted.length - wins, sets: meetings };
}

export type LinkedPlayer = { playerId: string; tag: string | null; showStats: boolean };

/**
 * A Smashy account's linked start.gg player, and whether their stats may be shown on their profile:
 * on by default for adults, off by default for teens, and anyone can change it.
 */
export async function getLinkedPlayer(userId: string): Promise<LinkedPlayer | null> {
  const db = createAdminClient();
  const [{ data: link }, { data: prof }, { data: priv }] = await Promise.all([
    db.from("startgg_links").select("startgg_player_id, gamer_tag").eq("user_id", userId).maybeSingle(),
    db.from("profiles").select("show_stats").eq("id", userId).maybeSingle(),
    db.from("private_profile_data").select("date_of_birth").eq("user_id", userId).maybeSingle(),
  ]);
  if (!link) return null;
  const teen = priv?.date_of_birth ? ageFromBirthdate(priv.date_of_birth) < 18 : true;
  const showStats = prof?.show_stats ?? !teen;
  return { playerId: String(link.startgg_player_id), tag: link.gamer_tag, showStats };
}

/**
 * A start.gg player's standing on Smashy: whether their history may be shown, and their Smashy
 * profile if they're a member who shows it. Not shown: players who asked not to be listed
 * (startgg_players.hidden), and members who don't show their stats (the default for teens).
 * Players who aren't on Smashy are shown: their results are public on start.gg.
 */
export async function playerOnSmashy(playerId: string): Promise<{ allowed: boolean; handle: string | null }> {
  if (!/^\d+$/.test(playerId)) return { allowed: false, handle: null };
  const db = createAdminClient();
  const [{ data: link, error }, optedOut] = await Promise.all([db.from("startgg_links").select("user_id").eq("startgg_player_id", big(playerId)).maybeSingle(), hiddenPlayers([playerId])]);
  if (error) throw error; // not knowing must never show a hidden player
  if (optedOut.has(playerId)) return { allowed: false, handle: null };
  if (!link) return { allowed: true, handle: null };
  if (!(await getLinkedPlayer(link.user_id))?.showStats) return { allowed: false, handle: null };
  const { data: prof } = await db.from("profiles").select("handle").eq("id", link.user_id).maybeSingle();
  return { allowed: true, handle: prof?.handle ?? null };
}

/**
 * Of these start.gg players, the ones who mustn't be listed: players who asked not to be
 * (startgg_players.hidden), and Smashy members who don't show their stats (the default for teens).
 */
export async function playersHidingStats(playerIds: string[]): Promise<Set<string>> {
  const ids = [...new Set(playerIds.filter((id) => /^\d+$/.test(id)))];
  if (!ids.length) return new Set();
  const db = createAdminClient();
  const [{ data: links, error }, hidden] = await Promise.all([db.from("startgg_links").select("user_id, startgg_player_id").in("startgg_player_id", bigs(ids)), hiddenPlayers(ids)]);
  if (error) throw error; // not knowing must never show a hidden player
  if (!links.length) return hidden;
  const users = links.map((l) => l.user_id);
  const [profs, privs] = await Promise.all([
    db.from("profiles").select("id, show_stats").in("id", users),
    db.from("private_profile_data").select("user_id, date_of_birth").in("user_id", users),
  ]);
  if (profs.error) throw profs.error;
  if (privs.error) throw privs.error;
  for (const l of links) {
    const dob = privs.data.find((p) => p.user_id === l.user_id)?.date_of_birth;
    const teen = dob ? ageFromBirthdate(dob) < 18 : true;
    const show = profs.data.find((p) => p.id === l.user_id)?.show_stats ?? !teen; // the same rule as getLinkedPlayer
    if (!show) hidden.add(String(l.startgg_player_id));
  }
  return hidden;
}

/**
 * Whether a start.gg player's history may be shown on Smashy (e.g. head-to-head on a set page).
 * Players who aren't on Smashy: yes (it's public on start.gg). Smashy members: their own setting.
 */
export async function statsAllowedForPlayer(playerId: string): Promise<boolean> {
  // The same rule as player pages. If the database can't be asked, nothing is shown.
  return playerOnSmashy(playerId).then((p) => p.allowed, () => false);
}
