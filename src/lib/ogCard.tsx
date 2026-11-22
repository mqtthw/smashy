// Link preview images ("Open Graph" cards): what shows up when someone pastes a Smashy link into
// iMessage, Discord, X, Instagram DMs… One shared frame (logo, label, accent bar) so every preview
// looks like Smashy; each page fills in its own middle part.
// Everything shown here must be guest-visible: build them with createGuestClient(), never the
// viewer's own client (see lib/supabase/guest.ts).
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import type { GameKey } from "./games";
import { logoMark, logoWordmark, TILE, WORDMARK_RATIO } from "./iconArt";
import { clip } from "./siteMeta";

export { clip };

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_TYPE = "image/png";

export const INK = "#e7e9ea";
export const MUTED = "#8b9197";
export const BRAND = "#ff4b33";
export const LINE = "#2f3336";
export const SURFACE = "#16181c";

/** Dark-theme game colors (same as globals.css). */
export const GAME_COLOR: Record<GameKey, string> = {
  melee: "#fb923c",
  ultimate: "#60a5fa",
  pplus: "#a78bfa",
  smash64: "#4ade80",
  brawl: "#22d3ee",
  smash4: "#f472b6",
};

const geist = readFile(join(process.cwd(), "assets/fonts/Geist-Regular.ttf"));

/**
 * Roughly how wide a line of Geist is, in ems: wide letters (W, M) count for more than narrow ones
 * (i, l), and anything outside Latin (Japanese, emoji…) as a full em. A guess, not a measurement,
 * so `oneLine` still cuts off anything that runs past.
 */
export function textEms(text: string): number {
  let ems = 0;
  for (const ch of text) {
    if ("WM@%".includes(ch)) ems += 0.95;
    else if ("mw".includes(ch)) ems += 0.85;
    else if ("ilj!.,:;'|I ".includes(ch)) ems += 0.3;
    else if (/[A-Z]/.test(ch)) ems += 0.7;
    else if (/[a-z0-9]/.test(ch)) ems += 0.57;
    else if (ch.charCodeAt(0) < 0x2000) ems += 0.65;
    else ems += 1;
  }
  return ems;
}

/** The biggest font size (between min and max) at which `text` fits in `width` pixels on one line. */
export function fitWidth(text: string, width: number, max: number, min: number): number {
  const ems = textEms(text);
  if (ems <= 0) return max;
  return Math.max(min, Math.min(max, Math.floor(width / ems)));
}

/** One line that ends in "…" if it still runs past its box (for text whose width can only be guessed). */
export const oneLine = { display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" } as const;

/** Bigger text for short titles, smaller for long ones. */
export function fitSize(text: string, sizes: [number, number][]): number {
  for (const [maxLen, size] of sizes) if (text.length <= maxLen) return size;
  return sizes[sizes.length - 1][1];
}

/** A small rounded label, e.g. a game name. */
export function Pill({ children, color }: { children: ReactNode; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", border: `2px solid ${color}`, color, borderRadius: 999, padding: "6px 20px", fontSize: 26 }}>
      {children}
    </div>
  );
}

/** A round letter avatar, like the one on the site. */
export function LetterAvatar({ name, size }: { name: string; size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size,
        background: SURFACE,
        border: `2px solid ${LINE}`,
        color: BRAND,
        fontSize: size * 0.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </div>
  );
}

type Frame = {
  /** Right side of the header, e.g. "Post" or "Melee · Set". */
  label?: string;
  accent?: string;
  /** Picture behind everything (data URL), darkened so text stays readable. */
  background?: string | null;
  children: ReactNode;
  /** How long the card is kept (default an hour on Vercel's network): see SHORT_CARD (round 634). */
  cacheControl?: string;
};

/** Default: an hour on Vercel's network, a day stale. Fine for cards of things that rarely go away. */
const CARD_CACHE = "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400";
/**
 * For posts and profiles (round 634): five minutes, so a post moderators removed, or a profile that went
 * private, stops showing in new link previews soon. `no-store` for a card drawn because a read failed.
 */
export const SHORT_CARD = "public, max-age=300, s-maxage=300, stale-while-revalidate=600";
export const NO_STORE = "no-store";

/** Renders a full 1200×630 preview card. */
export async function renderOg({ label, accent = BRAND, background, children, cacheControl = CARD_CACHE }: Frame) {
  const wordmark = await logoWordmark();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          background: TILE,
          color: INK,
          fontFamily: "Geist",
          padding: "56px 72px 56px 88px",
        }}
      >
        {background && (
          // eslint-disable-next-line @next/next/no-img-element -- next/og draws plain <img>
          <img src={background} alt="" width={1200} height={630} style={{ position: "absolute", left: 0, top: 0, width: 1200, height: 630, objectFit: "cover" }} />
        )}
        {background && (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 1200,
              height: 630,
              display: "flex",
              backgroundImage: "linear-gradient(180deg, rgba(15,20,25,0.6) 0%, rgba(15,20,25,0.55) 35%, rgba(15,20,25,0.96) 100%)",
            }}
          />
        )}
        <div style={{ position: "absolute", left: 0, top: 0, width: 16, height: 630, background: accent, display: "flex" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- next/og draws plain <img> */}
          <img src={wordmark} alt="Smashy" width={Math.round(72 * WORDMARK_RATIO)} height={72} />
          <div style={{ display: "flex", flex: 1 }} />
          {label && <Pill color={accent}>{label}</Pill>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>{children}</div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [{ name: "Geist", data: await geist, weight: 400, style: "normal" }],
      headers: { "Cache-Control": cacheControl },
    },
  );
}

