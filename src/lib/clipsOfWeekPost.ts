// "Clips of the week" as a weekly post (round 843, Matthew: "the clips of the week should be a thing
// that is posted at the end of the week as a compilation"). Every Monday the daily job posts a thread
// from @smashyhq with the past 7 days' most liked clips, crediting each player. It replaced the
// "Clips of the week" box at the top of the Feed. The words and the week's label are plain logic, so
// they can be tested; the reading and posting are in postClipsOfWeek.
import { tweetLinks, toEmbed, withoutLinks } from "./embeds";

/** The account that posts it. */
export const CLIPS_POST_HANDLE = "smashyhq";
/** Every compilation's title starts with this; the weekly pick leaves these posts out (they hold clips too). */
export const CLIPS_POST_TITLE = "Clips of the week";
/** How many clips go in one post. */
export const CLIPS_POST_COUNT = 5;

export type CompilationClip = {
  /** The player's handle on Smashy (credited with @), or null for a stream channel. */
  handle: string | null;
  /** Their tag, or the channel's name. */
  tag: string;
  /** What the clip's post said, or the clip's title. */
  words: string;
  /** The clip's own address on Smashy (a post or a Reels page), as a full link. */
  smashyUrl: string;
  /** The video link in the clip's post (YouTube, Twitch, X…), so it plays in the compilation; null for an uploaded video or a Reels clip. */
  videoUrl: string | null;
};

/** "Nov 24–30" (or "Nov 28 – Dec 4"): the 7 days before `now`, in UTC. */
export function weekLabel(now: Date): string {
  const end = new Date(now.getTime() - 86400e3);
  const start = new Date(now.getTime() - 7 * 86400e3);
  const month = (d: Date) => d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  return month(start) === month(end)
    ? `${month(start)} ${start.getUTCDate()}–${end.getUTCDate()}`
    : `${month(start)} ${start.getUTCDate()} – ${month(end)} ${end.getUTCDate()}`;
}

/** The first link in a post that plays as a video or shows as a tweet card, as written. */
export function videoLinkIn(body: string): string | null {
  const tweet = tweetLinks(body, 1)[0];
  for (const m of body.matchAll(/https:\/\/[^\s<]+[^\s<.,:;"')\]!?]/g)) {
    if (toEmbed(m[0])?.kind === "player") return m[0];
    if (tweet && m[0] === tweet.href) return m[0];
  }
  return null;
}

/** The post's title and text. Each clip: number, what it said (shortened), who to credit, and its links. */
export function compilationText(clips: CompilationClip[], now: Date): { title: string; body: string } {
  const title = `${CLIPS_POST_TITLE} · ${weekLabel(now)}`;
  const short = (s: string) => {
    const one = withoutLinks(s);
    return one.length > 80 ? `${one.slice(0, 79).trimEnd()}…` : one;
  };
  const parts = clips.map((c, i) => {
    const who = c.handle ? `@${c.handle}` : c.tag;
    const said = short(c.words);
    const lines = [`${i + 1}. ${said ? `${said} · ` : ""}by ${who}`, c.smashyUrl];
    if (c.videoUrl) lines.push(c.videoUrl);
    return lines.join("\n");
  });
  const body = [
    "The most liked clips on Smashy this week, picked by your likes. Post your own clips to be in next week's!",
    ...parts,
  ].join("\n\n");
  return { title, body };
}
