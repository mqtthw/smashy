// What a running bracket's pages read off its open sets (one read per page view, round 767).
import { describe, expect, it } from "vitest";
import { freshLive, type LiveState } from "@/lib/liveSet";
import { liveScoresOf, reportedOf, stationsOf, type OpenSet } from "@/lib/openSets";

const live = (o: Partial<LiveState>): LiveState => ({ ...freshLive(() => 0), ...o });
const set = (id: string, state: OpenSet["state"], l: LiveState | null): OpenSet => ({ id, identifier: id.toUpperCase(), p1_id: "p1", p2_id: "p2", state, updated_at: "2026-11-22T00:00:00Z", live: l });

const open: OpenSet[] = [
  set("a", "live", live({ station: "Setup 1", games: [{ stage: "Battlefield", winner: 1 }, { stage: "Dream Land", winner: 2 }, { stage: "Battlefield", winner: 1 }] })),
  set("b", "ready", live({ station: "Stream" })),
  set("c", "ready", null), // called, nobody has opened its room yet
  set("d", "live", live({ finals: { "1": { score: [2, 0], at: "2026-11-22T00:00:00Z" } } as LiveState["finals"] })),
];

describe("a bracket's open sets", () => {
  it("says where each set is played, leaving out sets without a setup", () => {
    expect(stationsOf(open)).toEqual({ a: "Setup 1", b: "Stream" });
  });

  it("counts games for sets being played, not for sets only called", () => {
    expect(liveScoresOf(open)).toEqual({ a: [2, 1], d: [0, 0] });
  });

  it("marks sets where a player reported the final score", () => {
    expect([...reportedOf(open)]).toEqual(["d"]);
  });

  it("is empty for a bracket with nothing open", () => {
    expect(stationsOf([])).toEqual({});
    expect(liveScoresOf([])).toEqual({});
    expect(reportedOf([]).size).toBe(0);
  });
});
