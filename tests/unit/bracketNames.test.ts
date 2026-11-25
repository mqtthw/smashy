// Events → Online: bracket names without the tournament's name repeated (round 840).
import { describe, expect, it } from "vitest";
import { shortBracketNames } from "@/lib/bracketNames";

describe("shortBracketNames", () => {
  it("drops the tournament's name in front", () => {
    expect(shortBracketNames("Alrest Series", ["Alrest Series #1", "Alrest Series #2"])).toEqual(["#1", "#2"]);
    expect(shortBracketNames("Smash Bong", ["Smash Bong - Melee Singles", "Smash Bong: Ultimate Singles"])).toEqual(["Melee Singles", "Ultimate Singles"]);
  });
  it("drops brackets that are just the tournament's name, and repeats", () => {
    expect(shortBracketNames("Super cool awesome tournament", ["Super cool awesome tournament", "super cool awesome tournament"])).toEqual([]);
    expect(shortBracketNames("X", ["Melee Singles", "Melee Singles"])).toEqual(["Melee Singles"]);
  });
  it("leaves other names alone", () => {
    expect(shortBracketNames("Weekly 5", ["Ultimate Singles", "Ultimate Doubles"])).toEqual(["Ultimate Singles", "Ultimate Doubles"]);
  });
});
