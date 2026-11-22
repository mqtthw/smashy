import { describe, expect, it } from "vitest";
import { searchLibrary } from "@/lib/librarySearch";

describe("library search", () => {
  it("finds a character's links by character and topic", () => {
    const hits = searchLibrary("fox combo");
    // Fox's own library first; other characters' links that mention Fox (e.g. "0-to-death on Fox") after.
    expect(hits.slice(0, 3).map((h) => h.character)).toEqual(["fox", "fox", "fox"]);
    expect(hits.some((h) => /combo/i.test(h.link.title))).toBe(true);
  });
  it("understands character nicknames and game names", () => {
    const puff = searchLibrary("puff rest");
    expect(puff.length).toBeGreaterThan(0);
    expect(puff[0].character).toBe("jigglypuff");
    const melee = searchLibrary("melee marth");
    expect(melee.length).toBeGreaterThan(0);
    expect(melee.every((h) => h.game === "melee")).toBe(true);
    expect([melee[0].game, melee[0].character]).toEqual(["melee", "marth"]);
  });
  it("finds topics across characters, without duplicate links", () => {
    const hits = searchLibrary("ledge trap", 40);
    expect(new Set(hits.map((h) => h.character)).size).toBeGreaterThan(2);
    expect(new Set(hits.map((h) => h.link.url)).size).toBe(hits.length);
  });
  it("finds resources by who made them, including courses (Matthew's example: armada peach)", () => {
    const hits = searchLibrary("armada peach");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.section === "Courses" && /Peach Deconstructed/.test(h.link.title))).toBe(true);
    expect(hits.every((h) => /armada/i.test(`${h.link.title} ${h.link.by}`))).toBe(true);
  });
  it("answers questions: filler words are ignored, the rest must fit", () => {
    const hits = searchLibrary("how do I ledge trap as fox");
    for (const h of hits) expect(`${h.name} ${h.link.title}`).toMatch(/fox/i);
    expect(searchLibrary("ledgetrap", 40).length).toBeGreaterThan(0);
    expect(searchLibrary("how do i")).toEqual([]);
  });
  it("doesn't show a link just because a word matches its section name", () => {
    // "combo" alone matches the "Combos, punishes & data" section; a data sheet isn't a combo resource.
    for (const h of searchLibrary("combo", 60)) expect(`${h.link.title} ${h.link.by}`).toMatch(/combo|bread|confirm/i);
  });
  it("finds game-wide resources too", () => {
    const hits = searchLibrary("stockfish");
    expect(hits[0]?.link.url).toBe("https://github.com/noahpodgurski/4Stockfish");
    expect(hits[0]?.character).toBeNull();
    expect(searchLibrary("slippi")[0]?.link.url).toBe("https://slippi.gg");
  });
  it("can search inside one character's library", () => {
    const hits = searchLibrary("how do i ledgedash", 40, { game: "melee", character: "fox" });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => h.game === "melee" && h.character === "fox")).toBe(true);
    // Nothing fits → nothing shown (the page then points to the character's Discord instead).
    expect(searchLibrary("edgeguard", 40, { game: "melee", character: "marth" })).toEqual([]);
  });
  it("needs every word to match, and ignores empty queries", () => {
    expect(searchLibrary("zzzzqq")).toEqual([]);
    expect(searchLibrary("fox zzzzqq")).toEqual([]);
    expect(searchLibrary(" ")).toEqual([]);
  });
});

describe("characters named in a search", () => {
  it("finds characters word by word, nicknames included, Melee first", async () => {
    const { charactersIn } = await import("@/lib/librarySearch");
    const hits = charactersIn("how to beat puff as fox");
    expect(hits.slice(0, 2).map((h) => `${h.game}/${h.character}`)).toEqual(["melee/jigglypuff", "melee/fox"]);
    expect(hits.some((h) => h.game === "ultimate" && h.character === "fox")).toBe(true);
    expect(charactersIn("how do i wavedash")).toEqual([]);
  });
});
