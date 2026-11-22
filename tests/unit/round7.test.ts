import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: () => {} }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
import { bracketName, zoneLabel } from "@/components/events/EventTimes";
import { majorDates, majorPlace } from "@/lib/majorText";
import { isActiveSoon } from "@/lib/brackets/startgg";
import { dropFinished } from "@/lib/events";
import { REGIONS } from "@/lib/regions";
import type { SmashyTournament } from "@/lib/startgg";
import { predictWeeklies } from "@/lib/weeklies";

const H = 3600;

describe("finished tournaments", () => {
  const now = 1_800_000_000;
  const t = (startAt: number, endAt: number | null) => ({ startAt, endAt });
  it("drops tournaments that ended (with a 2-hour grace)", () => {
    expect(dropFinished([t(now - 10 * H, now - 3 * H)], now)).toEqual([]);
    expect(dropFinished([t(now - 10 * H, now - 1 * H)], now)).toHaveLength(1); // just ended: still shown
    expect(dropFinished([t(now + H, now + 5 * H)], now)).toHaveLength(1);
  });
  it("without an end time, counts 12 hours from the start", () => {
    expect(dropFinished([t(now - 15 * H, null)], now)).toEqual([]);
    expect(dropFinished([t(now - 13 * H, null)], now)).toHaveLength(1);
  });
});

describe("My sets: checking often before the bracket starts", () => {
  const now = 1_800_000_000;
  it("watches live events and ones starting within 2 hours", () => {
    expect(isActiveSoon({ state: "live", startAt: now - 5 * H }, now)).toBe(true);
    expect(isActiveSoon({ state: "upcoming", startAt: now + H }, now)).toBe(true);
    expect(isActiveSoon({ state: "upcoming", startAt: now - H }, now)).toBe(true); // late start
    expect(isActiveSoon({ state: "upcoming", startAt: now + 5 * H }, now)).toBe(false);
    expect(isActiveSoon({ state: "upcoming", startAt: now - 20 * H }, now)).toBe(false); // stale
    expect(isActiveSoon({ state: "done", startAt: now }, now)).toBe(false);
  });
});

describe("bracket names", () => {
  it("adds the game only when the name doesn't say it", () => {
    expect(bracketName("Singles", "melee")).toBe("Melee Singles");
    expect(bracketName("Ult Singles", "ultimate")).toBe("Ult Singles");
    expect(bracketName("PPlus Doubles", "pplus")).toBe("PPlus Doubles");
    expect(bracketName("Project+ Singles", "pplus")).toBe("Project+ Singles");
    expect(bracketName("SSBU 1v1", "ultimate")).toBe("SSBU 1v1");
    expect(bracketName("Adult Bracket", "ultimate")).toBe("Ultimate Adult Bracket"); // "ult" inside a word doesn't count
  });
  it("names the venue's time zone", () => {
    expect(zoneLabel(Date.UTC(2026, 10, 10, 1) / 1000, "America/Chicago")).toBe("CST");
  });
});

describe("major dates", () => {
  it("uses the venue's days, not UTC's", () => {
    // Fri Nov 13 10 AM CST to Sun Nov 15 9 PM CST (= Mon 03:00 UTC)
    const m = { startAt: "2026-11-13T16:00:00Z", endAt: "2026-11-16T03:00:00Z" };
    expect(majorDates({ ...m, timezone: "America/Chicago" })).toBe("Nov 13–15");
    // Sat 10 AM in Tokyo is still Friday in UTC
    expect(majorDates({ startAt: "2026-11-20T01:00:00Z", endAt: "2026-11-22T12:00:00Z", timezone: "Asia/Tokyo" })).toBe("Nov 20–22");
    expect(majorDates({ startAt: "2026-11-30T16:00:00Z", endAt: "2026-12-02T03:00:00Z", timezone: "America/Chicago" })).toBe("Nov 30 – Dec 1");
  });
  it("writes them in each language", () => {
    const m = { startAt: "2026-11-13T16:00:00Z", endAt: "2026-11-16T03:00:00Z", timezone: "America/Chicago" };
    expect(majorDates(m, "es")).toBe("13–15 de nov");
    expect(majorDates(m, "fr")).toMatch(/13–15 nov/);
    expect(majorDates(m, "ja")).toBe("11/13～11/15");
    expect(majorDates({ startAt: "2026-11-30T16:00:00Z", endAt: "2026-12-02T03:00:00Z", timezone: "America/Chicago" }, "fr")).toMatch(/30 nov.*1 d/);
    expect(majorPlace({ city: "Tokorozawa", country: "JP" }, "fr")).toBe("Tokorozawa · Japon");
    expect(majorPlace({ city: "Seattle", country: "US" }, "ja")).toBe("Seattle");
  });
  it("survives an unknown time zone name", () => {
    expect(majorDates({ startAt: "2026-11-13T16:00:00Z", endAt: "2026-11-15T16:00:00Z", timezone: "Not/AZone" })).toBe("Nov 13–15");
  });
});

describe("regions", () => {
  it("lists countries alphabetically", () => {
    const names = REGIONS.filter((r) => r.group === "Countries").map((r) => r.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});

describe("expected weeklies", () => {
  it("only lists brackets for the games it shows", () => {
    const DAY = 86400;
    const base = Date.UTC(2026, 9, 13, 0, 0) / 1000;
    const mk = (n: number): SmashyTournament => ({
      id: `t${n}`, slug: `weekly-${n}`, name: `Ult Weekly #${n}`, city: "Austin", venueName: null, venueAddress: null,
      startAt: base + (n - 1) * 7 * DAY, endAt: null, timezone: "America/Chicago", numAttendees: 20, isRegistrationOpen: false,
      imageUrl: null, bannerUrl: null, startggUrl: "", registerUrl: "", streams: [],
      events: [
        { id: `u${n}`, name: "Ultimate Singles", game: "ultimate", startAt: base + (n - 1) * 7 * DAY, numEntrants: 20 },
        { id: `m${n}`, name: "Melee Singles", game: "melee", startAt: base + (n - 1) * 7 * DAY + H, numEntrants: 0 },
      ],
    });
    const [p] = predictWeeklies([mk(1), mk(2), mk(3), mk(4)], [], Date.UTC(2026, 10, 6, 18) / 1000);
    expect(p.games.map((g) => g.game)).toEqual(["ultimate"]);
    expect(p.events.map((e) => e.game)).toEqual(["ultimate"]);
  });
});
