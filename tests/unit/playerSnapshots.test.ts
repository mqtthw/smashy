// Step S1 of docs/searchable-player-pages-plan.md: what gets saved from a player lookup, and how often.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("not in unit tests");
  },
}));

import { SNAPSHOT_EVERY_MS, SNAPSHOT_FRESH_MS, SNAPSHOT_RESULTS, SNAPSHOT_SETS, resetSnapshotMemory, snapshotDue, snapshotRow, snapshotStale, snapshotWorthSaving } from "@/lib/playerSnapshots";
import type { PlayerResult } from "@/lib/playerResults";
import type { PlayerSet } from "@/lib/playerStats";

const set = (i: number) => ({ id: String(i) }) as PlayerSet;
const result = (i: number) => ({ eventId: String(i) }) as PlayerResult;

beforeEach(() => resetSnapshotMemory());

describe("which lookups are kept", () => {
  it("a member's lookup, or a player with a top 8 at a major; not a guest's lookup of anyone else", () => {
    expect(snapshotWorthSaving(true, false)).toBe(true);
    expect(snapshotWorthSaving(false, true)).toBe(true);
    expect(snapshotWorthSaving(false, false)).toBe(false);
  });
  it("a refresh of a copy that already exists is kept too (it adds no row)", () => {
    expect(snapshotWorthSaving(false, false, true)).toBe(true);
  });
});

describe("the saved row", () => {
  it("cuts the lists to what one lookup reads", () => {
    const sets = Array.from({ length: 300 }, (_, i) => set(i));
    const results = Array.from({ length: 50 }, (_, i) => result(i));
    const row = snapshotRow("5997", sets, results, "2026-11-24T00:00:00.000Z");
    expect(row?.player_id).toBe(5997);
    expect(row?.sets).toHaveLength(SNAPSHOT_SETS);
    expect(row?.results).toHaveLength(SNAPSHOT_RESULTS);
    expect(row?.saved_at).toBe("2026-11-24T00:00:00.000Z");
  });
  it("is nothing for a bad id, or an empty answer (which would replace a good copy)", () => {
    expect(snapshotRow("abc", [set(1)], [], "x")).toBeNull();
    expect(snapshotRow("1; drop", [set(1)], [], "x")).toBeNull();
    expect(snapshotRow("5997", [], [], "x")).toBeNull();
    expect(snapshotRow("5997", [], [result(1)], "x")).not.toBeNull();
  });
});

describe("how often one server writes a player", () => {
  it("once, then not again until the lookup itself would be fresh", () => {
    expect(snapshotDue("5997", 1000)).toBe(true);
    expect(snapshotDue("5997", 2000)).toBe(false);
    expect(snapshotDue("1000", 2000)).toBe(true);
    expect(snapshotDue("5997", 1000 + SNAPSHOT_EVERY_MS)).toBe(true);
  });
});

describe("when a saved copy is refreshed (step S2)", () => {
  const saved = "2026-11-24T00:00:00.000Z";
  const at = Date.parse(saved);
  it("not within a day, then yes", () => {
    expect(snapshotStale(saved, at + 60_000)).toBe(false);
    expect(snapshotStale(saved, at + SNAPSHOT_FRESH_MS)).toBe(false);
    expect(snapshotStale(saved, at + SNAPSHOT_FRESH_MS + 1)).toBe(true);
  });
});
