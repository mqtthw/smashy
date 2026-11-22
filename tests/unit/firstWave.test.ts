import { describe, expect, it } from "vitest";
import type { Post } from "@/lib/posts";
import { messagePush, notificationPush } from "@/lib/pushText";
import { hideInlineSpoilers } from "@/lib/spoilerText";
import { bansAllowed, bansFor, pickable, rulesFromRuleset, score, strikeOrder, winsNeeded, type StrikeRules } from "@/lib/striking";
import { buildReplyTree, hotScore } from "@/lib/threadRank";

const NOW = Date.parse("2026-11-08T12:00:00Z");
const ago = (h: number) => new Date(NOW - h * 3600_000).toISOString();

function reply(id: string, opts: Partial<Post> = {}): Post {
  return {
    id, body: id, title: null, flair: null, replyTo: null, spoiler: false, vsCharacter: null, game: "melee", character: null,
    createdAt: ago(1), editedAt: null, parentId: "thread", removedReason: null,
    author: { id: "u", tag: "u", handle: "u", homeCity: null, avatarUrl: null, main: null },
    likeCount: 0, replyCount: 0, repostCount: 0, likedByMe: false, savedByMe: false, pinned: false, repostedByMe: false,
    reactions: [], quote: null, quoteSet: null, quoteReel: null, hostedEvent: null, images: [], video: null, media: [], poll: null, card: null, ...opts,
  };
}

describe("thread ranking", () => {
  it("hot favors activity but fades with age", () => {
    const fresh = hotScore({ likeCount: 2, replyCount: 1, createdAt: ago(1) }, NOW);
    const old = hotScore({ likeCount: 2, replyCount: 1, createdAt: ago(48) }, NOW);
    const busyOld = hotScore({ likeCount: 200, replyCount: 50, createdAt: ago(48) }, NOW);
    expect(fresh).toBeGreaterThan(old);
    expect(busyOld).toBeGreaterThan(fresh);
  });

  it("builds a reply tree; orphans go to the top level", () => {
    const tree = buildReplyTree(
      [reply("a"), reply("b", { replyTo: "a" }), reply("c", { replyTo: "b" }), reply("d", { replyTo: "gone" })],
      "old",
    );
    expect(tree.map((n) => n.post.id).sort()).toEqual(["a", "d"]);
    const a = tree.find((n) => n.post.id === "a")!;
    expect(a.size).toBe(2);
    expect(a.children[0].post.id).toBe("b");
    expect(a.children[0].children[0].post.id).toBe("c");
  });

  it("sorts best (likes, then discussion), newest and oldest", () => {
    const list = [reply("x", { likeCount: 1, createdAt: ago(3) }), reply("y", { likeCount: 5, createdAt: ago(2) }), reply("z", { likeCount: 1, createdAt: ago(1) }), reply("z1", { replyTo: "z" })];
    expect(buildReplyTree(list, "best").map((n) => n.post.id)).toEqual(["y", "z", "x"]); // z has a reply, x doesn't
    expect(buildReplyTree(list, "new")[0].post.id).toBe("z");
    expect(buildReplyTree(list, "old").map((n) => n.post.id)).toEqual(["x", "y", "z"]);
  });
});

describe("stage striking", () => {
  const rules: StrikeRules = { starters: ["BF", "FD", "YS", "FoD", "PS"], counterpicks: ["DL"], pattern: "1-2-1", bans: 1, dsr: "modified", bestOf: 3 };

  it("follows the ruleset's strike pattern, or a fair fallback", () => {
    expect(strikeOrder(5, "1-2-1")).toEqual([0, 1, 1, 0]);
    expect(strikeOrder(5, "1-2-2")).toEqual([0, 1, 1, 0]); // doesn't add up to 4: fallback A-B-B-A
    expect(strikeOrder(3, null)).toEqual([0, 1]);
    expect(strikeOrder(1, "1-2-1")).toEqual([]);
  });

  it("applies DSR to the picking player", () => {
    const history = [{ stage: "FoD", winner: 1 as const }, { stage: "BF", winner: 0 as const }];
    // Modified DSR: player 1 can't go back to FoD (the last stage they won on).
    expect(pickable(rules, history, ["FD"], 1)).toEqual(["BF", "YS", "PS", "DL"]);
    // Standard DSR blocks every stage they've won on.
    expect(pickable({ ...rules, dsr: "standard" }, [...history, { stage: "YS", winner: 1 as const }], [], 1)).not.toContain("YS");
    expect(pickable({ ...rules, dsr: "none" }, history, [], 1)).toContain("FoD");
  });

  it("never lets bans leave nothing to pick, and counts wins", () => {
    expect(bansAllowed({ ...rules, starters: ["BF", "FD"], counterpicks: [], bans: 5 }, [], 1)).toBe(1);
    expect(winsNeeded(3)).toBe(2);
    expect(winsNeeded(5)).toBe(3);
    expect(score([{ stage: "a", winner: 0 }, { stage: "b", winner: 1 }, { stage: "c", winner: 0 }])).toEqual([2, 1]);
  });

  it("reads a saved ruleset with fallbacks", () => {
    const r = rulesFromRuleset({ starters: ["BF", "FD"], counterpicks: ["FD", "PS"], game1_striking: "1-1", counterpick_bans: 3, dsr: "standard", best_of: 5 }, ["X"]);
    expect(r).toEqual({ starters: ["BF", "FD"], counterpicks: ["PS"], pattern: "1-1", bans: 3, dsr: "standard", bestOf: 5, bansLong: null, bestOfLong: null });
    expect(rulesFromRuleset({}, ["A", "B"])).toMatchObject({ starters: ["A", "B"], bans: 2, dsr: "none", bestOf: 3 });
  });

  it("gives the longer sets their own number of bans when the ruleset says so", () => {
    // San Antonio Melee: best of 3 with 1 ban; best of 5 from Top 8 with no bans.
    const sa = rulesFromRuleset({ starters: ["BF", "DL", "FoD", "YS", "FD"], counterpicks: ["PS"], counterpick_bans: 1, counterpick_bans_top: 0, best_of: 3, best_of_top: 5 }, ["X"]);
    expect(sa).toMatchObject({ bans: 1, bansLong: 0, bestOf: 3, bestOfLong: 5 });
    expect(bansFor(sa, 3)).toBe(1);
    expect(bansFor(sa, 5)).toBe(0);
    expect(bansAllowed(sa, [{ stage: "BF", winner: 0 }], 1)).toBe(1); // no length given: the normal sets
    expect(bansAllowed(sa, [{ stage: "BF", winner: 0 }], 1, 3)).toBe(1);
    expect(bansAllowed(sa, [{ stage: "BF", winner: 0 }], 1, 5)).toBe(0);
    // More bans in the longer sets works too, and still never leaves nothing to pick.
    expect(bansAllowed({ ...sa, bansLong: 9 }, [], 1, 5)).toBe(5);
  });

  it("uses the same bans in every set when the longer sets have no number of their own", () => {
    const same = rulesFromRuleset({ starters: ["BF", "FD", "YS"], counterpick_bans: 1, best_of: 3, best_of_top: 5 }, ["X"]);
    expect(same).toMatchObject({ bansLong: null, bestOfLong: 5 });
    expect(bansFor(same, 5)).toBe(1);
    // A "longer" length that isn't longer than the normal sets is ignored, and so are odd values.
    expect(rulesFromRuleset({ best_of: 5, best_of_top: 3 }, ["X"]).bestOfLong).toBeNull();
    expect(rulesFromRuleset({ counterpick_bans_top: "0", best_of_top: "5" }, ["X"])).toMatchObject({ bansLong: null, bestOfLong: null });
    expect(rulesFromRuleset({ counterpick_bans_top: 99 }, ["X"]).bansLong).toBe(10);
  });
});

