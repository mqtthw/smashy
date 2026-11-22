import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));

import type { ParryggTournament } from "@/lib/brackets/parrygg";
import { isParryggMajor, parryggToMajorRow } from "@/lib/majors";

const NOW = Date.UTC(2026, 10, 13) / 1000;
const DEC20 = Date.UTC(2026, 11, 20, 16) / 1000;

/** Blitz Box as parry.gg showed it on 2026-11-13: featured, one Melee event, 61 of 256 signed up, no end date. */
function blitzBox(over: Partial<ParryggTournament> = {}): ParryggTournament {
  return {
    slug: "blitz-box-01a1c611",
    name: "Blitz Box",
    startAt: DEC20,
    endAt: null,
    timezone: "America/New_York",
    city: "Orlando",
    region: "Florida",
    country: "US",
    address: "400 W Church St, Orlando, FL 32801, USA",
    featured: true,
    attendees: 66,
    online: false,
    over: false,
    avatarUrl: null,
    bannerUrl: null,
    url: "https://parry.gg/blitz-box-01a1c611",
    events: [{ id: "e1", name: "Melee Singles", slug: "melee-singles", game: "melee", gameName: "Super Smash Bros. Melee", entrants: 61, cap: 256, online: false, started: false }],
    ...over,
  };
}

describe("parry.gg majors", () => {
  it("counts a tournament parry.gg features once a Smash event has 32 sign-ups", () => {
    const row = parryggToMajorRow(blitzBox(), { nowSec: NOW });
    expect(row).toMatchObject({ slug: "parrygg/blitz-box-01a1c611", name: "Blitz Box", games: ["melee"], entrants: 61, city: "Orlando", country: "US", timezone: "America/New_York" });
    // No end date on parry.gg: one day.
    expect(row?.end_at).toBe(new Date((DEC20 + 86400) * 1000).toISOString());
    expect(isParryggMajor(row!.slug)).toBe(true);
    expect(isParryggMajor("genesis-11")).toBe(false);
  });

  it("needs the usual entrant bar when parry.gg doesn't feature it", () => {
    expect(parryggToMajorRow(blitzBox({ featured: false }), { nowSec: NOW })).toBeNull();
    const big = blitzBox({ featured: false, events: [{ ...blitzBox().events[0], entrants: 250 }] });
    expect(parryggToMajorRow(big, { nowSec: NOW })?.entrants).toBe(250);
  });

  it("skips small featured events, online ones and other games", () => {
    expect(parryggToMajorRow(blitzBox({ events: [{ ...blitzBox().events[0], entrants: 20 }] }), { nowSec: NOW })).toBeNull();
    expect(parryggToMajorRow(blitzBox({ online: true }), { nowSec: NOW })).toBeNull();
    expect(parryggToMajorRow(blitzBox({ events: [{ ...blitzBox().events[0], game: null, gameName: "Tekken 8" }] }), { nowSec: NOW })).toBeNull();
    // An admin can feature anything with an in-person Smash event.
    expect(parryggToMajorRow(blitzBox({ featured: false, events: [{ ...blitzBox().events[0], entrants: 5 }] }), { force: true, nowSec: NOW })).not.toBeNull();
  });

  it("keeps a running tournament with no end date listed while it's on", () => {
    const started = DEC20 + 2 * 86400; // two days in, still not marked finished
    const row = parryggToMajorRow(blitzBox(), { nowSec: started });
    expect(Date.parse(row!.end_at) / 1000).toBe(started + 86400);
  });
});
