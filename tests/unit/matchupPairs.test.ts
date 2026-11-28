import { describe, expect, it } from "vitest";
import { matchupKey } from "@/lib/matchupPairs";

describe("matchupKey (round 1015)", () => {
  it("is the same for either side of a matchup", () => {
    expect(matchupKey("fox", "marth")).toBe(matchupKey("marth", "fox"));
    expect(matchupKey("fox", "marth")).toBe("fox|marth");
  });
  it("tells different matchups apart", () => {
    expect(matchupKey("fox", "falco")).not.toBe(matchupKey("fox", "marth"));
  });
});
