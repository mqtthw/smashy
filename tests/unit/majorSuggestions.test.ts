import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));

import { suggestedSlug } from "@/lib/majorSuggestions";

describe("suggestedSlug", () => {
  it("reads start.gg and parry.gg tournament links", () => {
    expect(suggestedSlug("https://www.start.gg/tournament/genesis-5/details")).toBe("genesis-5");
    expect(suggestedSlug("https://start.gg/tournament/the-big-house-8/event/melee-singles")).toBe("the-big-house-8");
    expect(suggestedSlug("https://parry.gg/blitz-box-01a1c611")).toBe("parrygg/blitz-box-01a1c611");
  });

  it("refuses anything else", () => {
    expect(suggestedSlug("genesis-5")).toBeNull(); // a bare slug: a link is asked for
    expect(suggestedSlug("http://www.start.gg/tournament/genesis-5")).toBeNull();
    expect(suggestedSlug("https://liquipedia.net/smash/Genesis/5")).toBeNull();
    expect(suggestedSlug("https://www.start.gg/user/abc")).toBeNull();
  });
});
