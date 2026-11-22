import { describe, expect, it } from "vitest";
import { graphicRows, graphicTitle, ordinal } from "@/lib/top8";

const e = (placement: number | null, tag: string | null) => ({ placement, tag });

describe("the results graphic", () => {
  it("writes places the way people say them", () => {
    expect([1, 2, 3, 4, 5, 7, 9, 11, 12, 13, 21, 22, 23, 101, 111].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "5th", "7th", "9th", "11th", "12th", "13th", "21st", "22nd", "23rd", "101st", "111th"]);
  });

  it("lists a double-elimination Top 8, ties sharing a place", () => {
    const rows = graphicRows([e(7, "Hal"), e(1, "Ada"), e(5, "Flo"), e(2, "Bo"), e(3, "Cy"), e(4, "Dee"), e(5, "Eli"), e(7, "Gus"), e(9, "Ivy"), e(9, "Jo"), e(null, "NoShow")]);
    expect(rows.map((r) => `${r.label} ${r.tag}`)).toEqual(["1st Ada", "2nd Bo", "3rd Cy", "4th Dee", "5th Eli", "5th Flo", "7th Gus", "7th Hal"]);
  });

  it("never cuts a tie in half: it stops before a group that doesn't fit", () => {
    const rows = graphicRows([e(1, "A"), e(2, "B"), e(3, "C"), e(4, "D"), e(5, "E"), e(5, "F"), e(7, "G"), e(7, "H"), e(7, "I")]);
    expect(rows.map((r) => r.tag)).toEqual(["A", "B", "C", "D", "E", "F"]);
  });

  it("shows as many as fit when everyone tied for first", () => {
    const rows = graphicRows(Array.from({ length: 10 }, (_, i) => e(1, `P${i}`)));
    expect(rows).toHaveLength(8);
    expect(rows.every((r) => r.label === "1st")).toBe(true);
  });

  it("names a player guests can't see \"Hidden player\", and skips players without a place", () => {
    expect(graphicRows([e(1, null), e(2, "Bo"), e(0, "Zero"), e(null, "None")]).map((r) => r.tag)).toEqual(["Hidden player", "Bo"]);
  });

  it("is titled by how many it shows, or as standings for a round robin", () => {
    expect(graphicTitle(8, false)).toBe("Top 8");
    expect(graphicTitle(4, false)).toBe("Top 4");
    expect(graphicTitle(6, true)).toBe("Final standings");
  });
});
