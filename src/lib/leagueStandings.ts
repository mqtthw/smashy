// Leagues, step L4 (docs/leagues-plan.md): a division's standings from its weekly sets. Pure, unit-tested.
// Counts: reported (until disputed), confirmed, no-shows (the winner gets the win) and double losses
// (a loss for both). Order: wins, then head to head between exactly two tied players, then game
// difference, then fewer losses, then name.

export type StandingSet = {
  p1Id: string; p2Id: string; state: string; p1Score: number | null; p2Score: number | null; winnerId: string | null;
};
export type StandingRow = { userId: string; played: number; wins: number; losses: number; gamesFor: number; gamesAgainst: number };

const COUNTS = new Set(["reported", "confirmed", "no_show", "double_loss"]);

export function divisionStandings(playerIds: string[], sets: StandingSet[], nameOf: (id: string) => string = (id) => id): StandingRow[] {
  const rows = new Map(playerIds.map((id) => [id, { userId: id, played: 0, wins: 0, losses: 0, gamesFor: 0, gamesAgainst: 0 }]));
  const beat = new Map<string, number>(); // "a>b" -> times a beat b
  for (const s of sets) {
    if (!COUNTS.has(s.state)) continue;
    const a = rows.get(s.p1Id);
    const b = rows.get(s.p2Id);
    if (!a || !b) continue;
    a.played++;
    b.played++;
    if (s.state === "double_loss") {
      a.losses++;
      b.losses++;
      continue;
    }
    if (!s.winnerId) continue;
    const [w, l] = s.winnerId === s.p1Id ? [a, b] : [b, a];
    w.wins++;
    l.losses++;
    beat.set(`${w.userId}>${l.userId}`, (beat.get(`${w.userId}>${l.userId}`) ?? 0) + 1);
    if (s.p1Score !== null && s.p2Score !== null && s.p1Score >= 0 && s.p2Score >= 0) {
      a.gamesFor += s.p1Score;
      a.gamesAgainst += s.p2Score;
      b.gamesFor += s.p2Score;
      b.gamesAgainst += s.p1Score;
    }
  }
  const list = [...rows.values()];
  const tiedOnWins = (x: StandingRow) => list.filter((r) => r.wins === x.wins).length;
  return list.sort((x, y) => {
    if (y.wins !== x.wins) return y.wins - x.wins;
    if (tiedOnWins(x) === 2) {
      const h = (beat.get(`${y.userId}>${x.userId}`) ?? 0) - (beat.get(`${x.userId}>${y.userId}`) ?? 0);
      if (h) return h;
    }
    const gd = y.gamesFor - y.gamesAgainst - (x.gamesFor - x.gamesAgainst);
    if (gd) return gd;
    if (x.losses !== y.losses) return x.losses - y.losses;
    return nameOf(x.userId).localeCompare(nameOf(y.userId));
  });
}
