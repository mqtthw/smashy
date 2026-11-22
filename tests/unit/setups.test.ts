// A night that runs itself: handing free setups to called sets, and the no-show clock.
import { describe, expect, it } from "vitest";
import { minutesLeft, noShowStatus, planSetups, setStarted, type OpenSet } from "@/lib/setups";

const T0 = 1_800_000_000_000;
const set = (id: string, a: string, b: string, station: string | null = null, calledAt = T0, order = 0): OpenSet => ({ id, players: [a, b], station, calledAt, order });

describe("handing out setups", () => {
  it("gives the lowest free setups to the sets that were called first", () => {
    const open = [set("c", "p5", "p6", null, T0 + 2000), set("a", "p1", "p2", null, T0), set("b", "p3", "p4", null, T0 + 1000)];
    expect(planSetups(2, open)).toEqual([
      { id: "a", station: "Setup 1" },
      { id: "b", station: "Setup 2" },
    ]); // c waits for one to free up
  });

  it("uses a setup again once its set is finished (the finished set is no longer open)", () => {
    const open = [set("b", "p3", "p4", "Setup 2"), set("c", "p5", "p6", null, T0 + 2000)];
    expect(planSetups(2, open)).toEqual([{ id: "c", station: "Setup 1" }]);
  });

  it("settles sets called at the same moment by the bracket's playing order", () => {
    const open = [set("late", "p3", "p4", null, T0, 5), set("early", "p1", "p2", null, T0, 1)];
    expect(planSetups(1, open)).toEqual([{ id: "early", station: "Setup 1" }]);
  });

  it("doesn't put a player in two places: their second set waits (pools)", () => {
    // p1 has two pool sets called at once. One free setup is left over rather than double-booking p1.
    const open = [set("a", "p1", "p2", null, T0, 1), set("b", "p1", "p3", null, T0, 2), set("c", "p4", "p5", null, T0, 3)];
    expect(planSetups(3, open)).toEqual([
      { id: "a", station: "Setup 1" },
      { id: "c", station: "Setup 2" },
    ]);
    // And a player already playing on the stream setup isn't called to a numbered one.
    expect(planSetups(2, [set("s", "p1", "p2", "Stream"), set("b", "p1", "p3")])).toEqual([]);
  });

  it("doesn't count setups the TO named by hand, or numbers above the venue's count", () => {
    const open = [set("s", "p1", "p2", "Stream"), set("x", "p3", "p4", "Setup 9"), set("a", "p5", "p6")];
    expect(planSetups(1, open)).toEqual([{ id: "a", station: "Setup 1" }]);
  });

  it("does nothing without a count, without waiting sets, or for a set still missing a player", () => {
    expect(planSetups(0, [set("a", "p1", "p2")])).toEqual([]);
    expect(planSetups(4, [set("a", "p1", "p2", "Setup 1")])).toEqual([]);
    expect(planSetups(4, [{ id: "a", players: ["p1", null], station: null, calledAt: T0, order: 0 }])).toEqual([]);
  });
});

describe("the no-show clock", () => {
  const base = { minutes: 10, since: T0, started: false, here: {} };

  it("runs from when the set got its place to play, and says who hasn't turned up", () => {
    expect(noShowStatus({ ...base, now: T0 + 4 * 60_000 })).toEqual({ deadline: T0 + 600_000, overdue: false, missing: [1, 2] });
    expect(noShowStatus({ ...base, now: T0 + 10 * 60_000, here: { "1": "x" } })).toEqual({ deadline: T0 + 600_000, overdue: true, missing: [2] });
  });

  it("stops when both are here, when the set has started, or when there's nothing to time", () => {
    expect(noShowStatus({ ...base, now: T0 + 20 * 60_000, here: { "1": "x", "2": "y" } })).toBeNull();
    expect(noShowStatus({ ...base, now: T0 + 20 * 60_000, started: true })).toBeNull();
    expect(noShowStatus({ ...base, minutes: null, now: T0 + 20 * 60_000 })).toBeNull(); // the event has no clock
    expect(noShowStatus({ ...base, since: null, now: T0 + 20 * 60_000 })).toBeNull(); // no setup yet
  });

  it("knows a set has started from anything done in its room", () => {
    expect(setStarted(null)).toBe(false);
    expect(setStarted({ struck: [], banned: [], games: [], report: null })).toBe(false);
    expect(setStarted({ struck: ["Battlefield"] })).toBe(true);
    expect(setStarted({ games: [{ stage: "x", winner: 1 }] })).toBe(true);
    expect(setStarted({ finals: { "1": { winner: 1 } } })).toBe(true);
  });

  it("says how long is left in words", () => {
    expect(minutesLeft(T0 + 4 * 60_000, T0)).toBe("in 4 min");
    expect(minutesLeft(T0 + 3.2 * 60_000, T0)).toBe("in 3 min");
    expect(minutesLeft(T0 + 3 * 60_000 + 400, T0)).toBe("in 3 min"); // a clock that just started, read a moment early
    expect(minutesLeft(T0 + 30_000, T0)).toBe("in under a minute");
  });
});
