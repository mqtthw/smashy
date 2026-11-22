// Replay stats saved to a profile: nothing about other people or the connect code is kept, and what a
// browser sends is checked before it's saved.
import { describe, expect, it } from "vitest";
import { readSavedSummary, toSavedSummary } from "@/lib/replayProfile";
import type { ReplayTotals } from "@/lib/slippiStats";

const totals: ReplayTotals = {
  me: "ABC#123", games: 10, wins: 6, losses: 4, minutes: 41.6, kills: 30,
  openingsPerKill: 4.25, damagePerOpening: 15.5, neutralWinRate: 0.52, counterHitRate: 0.31, inputsPerMinute: 310, lCancelRate: 0.8,
  byCharacter: [{ name: "Fox", games: 10, wins: 6, losses: 4 }],
  byOpponentCharacter: [{ name: "Marth", games: 10, wins: 6, losses: 4 }],
  byStage: [{ name: "Battlefield", games: 10, wins: 6, losses: 4 }],
  opponents: [{ name: "XYZ#999", games: 10, wins: 6, losses: 4 }],
};

describe("saved replay stats", () => {
  it("keeps the numbers, not the connect code or opponents", () => {
    const s = toSavedSummary(totals);
    expect(JSON.stringify(s)).not.toContain("ABC#123");
    expect(JSON.stringify(s)).not.toContain("XYZ#999");
    expect(s).toMatchObject({ games: 10, wins: 6, minutes: 42, byCharacter: [{ name: "Fox" }] });
    expect(readSavedSummary(s)).toEqual(s);
  });

  it("refuses what doesn't fit", () => {
    const s = toSavedSummary(totals);
    expect(readSavedSummary(null)).toBeNull();
    expect(readSavedSummary({ ...s, games: 0 })).toBeNull();
    expect(readSavedSummary({ ...s, wins: 9, losses: 9 })).toBeNull(); // more results than games
    expect(readSavedSummary({ ...s, neutralWinRate: 2 })).toBeNull();
    expect(readSavedSummary({ ...s, openingsPerKill: "4" })).toBeNull();
    expect(readSavedSummary({ ...s, byStage: [{ name: "XYZ#999", games: 1, wins: 1, losses: 0 }] })).toBeNull(); // a connect code
    expect(readSavedSummary({ ...s, byCharacter: Array.from({ length: 13 }, () => s.byCharacter[0]) })).toBeNull();
    // Round 719: only real character and stage names, so no free text reaches a public profile.
    expect(readSavedSummary({ ...s, byCharacter: [{ name: "call 555 123 4567", games: 1, wins: 1, losses: 0 }] })).toBeNull();
    expect(readSavedSummary({ ...s, byStage: [{ name: "Fox", games: 1, wins: 1, losses: 0 }] })).toBeNull(); // a character isn't a stage
    expect(readSavedSummary({ ...s, byCharacter: [{ name: "Unknown", games: 1, wins: 1, losses: 0 }] })).not.toBeNull();
    expect(readSavedSummary({ ...s, byStage: [{ name: "Pokémon Stadium", games: 1, wins: 1, losses: 0 }] })).not.toBeNull();
    // Extra fields (like opponents) are dropped.
    expect(readSavedSummary({ ...s, opponents: totals.opponents })).not.toHaveProperty("opponents");
  });
});
