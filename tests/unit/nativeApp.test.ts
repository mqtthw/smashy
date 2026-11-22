import { describe, expect, it } from "vitest";
import { smashyPath } from "@/lib/nativeApp";

describe("smashyPath (links that open the app)", () => {
  it("keeps the page, query and anchor of a smashy.gg link", () => {
    expect(smashyPath("https://smashy.gg/post/abc?x=1#r")).toBe("/post/abc?x=1#r");
    expect(smashyPath("https://www.smashy.gg/auth/callback?token_hash=t&type=magiclink")).toBe("/auth/callback?token_hash=t&type=magiclink");
  });
  it("ignores other sites and odd links", () => {
    expect(smashyPath("https://smashy.gg.evil.example/post/abc")).toBeNull();
    expect(smashyPath("http://smashy.gg/post/abc")).toBeNull();
    expect(smashyPath("javascript:alert(1)")).toBeNull();
    expect(smashyPath("not a url")).toBeNull();
  });
});
