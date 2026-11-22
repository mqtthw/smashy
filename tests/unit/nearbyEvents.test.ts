// "More smash in …" on event pages (round 704).
import { describe, expect, it } from "vitest";
import { nearbyPicks } from "@/lib/nearbyPicks";
import type { SmashyTournament } from "@/lib/startgg";

const tour = (slug: string, startAt: number) => ({ id: slug, slug, startAt }) as SmashyTournament;

describe("nearby events", () => {
  it("skips this tournament, puts the soonest first and keeps four", () => {
    const list = [tour("e", 50), tour("this", 10), tour("b", 20), tour("a", 15), tour("d", 40), tour("c", 30)];
    expect(nearbyPicks(list, "this").map((x) => x.slug)).toEqual(["a", "b", "c", "d"]);
    expect(nearbyPicks([tour("this", 1)], "this")).toEqual([]);
  });
});
