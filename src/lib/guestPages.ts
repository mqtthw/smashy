// A limit on how fast one visitor who isn't signed in may open the pages that read start.gg.
//
// Why: opening a bracket, a tournament or a weekly asks start.gg for data, and start.gg allows the
// whole site 80 requests a minute. On the day smashy.gg went live, crawlers walked bracket page
// after bracket page and used the allowance up, so members got "start.gg is busy" on their own
// pages. A person browsing never gets near this limit; one address opening page after page does,
// and gets "429 Too Many Requests" with a time to come back, which crawlers understand.
//
// Counted in this server's memory (like the other per-address limits), so it's approximate across
// servers: the live site runs two or three, each with its own count, so the real ceiling is two or
// three times the number below. Enough to stop a runaway. Nothing is stored about anyone.
// Signed-in members aren't limited.
//
// The limit alone didn't stop that day's crawlers, though: they were slow (a page every couple of
// minutes each) and the cost was in the pages, since one bracket can take dozens of start.gg
// requests. So crawlers that say they're crawlers are also turned away from the pages robots.txt
// asks them to skip (`crawlerOffLimits`), which costs nothing and takes effect at once.

/** Pages one address may open per window, signed out. */
export const GUEST_PAGES = 40;
export const GUEST_PAGES_WINDOW_MS = 5 * 60_000;
/** What a refused visitor is told to wait, in seconds. */
export const GUEST_PAGES_RETRY_S = 120;

/**
 * Pages whose data comes from start.gg (or parry.gg) when they're opened: brackets from other
 * sites, tournament pages and their calendar files, predicted weeklies, and set pages. Smashy's own
 * pages (hosted events and their brackets, the feed, profiles) aren't here: they only read Smashy.
 */
export function readsOutside(path: string): boolean {
  return (
    /^\/brackets\/[^/]+\/[^/]+\/?$/.test(path) ||
    /^\/sets\/[^/]+\/[^/]+\/?$/.test(path) ||
    /^\/events\/weekly\/[^/]+\/?$/.test(path) ||
    /^\/events\/[^/]+(\/calendar\.ics)?\/?$/.test(path)
  );
}

/**
 * The pages robots.txt keeps crawlers out of because each one costs start.gg requests: brackets
 * from other sites, set pages, player lookups and calendar files. (Tournament and weekly pages
 * stay open to search engines.)
 */
export function crawlerOffLimits(path: string): boolean {
  // Round 656: and their share pictures (a set's card, an event's Top 8 graphic). In the week to Nov 21
  // something walked ~1,900 set cards, each drawn from scratch; link previews and browsers showing the
  // graphic on a page still get them.
  return /^\/(brackets|sets)\/[^/]+\/[^/]+\/?(opengraph-image|top8\.png)?$/.test(path) || /^\/players\/[^/]+\/?$/.test(path) || /\/calendar\.ics$/.test(path);
}

// Fetchers that build a link preview when someone shares a link (Discord, X, Slack and so on):
// they call themselves bots, but they're a person sharing a bracket, so they're let through.
const LINK_PREVIEW = /discordbot|twitterbot|slackbot|slack-imgproxy|facebookexternalhit|whatsapp|telegrambot|linkedinbot|redditbot|embedly|iframely|mastodon|bluesky|skypeuripreview/i;
// Names crawlers and scrapers give themselves: "…bot/1.0", "…Bot;", crawler, spider and a few tools.
const CRAWLER = /bot[/;)]|bot$|crawler|spider|slurp|externalagent|scrapy|headlesschrome|python-requests|go-http-client/i;

/**
 * Not a browser (round 475). Every browser smashy.gg supports (Chrome, Edge, Firefox, Safari 16.4+,
 * and the apps' web views) marks a page load with "sec-fetch-dest" / "sec-fetch-mode"; scrapers that
 * pose as a browser by name almost never do. On 2026-11-17 one walked old set pages from many
 * addresses (each under the per-address limit) and used up the start.gg allowance, so guests got
 * "Player lookup is busy". Link-preview fetchers send neither mark either, so they're let through by name.
 */
export function notABrowser(userAgent: string | null, header: (name: string) => string | null): boolean {
  if (LINK_PREVIEW.test(userAgent ?? "")) return false;
  return !header("sec-fetch-dest") && !header("sec-fetch-mode");
}

/**
 * AI training crawlers (round 655). In the week to 2026-11-21 ClaudeBot, GPTBot, Meta's and Amazon's
 * crawlers opened the matchup pages ~67,000 times (people: ~700), and those pages used more CPU than
 * anything else on Smashy. They gather text to train AI models and send no visitors, so robots.txt asks
 * them to stay off the whole site and the proxy turns them away with a cheap 403. AI *search* fetchers
 * (OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot) answer a person's question
 * and can link back, so they're not on this list; neither are search engines (Googlebot, Bingbot).
 */
export const AI_TRAINING_CRAWLERS = ["GPTBot", "ClaudeBot", "anthropic-ai", "meta-externalagent", "Amazonbot", "CCBot", "Bytespider", "Applebot-Extended", "cohere-training-data-crawler", "Diffbot", "Timpibot", "ImagesiftBot", "omgili"];
const AI_TRAINING = new RegExp(AI_TRAINING_CRAWLERS.join("|"), "i");

export function isAiTrainingCrawler(userAgent: string | null): boolean {
  return AI_TRAINING.test(userAgent ?? "");
}

/** A crawler or scraper going by the name it gives itself (link-preview fetchers aren't counted as one). */
export function isCrawler(userAgent: string | null): boolean {
  const ua = userAgent ?? "";
  return !LINK_PREVIEW.test(ua) && CRAWLER.test(ua);
}

const seen = new Map<string, number[]>();

/**
 * Count one page for this address. `ok` false = it has opened too many for now (refusals don't
 * count); `left` = how many more it may open in this window.
 */
export function takeGuestPage(address: string, now: number): { ok: boolean; left: number } {
  const times = (seen.get(address) ?? []).filter((t) => now - t < GUEST_PAGES_WINDOW_MS);
  if (times.length >= GUEST_PAGES) {
    seen.set(address, times);
    return { ok: false, left: 0 };
  }
  if (seen.size > 5000) seen.clear();
  seen.set(address, [...times, now]);
  return { ok: true, left: GUEST_PAGES - times.length - 1 };
}

/**
 * Whether this request counts toward the limit, from its path and headers:
 * - only pages that read start.gg
 * - not signed-in members (a login Supabase verified; round 631: a made-up login cookie used to be enough)
 * - only whole page loads. Moving around inside the site, and the site quietly preloading the
 *   links a visitor can see, are background requests made by the page (the browser marks them
 *   "sec-fetch-dest: empty"); counting those would use a visitor's allowance up just by scrolling
 *   a list of events. Crawlers load whole pages, and most send no such mark at all.
 * - not a browser preparing a page ahead of time ("sec-purpose: prefetch")
 */
export function countsAsGuestPage(path: string, signedIn: boolean, header: (name: string) => string | null): boolean {
  if (!readsOutside(path)) return false;
  if (signedIn) return false;
  const dest = header("sec-fetch-dest");
  if (dest && dest !== "document") return false;
  if (/prefetch/i.test(header("purpose") ?? "") || /prefetch/i.test(header("sec-purpose") ?? "")) return false;
  return true;
}

/** For tests: forget every address. */
export function resetGuestPages() {
  seen.clear();
}
