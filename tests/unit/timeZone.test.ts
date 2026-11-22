// Time zones sent with the host and league forms (round 635).
import { describe, expect, it } from "vitest";
import { isTimeZone } from "@/lib/timeZone";

describe("time zone names", () => {
  it("accepts real zones and refuses made-up ones", () => {
    expect(isTimeZone("America/Chicago")).toBe(true);
    expect(isTimeZone("Asia/Tokyo")).toBe(true);
    expect(isTimeZone("UTC")).toBe(true);
    expect(isTimeZone("Mars/Olympus_Mons")).toBe(false);
    expect(isTimeZone("")).toBe(false);
    expect(isTimeZone("x".repeat(61))).toBe(false);
  });
});
