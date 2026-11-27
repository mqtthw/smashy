// The Smashy icons and the wordmark for link previews. Since round 1002 the flame logo again (Matthew, 2026-11-27:
// "bring the old logo and icons back until we get an artist"; rounds 861 to 1001 drew a white S on a red tile and a
// plain type wordmark): next/og can't draw the flame texture itself, so these place the finished pictures in
// assets/logo/ (see the README there). Used by app/icon.tsx (browser tab), app/apple-icon.tsx, the home-screen
// icons and lib/ogCard.tsx. The Source Sans 3 Black font stays for the link previews' other text.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const TILE = "#1a0606"; // the background of link previews: Smashy's night oxblood (round 877)
/** The logo red (globals.css --logo, night value: it sits on the dark preview cards). */
export const LOGO_RED = "#ff5440";

// Read once at module scope (the files never change).
const blackFont = readFile(join(process.cwd(), "assets/fonts/SourceSans3-Black.woff"));
const tilePng = readFile(join(process.cwd(), "assets/logo/tile.png"));
const maskablePng = readFile(join(process.cwd(), "assets/logo/tile-maskable.png"));
const markPng = readFile(join(process.cwd(), "assets/logo/mark.png"));
const wordmarkPng = readFile(join(process.cwd(), "assets/logo/wordmark-large.png"));
const dataUrl = (png: Buffer) => `data:image/png;base64,${png.toString("base64")}`;

/** The flame wordmark's shape: width divided by height. */
export const WORDMARK_RATIO = 2118 / 558;
/** The flame wordmark as a picture (data URL, see-through background), for `Wordmark`. */
export async function logoWordmark() {
  return dataUrl(await wordmarkPng);
}
/** The app icon (the flame S on its dark tile) as a picture, for inside a bigger image. */
export async function logoTile() {
  return dataUrl(await tilePng);
}

/** The font entry for next/og, for any image that shows the wordmark or the S. */
export async function wordmarkFont() {
  return { name: "Wordmark", data: await blackFont, weight: 900 as const, style: "normal" as const };
}

/** The flame wordmark inside a next/og image, about as big as type `size` pixels tall. `src`: from logoWordmark(). */
export function Wordmark({ size, src }: { size: number; src: string }) {
  const height = Math.round(size * 0.9);
  // eslint-disable-next-line @next/next/no-img-element -- next/og draws plain <img>
  return <img src={src} alt="" height={height} width={Math.round(height * WORDMARK_RATIO)} />;
}

/** A finished picture filling the square, with rounded corners when asked. */
async function picture(png: Promise<Buffer>, size: number, radius: number) {
  const src = dataUrl(await png);
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: "flex" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- next/og draws plain <img> */}
        <img src={src} alt="" width={size} height={size} style={{ borderRadius: radius }} />
      </div>
    ),
    { width: size, height: size },
  );
}

/**
 * The app icon at any size: the flame S on its dark tile.
 * `maskable` = the version with a smaller S and more room around it, for Android's round crops.
 */
export async function renderIcon(size: number, rounded: boolean, maskable = false) {
  return picture(maskable ? maskablePng : tilePng, size, rounded ? size * 0.22 : 0);
}

/**
 * The browser tab icon: just the S, filling the square, on a see-through background. Its own white band and dark
 * outline keep it readable on light and dark tab bars.
 */
export async function renderMark(size: number) {
  return picture(markPng, size, 0);
}
