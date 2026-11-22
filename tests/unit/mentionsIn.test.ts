import { describe, expect, it } from "vitest";
import { mentionsIn } from "@/lib/posts";

describe("mentionsIn (round 579)", () => {
  it("finds @handles, lowercase, once each", () => {
    expect(mentionsIn("Cool post from @DrevisSSB on X, cc @blair and @Blair")).toEqual(["drevisssb", "blair"]);
  });
  it("skips emails and too-short names, like the links do", () => {
    expect(mentionsIn("mail me at a@smashy.gg or @ab")).toEqual([]);
  });
  it("finds a handle at the very start", () => {
    expect(mentionsIn("@mqtthw gg")).toEqual(["mqtthw"]);
  });
});
