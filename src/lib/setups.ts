// A night that runs itself: which called set gets which free setup, and the no-show clock.
// Plain logic (no database), so it can be tested.

/** A set that's been called and isn't finished. */
export type OpenSet = {
  id: string;
  players: [string | null, string | null];
  /** Where it's being played ("Setup 3", "Stream", anything the TO typed), if anywhere yet. */
  station: string | null;
  /** When it was called (both players known), in milliseconds. */
  calledAt: number;
  /** Its place in the bracket's playing order (earlier rounds first), to settle sets called together. */
  order: number;
};

const numbered = (station: string | null) => {
  const n = Number(station?.match(/^Setup (\d+)$/)?.[1]);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/**
 * With `count` numbered setups at the venue, which waiting sets get which free one right now.
 *
 * - The set that was called first goes first (then the earlier round).
 * - A set whose player is already at a setup in another set waits (in pools a player has several
 *   sets called at once, and can only be in one place).
 * - Setups the TO named by hand ("Stream", "Side room") aren't numbered ones, so they never count
 *   against `count`; a set on one of them just isn't waiting.
 */
export function planSetups(count: number, open: OpenSet[]): { id: string; station: string }[] {
  if (!Number.isInteger(count) || count < 1) return [];
  const free: number[] = [];
  const taken = new Set(open.map((s) => numbered(s.station)).filter((n): n is number => n !== null));
  for (let n = 1; n <= count; n++) if (!taken.has(n)) free.push(n);
  const busy = new Set(open.filter((s) => s.station).flatMap((s) => s.players).filter((p): p is string => !!p));
  const waiting = open
    .filter((s) => !s.station && s.players[0] && s.players[1])
    .sort((a, b) => a.calledAt - b.calledAt || a.order - b.order || a.id.localeCompare(b.id));
  const out: { id: string; station: string }[] = [];
  for (const s of waiting) {
    if (!free.length) break;
    if (s.players.some((p) => busy.has(p!))) continue;
    out.push({ id: s.id, station: `Setup ${free.shift()}` });
    for (const p of s.players) busy.add(p!);
  }
  return out;
}

export type Here = Partial<Record<"1" | "2", string>>;

export type NoShow = {
  /** When players are expected by, in milliseconds. */
  deadline: number;
  /** The time is up. */
  overdue: boolean;
  /** The sides that haven't said they're here (1, 2 or both). */
  missing: (1 | 2)[];
};

/**
 * Where a called set stands on the no-show clock, or null when there's no clock to run:
 * the event has none, the set has started (a stage was struck, a game was played or a score was
 * reported), both sides said they're here, or it has no place to play yet.
 *
 * `since` is when the clock started: when the set got its setup, or, for an event where setups
 * aren't handed out automatically, when it was called. Null = not yet.
 */
export function noShowStatus(opts: { minutes: number | null; since: number | null; now: number; started: boolean; here: Here | undefined }): NoShow | null {
  const { minutes, since, now, started } = opts;
  if (!minutes || since === null || started) return null;
  const missing = ([1, 2] as const).filter((side) => !opts.here?.[String(side) as "1" | "2"]);
  if (!missing.length) return null;
  const deadline = since + minutes * 60_000;
  return { deadline, overdue: now >= deadline, missing };
}

/** Whether anything has happened in a set's live room: a strike, a ban, a game, or a reported score. */
export function setStarted(live: { struck?: unknown[]; banned?: unknown[]; games?: unknown[]; report?: unknown; finals?: Record<string, unknown> } | null | undefined): boolean {
  if (!live) return false;
  return (live.struck?.length ?? 0) > 0 || (live.banned?.length ?? 0) > 0 || (live.games?.length ?? 0) > 0 || !!live.report || Object.keys(live.finals ?? {}).length > 0;
}

/** "in 4 min", "in under a minute", for the time left on the clock (to the nearest minute). */
export function minutesLeft(deadline: number, now: number): string {
  const ms = deadline - now;
  return ms < 60_000 ? "in under a minute" : `in ${Math.round(ms / 60_000)} min`;
}
