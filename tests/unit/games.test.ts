import { describe, expect, it } from "vitest";
import { CHARACTERS } from "@/lib/characters";
import { GAME_KEYS, gameKeyFromStartggId, gamesFor, isGameKey } from "@/lib/games";
import { parseHashtag } from "@/lib/hashtags";
import { RULESET_FIELDS, STAGES } from "@/lib/rulesetFields";

describe("older games", () => {
  it("only show older games to people who play them", () => {
    expect(gamesFor([])).toEqual(["melee", "ultimate", "pplus"]);
    expect(gamesFor(null)).toEqual(["melee", "ultimate", "pplus"]);
    expect(gamesFor(["melee", "brawl"])).toEqual(["melee", "ultimate", "pplus", "brawl"]);
  });

  it("maps start.gg game IDs, including both Smash 4 versions", () => {
    expect(gameKeyFromStartggId(4)).toBe("smash64");
    expect(gameKeyFromStartggId(5)).toBe("brawl");
    expect(gameKeyFromStartggId(3)).toBe("smash4");
    expect(gameKeyFromStartggId("29")).toBe("smash4");
    expect(gameKeyFromStartggId(1)).toBe("melee");
    expect(gameKeyFromStartggId(2)).toBe("pplus"); // Project M, filed under P+
    expect(gameKeyFromStartggId(999)).toBeNull();
  });

  it("every game has characters, stages and ruleset fields", () => {
    for (const g of GAME_KEYS) {
      expect(CHARACTERS[g].length).toBeGreaterThan(10);
      expect(STAGES[g].length).toBeGreaterThan(3);
      expect(RULESET_FIELDS[g].length).toBeGreaterThan(0);
    }
    expect(CHARACTERS.smash64).toHaveLength(12);
  });

  it("recognizes older-game hashtags", () => {
    expect(parseHashtag("SSB64_Pikachu")).toMatchObject({ game: "smash64", character: "pikachu" });
    expect(parseHashtag("SSBB_MetaKnight")).toMatchObject({ game: "brawl", character: "meta-knight" });
    expect(parseHashtag("SSB4_Cloud")).toMatchObject({ game: "smash4", character: "cloud" });
    expect(parseHashtag("Smash64Kirby")).toMatchObject({ game: "smash64", character: "kirby" });
    expect(parseHashtag("SSBB_Cloud")).toMatchObject({ game: "brawl", character: null }); // not in Brawl
  });

  it("checks game keys", () => {
    expect(isGameKey("brawl")).toBe(true);
    expect(isGameKey("brawlhalla")).toBe(false);
  });
});
