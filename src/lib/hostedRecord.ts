// A player's record in brackets run on Smashy: events played, sets and games won and lost.
// DQs count as a set win or loss but add no games.
export type HostedRecord = { events: number; setWins: number; setLosses: number; gameWins: number; gameLosses: number };

export type RecordSet = { event_id: string; p1_id: string | null; p2_id: string | null; p1_score: number | null; p2_score: number | null; winner: number | null };

export function hostedRecord(userId: string, sets: RecordSet[]): HostedRecord {
  const out: HostedRecord = { events: 0, setWins: 0, setLosses: 0, gameWins: 0, gameLosses: 0 };
  const events = new Set<string>();
  for (const s of sets) {
    const slot = s.p1_id === userId ? 1 : s.p2_id === userId ? 2 : 0;
    if (!slot || !s.winner || !s.p1_id || !s.p2_id) continue; // byes and unfinished sets don't count
    events.add(s.event_id);
    if (s.winner === slot) out.setWins++;
    else out.setLosses++;
    const mine = slot === 1 ? s.p1_score : s.p2_score;
    const theirs = slot === 1 ? s.p2_score : s.p1_score;
    if (mine !== null && theirs !== null && mine >= 0 && theirs >= 0) {
      out.gameWins += mine;
      out.gameLosses += theirs;
    }
  }
  out.events = events.size;
  return out;
}

/** Seeding by record: best set win rate first (smoothed, so 1–0 doesn't beat 9–1), then most sets played. No record keeps its place at the end. */
export function seedByRecord<T extends { userId: string }>(players: T[], records: Record<string, { setWins: number; setLosses: number }>): T[] {
  const score = (id: string) => {
    const r = records[id];
    if (!r || r.setWins + r.setLosses === 0) return null;
    return { rate: (r.setWins + 1) / (r.setWins + r.setLosses + 2), played: r.setWins + r.setLosses };
  };
  const ranked = players.filter((p) => score(p.userId)).sort((a, b) => {
    const x = score(a.userId)!, y = score(b.userId)!;
    return y.rate - x.rate || y.played - x.played;
  });
  return [...ranked, ...players.filter((p) => !score(p.userId))];
}

/** Head-to-head between two players in finished sets on Smashy: [a's wins, b's wins]. */
export function headToHead(a: string, b: string, sets: RecordSet[]): [number, number] {
  let aw = 0, bw = 0;
  for (const s of sets) {
    if (!s.winner) continue;
    const ids = [s.p1_id, s.p2_id];
    if (!ids.includes(a) || !ids.includes(b)) continue;
    if (ids[s.winner - 1] === a) aw++;
    else bw++;
  }
  return [aw, bw];
}

export type MedalRow = { userId: string; gold: number; silver: number; bronze: number };

/** A series medal table: most 1st places first, then 2nd, then 3rd (shared places count for everyone tied). */
export function medalTable(placements: { userId: string; place: number }[]): MedalRow[] {
  const rows = new Map<string, MedalRow>();
  for (const p of placements) {
    if (p.place < 1 || p.place > 3) continue;
    const r = rows.get(p.userId) ?? { userId: p.userId, gold: 0, silver: 0, bronze: 0 };
    if (p.place === 1) r.gold++;
    else if (p.place === 2) r.silver++;
    else r.bronze++;
    rows.set(p.userId, r);
  }
  return [...rows.values()].sort((a, b) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze);
}

/**
 * Seeding from an earlier event's placements (last week's results): best place first, people who
 * tied keep the order they're in now, and anyone who wasn't in that event keeps their place after.
 */
export function seedByPlacement<T extends { userId: string }>(players: T[], places: Record<string, number>): T[] {
  const placed = players.filter((p) => places[p.userId] > 0).sort((a, b) => places[a.userId] - places[b.userId]);
  return [...placed, ...players.filter((p) => !(places[p.userId] > 0))];
}
