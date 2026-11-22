import { describe, expect, it } from "vitest";
import { brawlEventIsPplus, gameOfEvent } from "@/lib/games";

const BRAWL = { id: "5" };

describe("P+ events filed under start.gg's Brawl game (round 652)", () => {
  it("counts quoted \"Brawl\" and P+ names as P+", () => {
    for (const name of ['"Brawl" Singles', "“Brawl” Doubles", '"Brawl" Singles ($200 Pot Bonus)', "Brawl :) Singles", "P+ Singles", "Project+ Doubles", "Project M Singles"]) {
      expect(brawlEventIsPplus(name), name).toBe(true);
      expect(gameOfEvent({ videogame: BRAWL, name }), name).toBe("pplus");
    }
  });
  it("keeps real Brawl events as Brawl", () => {
    for (const name of ["Brawl Singles", "Brawl - 1v1 Singles", "Brawl Singles [STARTS 7 PM]", "BRAWL! Singles", "Super Smash Bros. Brawl", null]) {
      expect(gameOfEvent({ videogame: BRAWL, name }), String(name)).toBe("brawl");
    }
  });
  it("leaves other games alone", () => {
    expect(gameOfEvent({ videogame: { id: 1 }, name: '"Brawl" Singles' })).toBe("melee");
    expect(gameOfEvent({ videogame: { id: 33602 }, name: "Singles" })).toBe("pplus");
    expect(gameOfEvent({ videogame: null, name: "P+ Singles" })).toBeNull();
    expect(gameOfEvent(null)).toBeNull();
  });
});
