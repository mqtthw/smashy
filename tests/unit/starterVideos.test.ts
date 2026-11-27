import { describe, expect, it } from "vitest";
import { toEmbed } from "@/lib/embeds";
import { starterVideos } from "@/lib/starterVideos";

describe("starterVideos", () => {
  it("puts the general videos first, without a character", () => {
    const melee = starterVideos("melee");
    expect(melee[0]).toMatchObject({ title: "Armada's 5 tips for beginners", by: "Armada", character: null });
    expect(starterVideos("ultimate")[0]).toMatchObject({ by: "IzAw", character: null });
  });

  it("only returns single YouTube videos that play in place, each once", () => {
    for (const game of ["melee", "ultimate"] as const) {
      const list = starterVideos(game, 50);
      expect(list.length).toBeGreaterThan(1);
      expect(new Set(list.map((v) => v.url)).size).toBe(list.length);
      for (const v of list) {
        expect(toEmbed(v.url)).toMatchObject({ kind: "player", provider: "YouTube" });
        expect(v.url).not.toContain("playlist");
        expect(v.title).not.toMatch(/\(video\)$/);
        if (v.character) expect(v.title).toMatch(/beginner/i);
      }
    }
  });

  it("takes one part of a series, not the next part from another character's list", () => {
    const titles = starterVideos("ultimate", 50).map((v) => v.title);
    expect(titles.filter((t) => t.startsWith("ProtoBanham's beginner Lucina guide"))).toHaveLength(1);
  });

  it("keeps to the limit and gives nothing for a game with no library", () => {
    expect(starterVideos("ultimate", 3)).toHaveLength(3);
    expect(starterVideos("smash64")).toEqual([]);
  });

  it("leaves out a video that is listed as a beginner guide but is not for someone new to the game", () => {
    // Mew2King's "How to embarrass with Pichu" (round 967): it stays on Pichu's own page.
    expect(starterVideos("melee", 50).some((v) => /embarrass/i.test(v.title) || v.url.includes("Q3yexswM15Q"))).toBe(false);
  });
});
