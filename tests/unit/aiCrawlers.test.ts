import { describe, expect, it } from "vitest";
import { isAiTrainingCrawler } from "@/lib/guestPages";
import { hasAuthCookie } from "@/lib/supabase/proxy";

describe("AI training crawlers (round 655)", () => {
  it("recognizes the training crawlers", () => {
    for (const ua of [
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot",
      "meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)",
      "Mozilla/5.0 (compatible; Amazonbot/0.1; +https://developer.amazon.com/support/amazonbot)",
      "CCBot/2.0 (https://commoncrawl.org/faq/)",
    ]) expect(isAiTrainingCrawler(ua), ua).toBe(true);
  });
  it("lets people, search engines, AI search and link previews through", () => {
    for (const ua of [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)",
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-User/1.0; +Claude-User@anthropic.com)",
      "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      null,
    ]) expect(isAiTrainingCrawler(ua), String(ua)).toBe(false);
  });
});

describe("login cookie check", () => {
  it("finds Supabase's login cookie, whole or split", () => {
    expect(hasAuthCookie(["sb-pemwbclxvdjqbyomumjc-auth-token"])).toBe(true);
    expect(hasAuthCookie(["theme", "sb-pemwbclxvdjqbyomumjc-auth-token.0", "sb-pemwbclxvdjqbyomumjc-auth-token.1"])).toBe(true);
    expect(hasAuthCookie([])).toBe(false);
    expect(hasAuthCookie(["smashy-lang", "theme", "__vercel_toolbar"])).toBe(false);
  });
});
