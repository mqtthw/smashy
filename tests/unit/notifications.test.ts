import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
const { groupNotifications } = await import("@/lib/notifications");
type Item = Parameters<typeof groupNotifications>[0][number];

const n = (id: string, type: Item["type"], emoji: string | null, postId: string | null, read = true): Item => ({
  id, type, createdAt: "", read, actor: { tag: `T${id}`, handle: `t${id}` },
  post: postId ? { id: postId, body: "", parentId: null } : null, highlight: null, scene: null, major: null, clip: null, conversationId: null, emoji, event: null, others: 0,
});

describe("groupNotifications", () => {
  it("folds the same emoji on the same post into one line, newest first", () => {
    const out = groupNotifications([n("1", "reaction", "🔥", "p"), n("2", "like", null, "p"), n("3", "reaction", "🔥", "p", false), n("4", "reaction", "🔥", "p")]);
    expect(out.map((x) => x.id)).toEqual(["1", "2"]);
    expect(out[0]).toMatchObject({ others: 2, read: false }); // unread if any of them is
  });

  it("groups likes and upvotes on the same thing too, but not follows", () => {
    const vote = (id: string, h: string): Item => ({ ...n(id, "vote", null, null), highlight: { id: h, title: "t" } });
    const out = groupNotifications([n("1", "like", null, "p"), n("2", "like", null, "p"), vote("3", "h"), vote("4", "h"), n("5", "follow", null, null), n("6", "follow", null, null)]);
    expect(out.map((x) => [x.id, x.others])).toEqual([["1", 1], ["3", 1], ["5", 0], ["6", 0]]);
  });

  it("keeps different emojis and different posts apart", () => {
    const out = groupNotifications([n("1", "reaction", "🔥", "p"), n("2", "reaction", "😂", "p"), n("3", "reaction", "🔥", "q")]);
    expect(out.map((x) => x.id)).toEqual(["1", "2", "3"]);
    expect(out.every((x) => x.others === 0)).toBe(true);
  });
});
