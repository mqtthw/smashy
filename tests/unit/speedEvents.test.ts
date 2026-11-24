// Round 804: player pages don't use up the Speed Insights allowance.
import { describe, expect, it } from "vitest";
import { keepSpeedEvent } from "@/lib/speedEvents";

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
