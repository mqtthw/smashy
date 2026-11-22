// Comparing two start.gg players side by side: their head-to-head and the opponents they've both
// played. Plain logic (no database, no start.gg), so it can be tested.
import type { PlayerSet } from "./playerStats";

export type Meeting = { id: string; completedAt: number | null; tournamentName: string; eventName: string; round: string; aWon: boolean; aScore: number | null; bScore: number | null; dq: boolean };

/**
 * Every set the two played against each other, from both players' recent sets (each covers only
 * that player's latest sets, so together they reach further back). Newest first, each set once,
 * told from A's side. DQs are listed but not counted.
 */
export function combinedHeadToHead(aSets: PlayerSet[], bSets: PlayerSet[], aId: string, bId: string): { aWins: number; bWins: number; meetings: Meeting[] } {
  const byId = new Map<string, Meeting>();
  for (const s of aSets) {
    if (s.opp.playerId !== bId) continue;
    byId.set(s.id, { id: s.id, completedAt: s.completedAt, tournamentName: s.tournamentName, eventName: s.eventName, round: s.round, aWon: s.won, aScore: s.myScore, bScore: s.oppScore, dq: s.dq });
  }
  for (const s of bSets) {
    if (s.opp.playerId !== aId || byId.has(s.id)) continue;
    byId.set(s.id, { id: s.id, completedAt: s.completedAt, tournamentName: s.tournamentName, eventName: s.eventName, round: s.round, aWon: !s.won, aScore: s.oppScore, bScore: s.myScore, dq: s.dq });
  }
  const meetings = [...byId.values()].sort((x, y) => (y.completedAt ?? 0) - (x.completedAt ?? 0));
  const counted = meetings.filter((m) => !m.dq);
  const aWins = counted.filter((m) => m.aWon).length;
  return { aWins, bWins: counted.length - aWins, meetings };
}

export type SharedOpponent = { playerId: string; tag: string; a: { wins: number; losses: number }; b: { wins: number; losses: number } };

/**
 * Opponents both have played (not counting each other), with each one's record against them: the
 * most-played first. DQs aren't counted.
 */
export function sharedOpponents(aSets: PlayerSet[], bSets: PlayerSet[], aId: string, bId: string, top = 8): SharedOpponent[] {
  const tally = (sets: PlayerSet[], skip: string) => {
    const out = new Map<string, { tag: string; wins: number; losses: number }>();
    for (const s of sets) {
      if (s.dq || !s.opp.playerId || s.opp.playerId === skip) continue; // no id: hides their stats (round 633)
      const r = out.get(s.opp.playerId) ?? { tag: s.opp.tag, wins: 0, losses: 0 };
      if (s.won) r.wins++;
      else r.losses++;
      out.set(s.opp.playerId, r);
    }
    return out;
  };
  const a = tally(aSets, bId);
  const b = tally(bSets, aId);
  const shared: SharedOpponent[] = [];
  for (const [id, ra] of a) {
    const rb = b.get(id);
    if (rb) shared.push({ playerId: id, tag: ra.tag, a: { wins: ra.wins, losses: ra.losses }, b: { wins: rb.wins, losses: rb.losses } });
  }
  const played = (s: SharedOpponent) => s.a.wins + s.a.losses + s.b.wins + s.b.losses;
  return shared.sort((x, y) => played(y) - played(x) || x.tag.localeCompare(y.tag)).slice(0, top);
}
