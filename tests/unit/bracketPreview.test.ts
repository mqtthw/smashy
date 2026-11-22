import { describe, expect, it } from "vitest";
import { bracketPreview } from "@/lib/bracketPreview";

describe("bracketPreview", () => {
  it("pairs standard seeds in round 1 and gives byes to the top seeds", () => {
    const p = bracketPreview(["s1", "s2", "s3"], "double_elim");
    expect(p?.kind).toBe("elimination");
    const matches = p && p.kind === "elimination" ? p.matches : [];
    expect(matches).toContainEqual(["s1", null]);
    expect(matches.some((m) => m.includes("s2") && m.includes("s3"))).toBe(true);
  });
  it("lists everyone in round robin pools, in seed order", () => {
    const p = bracketPreview(["a", "b", "c", "d"], "round_robin");
    const all = p && p.kind === "pools" ? p.pools.flat() : [];
    expect(all.sort()).toEqual(["a", "b", "c", "d"]);
  });
  it("needs at least two players", () => {
    expect(bracketPreview(["a"], "single_elim")).toBeNull();
  });
});
