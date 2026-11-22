// Player lookup for visitors who aren't signed in (round 248): the two limits that keep bots from
// using up start.gg's 80 requests a minute.
import { beforeEach, describe, expect, it } from "vitest";
import { GUEST_BUSY_AT, GUEST_LOOKUPS, GUEST_WINDOW_MS, resetGuestLookups, takeGuestLookup } from "@/lib/guestBudget";

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
