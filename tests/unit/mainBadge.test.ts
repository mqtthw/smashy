import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { CHARACTERS, parseMains } from "@/lib/characters";
import { badgeMain, costumeIcons, mainCode, stockIconUrl } from "@/lib/mainBadge";
import { STOCK_COSTUMES } from "@/lib/stockCostumes";

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
  it("shows the costume a player picked, and the default one when there's no such costume (round 728)", () => {
    expect(costumeIcons({ game: "melee", character: "fox" })).toEqual(["/stock/melee/fox.webp", "/stock/melee/costumes/fox-2.webp", "/stock/melee/costumes/fox-3.webp", "/stock/melee/costumes/fox-4.webp"]);
    expect(stockIconUrl({ game: "melee", character: "fox", costume: 3 })).toBe("/stock/melee/costumes/fox-3.webp");
    expect(stockIconUrl({ game: "melee", character: "fox", costume: 9 })).toBe("/stock/melee/fox.webp");
    expect(stockIconUrl({ game: "pplus", character: "fox", costume: 2 })).toBe("/stock/brawl/costumes/fox-2.webp"); // Project+ borrows Brawl's
    expect(costumeIcons({ game: "smash64", character: "fox" })).toEqual(["/stock/smash64/fox.webp"]);
    expect(costumeIcons({ game: "pplus", character: "knuckles" })).toEqual([]);
  });
  it("has a file for every costume it lists", () => {
    for (const [game, chars] of Object.entries(STOCK_COSTUMES)) {
      for (const [key, count] of Object.entries(chars)) {
        for (let n = 2; n <= count; n++) expect(existsSync(`public/stock/${game}/costumes/${key}-${n}.webp`), `${game}/${key}-${n}`).toBe(true);
      }
    }
  });
  it("keeps a main's costume when reading saved mains, and drops junk", () => {
    expect(parseMains([{ game: "melee", character: "falco", costume: 3 }, { game: "melee", character: "pikachu", costume: "x" }, { game: "melee", character: "fox", costume: 1 }])).toEqual([
      { game: "melee", character: "falco", costume: 3 }, { game: "melee", character: "pikachu" }, { game: "melee", character: "fox" },
    ]);
  });
  it("makes short codes", () => {
    expect(mainCode({ game: "melee", character: "fox" })).toBe("FOX");
    expect(mainCode({ game: "melee", character: "captain-falcon" })).toBe("CF");
    expect(mainCode({ game: "melee", character: "mr-game-and-watch" })).toBe("MGW");
    expect(mainCode({ game: "pplus", character: "rob" })).toBe("ROB");
  });
});
