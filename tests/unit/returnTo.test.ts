import { describe, expect, it } from "vitest";
import { safeReturnPath, signInPath } from "@/lib/returnTo";

describe("safeReturnPath", () => {
  it("keeps paths on this site", () => {
    expect(safeReturnPath("/host/new")).toBe("/host/new");
    expect(safeReturnPath("/messages?to=abc")).toBe("/messages?to=abc");
  });
  it("refuses other sites, odd values and loops back into sign-in", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "host/new", "", null, 5, "/signin", "/welcome", "/auth/callback?x=1", `/${"a".repeat(300)}`]) {
      expect(safeReturnPath(bad)).toBeNull();
    }
  });
  it("refuses paths a browser would read as another site (tabs, newlines, backslashes)", () => {
    for (const bad of ["/\t/evil.com", "/\n/evil.com", "/\r/evil.com", "/\\/evil.com", "/host\\..\\evil", "/\u0000/evil.com", "/a\tb"]) {
      expect(safeReturnPath(bad)).toBeNull();
    }
    // Ordinary paths with queries, fragments and encoded characters still pass.
    expect(safeReturnPath("/host/abc?tab=sets#top")).toBe("/host/abc?tab=sets#top");
    expect(safeReturnPath("/search?q=fox%20combo")).toBe("/search?q=fox%20combo");
  });
  it("builds the sign-in link", () => {
    expect(signInPath("/host/new")).toBe("/signin?next=%2Fhost%2Fnew");
  });
});
