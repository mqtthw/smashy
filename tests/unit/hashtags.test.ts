import { describe, expect, it } from "vitest";
import { CHARACTERS } from "@/lib/characters";
import { characterFromText, findHashtags, matchCharacter, parseHashtag } from "@/lib/hashtags";

describe("parseHashtag", () => {
  it.each([
    ["SSBU_CLOUD", "ultimate", "cloud"],
    ["SSBM_Fox", "melee", "fox"],
    ["Melee_Falco", "melee", "falco"],
    ["PPlus_Marth", "pplus", "marth"],
    ["SSBUCloud", "ultimate", "cloud"],
    ["MeleeFox", "melee", "fox"],
    ["SSBU_GnW", "ultimate", "mr-game-and-watch"],
    ["SSBM_ICs", "melee", "ice-climbers"],
    ["SSBU_ZSS", "ultimate", "zero-suit-samus"],
    ["SSBU_KRool", "ultimate", "king-k-rool"],
    ["SSBU_Aegis", "ultimate", "pyra-and-mythra"],
    ["SSBM_puff", "melee", "jigglypuff"],
    ["SSBU_ROB", "ultimate", "rob"],
    ["SSBU_DrMario", "ultimate", "dr-mario"],
  ])("#%s -> %s / %s", (tag, game, character) => {
    expect(parseHashtag(tag)).toMatchObject({ game, character });
  });

  it("uses the post's game for bare names", () => {
    expect(parseHashtag("fox", "melee")).toMatchObject({ game: "melee", character: "fox" });
    expect(parseHashtag("falcon", "ultimate")).toMatchObject({ game: "ultimate", character: "captain-falcon" });
  });

  it("doesn't guess a character without a game", () => {
    expect(parseHashtag("fox")).toMatchObject({ game: null, character: null });
  });

  it("doesn't map characters that aren't in that game", () => {
    expect(parseHashtag("SSBM_Cloud")).toMatchObject({ game: "melee", character: null });
  });

  it("leaves ordinary hashtags alone", () => {
    expect(parseHashtag("combovideo", "melee").character).toBeNull();
  });
});

describe("findHashtags", () => {
  it("finds tags but ignores things like emails and C#", () => {
    expect(findHashtags("new tech!! #SSBU_CLOUD #combo, email a#b and C#sharp")).toEqual(["SSBU_CLOUD", "combo"]);
  });
});

describe("characterFromText", () => {
  it("returns the first character hashtag", () => {
    expect(characterFromText("check this #SSBM_Fox #wavedash", null)).toEqual({ game: "melee", character: "fox" });
  });
});

describe("rosters", () => {
  it("has no duplicate keys in any game", () => {
    for (const roster of Object.values(CHARACTERS)) {
      const keys = roster.map((c) => c.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
  it("gives R.O.B. a clean key", () => {
    expect(matchCharacter("ultimate", "R.O.B.")).toBe("rob");
  });
});
