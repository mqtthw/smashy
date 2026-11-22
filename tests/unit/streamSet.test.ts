import { describe, expect, it } from "vitest";
import { buildElimination, reportResult, type EngineSet } from "@/lib/bracketEngine";
import { isStreamSetup, pickStreamSet } from "@/lib/streamSet";

const apply = (sets: EngineSet[], changed: EngineSet[]) => {
  const m = new Map(sets.map((s) => [s.key, s]));
  for (const c of changed) m.set(c.key, c);
  return [...m.values()];
};
const players = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

describe("pickStreamSet", () => {
  it("follows the next set up, then the deepest live set, then the last set played", () => {
    let sets = buildElimination(players(4), { double: true, bestOf: 3 });
    const first = pickStreamSet(sets)!;
    expect(first.state).toBe("ready");
    expect(first.bracket).toBe("W");

    // Two sets live at once: the overlay follows the later round.
    const r1 = sets.filter((s) => s.state === "ready");
    sets = apply(sets, reportResult(sets, r1[0].key, 1, [2, 0]));
    sets = apply(sets, reportResult(sets, r1[1].key, 1, [2, 0]));
    const winnersFinal = sets.find((s) => s.bracket === "W" && s.state === "ready")!;
    const losersR1 = sets.find((s) => s.bracket === "L" && s.state === "ready")!;
    sets = sets.map((s) => (s.key === winnersFinal.key || s.key === losersR1.key ? { ...s, state: "live" as const } : s));
    expect(pickStreamSet(sets)?.key).toBe(winnersFinal.key);

    // Everything played: the last set (Grand Final) stays on screen.
    for (let guard = 0; guard < 20; guard++) {
      const next = sets.find((s) => s.state === "ready" || s.state === "live");
      if (!next) break;
      sets = apply(sets, reportResult(sets, next.key, 1, [2, 0]));
    }
    expect(pickStreamSet(sets)?.bracket).toBe("GF");
  });
  it("follows the set the TO put on the stream setup, live first", () => {
    let sets = buildElimination(players(8), { double: true, bestOf: 3 });
    const [a, b, c] = sets.filter((s) => s.state === "ready");
    // Nothing on stream: the usual pick.
    expect(pickStreamSet(sets, { [a.key]: "Setup 2" })?.key).toBe(pickStreamSet(sets)?.key);
    // A waiting set on stream beats an earlier set that's ready.
    expect(pickStreamSet(sets, { [c.key]: "Stream" })?.key).toBe(c.key);
    // A set playing on stream beats one waiting there.
    sets = sets.map((s) => (s.key === b.key ? { ...s, state: "live" as const } : s));
    expect(pickStreamSet(sets, { [c.key]: "stream", [b.key]: "Stream 2" })?.key).toBe(b.key);
    // Once the streamed set is done, back to the usual pick.
    sets = apply(sets, reportResult(sets, b.key, 1, [2, 0]));
    expect(pickStreamSet(sets, { [b.key]: "Stream" })?.key).toBe(pickStreamSet(sets)?.key);
  });
  it("knows a stream setup by name", () => {
    expect(isStreamSetup("Stream")).toBe(true);
    expect(isStreamSetup(" stream 2")).toBe(true);
    expect(isStreamSetup("Streamer's setup")).toBe(false);
    expect(isStreamSetup("Setup 3")).toBe(false);
    expect(isStreamSetup(undefined)).toBe(false);
  });
  it("is empty before the bracket has sets", () => {
    expect(pickStreamSet([])).toBeNull();
  });
});
