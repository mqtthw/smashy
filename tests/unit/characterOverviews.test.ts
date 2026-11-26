import { describe, expect, it } from "vitest";
import { CHARACTER_OVERVIEWS, characterOverview, inLang } from "@/lib/characterOverviews";
import { characterName } from "@/lib/characters";
import type { GameKey } from "@/lib/games";

describe("character overviews", () => {
  it("every overview is for a real character and names a linked source and its authors", () => {
    for (const [game, list] of Object.entries(CHARACTER_OVERVIEWS)) {
      for (const [character, o] of Object.entries(list ?? {})) {
        expect(characterName(game as GameKey, character), `${game}/${character}`).toBeTruthy();
        expect(o.source.url).toMatch(/^https:\/\//);
        expect(o.source.title.length).toBeGreaterThan(3);
        expect(o.source.by.length).toBeGreaterThan(1);
        expect(o.playstyle.en.length).toBeGreaterThan(40);
        expect(o.traits.length + o.strengths.length + o.weaknesses.length).toBeGreaterThan(0);
      }
    }
  });

  it("falls back to English for a language that isn't written, and gives nothing for a character without one", () => {
    expect(inLang({ en: "a", fr: "b" }, "fr")).toBe("b");
    expect(inLang({ en: "a" }, "ja")).toBe("a");
    expect(characterOverview("ultimate", "king-k-rool")?.stats?.weight).toBe(133);
    expect(characterOverview("melee", "nobody")).toBeNull();
  });
});
