// Database-side fixes from the 2026-11-10 code review (20261130100000_review_fixes.sql):
// blocks reach replies, quotes, highlights, lobbies and chat; the contact-info rule covers profiles
// and teens' highlights and polls; limits count attempts; lobbies can't be reopened; push
// subscriptions are restricted; links don't count as mentions; and two message fixes.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, cleanup, guest, hasDb, makeUser, type TestUser } from "./helpers";

describe.skipIf(!hasDb)("code review fixes", () => {
  let a: TestUser, b: TestUser, c: TestUser, t: TestUser, u: TestUser;
  let aHandle = "";
  let aPost = "", cPost = "", aReply = "";
  let bHighlight = "", bLobby = "", bChat = "";

  const post = (who: TestUser, extra: Record<string, unknown>) => who.c.from("posts").insert({ author_id: who.id, game: "melee", body: "review fixes test", ...extra }).select("id").single();
  const inAnHour = () => new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const lobby = (who: TestUser, extra: Record<string, unknown> = {}) =>
    who.c.from("lobbies").insert({ host_id: who.id, game: "melee", title: "Review fixes lobby", connect_info: "TEST#123", closes_at: inAnHour(), ...extra }).select("id").single();

  beforeAll(async () => {
    [a, b, c] = await Promise.all([makeUser("RfA"), makeUser("RfB"), makeUser("RfC")]);
    [t, u] = await Promise.all([makeUser("RfTeen1", { teen: true }), makeUser("RfTeen2", { teen: true })]);
    aHandle = (await admin.from("profiles").select("handle").eq("id", a.id).single()).data!.handle;
    aPost = (await post(a, {})).data!.id;
    cPost = (await post(c, {})).data!.id;
    aReply = (await post(a, { parent_id: cPost })).data!.id;
    bHighlight = (await b.c.from("highlights").insert({ author_id: b.id, type: "guide", title: "Review fixes guide", game: "melee", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }).select("id").single()).data!.id;
    bLobby = (await lobby(b)).data!.id;
    bChat = (await b.c.from("chat_messages").insert({ room: "melee", author_id: b.id, body: "review fixes hello" }).select("id").single()).data!.id;
  });
  afterAll(async () => {
    await admin.from("chat_messages").delete().eq("id", bChat);
    await cleanup();
  });

  it("a blocked person can't reply to, or quote, the blocker's posts", async () => {
    expect((await a.c.from("blocks").insert({ blocker_id: a.id, blocked_id: b.id })).error).toBeNull();
    expect((await post(b, { parent_id: aPost })).error?.message).toMatch(/Post not found/);
    expect((await post(b, { quote_of: aPost })).error?.message).toMatch(/Post not found/);
    // In someone else's thread, B can't answer A's reply directly either.
    expect((await post(b, { parent_id: cPost, reply_to: aReply })).error?.message).toMatch(/reply isn't available/);
    // It works both ways: the blocker can't reply to the blocked person's post.
    const bPost = (await post(b, {})).data!.id;
    expect((await post(a, { parent_id: bPost })).error?.message).toMatch(/Post not found/);
    // Everyone else is unaffected.
    expect((await post(c, { parent_id: aPost })).error).toBeNull();
  });

  it("highlights, lobbies and chat messages are hidden across a block", async () => {
    const sees = async (who: TestUser, table: "highlights" | "lobbies" | "chat_messages", id: string) => ((await who.c.from(table).select("id").eq("id", id)).data ?? []).length === 1;
    for (const [table, id] of [["highlights", bHighlight], ["lobbies", bLobby], ["chat_messages", bChat]] as const) {
      expect(await sees(a, table, id), `A sees B's ${table} while blocked`).toBe(false);
      expect(await sees(c, table, id), `C sees B's ${table}`).toBe(true);
      expect(await sees(b, table, id), `B sees their own ${table}`).toBe(true);
    }
    await a.c.from("blocks").delete().eq("blocker_id", a.id).eq("blocked_id", b.id);
    for (const [table, id] of [["highlights", bHighlight], ["lobbies", bLobby], ["chat_messages", bChat]] as const) {
      expect(await sees(a, table, id), `A sees B's ${table} after unblocking`).toBe(true);
    }
    // Unblocked, replying works again.
    expect((await post(b, { parent_id: aPost })).error).toBeNull();
  });

  it("profiles refuse links and contact info set straight through the database", async () => {
    const set = (fields: Record<string, unknown>) => a.c.from("profiles").update(fields).eq("id", a.id);
    expect((await set({ bio: "add me on insta @someone" })).error?.message).toMatch(/Profiles can't include/);
    expect((await set({ home_city: "call 210-555-0199 anytime" })).error?.message).toMatch(/Profiles can't include/);
    expect((await set({ tag: "www.example.com" })).error?.message).toMatch(/Profiles can't include/);
    expect((await set({ crew: "discord.gg/abc" })).error?.message).toMatch(/Profiles can't include/);
    expect((await set({ bio: "Fox main from San Antonio", home_city: "San Antonio", crew: "UTSA Smash Club" })).error).toBeNull();
    // Only fields being changed are checked, so an older profile can still be edited.
    await admin.from("profiles").update({ bio: "old bio with example.com" }).eq("id", a.id);
    expect((await set({ crew: "UTSA Smash" })).error).toBeNull();
  });

  it("under-18s: highlights can't carry contact info or chat-app links; adults aren't held to that", async () => {
    const add = (who: TestUser, fields: Record<string, unknown>) => who.c.from("highlights").insert({ author_id: who.id, type: "guide", title: "Teen guide", game: "melee", ...fields });
    expect((await add(t, { url: "https://www.youtube.com/watch?v=abc", description: "dm me on insta for more" })).error?.message).toMatch(/contact info/);
    expect((await add(t, { guide_body: "My notes. Questions? my discord is tealeaf" })).error?.message).toMatch(/contact info/);
    expect((await add(t, { url: "https://discord.gg/abcdef" })).error?.message).toMatch(/link can't be shared/);
    expect((await add(t, { url: "https://www.instagram.com/someone" })).error?.message).toMatch(/link can't be shared/);
    expect((await add(t, { url: "https://www.youtube.com/watch?v=abc", description: "Edgeguarding Marth" })).error).toBeNull();
    expect((await add(c, { url: "https://discord.gg/abcdef" })).error).toBeNull();
  });

  it("polls: no empty options, and no contact info in a teen's options", async () => {
    const tPost = (await post(t, {})).data!.id;
    const closes = inAnHour();
    expect((await t.c.from("polls").insert({ post_id: tPost, options: ["insta: coolkid", "no"], closes_at: closes })).error?.message).toMatch(/contact info/);
    expect((await t.c.from("polls").insert({ post_id: tPost, options: ["Fox", null], closes_at: closes })).error?.message).toMatch(/can't be empty/);
    expect((await t.c.from("polls").insert({ post_id: tPost, options: ["Fox", "Marth"], closes_at: closes })).error).toBeNull();
  });

  it("a lobby's region follows the contact rule, and a host can close but not reopen a lobby", async () => {
    expect((await lobby(c, { region: "insta: someone" })).error?.code).toBe("23514");
    // A moderator closes B's lobby; B can't reopen it.
    await admin.from("lobbies").update({ closed_at: new Date().toISOString() }).eq("id", bLobby);
    await b.c.from("lobbies").update({ closed_at: null }).eq("id", bLobby);
    expect((await admin.from("lobbies").select("closed_at").eq("id", bLobby).single()).data?.closed_at).not.toBeNull();
    // Closing your own open lobby still works.
    const second = (await lobby(b)).data!.id;
    await b.c.from("lobbies").update({ closed_at: new Date().toISOString() }).eq("id", second).eq("host_id", b.id);
    expect((await admin.from("lobbies").select("closed_at").eq("id", second).single()).data?.closed_at).not.toBeNull();
  });

  it("the posting limit counts attempts, so deleting a post doesn't give the slot back", async () => {
    // U hasn't posted yet: 5 posts, each deleted straight away, then a 6th within the minute.
    for (let i = 0; i < 5; i++) {
      const { data, error } = await post(u, { body: `delete loop ${i}` });
      expect(error).toBeNull();
      await u.c.from("posts").delete().eq("id", data!.id);
    }
    const sixth = await post(u, { body: "delete loop 6" });
    expect(sixth.error?.code).toBe("P0429");
    expect(sixth.error?.message).toMatch(/posting too fast/);
  });

  it("a link containing @name isn't a mention; a real @name still is", async () => {
    const mentions = async () => ((await a.c.from("notifications").select("id").eq("actor_id", c.id).eq("type", "mention")).data ?? []).length;
    expect((await post(c, { body: `watch https://www.youtube.com/@${aHandle} and www.twitch.tv/@${aHandle}` })).error).toBeNull();
    expect(await mentions()).toBe(0);
    expect((await post(c, { body: `gg @${aHandle}!` })).error).toBeNull();
    expect(await mentions()).toBe(1);
  });

  it("push subscriptions: real push services only, and at most 10 devices", async () => {
    const sub = (endpoint: string) => a.c.from("push_subscriptions").insert({ user_id: a.id, endpoint, p256dh: "key", auth: "auth" });
    expect((await sub("https://evil.example.com/collect")).error?.code).toBe("23514");
    expect((await sub("https://updates.push.services.mozilla.com/wpush/v2/test")).error).toBeNull();
    expect((await sub("https://web.push.apple.com/test")).error).toBeNull();
    expect((await sub("https://wns2-by3p.notify.windows.com/w/?token=test")).error).toBeNull();
    for (let i = 0; i < 9; i++) expect((await sub(`https://fcm.googleapis.com/fcm/send/review-fixes-${a.id}-${i}`)).error).toBeNull();
    const rows = (await a.c.from("push_subscriptions").select("endpoint")).data ?? [];
    expect(rows).toHaveLength(10); // 12 added: the two oldest were replaced
    expect(rows.some((r) => r.endpoint.includes("mozilla.com"))).toBe(false);
  });

  it("limit_action: 10 avatar uploads an hour, known actions only, signed-in people only", async () => {
    for (let i = 0; i < 10; i++) expect((await b.c.rpc("limit_action", { action: "avatar_upload" })).error).toBeNull();
    const eleventh = await b.c.rpc("limit_action", { action: "avatar_upload" });
    expect(eleventh.error?.code).toBe("P0429");
    expect(eleventh.error?.message).toMatch(/changed your picture a lot/);
    expect((await b.c.rpc("limit_action", { action: "translate" })).error).toBeNull(); // a separate count
    expect((await b.c.rpc("limit_action", { action: "something_else" })).error?.code).toBe("P0001");
    expect((await guest().rpc("limit_action", { action: "translate" })).error).not.toBeNull();
  });

  // Last: this one turns the two teens into adults.
  it("two teens who both turn 18 can message again; a chat keeps the other person's name after they remove it", async () => {
    const { data: conv, error } = await t.c.rpc("start_direct", { other: u.id });
    expect(error).toBeNull();
    expect((await t.c.from("messages").insert({ conversation_id: conv, sender_id: t.id, body: "practice later?" })).error).toBeNull();
    expect((await u.c.rpc("accept_message_request", { conv })).error).toBeNull();
    expect((await t.c.rpc("conversation_can_send", { conv })).data).toBe(true);

    // Both turn 18: they can keep sending (round 722: sending no longer depends on the chat's age label),
    // and the chat now takes photos, since nobody in it is under 18.
    expect((await t.c.rpc("conversation_allows_photos", { conv })).data).toBe(false);
    await admin.from("private_profile_data").update({ date_of_birth: "1990-01-01" }).in("user_id", [t.id, u.id]);
    expect((await t.c.rpc("conversation_can_send", { conv })).data).toBe(true);
    expect((await t.c.rpc("conversation_allows_photos", { conv })).data).toBe(true);
    // Opening it again from the other's profile brings the saved label up to date.
    expect((await t.c.rpc("start_direct", { other: u.id })).data).toBe(conv);
    expect((await admin.from("conversations").select("age_band").eq("id", conv).single()).data?.age_band).toBe("adult");
    expect((await t.c.rpc("conversation_can_send", { conv })).data).toBe(true);
    expect((await u.c.rpc("conversation_can_send", { conv })).data).toBe(true);

    // U removes the chat from their inbox: T's inbox still names U.
    await u.c.rpc("leave_conversation", { conv });
    const inbox = ((await t.c.rpc("my_conversations")).data ?? []) as { id: string; members: { id: string }[] }[];
    expect(inbox.find((r) => r.id === conv)?.members.map((m) => m.id)).toEqual([u.id]);
  });
});
