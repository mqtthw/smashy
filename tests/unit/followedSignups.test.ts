import { describe, expect, it } from "vitest";
import { KNOWN_KEEP, newSignups } from "@/lib/followedSignups";

describe("newSignups", () => {
  it("only remembers on the first look", () => {
    expect(newSignups(null, ["genesis-x4", "weekly-12"])).toEqual({ announce: [], remember: ["genesis-x4", "weekly-12"] });
  });
  it("a first look with nothing upcoming still counts, so the next signup is announced", () => {
    const first = newSignups(null, []);
    expect(first.remember).toEqual([]);
    expect(newSignups(first.remember, ["weekly-13"]).announce).toEqual(["weekly-13"]);
  });
  it("announces only tournaments not seen before, once", () => {
    expect(newSignups(["genesis-x4"], ["genesis-x4", "weekly-13", "weekly-13"])).toEqual({ announce: ["weekly-13"], remember: ["genesis-x4", "weekly-13"] });
  });
  it("keeps finished tournaments for a while, so one that comes back isn't announced again", () => {
    const after = newSignups(["genesis-x4", "weekly-12"], ["weekly-13"]);
    expect(after.remember).toEqual(["weekly-13", "genesis-x4", "weekly-12"]);
    expect(newSignups(after.remember, ["weekly-12", "weekly-13"]).announce).toEqual([]);
  });
  it("remembers at most KNOWN_KEEP, the current ones first", () => {
    const old = Array.from({ length: KNOWN_KEEP }, (_, i) => `old-${i}`);
    const r = newSignups(old, ["new-1"]);
    expect(r.remember).toHaveLength(KNOWN_KEEP);
    expect(r.remember[0]).toBe("new-1");
  });
});
