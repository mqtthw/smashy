// Round 801: which players the background fill takes next.
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: () => {} }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("not in unit tests");
  },
}));
vi.mock("@/lib/startgg", () => ({ startggQuery: async () => ({}), isTooComplex: () => false, startggLoad: () => 0 }));

import { FILL_SITE_PER_MINUTE, playersToFill } from "@/lib/playerSnapshotFill";
import { GUEST_SITE_PER_MINUTE } from "@/lib/guestBudget";
import { snapshotRow } from "@/lib/playerSnapshots";

describe("the background fill of saved copies", () => {
  it("takes listed players without a copy, in order, up to the limit", () => {
    expect(playersToFill(["1", "2", "3", "4"], new Set(["2"]), 2)).toEqual(["1", "3"]);
    expect(playersToFill(["1", "2"], new Set(["1", "2"]), 5)).toEqual([]);
    expect(playersToFill(["1"], new Set(), 0)).toEqual([]);
  });
  it("only runs while the site is quieter than the point where guests' lookups stop", () => {
    expect(FILL_SITE_PER_MINUTE).toBeLessThan(GUEST_SITE_PER_MINUTE);
  });
  it("saves an empty copy when asked to, so a player with nothing on start.gg isn't asked about every run", () => {
    expect(snapshotRow("5997", [], [], "x")).toBeNull();
    expect(snapshotRow("5997", [], [], "x", true)).toEqual({ player_id: 5997, sets: [], results: [], saved_at: "x" });
  });
});
