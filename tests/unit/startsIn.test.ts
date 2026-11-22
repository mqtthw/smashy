import { describe, expect, it } from "vitest";
import { startsInText } from "@/components/host/StartsIn";

describe("startsInText", () => {
  const min = 60_000;
  it("counts down in minutes, hours, then days", () => {
    expect(startsInText(5 * min)).toBe("Starts in 5 min");
    expect(startsInText(60 * min)).toBe("Starts in 1h");
    expect(startsInText(135 * min)).toBe("Starts in 2h 15m");
    expect(startsInText(26 * 60 * min)).toBe("Starts in 1 day 2h");
    expect(startsInText(3 * 24 * 60 * min)).toBe("Starts in 3 days");
  });
  it("shows nothing once started or more than a week away", () => {
    expect(startsInText(0)).toBeNull();
    expect(startsInText(-min)).toBeNull();
    expect(startsInText(8 * 24 * 60 * min)).toBeNull();
  });
});

describe("startsInText (short form)", () => {
  it("uses a custom window and prefix", () => {
    expect(startsInText(45 * 60_000, 24 * 3600_000, "in")).toBe("in 45 min");
    expect(startsInText(25 * 3600_000, 24 * 3600_000, "in")).toBeNull();
  });
});
