// Events → Online's "Big online brackets" (round 844).
import { describe, expect, it } from "vitest";
import { bigOnline } from "@/lib/bigOnline";

const now = 1_800_000_000;
const row = (name: string, entrants: number | null, startAt = now, finished = false) => ({ name, startAt, finished, games: [{ entrants }] });

describe("bigOnline", () => {
  it("keeps brackets of 100+ players this week, biggest first", () => {
    const rows = [row("Small", 40), row("Cashbox", 201), row("Alrest", 134), row("Unknown", null)];
    expect(bigOnline(rows, now).map((r) => r.name)).toEqual(["Cashbox", "Alrest"]);
  });
  it("leaves out finished ones and ones more than a week away", () => {
    expect(bigOnline([row("Done", 300, now - 3600, true), row("Later", 300, now + 8 * 86400)], now)).toEqual([]);
  });
  it("uses a tournament's biggest game", () => {
    expect(bigOnline([{ name: "Two", startAt: now, games: [{ entrants: 20 }, { entrants: 150 }] }], now)).toHaveLength(1);
  });
});
