// Round 805: the watched clips that travel with the Reels page request.
import { describe, expect, it } from "vitest";
import { REEL_SEEN_COOKIE, REEL_SEEN_MAX_CHARS, decodeSeen, encodeSeen, seenCookieString } from "@/lib/reelSeenCookie";

describe("the watched-clips cookie", () => {
  it("round-trips a short list in order", () => {
    const seen = ["AwkwardHelplessSalamander-abc_123", "dQw4w9WgXcQ", "post-3f2a1b4c-0000-4000-8000-000000000001"];
    expect(decodeSeen(encodeSeen(seen))).toEqual(seen);
  });
  it("keeps the most recently watched when the list is too long for a cookie", () => {
    const seen = Array.from({ length: 300 }, (_, i) => `ClipNumber${String(i).padStart(3, "0")}-withSomeLongSlugTextHere`);
    const value = encodeSeen(seen);
    expect(value.length).toBeLessThanOrEqual(REEL_SEEN_MAX_CHARS);
    const kept = decodeSeen(value);
    expect(kept.length).toBeGreaterThan(50);
    expect(kept.at(-1)).toBe(seen.at(-1));
    expect(kept).toEqual(seen.slice(-kept.length));
  });
  it("drops anything that isn't a clip id", () => {
    expect(encodeSeen(["ok-1", "has space", "semi;colon", "", "ok_2"])).toBe("ok-1.ok_2");
    expect(decodeSeen("ok-1.bad id.<script>.ok_2")).toEqual(["ok-1", "ok_2"]);
    expect(decodeSeen(null)).toEqual([]);
    expect(decodeSeen("")).toEqual([]);
  });
  it("is only sent to Reels", () => {
    const line = seenCookieString(["abc"]);
    expect(line.startsWith(`${REEL_SEEN_COOKIE}=abc;`)).toBe(true);
    expect(line).toContain("Path=/reels");
    expect(line).toContain("SameSite=Lax");
  });
});
