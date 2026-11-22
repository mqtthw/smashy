// The VOD library: which links are accepted, and where a VOD's set lives. Plain logic (no
// database), shared by the server and the add form.
import { toEmbed } from "./embeds";

export type VodSource = "smashy" | "startgg" | "parrygg";
export const VOD_SOURCES: VodSource[] = ["smashy", "startgg", "parrygg"];
export const VODS_PER_SET = 6;
export const VODS_PER_DAY = 20;

/**
 * A pasted link, if it's a video that can be played here: YouTube (videos, Shorts, live), Twitch
 * (VODs and clips) or Streamable. Returns the link tidied and which site it's from; anything else
 * (a channel, a playlist, another site) is null.
 */
export function readVodLink(raw: unknown): { url: string; provider: "YouTube" | "Twitch" | "Streamable" } | null {
  const text = String(raw ?? "").trim();
  if (!text || text.length > 300) return null;
  const withScheme = /^https?:\/\//i.test(text) ? text.replace(/^http:\/\//i, "https://") : `https://${text}`;
  const embed = toEmbed(withScheme);
  if (!embed || embed.kind !== "player") return null;
  const url = embed.href;
  // The database takes these addresses only; a link whose tidied form isn't one of them is refused here too.
  if (url.length > 300 || !/^https:\/\/((www|m)\.)?(youtube\.com|youtu\.be|twitch\.tv|clips\.twitch\.tv|streamable\.com)\//.test(url)) return null;
  return { url, provider: embed.provider };
}

/** The page of the set a VOD belongs to. */
export function vodSetPath(source: VodSource, setId: string): string {
  return source === "smashy" ? `/host/set/${setId}` : `/sets/${source}/${encodeURIComponent(setId)}`;
}

/** A search typed into the VOD list, safe to use in a "contains" match (% and _ are ordinary characters). */
export function vodSearchPattern(q: string): string | null {
  const text = q.replace(/\s+/g, " ").trim().slice(0, 60);
  if (text.length < 2) return null;
  return `%${text.replace(/[\\%_,()]/g, (c) => `\\${c}`)}%`;
}
