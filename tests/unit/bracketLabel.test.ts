import { describe, expect, it } from "vitest";
import { bracketLabel } from "@/lib/bracketLabel";

describe("bracketLabel", () => {
  it("takes the game's name off either end", () => {
    expect(bracketLabel("Super Smash Bros. Melee - Singles", "melee")).toBe("Singles");
    expect(bracketLabel("Melee - 1v1 Singles", "melee")).toBe("Singles");
    expect(bracketLabel("SSBM Singles", "melee")).toBe("Singles");
    expect(bracketLabel("Singles (Melee)", "melee")).toBe("Singles");
    expect(bracketLabel("Ultimate Singles", "ultimate")).toBe("Singles");
    expect(bracketLabel("Smash Ultimate: Doubles", "ultimate")).toBe("Doubles");
  });

  it("calms shouted names and keeps the rest as typed", () => {
    expect(bracketLabel("MAIN EVENT", "melee")).toBe("Main Event");
    expect(bracketLabel("Main Bracket", "melee")).toBe("Main Bracket");
    expect(bracketLabel("Top 8 Bracket", "melee")).toBe("Top 8 Bracket");
  });

  it("doesn't cut words that only contain the game's name", () => {
    expect(bracketLabel("Ultimate Ultras Singles", "ultimate")).toBe("Ultras Singles");
    expect(bracketLabel("Amateur Bracket", "ultimate")).toBe("Amateur Bracket");
  });

  it("falls back to the game when nothing else is left", () => {
    expect(bracketLabel("Melee", "melee")).toBe("Melee");
    expect(bracketLabel("Super Smash Bros. Melee", "melee")).toBe("Melee");
  });
});
