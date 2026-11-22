// Doubles: reading what a player typed for their partner, and the names a host types for a team.
import { describe, expect, it } from "vitest";
import { cleanTeamName, readPartner } from "@/lib/teams";

describe("a doubles partner as typed", () => {
  it("reads @handle as someone on Smashy, in lower case", () => {
    expect(readPartner("@Mango_1")).toEqual({ kind: "handle", handle: "mango_1" });
    expect(readPartner("  @zain  ")).toEqual({ kind: "handle", handle: "zain" });
  });

  it("reads anything else as the name of someone without an account", () => {
    expect(readPartner("Zain")).toEqual({ kind: "name", name: "Zain" });
    expect(readPartner("  Big   Dave ")).toEqual({ kind: "name", name: "Big Dave" });
  });

  it("explains what's wrong instead of guessing", () => {
    expect(readPartner("").kind).toBe("error");
    expect(readPartner("   ").kind).toBe("error");
    expect(readPartner("@").kind).toBe("error");
    expect(readPartner("@not a handle!").kind).toBe("error"); // an @ with something that can't be a handle isn't quietly taken as a name
    expect(readPartner("x".repeat(31)).kind).toBe("error");
    expect(readPartner("x".repeat(30)).kind).toBe("name");
  });
});

describe("a name the host types for one half of a team", () => {
  it("tidies spaces and refuses names that are too long", () => {
    expect(cleanTeamName("  Fox   Guy ")).toBe("Fox Guy");
    expect(cleanTeamName("x".repeat(30))).toHaveLength(30);
    expect(cleanTeamName("x".repeat(31))).toBe("");
    expect(cleanTeamName(null)).toBe("");
  });
});
