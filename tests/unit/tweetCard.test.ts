// Tweets linked in posts (round 622): finding them in a post, and turning X's tweet data into the card.
import { describe, expect, it } from "vitest";
import { tweetIdFrom, tweetLinks } from "@/lib/embeds";
import { toTweetCard, tweetDataUrl } from "@/lib/tweetCard";

describe("finding tweet links", () => {
  it("reads x.com, twitter.com and mobile links, with or without tracking bits", () => {
    expect(tweetIdFrom("https://x.com/liquidhbox/status/2123597283744751976?a=Nc&s=46")).toBe("2123597283744751976");
    expect(tweetIdFrom("https://twitter.com/LiquidHbox/status/123456789")).toBe("123456789");
    expect(tweetIdFrom("https://mobile.twitter.com/a_b/status/123456789/photo/1")).toBe("123456789");
    expect(tweetIdFrom("https://x.com/i/web/status/123456789")).toBe("123456789");
  });
  it("ignores profiles, other sites and plain http", () => {
    expect(tweetIdFrom("https://x.com/LiquidHbox")).toBeNull();
    expect(tweetIdFrom("https://notx.com/a/status/123456789")).toBeNull();
    expect(tweetIdFrom("http://x.com/a/status/123456789")).toBeNull();
  });
  it("takes up to two, once each, and skips ones inside a spoiler", () => {
    const text = "look https://x.com/a/status/111111 and https://twitter.com/a/status/111111 ||https://x.com/b/status/222222|| https://x.com/c/status/333333. https://x.com/d/status/444444";
    expect(tweetLinks(text)).toEqual([
      { id: "111111", href: "https://x.com/a/status/111111" },
      { id: "333333", href: "https://x.com/c/status/333333" },
    ]);
  });
});

describe("the tweet card", () => {
  const raw = {
    __typename: "Tweet",
    id_str: "2123597283744751976",
    created_at: "2026-11-20T02:00:21.000Z",
    text: "Above the Summit 🏔️ &amp; more https://t.co/abc https://t.co/pic",
    display_text_range: [0, 47],
    entities: { urls: [{ url: "https://t.co/abc", expanded_url: "https://smashy.gg/events" }], media: [{ url: "https://t.co/pic" }] },
    user: { name: "hungrybox", screen_name: "LiquidHbox", profile_image_url_https: "https://pbs.twimg.com/profile_images/1/a_normal.jpg" },
    mediaDetails: [{ type: "photo", media_url_https: "https://pbs.twimg.com/media/X.jpg", original_info: { width: 1080, height: 1350 } }],
  };

  it("keeps the words, real links, the author and the photo", () => {
    expect(toTweetCard(raw)).toEqual({
      id: "2123597283744751976",
      name: "hungrybox",
      handle: "LiquidHbox",
      avatar: "https://pbs.twimg.com/profile_images/1/a_bigger.jpg",
      text: "Above the Summit 🏔️ & more https://smashy.gg/events",
      createdAt: "2026-11-20T02:00:21.000Z",
      picture: { url: "https://pbs.twimg.com/media/X.jpg?name=medium", width: 1080, height: 1350, video: false },
    });
  });
  it("marks a video's picture", () => {
    const card = toTweetCard({ ...raw, mediaDetails: [{ ...raw.mediaDetails[0], type: "video" }] });
    expect(card?.picture?.video).toBe(true);
  });
  it("gives null for deleted tweets and data it doesn't know", () => {
    expect(toTweetCard({ __typename: "TweetTombstone" })).toBeNull();
    expect(toTweetCard(null)).toBeNull();
    expect(toTweetCard({ __typename: "Tweet", id_str: "1" })).toBeNull();
  });
  it("only shows pictures from X's own image server", () => {
    const card = toTweetCard({ ...raw, mediaDetails: [{ type: "photo", media_url_https: "https://evil.example/x.jpg", original_info: { width: 1, height: 1 } }] });
    expect(card?.picture).toBeNull();
  });
  it("asks X's tweet data address with the id and its token", () => {
    expect(tweetDataUrl("2123597283744751976")).toMatch(/^https:\/\/cdn\.syndication\.twimg\.com\/tweet-result\?id=2123597283744751976&lang=en&token=\w+$/);
  });
});
