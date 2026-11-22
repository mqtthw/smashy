// The Smashy app icon (dark red tile with the flame S), the S on its own, and the logo picture for
// link previews. Used by app/icon.tsx (browser tab: the S alone), app/apple-icon.tsx, the home-screen icons, and lib/ogCard.tsx.
// next/og can't draw the logo's flame texture itself, so these place finished pictures instead:
// PNG files in assets/logo/ (see the README there for how to remake them).
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const TILE = "#0f1419"; // matches the app's dark text color; the background of link previews

// Read once at module scope (the files never change).
const tilePng = readFile(join(process.cwd(), "assets/logo/tile.png"));
const maskablePng = readFile(join(process.cwd(), "assets/logo/tile-maskable.png"));
const markPng = readFile(join(process.cwd(), "assets/logo/mark.png"));
const wordmarkPng = readFile(join(process.cwd(), "assets/logo/wordmark.png"));

const dataUrl = (png: Buffer) => `data:image/png;base64,${png.toString("base64")}`;

/** The wordmark's shape: width divided by height. */
export const WORDMARK_RATIO = 1059 / 279;

/** The "SMASHY" wordmark as a picture (data URL, see-through background) for use inside a bigger image. */
export async function logoWordmark() {
  return dataUrl(await wordmarkPng);
}

/** Just the S (flame fill, white band), as a picture (data URL, see-through background). */
export async function logoMark() {
  return dataUrl(await markPng);
}

/**
 * The app icon at any size.
 * `maskable` = the version with a smaller S and more room around it, for Android's round crops.
 */
export async function renderIcon(size: number, rounded: boolean, maskable = false) {
  const src = dataUrl(await (maskable ? maskablePng : tilePng));
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: "flex" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- next/og draws plain <img> */}
        <img src={src} alt="" width={size} height={size} style={{ borderRadius: rounded ? size * 0.22 : 0 }} />
      </div>
    ),
    { width: size, height: size },
  );
}

/**
 * Just the S, filling the square, on a see-through background: the browser tab icon. At 16 pixels
 * the S on its dark tile was hard to make out, especially on a dark tab bar; the S's own white band
 * and dark outline keep it readable on light and dark tabs alike.
 */
export async function renderMark(size: number) {
  const src = dataUrl(await markPng);
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: "flex" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- next/og draws plain <img> */}
        <img src={src} alt="" width={size} height={size} />
      </div>
    ),
    { width: size, height: size },
  );
}
