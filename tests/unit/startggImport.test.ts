import { describe, expect, it } from "vitest";
import { IMPORT_MAX, isEventSlug, planImport, readStartggLink } from "@/lib/startggImport";

describe("readStartggLink", () => {
  it("reads an event link, with or without extra path and letter case", () => {
    expect(readStartggLink("https://www.start.gg/tournament/Texas-Weekly-12/event/Melee-Singles/overview")).toEqual({ kind: "event", slug: "tournament/texas-weekly-12/event/melee-singles" });
    expect(readStartggLink("start.gg/tournament/a-b/event/c_d?x=1")).toEqual({ kind: "event", slug: "tournament/a-b/event/c_d" });
    expect(readStartggLink("https://start.gg/tournament/a/events/melee/brackets/1/2")).toEqual({ kind: "event", slug: "tournament/a/event/melee" });
    expect(readStartggLink("https://smash.gg/tournament/old/event/singles")).toEqual({ kind: "event", slug: "tournament/old/event/singles" });
  });
  it("reads a whole-tournament link", () => {
    expect(readStartggLink("https://www.start.gg/tournament/texas-weekly-12/details")).toEqual({ kind: "tournament", slug: "tournament/texas-weekly-12" });
    expect(readStartggLink("  https://start.gg/tournament/texas-weekly-12  ")).toEqual({ kind: "tournament", slug: "tournament/texas-weekly-12" });
    expect(readStartggLink("https://www.start.gg/admin/tournament/texas-weekly-12/dashboard")).toEqual({ kind: "tournament", slug: "tournament/texas-weekly-12" });
  });
  it("refuses anything else", () => {
    for (const bad of ["", "hello", "https://challonge.com/abc", "https://notstart.gg/tournament/a/event/b", "https://www.start.gg/user/1234", "https://evil.example/?u=xstart.gg/tournament/a"]) {
      expect(readStartggLink(bad), bad).toBeNull();
    }
  });
  it("knows a slug it built", () => {
    expect(isEventSlug("tournament/a-b/event/c")).toBe(true);
    expect(isEventSlug("tournament/a-b")).toBe(false);
    expect(isEventSlug("tournament/a/event/b/../c")).toBe(false);
    expect(isEventSlug("Tournament/A/event/B")).toBe(false);
  });
});

describe("planImport", () => {
  const found = [
    { tag: "Cara", seed: 3 },
    { tag: "Alice", seed: 1 },
    { tag: "Bob", seed: 2 },
  ];
  it("adds everyone in start.gg's seeding order", () => {
    const plan = planImport(found, [], 64, 0);
    expect(plan.add).toEqual([
      { tag: "Alice", seed: 1 },
      { tag: "Bob", seed: 2 },
      { tag: "Cara", seed: 3 },
    ]);
    expect(plan).toMatchObject({ already: [], blocked: 0, noRoom: [] });
  });
  it("seeds them after the people already seeded", () => {
    expect(planImport(found, ["Zed"], 64, 5).add.map((p) => p.seed)).toEqual([6, 7, 8]);
  });
  it("skips people already in the event, in any letter case, and tags listed twice", () => {
    const plan = planImport([...found, { tag: "alice ", seed: 4 }], ["BOB"], 64, 0);
    expect(plan.add.map((p) => p.tag)).toEqual(["Alice", "Cara"]);
    expect(plan.already).toEqual(["Bob", "alice"]);
  });
  it("stops at the cap and says who didn't fit", () => {
    const plan = planImport(found, [], 2, 0);
    expect(plan.add.map((p) => p.tag)).toEqual(["Alice", "Bob"]);
    expect(plan.noRoom).toEqual(["Cara"]);
    expect(planImport(found, [], 0, 0).add).toEqual([]);
  });
  it("leaves out tags that are blank or can't be shown", () => {
    const plan = planImport([{ tag: "   ", seed: 1 }, { tag: "", seed: 2 }, { tag: "add me on insta", seed: 3 }, { tag: "www.example.com", seed: 4 }, { tag: "Dan", seed: 5 }], [], 64, 0);
    expect(plan.add).toEqual([{ tag: "Dan", seed: 1 }]);
    expect(plan.blocked).toBe(4);
  });
  it("cuts long tags to 30 characters and tidies spacing", () => {
    const plan = planImport([{ tag: "A".repeat(29) + " BCD", seed: 1 }, { tag: "  Two\t  Words ", seed: 2 }], [], 64, 0);
    expect(plan.add[0].tag).toBe("A".repeat(29));
    expect(plan.add[1].tag).toBe("Two Words");
    expect([...plan.add[0].tag].length).toBeLessThanOrEqual(30);
  });
  it("keeps start.gg's order for unseeded players and runs out of seed numbers gracefully", () => {
    const unseeded = planImport([{ tag: "X", seed: null }, { tag: "Y", seed: null }, { tag: "W", seed: 9 }], [], 64, 0);
    expect(unseeded.add.map((p) => p.tag)).toEqual(["W", "X", "Y"]);
    const late = planImport(found, [], 64, IMPORT_MAX - 1);
    expect(late.add.map((p) => p.seed)).toEqual([IMPORT_MAX, null, null]);
  });
});
