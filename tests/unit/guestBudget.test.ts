// Player lookup for visitors who aren't signed in (round 248): the two limits that keep bots from
// using up start.gg's 80 requests a minute.
import { beforeEach, describe, expect, it } from "vitest";
import { GUEST_BUSY_AT, GUEST_LOOKUPS, GUEST_SITE_PER_MINUTE, GUEST_TICKET, GUEST_WINDOW_MS, guestSiteRoom, refundGuestLookup, resetGuestLookups, takeGuestLookup } from "@/lib/guestBudget";

const T0 = 1_800_000_000_000;

beforeEach(resetGuestLookups);

describe("takeGuestLookup", () => {
  it("lets a visitor look up players, up to the limit for one address", () => {
    for (let i = 0; i < GUEST_LOOKUPS; i++) expect(takeGuestLookup("1.2.3.4", T0 + i * 1000, 0)).toBe("ok");
    expect(takeGuestLookup("1.2.3.4", T0 + 60_000, 0)).toBe("slow_down");
    expect(takeGuestLookup("1.2.3.4", T0 + 61_000, 0)).toBe("slow_down"); // being refused doesn't use more up, or reset anything
  });

  it("counts each address by itself", () => {
    for (let i = 0; i < GUEST_LOOKUPS; i++) takeGuestLookup("1.2.3.4", T0, 0);
    expect(takeGuestLookup("1.2.3.4", T0, 0)).toBe("slow_down");
    expect(takeGuestLookup("5.6.7.8", T0, 0)).toBe("ok");
  });

  it("gives the lookups back once the window has passed", () => {
    for (let i = 0; i < GUEST_LOOKUPS; i++) takeGuestLookup("1.2.3.4", T0, 0);
    expect(takeGuestLookup("1.2.3.4", T0 + GUEST_WINDOW_MS - 1, 0)).toBe("slow_down");
    expect(takeGuestLookup("1.2.3.4", T0 + GUEST_WINDOW_MS + 1, 0)).toBe("ok");
  });

  it("makes guests wait while the server is busy with start.gg, without counting it against them", () => {
    expect(takeGuestLookup("1.2.3.4", T0, GUEST_BUSY_AT - 1)).toBe("ok");
    for (let i = 0; i < 100; i++) expect(takeGuestLookup("1.2.3.4", T0 + i, GUEST_BUSY_AT)).toBe("busy");
    // Still has all but the one lookup that went through.
    for (let i = 1; i < GUEST_LOOKUPS; i++) expect(takeGuestLookup("1.2.3.4", T0 + 1000 + i, 0)).toBe("ok");
    expect(takeGuestLookup("1.2.3.4", T0 + 2000, 0)).toBe("slow_down");
  });

  it("tells an address that used up its lookups to slow down, busy or not", () => {
    for (let i = 0; i < GUEST_LOOKUPS; i++) takeGuestLookup("1.2.3.4", T0, 0);
    expect(takeGuestLookup("1.2.3.4", T0, GUEST_BUSY_AT + 20)).toBe("slow_down");
  });
});

describe("the whole site's pace for guests (step S3)", () => {
  it("goes ahead only with a full ticket", async () => {
    const asked: [number, number][] = [];
    const take = (granted: number | null) => async (want: number, perMinute: number) => (asked.push([want, perMinute]), granted);
    expect(await guestSiteRoom(take(GUEST_TICKET))).toBe(true);
    expect(await guestSiteRoom(take(GUEST_TICKET - 1))).toBe(false);
    expect(await guestSiteRoom(take(0))).toBe(false);
    expect(asked[0]).toEqual([GUEST_TICKET, GUEST_SITE_PER_MINUTE]);
  });
  it("leaves at least half of start.gg's allowance for members and brackets", () => {
    expect(GUEST_SITE_PER_MINUTE).toBeLessThanOrEqual(75 / 2);
  });
  it("goes ahead when the shared count can't be asked, instead of turning every guest away", async () => {
    expect(await guestSiteRoom(async () => null)).toBe(true);
    expect(await guestSiteRoom(async () => Promise.reject(new Error("database slow")))).toBe(true);
  });
  it("a visitor turned away as busy gets their lookup back", () => {
    resetGuestLookups();
    for (let i = 0; i < GUEST_LOOKUPS; i++) takeGuestLookup("1.2.3.4", 1000 + i, 0);
    expect(takeGuestLookup("1.2.3.4", 5000, 0)).toBe("slow_down");
    refundGuestLookup("1.2.3.4");
    expect(takeGuestLookup("1.2.3.4", 5000, 0)).toBe("ok");
  });
});
