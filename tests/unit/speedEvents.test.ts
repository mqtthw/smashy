// Round 804: player pages don't use up the Speed Insights allowance.
import { describe, expect, it } from "vitest";
import { SCRAPER_USER_AGENT, countThisBrowser, keepSpeedEvent } from "@/lib/speedEvents";

describe("which page-speed measurements are sent", () => {
  it("not player pages, where the bots go", () => {
    expect(keepSpeedEvent("https://smashy.gg/players/16104")).toBe(false);
    expect(keepSpeedEvent("https://smashy.gg/players/compare?a=1")).toBe(false);
    expect(keepSpeedEvent("/players/5997")).toBe(false);
  });
  it("every other page, and anything it can't read", () => {
    for (const url of ["https://smashy.gg/", "https://smashy.gg/reels", "https://smashy.gg/events/genesis-x4", "https://smashy.gg/search?tab=players", "/u/players"]) expect(keepSpeedEvent(url)).toBe(true);
    expect(keepSpeedEvent("http://[bad")).toBe(true);
  });
});

describe("the scraper's visits aren't counted (round 823)", () => {
  it("leaves out exactly its browser name and nothing else", () => {
    expect(countThisBrowser(SCRAPER_USER_AGENT)).toBe(false);
    for (const ua of [
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1",
      "",
    ]) expect(countThisBrowser(ua)).toBe(true);
    expect(countThisBrowser(undefined)).toBe(true);
  });
});

