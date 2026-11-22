import { describe, expect, it } from "vitest";
import { buildElimination, reportResult, type EngineSet } from "@/lib/bracketEngine";
import { feederStatus } from "@/lib/feederStatus";

const apply = (sets: EngineSet[], changed: EngineSet[]) => {
  const m = new Map(sets.map((s) => [s.key, s]));
  for (const c of changed) m.set(c.key, c);
  return [...m.values()];
};
const tag = (id: string | null) => (id ? id.toUpperCase() : "TBD");

describe("feederStatus", () => {
  // 4 players, single elimination: two semis feed the final.
  let sets = buildElimination(["a", "b", "c", "d"], { double: false, bestOf: 3 });
  const [semi1, semi2] = sets.filter((s) => s.state === "ready");
  sets = apply(sets, reportResult(sets, semi1.key, 1, [2, 0]));
  const final = sets.find((s) => s.state === "waiting" || (s.state !== "done" && s.key !== semi2.key))!;

  it("describes a called set that hasn't started, with its setup", () => {
    const st = feederStatus(sets, final.key, { tag, setups: { [semi2.key]: "Setup 2" } })!;
    expect(st.live).toBe(false);
    expect(st.text).toBe(`${tag(semi2.p[0].id)} vs ${tag(semi2.p[1].id)} is about to start on Setup 2`);
    expect(feederStatus(sets, final.key, { tag })!.text).not.toContain(" on ");
  });
  it("prefers a set being played, with its live score", () => {
    const live = sets.map((s) => (s.key === semi2.key ? { ...s, state: "live" as const } : s));
    const st = feederStatus(live, final.key, { tag, scores: { [semi2.key]: [1, 0] } })!;
    expect(st).toEqual({ live: true, text: `Being played now: ${tag(semi2.p[0].id)} 1–0 ${tag(semi2.p[1].id)}` });
    expect(feederStatus(live, final.key, { tag })!.text).toContain(" vs ");
  });
  it("is null once nothing feeding the set is under way", () => {
    const done = apply(sets, reportResult(sets, semi2.key, 1, [2, 0]));
    expect(feederStatus(done, final.key, { tag })).toBeNull();
  });
});
