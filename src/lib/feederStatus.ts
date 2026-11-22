// "Who am I waiting for?": the set that decides a waiting set's missing player, described for the
// player who's waiting ("Being played now: Bob 1–0 Cara" / "Bob vs Cara is about to start on Setup 2").
// Safe in the browser.
import type { EngineSet } from "./bracketEngine";

export type FeederStatus = { live: boolean; text: string };

/**
 * The most relevant set feeding into `setKey` (one being played first, else one called and ready),
 * or null when nothing feeding it is under way. `scores` are live game scores by set id; `setups`
 * the setup each called set is on.
 */
export function feederStatus(
  sets: EngineSet[],
  setKey: string,
  { tag, scores = {}, setups = {} }: { tag: (id: string | null) => string; scores?: Record<string, [number, number]>; setups?: Record<string, string> },
): FeederStatus | null {
  const feeds = sets.filter((s) => s.winnerTo?.key === setKey || s.loserTo?.key === setKey);
  const live = feeds.find((s) => s.state === "live" && s.p[0].id && s.p[1].id);
  if (live) {
    const score = scores[live.key];
    return { live: true, text: `Being played now: ${tag(live.p[0].id)} ${score ? `${score[0]}–${score[1]}` : "vs"} ${tag(live.p[1].id)}` };
  }
  const ready = feeds.find((s) => s.state === "ready" && s.p[0].id && s.p[1].id);
  if (ready) {
    const setup = setups[ready.key];
    return { live: false, text: `${tag(ready.p[0].id)} vs ${tag(ready.p[1].id)} is about to start${setup ? ` on ${setup}` : ""}` };
  }
  return null;
}
