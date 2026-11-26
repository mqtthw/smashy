import { describe, expect, it } from "vitest";
import { isNear, kmBetween } from "@/lib/distance";

const austin = { lat: 30.2672, lng: -97.7431 };
const sanAntonio = { lat: 29.4241, lng: -98.4936 };
const roundRock = { lat: 30.5083, lng: -97.6789 };

describe("distance", () => {
  it("measures Austin to San Antonio at about 118 km", () => {
    expect(Math.round(kmBetween(austin, sanAntonio))).toBeGreaterThan(110);
    expect(Math.round(kmBetween(austin, sanAntonio))).toBeLessThan(125);
  });
  it("counts Round Rock as near Austin, San Antonio not", () => {
    expect(isNear(austin, roundRock.lat, roundRock.lng)).toBe(true);
    expect(isNear(austin, sanAntonio.lat, sanAntonio.lng)).toBe(false);
  });
  it("never counts a place without coordinates", () => {
    expect(isNear(austin, null, null)).toBe(false);
  });
});
