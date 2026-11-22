// The limit on how fast a signed-out visitor may open pages that read start.gg (it stops crawlers
// from using up the site's start.gg allowance).
import { beforeEach, describe, expect, it } from "vitest";
import { GUEST_PAGES, GUEST_PAGES_WINDOW_MS, countsAsGuestPage, crawlerOffLimits, isCrawler, readsOutside, resetGuestPages, takeGuestPage, notABrowser } from "@/lib/guestPages";

const T0 = 1_800_000_000_000;
const noHeaders = () => null;

beforeEach(resetGuestPages);

describe("which pages read start.gg when opened", () => {
  it("covers outside brackets, tournaments, their calendar files, weeklies and set pages", () => {
    for (const path of ["/brackets/startgg/1616744", "/brackets/parrygg/abc-123", "/events/genesis-x4", "/events/port-priority-dx/calendar.ics", "/events/weekly/smash-honor--oxford", "/sets/startgg/98765"]) {
      expect(readsOutside(path), path).toBe(true);
    }
  });

  it("leaves Smashy's own pages alone", () => {
    for (const path of ["/", "/events", "/brackets", "/host/3f2a/bracket", "/host/3f2a", "/u/mango", "/reels/abc", "/games/ultimate/roy", "/players/222927", "/search", "/api/errors"]) {
      expect(readsOutside(path), path).toBe(false);
    }
  });
});

describe("which requests count", () => {
  it("counts a signed-out visitor opening a bracket", () => {
    expect(countsAsGuestPage("/brackets/startgg/1616744", false, noHeaders)).toBe(true);
    
  });

  it("counts a browser loading the whole page, and a crawler that says nothing about itself", () => {
    expect(countsAsGuestPage("/events/genesis-x4", false, (n) => (n === "sec-fetch-dest" ? "document" : null))).toBe(true);
    expect(countsAsGuestPage("/events/genesis-x4", false, noHeaders)).toBe(true);
  });

  it("doesn't count members, moving around inside the site, link preloading, or other pages", () => {
    expect(countsAsGuestPage("/brackets/startgg/1616744", true, noHeaders)).toBe(false); // a verified login
    expect(countsAsGuestPage("/events/genesis-x4", false, (n) => (n === "sec-fetch-dest" ? "empty" : null))).toBe(false);
    expect(countsAsGuestPage("/events/genesis-x4", false, (n) => (n === "sec-purpose" ? "prefetch;prerender" : null))).toBe(false);
    expect(countsAsGuestPage("/events", false, noHeaders)).toBe(false);
  });
});

describe("the limit for one address", () => {
  it("lets a visitor open pages up to the limit, then refuses until the window passes", () => {
    for (let i = 0; i < GUEST_PAGES; i++) expect(takeGuestPage("1.2.3.4", T0 + i * 1000)).toEqual({ ok: true, left: GUEST_PAGES - i - 1 });
    expect(takeGuestPage("1.2.3.4", T0 + 60_000)).toEqual({ ok: false, left: 0 });
    expect(takeGuestPage("1.2.3.4", T0 + 61_000).ok).toBe(false); // being refused doesn't use more up
    expect(takeGuestPage("1.2.3.4", T0 + GUEST_PAGES_WINDOW_MS + 1).ok).toBe(true); // the first ones have aged out
  });

  it("counts each address by itself", () => {
    for (let i = 0; i < GUEST_PAGES; i++) takeGuestPage("1.2.3.4", T0);
    expect(takeGuestPage("1.2.3.4", T0).ok).toBe(false);
    expect(takeGuestPage("5.6.7.8", T0).ok).toBe(true);
  });
});

describe("crawlers and the pages robots.txt keeps them out of", () => {
  it("knows crawlers by the names they give themselves", () => {
    for (const ua of [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)",
      "Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
      "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)",
      "Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)",
      "meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)",
      "CCBot/2.0 (https://commoncrawl.org/faq/)",
      "python-requests/2.32.3",
    ]) {
      expect(isCrawler(ua), ua).toBe(true);
    }
  });

  it("lets people, and the link previews made when they share a bracket, through", () => {
    for (const ua of [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (Linux; Android 13; CUBOT NOTE 21) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36", // a phone brand, not a bot
      "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
      "Twitterbot/1.0",
      "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      "",
    ]) {
      expect(isCrawler(ua), ua).toBe(false);
    }
    expect(isCrawler(null)).toBe(false);
  });

  it("keeps them out of brackets from other sites, set pages, player lookups and calendar files only", () => {
    for (const path of ["/brackets/startgg/1616744", "/brackets/startgg/1616744/top8.png", "/sets/startgg/98765/opengraph-image", "/sets/startgg/98765", "/players/222927", "/events/port-priority-dx/calendar.ics", "/host/3f2a/calendar.ics"]) expect(crawlerOffLimits(path), path).toBe(true);
    for (const path of ["/", "/events", "/events/genesis-x4", "/events/weekly/smash-honor--oxford", "/host/3f2a", "/host/3f2a/bracket", "/brackets", "/u/mango", "/games/ultimate/roy"]) expect(crawlerOffLimits(path), path).toBe(false);
  });
});

describe("notABrowser (round 475)", () => {
  const h = (map: Record<string, string>) => (name: string) => map[name] ?? null;
  const chrome = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";
  it("lets real page loads through (browsers mark them)", () => {
    expect(notABrowser(chrome, h({ "sec-fetch-dest": "document", "sec-fetch-mode": "navigate" }))).toBe(false);
  });
  it("turns away a scraper posing as a browser without the marks", () => {
    expect(notABrowser(chrome, h({}))).toBe(true);
    expect(notABrowser(null, h({}))).toBe(true);
  });
  it("lets link previews through by name", () => {
    expect(notABrowser("Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)", h({}))).toBe(false);
    expect(notABrowser("facebookexternalhit/1.1", h({}))).toBe(false);
  });
});
