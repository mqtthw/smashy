import { describe, expect, it } from "vitest";
import { CHARACTERS } from "@/lib/characters";
import { badgeMain, mainCode, stockIconUrl } from "@/lib/mainBadge";

describe("main badge", () => {
  it("shows the first main that has an icon, otherwise the first main", () => {
    expect(badgeMain([{ game: "pplus", character: "knuckles" }, { game: "melee", character: "marth" }])).toEqual({ game: "melee", character: "marth" });
    expect(badgeMain([{ game: "pplus", character: "fox" }, { game: "melee", character: "marth" }])).toEqual({ game: "pplus", character: "fox" });
    expect(badgeMain([{ game: "melee", character: "fox" }, { game: "ultimate", character: "cloud" }])).toEqual({ game: "melee", character: "fox" });
    expect(badgeMain([{ game: "pplus", character: "knuckles" }])).toEqual({ game: "pplus", character: "knuckles" });
    expect(badgeMain([])).toBeNull();
    expect(badgeMain("junk")).toBeNull();
  });
  it("has a stock icon for every character in every game; Project+ borrows Brawl's (then Melee's, Smash 4's)", () => {
    for (const game of ["ultimate", "melee", "smash64", "brawl", "smash4"] as const) {
      for (const c of CHARACTERS[game]) expect(stockIconUrl({ game, character: c.key }), `${game}/${c.key}`).toBe(`/stock/${game}/${c.key}.webp`);
    }
    expect(stockIconUrl({ game: "pplus", character: "fox" })).toBe("/stock/brawl/fox.webp");
    expect(stockIconUrl({ game: "pplus", character: "roy" })).toBe("/stock/melee/roy.webp");
    expect(stockIconUrl({ game: "pplus", character: "mewtwo" })).toBe("/stock/melee/mewtwo.webp");
    expect(stockIconUrl({ game: "pplus", character: "charizard" })).toBe("/stock/smash4/charizard.webp");
    const missing = CHARACTERS.pplus.filter((c) => !stockIconUrl({ game: "pplus", character: c.key })).map((c) => c.key);
    expect(missing.sort()).toEqual(["ivysaur", "knuckles", "squirtle"]);
    expect(stockIconUrl({ game: "melee", character: "not-a-character" })).toBeNull();
  });
  it("makes short codes", () => {
    expect(mainCode({ game: "melee", character: "fox" })).toBe("FOX");
    expect(mainCode({ game: "melee", character: "captain-falcon" })).toBe("CF");
    expect(mainCode({ game: "melee", character: "mr-game-and-watch" })).toBe("MGW");
    expect(mainCode({ game: "pplus", character: "rob" })).toBe("ROB");
  });
});
