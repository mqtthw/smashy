import { describe, expect, it } from "vitest";
import { mediaBlocks, parseMediaList, type PostMediaItem } from "@/lib/postMedia";
import { playerLinks } from "@/lib/embeds";

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;

describe("post media (round 450)", () => {
  it("reads the composer's ordered list: up to 4, at most 2 videos, bad entries dropped", () => {
    const list = JSON.stringify([
      { kind: "image", id: id(1), alt: " a fox " },
      { kind: "video", id: id(2) },
      { kind: "video", id: id(3) },
      { kind: "video", id: id(4) }, // a third video: dropped
      { kind: "image", id: "not-an-id" },
      { kind: "image", id: id(1) }, // a repeat: dropped
      { kind: "image", id: id(5) },
      { kind: "image", id: id(6) }, // fifth item: past the limit
    ]);
    expect(parseMediaList(list)).toEqual([
      { kind: "image", id: id(1), alt: "a fox" },
      { kind: "video", id: id(2) },
      { kind: "video", id: id(3) },
      { kind: "image", id: id(5), alt: "" },
    ]);
    expect(parseMediaList("not json")).toEqual([]);
  });

  it("still takes the older separate photos and video fields (photos first)", () => {
    expect(parseMediaList(null, JSON.stringify([{ id: id(1), alt: "" }]), id(2))).toEqual([
      { kind: "image", id: id(1), alt: "" },
      { kind: "video", id: id(2) },
    ]);
    expect(parseMediaList(null, null, null)).toEqual([]);
  });

  it("groups photos next to each other; each video stands alone", () => {
    const img = (n: number): PostMediaItem => ({ kind: "image", image: { url: `i${n}`, width: 1, height: 1, alt: "" } });
    const vid = (n: number): PostMediaItem => ({ kind: "video", video: { url: `v${n}`, posterUrl: "p", width: 1, height: 1, durationMs: 1000 } });
    expect(mediaBlocks([img(1), img(2), vid(1), img(3)]).map((b) => (b.kind === "images" ? b.images.length : "video"))).toEqual([2, "video", 1]);
    expect(mediaBlocks([vid(1), vid(2)]).map((b) => b.kind)).toEqual(["video", "video"]);
    expect(mediaBlocks([])).toEqual([]);
  });

  it("finds up to 3 different video links, skipping spoilers", () => {
    const text = "https://youtu.be/aaaaaaaaaaa and https://youtu.be/aaaaaaaaaaa again, https://www.youtube.com/watch?v=bbbbbbbbbbb ||https://youtu.be/ccccccccccc|| https://streamable.com/abc12 https://youtu.be/ddddddddddd";
    expect(playerLinks(text).map((e) => e.provider)).toEqual(["YouTube", "YouTube", "Streamable"]);
    expect(playerLinks(text, 1)).toHaveLength(1);
    expect(playerLinks("no links")).toEqual([]);
  });
});
