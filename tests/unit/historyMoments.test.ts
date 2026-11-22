import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));

import { byYear, checkMoment, type Moment, type MomentInput } from "@/lib/historyMoments";

const TODAY = "2026-11-17";
const EVO_2016: MomentInput = { day: "2016-07-17", title: "  Hungrybox wins   Evo 2016 Melee singles ", note: "", link: "https://www.youtube.com/watch?v=abc", game: "melee" };

describe("checkMoment", () => {
  it("keeps a plain, dated moment with its link", () => {
    expect(checkMoment(EVO_2016, TODAY)).toEqual({ happened_on: "2016-07-17", title: "Hungrybox wins Evo 2016 Melee singles", note: null, link: "https://www.youtube.com/watch?v=abc", game: "melee" });
    expect(checkMoment({ ...EVO_2016, game: "" }, TODAY)).toMatchObject({ game: null });
  });

  it("refuses a missing or future date, a short title, a bad link or game", () => {
    const err = (input: Partial<MomentInput>) => (checkMoment({ ...EVO_2016, ...input }, TODAY) as { error?: { key: string } }).error?.key;
    expect(err({ day: "" })).toBe("history.err.day");
    expect(err({ day: "1998-12-31" })).toBe("history.err.dayEarly");
    expect(err({ day: "2026-12-01" })).toBe("history.err.future");
    expect(err({ title: "ok" })).toBe("history.err.title");
    expect(err({ link: "http://example.com" })).toBe("history.err.link");
    expect(err({ link: "not a link" })).toBe("history.err.link");
    expect(err({ game: "tekken" })).toBe("history.err.pickGame");
  });
});

describe("byYear", () => {
  const m = (day: string): Moment => ({ id: day, day, monthOnly: false, title: day, note: null, link: "https://x.y", game: null, status: "approved", suggestedBy: null });
  it("groups moments by year in the order given", () => {
    expect(byYear([m("2001-11-21"), m("2001-12-03"), m("2004-07-10")]).map((g) => [g.year, g.moments.length])).toEqual([[2001, 2], [2004, 1]]);
  });
});
