// Which pool (phase group) a bracket page opens on when the link doesn't name one.

export type PhaseInfo = { name: string; order: number; groups: { id: string; state: number | null }[] };

// Side brackets that come after the main one but don't decide the event.
export const SIDE = /\b(redemption|respawn|amateurs?|ladder|consolation|side (bracket|event)|low tier|crew battle)\b/i;

/**
 * While an event runs: the first pool of the latest phase that has started. Once it's finished:
 * the main final bracket, i.e. the latest single-pool phase (start.gg's phase order isn't always
 * the playing order: Genesis X Melee lists "R2 Pools" after "Top 8").
 */
export function defaultGroupId(phases: PhaseInfo[], finished: boolean): string | null {
  const sorted = [...phases].sort((a, b) => a.order - b.order);
  if (finished) {
    // Only a phase that was actually played (an unused top-cut phase left on start.gg stays empty).
    const final = sorted.filter((p) => p.groups.length === 1 && (p.groups[0].state ?? 1) >= 2 && !SIDE.test(p.name)).at(-1);
    if (final) return final.groups[0].id;
  }
  const started = sorted.filter((p) => p.groups.some((g) => (g.state ?? 1) >= 2));
  // Side brackets only when nothing else has started (round 454: Port Priority DX's Melee Singles
  // opened on its Salmon Ladder, ~1,500 sets, while the main bracket was on Top 132).
  const phase = started.filter((p) => !SIDE.test(p.name)).at(-1) ?? started.at(-1) ?? sorted[0];
  return phase?.groups[0]?.id ?? null;
}

/**
 * The default pool turned out not to have started (round 458: start.gg marks Port Priority DX's Top 8
 * as started as soon as it's set up, while Top 16 is still being played): the pool that's really on,
 * i.e. the first in-progress pool of the latest earlier phase that's still going (side brackets left
 * out). Null when there's none.
 */
export function stillPlayingGroupId(phases: PhaseInfo[], notStartedId: string): string | null {
  const sorted = [...phases].sort((a, b) => a.order - b.order);
  const at = sorted.findIndex((p) => p.groups.some((g) => g.id === notStartedId));
  if (at <= 0) return null;
  const earlier = sorted.slice(0, at).filter((p) => !SIDE.test(p.name) && p.groups.some((g) => g.state === 2));
  return earlier.at(-1)?.groups.find((g) => g.state === 2)?.id ?? null;
}

/**
 * Whether a finished pool can be kept for an hour without checking again: only when the link named
 * that pool, or the whole event is over. The event's default link (no pool named) moves on to the
 * next phase when it starts, so until then it's checked every minute; kept for an hour, it stayed
 * on a finished pool while Top 8 ran.
 */
export function poolSettled(finished: boolean, namedByLink: boolean, eventOver: boolean): boolean {
  return finished && (namedByLink || eventOver);
}

/**
 * The event's top cut (where "Top 8" is played): a single-pool phase named like "Top 8" / "Top 24" /
 * "Finals", else the last single-pool phase that isn't a side bracket. Null when there's only one pool.
 * `groups` come in phase order (pools of one phase next to each other).
 */
export function topCutGroupId(groups: { id: string; phase: string }[]): string | null {
  if (groups.length < 2) return null;
  const count = new Map<string, number>();
  for (const g of groups) count.set(g.phase, (count.get(g.phase) ?? 0) + 1);
  const single = groups.filter((g) => count.get(g.phase) === 1 && !SIDE.test(g.phase));
  const named = single.filter((g) => /\btop\s*\d+\b|\bfinals?\b/i.test(g.phase)).at(-1);
  return (named ?? single.at(-1))?.id ?? null;
}

/** Order for "My sets": 0 = on now (started, not finished), 1 = coming up, 2 = finished. */
export function myEventRank(e: { state: string | null; startAt: number }, now: number): number {
  if (e.state === "COMPLETED") return 2;
  return e.state === "ACTIVE" || e.startAt <= now ? 0 : 1;
}
