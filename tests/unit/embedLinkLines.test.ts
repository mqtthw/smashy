// Links already shown as a player or tweet card aren't printed again in the post's text (round 841).
import { describe, expect, it } from "vitest";
import { withoutEmbeddedLinkLines } from "@/lib/embeds";

describe("withoutEmbeddedLinkLines", () => {
  it("drops a YouTube link alone on its line, and tidies the gap", () => {
    expect(withoutEmbeddedLinkLines("Mine: RapMonster vs Zain\nhttps://www.youtube.com/watch?v=E-YAmXmyqsc\n\nThis set was great")).toBe("Mine: RapMonster vs Zain\n\nThis set was great");
  });
  it("drops a tweet link alone on its line", () => {
    expect(withoutEmbeddedLinkLines("Steve dittos\nhttps://x.com/kactosophile/status/2124429086789353494")).toBe("Steve dittos");
  });
  it("keeps links inside a sentence, and links that don't embed", () => {
    const t = "Watch https://www.youtube.com/watch?v=E-YAmXmyqsc now";
    expect(withoutEmbeddedLinkLines(t)).toBe(t);
    expect(withoutEmbeddedLinkLines("Full results:\nhttps://smashy.gg/events/genesis-x3")).toBe("Full results:\nhttps://smashy.gg/events/genesis-x3");
  });
});
