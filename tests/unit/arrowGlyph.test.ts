// The "↗" on links that open another site (round 830): iPhones draw a bare ↗ as a blue emoji box,
// because Smashy's fonts have no arrow glyph and iOS falls back to the emoji font. Followed by U+FE0E
// ("text version, please") it's drawn as a plain arrow in the text colour, at any weight.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|css|mjs|js)$/.test(name) ? [p] : [];
  });
}

describe("the ↗ arrow (round 830)", () => {
  it("is always followed by U+FE0E, so iPhones don't draw it as an emoji", () => {
    const bare = files("src").filter((p) => /↗(?!︎)/.test(readFileSync(p, "utf8")));
    expect(bare, "add \\uFE0E right after ↗ (copy an arrow from another file)").toEqual([]);
  });
});
