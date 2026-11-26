// The Smashy icons and the wordmark for link previews (round 861): a white S on a red tile, and the
// word "Smashy" in Source Sans 3 Black, the same plain type wordmark the site shows (components/Logo.tsx).
// Used by app/icon.tsx (browser tab), app/apple-icon.tsx, the home-screen icons and lib/ogCard.tsx.
// The old flame-S pictures are still in assets/logo/ (the store apps' own icon is built from them).
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CSSProperties } from "react";
import { ImageResponse } from "next/og";

export const TILE = "#0f1419"; // the background of link previews
/** The logo red (globals.css --logo, night value: it sits on the dark preview cards). */
export const LOGO_RED = "#ff5440";
/** The icon tile's red (globals.css --logo, day value: white reads best on it). */
const ICON_RED = "#d4231a";

// Read once at module scope (the file never changes).
const blackFont = readFile(join(process.cwd(), "assets/fonts/SourceSans3-Black.woff"));

/** The font entry for next/og, for any image that shows the wordmark or the S. */
export async function wordmarkFont() {
  return { name: "Wordmark", data: await blackFont, weight: 900 as const, style: "normal" as const };
}

/** The word "Smashy" for inside a next/og image, `size` pixels tall (cap height about 0.66 of it). */
export function Wordmark({ size, color = LOGO_RED }: { size: number; color?: string }) {
  const style: CSSProperties = { display: "flex", fontFamily: "Wordmark", fontWeight: 900, fontSize: size, lineHeight: 1, letterSpacing: -size * 0.035, color };
  return <div style={style}>Smashy</div>;
}

/** A white S on a red square. `scale` is how much of the tile the S fills (smaller for Android's round crops). */
async function tileImage(size: number, radius: number, scale: number) {
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: ICON_RED, borderRadius: radius }}>
        <div style={{ display: "flex", fontFamily: "Wordmark", fontWeight: 900, fontSize: size * scale, lineHeight: 1, color: "#ffffff", marginTop: -size * scale * 0.08 }}>S</div>
      </div>
    ),
    { width: size, height: size, fonts: [await wordmarkFont()] },
  );
}

/**
 * The app icon at any size.
 * `maskable` = the version with a smaller S and more room around it, for Android's round crops.
 */
export async function renderIcon(size: number, rounded: boolean, maskable = false) {
  return tileImage(size, rounded ? size * 0.22 : 0, maskable ? 0.62 : 0.86);
}

/** The browser tab icon: the same red tile with rounded corners, so it reads on light and dark tab bars. */
export async function renderMark(size: number) {
  return tileImage(size, size * 0.2, 0.9);
}
