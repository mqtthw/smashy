// The projected bracket (round 452): every slot that isn't decided yet, filled with the player the seeds
// say will get there. Each unplayed set goes to the better (lower-numbered) seed; real results always
// win over projections. Works for every source, because each one marks an empty slot the same way
// ("Winner of B" / "Loser of B"). Shared by server and browser code.
import type { Bracket, BracketSet, SetPlayer } from "./types";

/** For each set id, its two slots as projected: the real player, a projected one, or null (can't tell). */
export type Projection = Map<string, [SetPlayer | null, SetPlayer | null]>;

const FEEDER = /^(Winner|Loser) of (.+)$/;

/** Who wins a set between two players, by seed. null when there's no way to tell (a seed is missing). */
function bySeed(a: SetPlayer | null, b: SetPlayer | null): { winner: SetPlayer | null; loser: SetPlayer | null } {
  if (a && !b) return { winner: a, loser: null };
  if (b && !a) return { winner: b, loser: null };
  if (!a || !b || a.seed === null || b.seed === null || a.seed === b.seed) return { winner: null, loser: null };
  return a.seed < b.seed ? { winner: a, loser: b } : { winner: b, loser: a };
}

export function projectBracket(bracket: Pick<Bracket, "rounds">): Projection {
  return build(bracket).slots;
}

/** Who the projection says wins each of these sets (round 454: the players a pool sends on). */
export function projectedWinners(bracket: Pick<Bracket, "rounds">, setIds: string[]): (SetPlayer | null)[] {
  const { outcomeOf, byId } = build(bracket);
  return setIds.map((id) => {
    const s = byId.get(id);
    return s ? outcomeOf(s).winner : null;
  });
}

function build(bracket: Pick<Bracket, "rounds">) {
  const sets = bracket.rounds.flatMap((r) => r.sets);
  const byIdentifier = new Map<string, BracketSet>();
  for (const s of sets) if (s.identifier) byIdentifier.set(s.identifier, s);

  const slots: Projection = new Map();
  const outcome = new Map<string, { winner: SetPlayer | null; loser: SetPlayer | null }>();
  const visiting = new Set<string>();

  const slotsOf = (s: BracketSet): [SetPlayer | null, SetPlayer | null] => {
    const known = slots.get(s.id);
    if (known) return known;
    const fill = (i: 0 | 1): SetPlayer | null => {
      if (s.players[i]) return s.players[i];
      const m = s.waitingOn[i]?.match(FEEDER);
      const from = m ? byIdentifier.get(m[2]) : undefined;
      // Filled from an earlier phase (round 454): the player projected to come through from there.
      if (!m || !from) return s.projectedIn?.[i] ?? null;
      const o = outcomeOf(from);
      return m[1] === "Winner" ? o.winner : o.loser;
    };
    const both: [SetPlayer | null, SetPlayer | null] = [fill(0), fill(1)];
    slots.set(s.id, both);
    return both;
  };

  function outcomeOf(s: BracketSet): { winner: SetPlayer | null; loser: SetPlayer | null } {
    const known = outcome.get(s.id);
    if (known) return known;
    if (visiting.has(s.id)) return { winner: null, loser: null }; // a loop in odd data: give up on it
    visiting.add(s.id);
    const [a, b] = s.players;
    let o: { winner: SetPlayer | null; loser: SetPlayer | null };
    if (s.state === "done" && (a?.won || b?.won)) o = a?.won ? { winner: a, loser: b } : { winner: b, loser: a };
    else {
      const [pa, pb] = slotsOf(s);
      // A bye: the one player there goes through; nobody drops to losers from it.
      const bye = s.waitingOn.some((w) => w === "Bye");
      o = bye ? { winner: pa ?? pb, loser: null } : bySeed(pa, pb);
    }
    visiting.delete(s.id);
    outcome.set(s.id, o);
    return o;
  }

  for (const s of sets) slotsOf(s);
  return { slots, outcomeOf, byId: new Map(sets.map((s) => [s.id, s])) };
}

/** True when a slot shows a projection rather than a real player. */
export const isProjected = (real: SetPlayer | null, shown: SetPlayer | null) => !real && !!shown;
