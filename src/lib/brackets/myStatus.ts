// Where a player stands in a start.gg event they entered (for My sets and "Your events").
import type { MyEvent, MySet } from "./startgg";

/**
 * Up now, their next set, out (with a placement), or waiting on results: the event is still open on
 * start.gg but has no next set for them and no placement. That happens between rounds, and at locals
 * whose organizers report scores after the event (The Contract #225), so it never says they're out.
 */
export function myStatus(state: MyEvent["state"], sets: MySet[], placement: number | null): MyEvent["status"] {
  const playing = sets.find((s) => s.called || s.state === "live");
  if (playing) return { kind: "up", set: playing };
  const next = sets.find((s) => s.state === "pending");
  if (next) return { kind: "next", set: next };
  if (state === "upcoming") return { kind: "not_started" };
  if (state === "live" && placement === null) {
    const last = sets.filter((s) => s.state === "done").at(-1);
    return { kind: "waiting", lastWon: !!last && !!last.players[last.me]?.won };
  }
  return { kind: "out", placement };
}
