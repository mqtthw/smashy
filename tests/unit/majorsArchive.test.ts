import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));

import { HISTORY_FIRST_YEAR, archiveYears } from "@/lib/majors";

describe("archiveYears", () => {
  it("lists this year down to Smash 64's release (1999), newest first", () => {
    const years = archiveYears({ nowMs: Date.UTC(2026, 10, 16) });
    expect(years[0]).toBe(2026);
    expect(years.at(-1)).toBe(HISTORY_FIRST_YEAR);
    expect(years).toHaveLength(2026 - 1999 + 1);
  });

  it("goes by the UTC year (New Year's Day counts as the new year)", () => {
    expect(archiveYears({ nowMs: Date.UTC(2027, 0, 1, 0, 30) })[0]).toBe(2027);
  });
});
