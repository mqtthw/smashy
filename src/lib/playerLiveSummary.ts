// A player's run through the bracket they're in right now (round 455): still in or out, who they lost
// to, and what's next. Pure, so it's unit-tested; the start.gg loading is in playerLive.ts.

export type LiveSetSide = { entrantId: string | null; tag: string | null; playerId: string | null; score: number | null };

export type LiveRunSet = {
  id: string;
  round: string; // "Winners Semi-Final"
  identifier: string | null;
  state: "pending" | "live" | "done";
  winnerEntrantId: string | null;
  me: LiveSetSide;
  opp: LiveSetSide;
  /** When the opponent isn't known yet: who they come from ("Winner of" a set between these two). */
  oppFrom?: { placement: "winner" | "loser"; a: string | null; b: string | null; identifier: string | null } | null;
  order: number; // newest last (completed time, or start.gg's order for unplayed sets)
  groupId: string | null;
};

export type LiveRun = {
  status: "playing" | "next" | "waiting" | "out";
  current: LiveRunSet | null; // the set on now, or the next one
  losses: LiveRunSet[];
  wins: number;
};

export function summarizeRun(sets: LiveRunSet[]): LiveRun {
  const sorted = [...sets].sort((a, b) => a.order - b.order);
  const done = sorted.filter((s) => s.state === "done" && s.winnerEntrantId);
  const losses = done.filter((s) => s.winnerEntrantId !== s.me.entrantId && s.me.score !== -1);
  const wins = done.filter((s) => s.winnerEntrantId === s.me.entrantId).length;
  const playing = sorted.find((s) => s.state === "live") ?? null;
  if (playing) return { status: "playing", current: playing, losses, wins };
  const next = sorted.find((s) => s.state === "pending") ?? null;
  if (next) return { status: "next", current: next, losses, wins };
  // Nothing left to play here: out when their last set was a loss, else waiting (the next phase,
  // or a set start.gg hasn't made yet).
  const last = done.at(-1);
  const out = !!last && last.winnerEntrantId !== last.me.entrantId;
  return { status: out ? "out" : "waiting", current: null, losses, wins };
}
