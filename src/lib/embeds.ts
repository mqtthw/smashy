// Turn a pasted link into something we can show: an embedded player (YouTube, Twitch,
// Streamable) or a plain link card (X, Medal, anything else). Shared by server and browser.
//
// We only embed players from an allowlist, using each site's official embed URL. X and Medal
// are shown as link cards: X embeds need X's tracking script, and Medal's embed format isn't
// officially documented.

export type Embed =
  | { kind: "player"; provider: "YouTube" | "Twitch" | "Streamable"; src: string; needsTwitchParent: boolean; href: string }
  | { kind: "link"; provider: string; href: string; host: string };

function parse(url: string): URL | null {
  try {
    const u = new URL(url);
    return u.protocol === "https:" ? u : null;
  } catch {
    return null;
  }
}

/** "1m30s" / "90" / "90s" -> seconds */
function youtubeStart(t: string | null): number {
  if (!t) return 0;
  if (/^\d+$/.test(t)) return Number(t);
  const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  return m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : 0;
}

export function toEmbed(url: string): Embed | null {
  const u = parse(url);
  if (!u) return null;
  const host = u.hostname.replace(/^www\.|^m\./, "");
  const href = u.toString();

  // YouTube (privacy-enhanced embed domain)
  let yt: string | null = null;
  if (host === "youtu.be") yt = u.pathname.slice(1);
  else if (host === "youtube.com") {
    if (u.pathname === "/watch") yt = u.searchParams.get("v");
    else yt = u.pathname.match(/^\/(?:shorts|embed|live)\/([^/?]+)/)?.[1] ?? null;
  }
  if (yt && /^[A-Za-z0-9_-]{6,20}$/.test(yt)) {
    const start = youtubeStart(u.searchParams.get("t") ?? u.searchParams.get("start"));
    return { kind: "player", provider: "YouTube", src: `https://www.youtube-nocookie.com/embed/${yt}${start ? `?start=${start}` : ""}`, needsTwitchParent: false, href };
  }

  // Twitch clips and VODs (Twitch requires a "parent" = the site's hostname, added at render time)
  let clip: string | null = null;
  if (host === "clips.twitch.tv") clip = u.pathname.slice(1).split("/")[0];
  else if (host === "twitch.tv") clip = u.pathname.match(/^\/[^/]+\/clip\/([^/?]+)/)?.[1] ?? null;
  if (clip && /^[A-Za-z0-9_-]{4,120}$/.test(clip)) {
    return { kind: "player", provider: "Twitch", src: `https://clips.twitch.tv/embed?clip=${clip}&autoplay=false`, needsTwitchParent: true, href };
  }
  const vod = host === "twitch.tv" ? u.pathname.match(/^\/videos\/(\d+)/)?.[1] : null;
  if (vod) {
    return { kind: "player", provider: "Twitch", src: `https://player.twitch.tv/?video=${vod}&autoplay=false`, needsTwitchParent: true, href };
  }

  // Streamable
  const st = host === "streamable.com" ? u.pathname.match(/^\/(?:e\/)?([A-Za-z0-9]{3,20})$/)?.[1] : null;
  if (st) return { kind: "player", provider: "Streamable", src: `https://streamable.com/e/${st}`, needsTwitchParent: false, href };

  // Link cards
  const named: Record<string, string> = { "x.com": "X", "twitter.com": "X", "medal.tv": "Medal", "docs.google.com": "Google Docs", "github.com": "GitHub" };
  return { kind: "link", provider: named[host] ?? host, href, host };
}

/**
 * The player for the first video link in a post's text (YouTube, Twitch or Streamable), or null.
 * Links inside ||spoiler|| bars don't count: the player would give them away.
 */
export function firstPlayerLink(text: string): Extract<Embed, { kind: "player" }> | null {
  return playerLinks(text, 1)[0] ?? null;
}

/**
 * The players for the video links in a post's text, in order, at most `max` (round 450: up to 3 per
 * post). Repeats of the same video count once; links inside ||spoiler|| bars don't count.
 */
export function playerLinks(text: string, max = 3): Extract<Embed, { kind: "player" }>[] {
  const visible = text.replace(/\|\|[^|\n]{1,300}\|\|/g, " ");
  const out: Extract<Embed, { kind: "player" }>[] = [];
  for (const m of visible.matchAll(/https:\/\/[^\s<]+[^\s<.,:;"')\]!?]/g)) {
    const e = toEmbed(m[0]);
    if (e?.kind === "player" && !out.some((o) => o.src === e.src)) out.push(e);
    if (out.length >= max) break;
  }
  return out;
}

/** The tweet id in an X or Twitter link ("x.com/LiquidHbox/status/123"), or null. */
export function tweetIdFrom(url: string): string | null {
  const u = parse(url);
  if (!u) return null;
  const host = u.hostname.replace(/^www\.|^m\.|^mobile\./, "");
  if (host !== "x.com" && host !== "twitter.com") return null;
  return u.pathname.match(/^\/(?:[A-Za-z0-9_]{1,15}|i\/web)\/status(?:es)?\/(\d{5,25})(?:\/|$)/)?.[1] ?? null;
}

/**
 * The tweets linked in a post's text, in order, at most `max` (round 622: they show as cards). Repeats
 * count once; links inside ||spoiler|| bars don't count.
 */
export function tweetLinks(text: string, max = 2): { id: string; href: string }[] {
  const visible = text.replace(/\|\|[^|\n]{1,300}\|\|/g, " ");
  const out: { id: string; href: string }[] = [];
  for (const m of visible.matchAll(/https:\/\/[^\s<]+[^\s<.,:;"')\]!?]/g)) {
    const id = tweetIdFrom(m[0]);
    if (id && !out.some((o) => o.id === id)) out.push({ id, href: m[0] });
    if (out.length >= max) break;
  }
  return out;
}

/**
 * The post's text without the links that already show as a player or a tweet card below it (round 841),
 * but only a link alone on its line: one inside a sentence stays, so the sentence still reads. A thread
 * showed "www.youtube.com/watch?v=…" in red right above the same video.
 */
export function withoutEmbeddedLinkLines(text: string, maxPlayers = 3, maxTweets = 2): string {
  const players = new Set(playerLinks(text, maxPlayers).map((p) => p.src));
  const tweets = new Set(tweetLinks(text, maxTweets).map((t) => t.href));
  const kept = text.split("\n").filter((line) => {
    const url = line.trim();
    if (!/^https:\/\/\S+$/.test(url)) return true;
    if (tweets.has(url)) return false;
    const e = toEmbed(url);
    return !(e?.kind === "player" && players.has(e.src));
  });
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// Link previews of posts (round 459)
/** The id of the first Twitch clip linked in the text (outside ||spoilers||), or null. */
export function twitchClipIdIn(text: string): string | null {
  for (const p of playerLinks(text, 3)) {
    const id = p.provider === "Twitch" ? new URL(p.src).searchParams.get("clip") : null;
    if (id) return id;
  }
  return null;
}

/** The text with its links taken out (they read badly in a preview). */
export function withoutLinks(text: string): string {
  return text.replace(/https?:\/\/\S+/g, " ").replace(/\s+/g, " ").trim();
}
