import { describe, expect, it } from "vitest";
import { myStatus } from "@/lib/brackets/myStatus";
import type { MySet } from "@/lib/brackets/startgg";

const set = (state: MySet["state"], iWon: boolean | null, extra: Partial<MySet> = {}): MySet =>
  ({
    id: "1", identifier: "A", round: 1, roundLabel: "Winners Quarter-Final", winnersSide: true, state,
    players: [
      { entrantId: "me", name: "blair", prefix: null, seed: 4, score: null, won: iWon === true },
      { entrantId: "them", name: "CENTIPEDE", prefix: null, seed: 5, score: null, won: iWon === false },
    ],
    waitingOn: [null, null], completedAt: state === "done" ? 1 : null,
    groupId: "g", pool: "Bracket", station: null, stream: null, called: false, me: 0, ...extra,
  }) as MySet;

describe("myStatus", () => {
  it("waits on results instead of saying 'out' when the event is open with no next set (The Contract #225)", () => {
    expect(myStatus("live", [set("done", true)], null)).toEqual({ kind: "waiting", lastWon: true });
    expect(myStatus("live", [set("done", false)], null)).toEqual({ kind: "waiting", lastWon: false });
  });
  it("is out once start.gg gives a placement", () => {
    expect(myStatus("live", [set("done", false)], 7)).toEqual({ kind: "out", placement: 7 });
    expect(myStatus("done", [set("done", true)], 1)).toEqual({ kind: "out", placement: 1 });
  });
  it("prefers a called or live set, then the next pending one", () => {
    expect(myStatus("live", [set("done", true), set("pending", null, { called: true, id: "2" })], null).kind).toBe("up");
    expect(myStatus("live", [set("done", true), set("pending", null, { id: "2" })], null).kind).toBe("next");
  });
  it("hasn't started before the event", () => {
    expect(myStatus("upcoming", [], null)).toEqual({ kind: "not_started" });
  });
});