describe("spoilers and pushes", () => {
  it("blacks out ||inline spoilers|| where they can't be tapped", () => {
    expect(hideInlineSpoilers("who won? ||Zain|| obviously")).toBe("who won? ▒▒▒ obviously");
    expect(hideInlineSpoilers("a || b")).toBe("a || b");
  });

  it("writes short pushes and hides spoiler posts", () => {
    const base = { actor: { tag: "Mang0", handle: "mang0" }, majorName: null, majorSlug: null, conversationId: null, eventName: null, eventHref: null };
    const post = { id: "p2", parentId: "p1", body: "Grand finals ||went 3-2||", title: null, spoiler: false };
    expect(notificationPush({ ...base, type: "reply", post })).toEqual({ title: "Mang0 replied", body: "Grand finals ▒▒▒", url: "/post/p1" });
    expect(notificationPush({ ...base, type: "reply", post: { ...post, spoiler: true } })?.body).toBe("(spoiler)");
    expect(notificationPush({ ...base, type: "like", post })).toBeNull(); // likes don't push
    expect(notificationPush({ ...base, type: "follow", post: null })?.url).toBe("/u/mang0");
    expect(messagePush({ senderTag: "Hbox", body: "", hasImage: true, conversationId: "c1", groupTitle: null })).toEqual({ title: "Hbox", body: "Sent a photo", url: "/messages/c1", tag: "chat-c1" });
  });
});

describe("round 8: spoiler snippets and muted titles", () => {
  it("never shows a spoiler post's text in previews", async () => {
    const { safeSnippet } = await import("@/lib/spoilerText");
    expect(safeSnippet({ body: "Zain won", spoiler: true })).toBe("(spoiler)");
    expect(safeSnippet({ title: "Who won? ||Zain||", body: "x" })).toBe("Who won? ▒▒▒");
    expect(safeSnippet({ body: "plain" })).toBe("plain");
  });
  it("muted words also match thread titles and quoted titles", async () => {
    const { hasMutedWord } = await import("@/lib/posts");
    expect(hasMutedWord({ title: "Genesis spoilers inside", body: "hi", quote: null, poll: null }, ["genesis"])).toBe(true);
    expect(hasMutedWord({ body: "hi", poll: null, quote: { id: "q", body: "x", title: "Genesis recap", spoiler: false, createdAt: "", author: { tag: "a", handle: "a" }, image: null, imageCount: 0, videoPoster: null } }, ["genesis"])).toBe(true);
  });
});

describe("stage diagrams", () => {
  it("matches stage names however a ruleset writes them", async () => {
    const { stageKey, stageLayout, stageInitials } = await import("@/lib/stageLayouts");
    expect(stageKey("Pokémon Stadium 2")).toBe("pokemon stadium 2");
    expect(stageKey("Yoshi's Island (Brawl)")).toBe("yoshis island brawl");
    expect(stageKey("Dream Land N64")).toBe("dream land");
    expect(stageKey("FD")).toBe("final destination");
    expect(stageLayout("Battlefield")?.platforms).toHaveLength(3);
    expect(stageLayout("Small Battlefield")?.platforms).toHaveLength(2);
    expect(stageLayout("Final Destination")?.platforms).toHaveLength(0);
    expect(stageLayout("Northern Cave")).toBeNull(); // not drawn: shows initials
    expect(stageInitials("Northern Cave")).toBe("NC");
    expect(stageInitials("Castle Siege")).toBe("CS");
    expect(stageInitials("WarioWare, Inc.")).toBe("WI");
  });
});
