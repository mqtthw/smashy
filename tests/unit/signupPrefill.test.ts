import { describe, expect, it } from "vitest";
import { tagFromSignIn } from "@/lib/signupPrefill";

describe("tagFromSignIn (round 659)", () => {
  it("uses Discord's display name, then its username", () => {
    expect(tagFromSignIn("discord", { custom_claims: { global_name: "Mango" }, name: "c9mango#0", full_name: "c9mango" })).toBe("Mango");
    expect(tagFromSignIn("discord", { name: "zainnaghmi#0" })).toBe("zainnaghmi");
    expect(tagFromSignIn("discord", { full_name: "  Cody  " })).toBe("Cody");
  });
  it("leaves the tag empty for Google, Apple, email and unusable names", () => {
    expect(tagFromSignIn("google", { full_name: "Jane Doe", name: "Jane Doe" })).toBe("");
    expect(tagFromSignIn("apple", { full_name: "Jane Doe" })).toBe("");
    expect(tagFromSignIn("email", {})).toBe("");
    expect(tagFromSignIn("discord", null)).toBe("");
    expect(tagFromSignIn("discord", { custom_claims: { global_name: "Smashy Admin" } })).toBe("");
    expect(tagFromSignIn("discord", { name: "" })).toBe("");
  });
});
