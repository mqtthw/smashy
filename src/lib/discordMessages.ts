// Discord for an event: checking a webhook link, writing the messages, and sending one.
// Plain logic (the sender takes the fetch to use), so it can be tested without touching Discord.

/** The only links accepted: a webhook on Discord's own addresses (nothing else is ever requested). */
const WEBHOOK = /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/[0-9]{5,25}\/[A-Za-z0-9_-]{20,120}$/;

/** A webhook link as pasted, tidied (query and trailing slash dropped), or null if it isn't one. */
export function readWebhook(raw: unknown): string | null {
  const text = String(raw ?? "").trim().replace(/[?#].*$/, "").replace(/\/+$/, "").replace(/^https:\/\/(ptb|canary)\.discord\.com\//, "https://discord.com/");
  return WEBHOOK.test(text) ? text : null;
}

/**
 * Text that Discord shows as typed: the characters it reads as formatting inside a line (bold,
 * italics, strike-through, code, spoilers, named links) are escaped, and an @ can't start a
 * mention. (Messages are also sent with mentions switched off; this keeps a name like "*Fox*" or
 * "@everyone" reading as the name.)
 */
export function plain(text: string): string {
  return text.replace(/([\\*_~`|\[\]])/g, "\\$1").replace(/@/g, "@\u200b");
}

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
const LIMIT = 1900; // Discord allows 2000 characters a message

const fit = (lines: string[], last: string) => {
  const out: string[] = [];
  let size = last.length + 1;
  for (const line of lines) {
    if (size + line.length + 1 > LIMIT) {
      out.push("…");
      break;
    }
    out.push(line);
    size += line.length + 1;
  }
  return [...out, last].join("\n");
};

/** Sent once when the host connects the channel, so they see it worked. */
export function connectedMessage(event: string, url: string): string {
  return `✅ Smashy is connected. **${plain(event)}** will post here when the bracket starts, when sets are called, and the results.\n<${url}>`;
}

/** The host's "post the sign-up link" button. `when` is already written out ("Fri, Nov 20, 7:00 PM CST"). */
export function signupMessage(e: { name: string; when: string; where: string; entries: number; cap: number; teams: boolean }, url: string): string {
  const who = e.teams ? "teams" : "players";
  return [`📣 **${plain(e.name)}**`, `${e.when} · ${plain(e.where)}`, `${e.entries} / ${e.cap} ${who} so far. Sign up: <${url}>`].join("\n");
}

export function startedMessage(event: string, entries: number, teams: boolean, url: string): string {
  return `🎮 **${plain(event)}** has started with ${entries} ${teams ? "teams" : "players"}. Live bracket: <${url}>`;
}

export type CalledSet = { identifier: string | null; a: string; b: string; station: string | null };

/** Sets that were just called, in one message: "Set C: Ben vs Gus → Setup 1". */
export function callsMessage(event: string, sets: CalledSet[], url: string): string {
  const lines = sets.map((s) => `**Set ${plain(s.identifier ?? "?")}**: ${plain(s.a)} vs ${plain(s.b)}${s.station ? ` → **${plain(s.station)}**` : ""}`);
  return fit([`🔔 ${plain(event)}: ${sets.length === 1 ? "you're up" : "sets called"}`, ...lines], `<${url}>`);
}

/** The top 8 (ties share a line), with a link to the full bracket. */
export function resultsMessage(event: string, placements: { id: string; place: number }[], tagOf: (id: string) => string | null, url: string, top = 8): string {
  const byPlace = new Map<number, string[]>();
  for (const p of placements) {
    if (p.place > top) continue;
    const tag = tagOf(p.id);
    if (tag) byPlace.set(p.place, [...(byPlace.get(p.place) ?? []), plain(tag)]);
  }
  const lines = [...byPlace.entries()].sort((a, b) => a[0] - b[0]).map(([place, tags]) => `${MEDAL[place] ?? `${place}.`} ${tags.join(", ")}`);
  return fit([`🏆 **${plain(event)}**: results`, ...lines], `Full bracket: <${url}>`);
}

export type SendResult = { ok: true } | { ok: false; gone: boolean };

/**
 * Post one message to a webhook. Never throws. `gone` = Discord says the webhook doesn't exist
 * anymore (it was deleted in the server's settings), so there's no point trying again.
 * Mentions are switched off: nothing Smashy posts can ping anyone. `image`: a picture to show under
 * the message (the results graphic), on Smashy's own address only.
 */
export async function postDiscord(url: string, content: string, fetcher: typeof fetch = fetch, image?: string): Promise<SendResult> {
  if (!WEBHOOK.test(url)) return { ok: false, gone: true };
  try {
    const res = await fetcher(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.slice(0, 2000), username: "Smashy", allowed_mentions: { parse: [] }, ...(image && /^https:\/\//.test(image) ? { embeds: [{ image: { url: image } }] } : {}) }),
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) return { ok: true };
    return { ok: false, gone: res.status === 404 || res.status === 401 || res.status === 403 };
  } catch {
    return { ok: false, gone: false };
  }
}
