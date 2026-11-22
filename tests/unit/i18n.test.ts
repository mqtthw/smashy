// Languages: picking one from the browser, filling in phrases, and Spanish covering every English phrase.
import { describe, expect, it } from "vitest";
import { pickLang, placeIn, placeKey, translate } from "@/lib/i18n/core";
import { en } from "@/lib/i18n/en";
import { es } from "@/lib/i18n/es";
import { ja } from "@/lib/i18n/ja";
import { fr } from "@/lib/i18n/fr";

describe("languages", () => {
  it("picks Spanish for any Spanish-speaking browser and English otherwise", () => {
    expect(pickLang("es-MX,es;q=0.9,en;q=0.8")).toBe("es");
    expect(pickLang("en-US,en;q=0.9,es;q=0.5")).toBe("en");
    expect(pickLang("de-DE,es;q=0.5")).toBe("es");
    expect(pickLang(["pt-BR", "de"])).toBe("en");
    expect(pickLang(null)).toBe("en");
  });

  it("fills in names and picks the plural", () => {
    expect(translate("en", "common.showMore", { n: 3 })).toBe("Show 3 more");
    expect(translate("es", "common.showMore", { n: 3 })).toBe("Ver 3 más");
    expect(translate("es", "signin.sentTo", { email: "a@b.co" })).toContain("a@b.co");
  });

  for (const [name, dict] of [["Spanish", es], ["Japanese", ja], ["French", fr]] as const) {
    it(`has ${name} for every phrase, with the same {names} filled in`, () => {
      // Which {names} appear (a plural can repeat one on both sides of "|").
      const names = (t: string) => [...new Set([...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort();
      for (const key of Object.keys(en) as (keyof typeof en)[]) {
        expect(dict[key], key).toBeTruthy();
        expect(names(dict[key]), key).toEqual(names(en[key]));
        expect(dict[key].includes("|"), key).toBe(en[key].includes("|"));
      }
    });
  }

  it("picks Japanese and French for those browsers", () => {
    expect(pickLang("ja-JP,ja;q=0.9,en;q=0.8")).toBe("ja");
    expect(pickLang("fr-CA,fr;q=0.9,en;q=0.8")).toBe("fr");
  });

  it("writes places the way each language does", () => {
    const place = (lang: "en" | "fr", n: number) => translate(lang, placeKey(n), { n });
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map((n) => place("en", n))).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd"]);
    expect([1, 2, 21].map((n) => place("fr", n))).toEqual(["1er", "2e", "21e"]);
    expect([placeIn("fr", 1), placeIn("fr", 3), placeIn("en", 12), placeIn("ja", 3)]).toEqual(["1er", "3e", "12th", "3"]);
  });
});
