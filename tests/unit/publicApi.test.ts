// The public API (round 708): per-address allowances and the shape of its answers.
import { beforeEach, describe, expect, it } from "vitest";
import { API_LIMITS, API_WINDOW_MS, apiBucket, resetApiCalls, takeApiCall } from "@/lib/apiLimit";
import { apiError, apiJson, apiTournament } from "@/lib/publicApi";
import type { SmashyTournament } from "@/lib/startgg";

describe("public API allowance", () => {
  beforeEach(() => resetApiCalls());
  it("allows the general limit per minute, then refuses until the minute has passed", () => {
    for (let i = 0; i < API_LIMITS.general; i++) expect(takeApiCall("1.2.3.4", "general", 1000).ok).toBe(true);
    expect(takeApiCall("1.2.3.4", "general", 1000)).toMatchObject({ ok: false, left: 0 });
    expect(takeApiCall("5.6.7.8", "general", 1000).ok).toBe(true); // another address has its own
    expect(takeApiCall("1.2.3.4", "general", 1000 + API_WINDOW_MS).ok).toBe(true);
  });
  it("gives single-tournament lookups (which may ask start.gg) their own tighter allowance", () => {
    expect(apiBucket("/api/v1/events/genesis-x4")).toBe("startgg");
    expect(apiBucket("/api/v1/events")).toBe("general");
    expect(apiBucket("/api/v1/majors/riptide-2025-4")).toBe("general");
    for (let i = 0; i < API_LIMITS.startgg; i++) takeApiCall("1.2.3.4", "startgg", 0);
    expect(takeApiCall("1.2.3.4", "startgg", 0).ok).toBe(false);
    expect(takeApiCall("1.2.3.4", "general", 0).ok).toBe(true);
  });
});

describe("public API answers", () => {
  it("are JSON any site may read, cached unless they're errors", async () => {
    const ok = apiJson({ a: 1 }, "long");
    expect(ok.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(ok.headers.get("Cache-Control")).toContain("s-maxage=3600");
    expect(await ok.json()).toEqual({ a: 1 });
    const bad = apiError(404, "nope");
    expect(bad.status).toBe(404);
    expect(bad.headers.get("Cache-Control")).toBe("no-store");
  });
  it("turn a tournament's times into ISO dates and keep only public fields", () => {
    const t = {
      id: "1", slug: "test-local", name: "Test Local", city: "Austin", venueName: null, venueAddress: null, startAt: 1_800_000_000, endAt: null,
      timezone: "America/Chicago", numAttendees: 12, isRegistrationOpen: true, imageUrl: null, bannerUrl: null,
      startggUrl: "https://www.start.gg/tournament/test-local/details", registerUrl: "", streams: [], region: "US-TX",
      events: [{ id: "9", name: "Melee Singles", game: "melee", startAt: 1_800_000_000, numEntrants: 12, state: "CREATED" }],
    } as SmashyTournament;
    const out = apiTournament(t);
    expect(out.startAt).toBe("2027-01-15T08:00:00.000Z");
    expect(out.endAt).toBeNull();
    expect(out.region).toBe("US-TX");
    expect(out.url).toMatch(/\/events\/test-local$/);
    expect(out.events[0]).toEqual({ id: "9", name: "Melee Singles", game: "melee", startAt: "2027-01-15T08:00:00.000Z", entrants: 12, state: "CREATED", online: false });
    expect(out).not.toHaveProperty("id");
  });
});
