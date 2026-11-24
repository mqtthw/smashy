// Step S5 of docs/searchable-player-pages-plan.md: which players the site map lists.
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: () => {} }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("not in unit tests");
  },
}));

import { top8PlayerIds } from "@/lib/playerSearchable";

describe("player ids from saved top 8s", () => {
  it("takes each player once, and only real ids", () => {
    const rows = [
      { top8: [{ playerId: "1000", name: "Mang0" }, { playerId: "16104", name: "Nairo" }, { name: "Ken" }] },
      { top8: [{ playerId: "1000", name: "Mang0" }, { playerId: "abc" }, { playerId: 42 }, null] },
      { top8: null },
    ];
    expect(top8PlayerIds(rows).sort()).toEqual(["1000", "16104"]);
  });
});
