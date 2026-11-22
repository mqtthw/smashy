import { playOrder, type EngineSet } from "./bracketEngine";

const both = (s: EngineSet) => !!s.p[0].id && !!s.p[1].id;

/** A setup the TO named for the stream ("Stream", "stream 2", "Stream setup"). */
export const isStreamSetup = (setup: string | undefined) => !!setup && /^\s*stream\b/i.test(setup);

/**
 * The set an event-wide stream overlay follows. When the TO has put a set on the stream setup
 * (a setup named "Stream"), that one: playing first, else waiting to start. Otherwise the deepest
 * set being played right now (later rounds matter most when several are live), else the next one
 * ready to play, else (once everything's played) the last set, e.g. Grand Finals. Null before the
 * bracket starts. `setups` maps set ids to the setup each was called to.
 */
export function pickStreamSet(sets: EngineSet[], setups: Record<string, string> = {}): EngineSet | null {
  const by = (dir: 1 | -1) => (a: EngineSet, b: EngineSet) => dir * (playOrder(a) - playOrder(b)) || a.idx - b.idx;
  const onStream = sets.filter((s) => (s.state === "live" || s.state === "ready") && both(s) && isStreamSetup(setups[s.key]));
  const streamed = onStream.filter((s) => s.state === "live").sort(by(-1))[0] ?? onStream.sort(by(1))[0];
  if (streamed) return streamed;
  const live = sets.filter((s) => s.state === "live" && both(s)).sort(by(-1));
  if (live.length) return live[0];
  const ready = sets.filter((s) => s.state === "ready" && both(s)).sort(by(1));
  if (ready.length) return ready[0];
  const done = sets.filter((s) => s.state === "done" && both(s)).sort(by(-1));
  return done[0] ?? null;
}
