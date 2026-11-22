// Round 564: a post list's extras (reactions, polls, and the viewer's likes, reposts and saves) load
// all at once, not one group after another. A fake database records when each lookup starts.
import { describe, expect, it, vi } from "vitest";

const started: { table: string; at: number }[] = [];
const fakeDb = () => ({
  from(table: string) {
    const chain: Record<string, unknown> = {};
    for (const m of ["select", "eq", "in", "limit", "order", "is", "gte", "lte"]) chain[m] = () => chain;
    chain.then = (ok: (v: unknown) => unknown, fail?: (e: unknown) => unknown) => {
      started.push({ table, at: Date.now() });
      return new Promise((r) => setTimeout(() => r({ data: [], error: null, count: 0 }), 40)).then(ok, fail);
    };
    return chain;
  },
});

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => fakeDb() }));
vi.mock("@/lib/supabase/guest", () => ({ createGuestClient: () => fakeDb() }));

describe("postExtras", () => {
  it("starts every lookup before any of them finishes", async () => {
    const { postExtras } = await import("@/lib/posts");
    started.length = 0;
    const t0 = Date.now();
    await postExtras(["p1", "p2"], "viewer-1");
    const tables = started.map((s) => s.table).sort();
    expect(tables).toEqual(["bookmarks", "polls", "post_likes", "post_reactions", "reposts"]);
    // Each lookup takes 40 ms here: all starting within the first 30 ms means none waited for another.
    for (const s of started) expect(s.at - t0).toBeLessThan(30);
  });

  it("skips the viewer's own lookups for guests", async () => {
    const { postExtras } = await import("@/lib/posts");
    started.length = 0;
    await postExtras(["p1"], null);
    expect(started.map((s) => s.table).sort()).toEqual(["polls", "post_reactions"]);
  });
});
