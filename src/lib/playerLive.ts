// The bracket a player is in right now, from start.gg (round 455): shown on their player page with
// how their run is going (still in or out, who they lost to, who's next). Shared by every server and
// kept for ~30 seconds, so a busy weekend doesn't send start.gg one request per page view.
import "server-only";
import { cacheLife } from "next/cache";
import { gameOfEvent, type GameKey } from "./games";
import { startggQuery } from "./startgg";
import { summarizeRun, type LiveRun, type LiveRunSet, type LiveSetSide } from "./playerLiveSummary";

export type PlayerLive = LiveRun & {
  eventId: string;
  eventName: string;
  tournamentName: string;
  tournamentSlug: string | null;
  game: GameKey | null;
  sets: LiveRunSet[];
};

type RawEntrant = { id: string | number; name: string; participants: { gamerTag: string; player: { id: string | number } | null }[] | null } | null;
type RawSlot = { prereqType: string | null; prereqId: string | null; prereqPlacement: number | null; entrant: RawEntrant; standing: { stats: { score: { value: number | null } | null } | null } | null };
type RawSet = { id: string | number; identifier: string | null; fullRoundText: string | null; state: number | null; winnerId: string | number | null; completedAt: number | null; phaseGroup: { id: string | number } | null; slots: RawSlot[] | null };

type RecentSet = {
  event: { id: string | number; name: string; state: string | null; videogame: { id: string | number } | null; tournament: { name: string; slug: string } | null } | null;
  slots: { entrant: { id: string | number; participants: { player: { id: string | number } | null }[] | null } | null }[] | null;
};

const LIVE = { stale: 15, revalidate: 30, expire: 300 };

const tagOf = (e: RawEntrant) => (e ? (e.participants?.length === 1 ? e.participants[0].gamerTag : e.name) : null);
const side = (s: RawSlot | undefined): LiveSetSide => ({
  entrantId: s?.entrant ? String(s.entrant.id) : null,
  tag: tagOf(s?.entrant ?? null),
  playerId: s?.entrant?.participants?.length === 1 && s.entrant.participants[0].player ? String(s.entrant.participants[0].player.id) : null,
  score: s?.standing?.stats?.score?.value ?? null,
});

export async function getPlayerLive(playerId: string): Promise<PlayerLive | null> {
  "use cache: remote";
  cacheLife(LIVE);
  if (!/^\d+$/.test(playerId)) return null;

  // Their latest sets say which event they're in; the first one start.gg calls ACTIVE wins.
  const recent = await startggQuery<{ player: { sets: { nodes: RecentSet[] | null } | null } | null }>(
    `query R($p: ID!) { player(id: $p) { sets(page: 1, perPage: 8) { nodes {
      event { id name state videogame { id } tournament { name slug } }
      slots { entrant { id participants { player { id } } } }
    } } } }`,
    { p: playerId },
  );
  let entrantId: string | null = null;
  let event: RecentSet["event"] = null;
  for (const s of recent.player?.sets?.nodes ?? []) {
    if (s.event?.state !== "ACTIVE") continue;
    // Singles only: an entrant that is just this player.
    const mine = (s.slots ?? []).find((sl) => sl.entrant?.participants?.length === 1 && String(sl.entrant.participants[0].player?.id) === playerId);
    if (!mine?.entrant) continue;
    entrantId = String(mine.entrant.id);
    event = s.event;
    break;
  }
  if (!entrantId || !event) return null;

  const data = await startggQuery<{ event: { sets: { nodes: RawSet[] | null } } | null }>(
    `query E($e: ID!, $ent: ID!) { event(id: $e) { sets(page: 1, perPage: 40, sortType: RECENT, filters: { entrantIds: [$ent] }) { nodes {
      id identifier fullRoundText state winnerId completedAt phaseGroup { id }
      slots { prereqType prereqId prereqPlacement entrant { id name participants { gamerTag player { id } } } standing { stats { score { value } } } }
    } } } }`,
    { e: event.id, ent: entrantId },
  );
  const raw = (data.event?.sets.nodes ?? []).filter((s) => (s.slots ?? []).some((sl) => sl.entrant && String(sl.entrant.id) === entrantId));
  const sets: LiveRunSet[] = raw.map((s, i) => {
    const slots = s.slots ?? [];
    const meAt = slots.findIndex((sl) => sl.entrant && String(sl.entrant.id) === entrantId);
    const oppSlot = slots[1 - meAt];
    const state = s.state === 3 ? "done" : s.state === 2 || s.state === 6 ? "live" : "pending";
    return {
      id: String(s.id),
      round: s.fullRoundText ?? "",
      identifier: s.identifier,
      state,
      winnerEntrantId: s.winnerId === null ? null : String(s.winnerId),
      me: side(slots[meAt]),
      opp: side(oppSlot),
      oppFrom: !oppSlot?.entrant && oppSlot?.prereqType === "set" && oppSlot.prereqId ? { placement: oppSlot.prereqPlacement === 2 ? "loser" : "winner", a: oppSlot.prereqId, b: null, identifier: null } : null,
      // Played sets by when they finished; the rest after them.
      order: s.completedAt ?? 4e9 + i,
      groupId: s.phaseGroup ? String(s.phaseGroup.id) : null,
    };
  });

  const run = summarizeRun(sets);
  // Their next opponent isn't decided yet: name the two players in the set it comes from.
  const from = run.current?.oppFrom;
  if (from?.a && /^\d+$/.test(from.a)) {
    const prior = await startggQuery<{ set: { identifier: string | null; slots: RawSlot[] | null } | null }>(
      `query P($id: ID!) { set(id: $id) { identifier slots { prereqType prereqId prereqPlacement entrant { id name participants { gamerTag player { id } } } standing { stats { score { value } } } } } }`,
      { id: from.a },
    ).catch(() => null);
    const ps = prior?.set?.slots ?? [];
    run.current!.oppFrom = { placement: from.placement, a: tagOf(ps[0]?.entrant ?? null), b: tagOf(ps[1]?.entrant ?? null), identifier: prior?.set?.identifier ?? null };
  } else if (run.current) {
    run.current.oppFrom = null;
  }

  return {
    ...run,
    eventId: String(event.id),
    eventName: event.name,
    tournamentName: event.tournament?.name ?? "",
    tournamentSlug: event.tournament?.slug.replace(/^tournament\//, "") ?? null,
    game: gameOfEvent(event),
    sets,
  };
}