/**
 * The generic card: the home page, and whenever a page's content isn't public. More flair than the
 * other cards (it's the one people see when smashy.gg itself is shared): the flaming S big on the
 * right over a fire glow, the logo's diagonal slash, a short line ("Everything Smash.") and what's
 * inside, with the three main games in their colors.
 */
export async function siteCard(cacheControl = CARD_CACHE) {
  const [wordmark, mark] = await Promise.all([logoWordmark(), logoMark()]);
  const games: [string, string][] = [["Melee", GAME_COLOR.melee], ["Ultimate", GAME_COLOR.ultimate], ["P+", GAME_COLOR.pplus]];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", overflow: "hidden", background: TILE, color: INK, fontFamily: "Geist" }}>
        {/* Fire glow behind the S, and a softer one bottom left */}
        {/* (inside the card's edges: the image drawer cuts shapes that run past them in a straight line) */}
        <div style={{ position: "absolute", left: 0, top: 0, width: 1200, height: 630, display: "flex", backgroundImage: "radial-gradient(circle 420px at 935px 305px, rgba(255,100,28,0.55) 0%, rgba(217,29,21,0.32) 40%, rgba(134,9,9,0.12) 70%, rgba(15,20,25,0) 100%)" }} />
        <div style={{ position: "absolute", left: 0, top: 0, width: 1200, height: 630, display: "flex", backgroundImage: "radial-gradient(circle 360px at 80px 690px, rgba(217,29,21,0.22) 0%, rgba(15,20,25,0) 100%)" }} />
        {/* The logo's diagonal slash, across the whole card */}
        <div style={{ position: "absolute", left: 560, top: -200, width: 14, height: 1100, display: "flex", background: "rgba(255,255,255,0.10)", transform: "rotate(30deg)" }} />
        <div style={{ position: "absolute", left: 610, top: -200, width: 4, height: 1100, display: "flex", background: "rgba(255,255,255,0.06)", transform: "rotate(30deg)" }} />
        {/* The S */}
        {/* eslint-disable-next-line @next/next/no-img-element -- next/og draws plain <img> */}
        <img src={mark} alt="" width={470} height={470} style={{ position: "absolute", left: 700, top: 70, transform: "rotate(-6deg)" }} />
        {/* Brand bar */}
        <div style={{ position: "absolute", left: 0, top: 0, width: 16, height: 630, display: "flex", backgroundImage: "linear-gradient(180deg, #ff641c 0%, #d91d15 55%, #860909 100%)" }} />

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 30, padding: "0 0 0 88px", width: 720 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- next/og draws plain <img> */}
          <img src={wordmark} alt="Smashy" width={Math.round(96 * WORDMARK_RATIO)} height={96} />
          <div style={{ display: "flex", flexDirection: "column", fontSize: 104, lineHeight: 1.0, letterSpacing: -3, color: "#ffffff" }}>
            <span>Everything</span>
            <span style={{ color: BRAND }}>Smash.</span>
          </div>
          <div style={{ display: "flex", fontSize: 32, color: MUTED, letterSpacing: -0.3 }}>Locals · Brackets · Clips · Guides</div>
          <div style={{ display: "flex", gap: 12 }}>
            {games.map(([name, color]) => (
              <div key={name} style={{ display: "flex", padding: "8px 20px", borderRadius: 9999, border: `2px solid ${color}`, color, fontSize: 26 }}>{name}</div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [{ name: "Geist", data: await geist, weight: 400, style: "normal" }],
      headers: { "Cache-Control": cacheControl },
    },
  );
}

/** Hosts we download preview pictures from (Twitch's and YouTube's image servers only). */
const IMAGE_HOSTS = [/(^|\.)jtvnw\.net$/, /(^|\.)twitch\.tv$/, /^i\d?\.ytimg\.com$/];

/** Downloads a picture for a card (e.g. a Twitch thumbnail) as a data URL; null if it fails or is slow. */
export async function fetchImage(url: string | null | undefined, timeoutMs = 3000): Promise<string | null> {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || !IMAGE_HOSTS.some((h) => h.test(u.hostname))) return null;
    const res = await fetch(u, { signal: AbortSignal.timeout(timeoutMs) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !/^image\/(jpeg|png)/.test(type)) return null; // the image drawer can't read webp
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 2_000_000) return null;
    return `data:${type.split(";")[0]};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}
