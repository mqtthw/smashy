import { describe, expect, it } from "vitest";
import { firstPlayerLink } from "@/lib/embeds";

describe("firstPlayerLink", () => {
  it("finds a YouTube link anywhere in a post", () => {
    expect(firstPlayerLink("Full set here: https://www.youtube.com/watch?v=dQw4w9WgXcQ enjoy")?.src).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(firstPlayerLink("https://youtu.be/dQw4w9WgXcQ?t=90")?.src).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=90");
  });
  it("skips links that aren't players and takes the first player", () => {
    expect(firstPlayerLink("bracket https://start.gg/tournament/x then https://youtu.be/dQw4w9WgXcQ.")?.provider).toBe("YouTube");
  });
  it("ignores a link hidden in ||spoiler|| bars", () => {
    expect(firstPlayerLink("Winner: ||https://youtu.be/dQw4w9WgXcQ||")).toBeNull();
  });
  it("is null without a video link", () => {
    expect(firstPlayerLink("no links here")).toBeNull();
    expect(firstPlayerLink("http://youtu.be/dQw4w9WgXcQ")).toBeNull(); // https only, like the player
  });
});
