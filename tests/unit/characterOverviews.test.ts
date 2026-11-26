import { describe, expect, it } from "vitest";
import { CHARACTER_OVERVIEWS, characterOverview, inLang } from "@/lib/characterOverviews";
import { characterName } from "@/lib/characters";
import type { GameKey } from "@/lib/games";
import { OVERVIEW_NAMES, traitName } from "@/lib/overviewNames";
import { OVERVIEW_TEXT as ES } from "@/lib/overviewText.es";
import { OVERVIEW_TEXT as FR } from "@/lib/overviewText.fr";
import { OVERVIEW_TEXT as JA } from "@/lib/overviewText.ja";

const FILES: Record<string, Record<string, string>> = { es: ES, fr: FR, ja: JA };

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

  it("every English line has a Spanish, French and Japanese translation", () => {
    const lines: { en: string; es?: string }[] = [];
    for (const list of Object.values(CHARACTER_OVERVIEWS)) {
      for (const o of Object.values(list ?? {})) lines.push(o.playstyle, ...o.traits.map((t) => t.text), ...o.strengths, ...o.weaknesses);
    }
    expect(lines.length).toBeGreaterThan(400);
    for (const lang of ["es", "fr", "ja"]) {
      // Written beside the English, or in that language's file (a line may rightly read the same, e.g. "Recovery.").
      const missing = lines.filter((l) => !(lang in l) && !(l.en in FILES[lang])).map((l) => l.en.slice(0, 50));
      expect(missing, lang).toEqual([]);
    }
  });

  it("trait headings: every translated heading is one that's in use, and a move's own name stays as it is", () => {
    const used = new Set<string>();
    for (const list of Object.values(CHARACTER_OVERVIEWS)) for (const o of Object.values(list ?? {})) for (const t of o.traits) used.add(t.name);
    for (const name of Object.keys(OVERVIEW_NAMES)) expect(used.has(name), name).toBe(true);
    expect(traitName("Recovery", "es")).toBe("Recuperación");
    expect(traitName("Recovery", "en")).toBe("Recovery");
    expect(traitName("Gordo", "ja")).toBe("Gordo");
  });

  it("falls back to English for a language that isn't written, and gives nothing for a character without one", () => {
    expect(inLang({ en: "a", fr: "b" }, "fr")).toBe("b");
    expect(inLang({ en: "a" }, "ja")).toBe("a");
    expect(characterOverview("ultimate", "king-k-rool")?.stats?.weight).toBe(133);
    expect(characterOverview("melee", "nobody")).toBeNull();
  });
});
