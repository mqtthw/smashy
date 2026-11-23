import { describe, expect, it } from "vitest";
import { REPLAY_BATCH, newestReplays, replaysInFolder, takeBatch, type DirHandle, type FileHandle } from "@/lib/replayPick";

const f = (name: string, lastModified: number) => ({ name, lastModified });

describe("picking replays", () => {
  it("keeps only .slp files, newest first", () => {
    const picked = newestReplays([f("Game_20260101T100000.slp", 100), f("notes.txt", 999), f("Game_20261120T100000.SLP", 300), f("Game_20260601T100000.slp", 200)]);
    expect(picked.map((x) => x.name)).toEqual(["Game_20261120T100000.SLP", "Game_20260601T100000.slp", "Game_20260101T100000.slp"]);
  });

  it("falls back to the name when files were written at the same moment (a copied folder)", () => {
    const picked = newestReplays([f("Game_20260101T100000.slp", 5), f("Game_20261120T100000.slp", 5)]);
    expect(picked[0].name).toBe("Game_20261120T100000.slp");
  });

  it("takes a batch off the front and keeps the rest", () => {
    const queue = Array.from({ length: 2958 }, (_, i) => i);
    const { batch, rest } = takeBatch(queue);
    expect(batch).toHaveLength(REPLAY_BATCH);
    expect(batch[0]).toBe(0);
    expect(rest).toHaveLength(2958 - REPLAY_BATCH);
    expect(takeBatch([1, 2], 300)).toEqual({ batch: [1, 2], rest: [] });
  });
});

const file = (name: string): FileHandle => ({ kind: "file", name, getFile: async () => new File([], name) });
const dir = (name: string, entries: (DirHandle | FileHandle)[]): DirHandle => ({
  kind: "directory",
  name,
  async *values() {
    yield* entries;
  },
});

describe("reading a picked folder", () => {
  it("finds replays in the folder and its month folders, and skips other files", async () => {
    const slippi = dir("Slippi", [file("Game_a.slp"), file("readme.txt"), dir("2026-11", [file("Game_b.slp"), file("Game_c.SLP")]), dir("2026-10", [file("Game_d.slp")])]);
    expect((await replaysInFolder(slippi)).map((x) => x.name).sort()).toEqual(["Game_a.slp", "Game_b.slp", "Game_c.SLP", "Game_d.slp"]);
  });

  it("stops at the limit and doesn't dig forever", async () => {
    const big = dir("Slippi", Array.from({ length: 50 }, (_, i) => file(`Game_${i}.slp`)));
    expect(await replaysInFolder(big, 10)).toHaveLength(10);
    const deep = dir("a", [dir("b", [dir("c", [dir("d", [dir("e", [dir("f", [file("Game_deep.slp")])])])])])]);
    expect(await replaysInFolder(deep)).toEqual([]);
  });
});
