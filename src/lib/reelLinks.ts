// Links and players for Reels clips. Safe to use in the browser (no keys here).

export type ReelPlatform = "twitch" | "youtube";

/** The channel's page on Twitch or YouTube. */
export function channelUrl(c: { platform: ReelPlatform; login: string }) {
  return c.platform === "youtube" ? `https://www.youtube.com/channel/${encodeURIComponent(c.login)}` : `https://www.twitch.tv/${encodeURIComponent(c.login)}`;
}

/** The clip on Twitch, or the Short on YouTube. */
export function clipUrl(r: { platform: ReelPlatform; clipId: string }) {
  return r.platform === "youtube" ? `https://www.youtube.com/shorts/${encodeURIComponent(r.clipId)}` : `https://clips.twitch.tv/${encodeURIComponent(r.clipId)}`;
}

/**
 * Reads a pasted Twitch clip or YouTube link. Accepts:
 *   clips.twitch.tv/<slug>, twitch.tv/<channel>/clip/<slug>, m.twitch.tv/clip/<slug>
 *   youtube.com/shorts/<id>, youtu.be/<id>, youtube.com/watch?v=<id>
 * Null if it isn't one of those.
 */
export function parseClipLink(input: string): { platform: ReelPlatform; clipId: string } | null {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, "");
  const parts = url.pathname.split("/").filter(Boolean);
  const slug = (s: string | null | undefined) => (s && /^[A-Za-z0-9_-]{3,100}$/.test(s) ? s : null);
  const ytId = (s: string | null | undefined) => (s && /^[A-Za-z0-9_-]{11}$/.test(s) ? s : null);

  let clipId: string | null = null;
  if (host === "clips.twitch.tv") {
    clipId = parts[0] === "embed" ? slug(url.searchParams.get("clip")) : slug(parts[0]);
    return clipId ? { platform: "twitch", clipId } : null;
  }
  if (host === "twitch.tv") {
    const at = parts.indexOf("clip");
    clipId = at >= 0 ? slug(parts[at + 1]) : null;
    return clipId ? { platform: "twitch", clipId } : null;
  }
  if (host === "youtu.be") clipId = ytId(parts[0]);
  else if (host === "youtube.com") {
    if (parts[0] === "shorts") clipId = ytId(parts[1]);
    else if (parts[0] === "watch") clipId = ytId(url.searchParams.get("v"));
  }
  return clipId ? { platform: "youtube", clipId } : null;
}

export const platformName =(p: ReelPlatform) => (p === "youtube" ? "YouTube" : "Twitch");

/**
 * The player's address. Twitch needs this site's hostname ("parent"). YouTube's player comes from
 * youtube-nocookie.com, YouTube's privacy-enhanced mode: no tracking cookies until someone presses
 * play. Shorts loop like they do on YouTube.
 */
/**
 * The player's address. `feed` (Reels): YouTube Shorts don't loop and report when they end (so the
 * next clip can start); on a clip's own page they loop.
 */
export function embedUrl(r: { platform: ReelPlatform; clipId: string }, hostname: string, autoplay: boolean, feed = false, muted = autoplay) {
  const id = encodeURIComponent(r.clipId);
  if (r.platform === "youtube") {
    const q = new URLSearchParams({
      playsinline: "1",
      rel: "0",
      ...(feed ? { enablejsapi: "1" } : { loop: "1", playlist: r.clipId }),
      ...(autoplay ? { autoplay: "1" } : {}),
      ...(muted ? { mute: "1" } : {}),
    });
    return `https://www.youtube-nocookie.com/embed/${id}?${q}`;
  }
  return `https://clips.twitch.tv/embed?clip=${id}&parent=${hostname}&autoplay=${autoplay}&muted=${muted}`;
}

/**
 * The first Twitch clip or YouTube link in a post's text that Reels could take (round 460: "Also share
 * to Reels" in the post box). Links inside ||spoiler|| bars don't count.
 */
export function firstClipLinkIn(text: string): string | null {
  const visible = text.replace(/\|\|[^|\n]{1,300}\|\|/g, " ");
  for (const m of visible.matchAll(/https?:\/\/[^\s<]+[^\s<.,:;"')\]!?]/g)) if (parseClipLink(m[0])) return m[0];
  return null;
}
