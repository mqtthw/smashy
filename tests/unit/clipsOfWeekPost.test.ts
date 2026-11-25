// The weekly "Clips of the week" post's words (round 843).
import { describe, expect, it } from "vitest";
import { compilationText, videoLinkIn, weekLabel } from "@/lib/clipsOfWeekPost";

describe("weekLabel", () => {
  it("names the 7 days before the Monday it's posted", () => {
    expect(weekLabel(new Date("2026-11-30T11:00:00Z"))).toBe("Nov 23–29");
    expect(weekLabel(new Date("2026-12-07T11:00:00Z"))).toBe("Nov 30 – Dec 6");
  });
});

describe("videoLinkIn", () => {
  it("finds the link that plays or shows as a tweet, as written", () => {
    expect(videoLinkIn("wow\nhttps://www.youtube.com/watch?v=E-YAmXmyqsc")).toBe("https://www.youtube.com/watch?v=E-YAmXmyqsc");
    expect(videoLinkIn("see https://x.com/a/status/2124429086789353494 lol")).toBe("https://x.com/a/status/2124429086789353494");
    expect(videoLinkIn("results https://smashy.gg/events/genesis-x3")).toBeNull();
  });
});

describe("compilationText", () => {
  it("credits each player and links each clip", () => {
    const { title, body } = compilationText(
      [
        { handle: "mqtthw", tag: "mqtthw", words: "Steve dittos can be so funny https://x.com/a/status/1", smashyUrl: "https://smashy.gg/post/1", videoUrl: "https://x.com/a/status/2124429086789353494" },
        { handle: null, tag: "PhoenixSmash", words: "ice cold", smashyUrl: "https://smashy.gg/reels/abc", videoUrl: null },
      ],
      new Date("2026-11-30T11:00:00Z"),
    );
    expect(title).toBe("Clips of the week · Nov 23–29");
    expect(body).toContain("1. Steve dittos can be so funny · by @mqtthw\nhttps://smashy.gg/post/1\nhttps://x.com/a/status/2124429086789353494");
    expect(body).toContain("2. ice cold · by PhoenixSmash\nhttps://smashy.gg/reels/abc");
    expect(title.length).toBeLessThanOrEqual(120);
  });
  it("shortens long words", () => {
    const { body } = compilationText([{ handle: "a", tag: "a", words: "x".repeat(200), smashyUrl: "https://smashy.gg/post/1", videoUrl: null }], new Date("2026-11-30T11:00:00Z"));
    expect(body).toMatch(/x{79}… · by @a/);
  });
});
