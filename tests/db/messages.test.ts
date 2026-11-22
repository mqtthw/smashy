// Direct messages and group chats: the safety rules live in the database, so test them there.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, cleanup, guest, hasDb, makeUser, type TestUser } from "./helpers";

describe.skipIf(!hasDb)("messages", () => {
  let a: TestUser, b: TestUser, c: TestUser, d: TestUser, t1: TestUser, t2: TestUser;

  const mutual = async (x: TestUser, y: TestUser) => {
    const { error } = await admin.from("follows").insert([
      { follower_id: x.id, followee_id: y.id, status: "active" },
      { follower_id: y.id, followee_id: x.id, status: "active" },
    ]);
    if (error) throw error;
    // Teen accounts are always protected, so follows to them start as requests: approve them.
    await admin.from("follows").update({ status: "active" }).in("follower_id", [x.id, y.id]).in("followee_id", [x.id, y.id]);
  };
  const send = (u: TestUser, conv: string, body: string) => u.c.from("messages").insert({ conversation_id: conv, sender_id: u.id, body });
  const status = async (conv: string, u: TestUser) =>
    (await admin.from("conversation_members").select("status").eq("conversation_id", conv).eq("user_id", u.id).single()).data?.status;

  beforeAll(async () => {
    [a, b, c, d, t1, t2] = await Promise.all([
      makeUser("DmA"), makeUser("DmB"), makeUser("DmC"), makeUser("DmD"),
      makeUser("DmTeen1", { teen: true }), makeUser("DmTeen2", { teen: true }),
    ]);
    await Promise.all([mutual(a, b), mutual(a, d), mutual(t1, t2), mutual(a, t1)]);
  });
  afterAll(async () => {
    const { data } = await admin.from("conversation_members").select("conversation_id").in("user_id", [a, b, c, d, t1, t2].map((u) => u.id));
    await admin.from("conversations").delete().in("id", [...new Set((data ?? []).map((r) => r.conversation_id))]);
    await cleanup();
  });

  it("people who follow each other can message right away; outsiders can't read it", async () => {
    const { data: conv, error } = await a.c.rpc("start_direct", { other: b.id });
    expect(error).toBeNull();
    expect(await status(conv, b)).toBe("active");
    expect((await send(a, conv, "gg last night")).error).toBeNull();
    expect((await b.c.from("messages").select("body").eq("conversation_id", conv)).data).toEqual([{ body: "gg last night" }]);
    expect((await c.c.from("messages").select("body").eq("conversation_id", conv)).data).toEqual([]);
    expect((await guest().from("messages").select("body").eq("conversation_id", conv)).error).not.toBeNull();
    // Starting again finds the same chat.
    expect((await b.c.rpc("start_direct", { other: a.id })).data).toBe(conv);
  });

  it("anyone else lands in requests and gets one message until it's accepted", async () => {
    const { data: conv } = await a.c.rpc("start_direct", { other: c.id });
    expect(await status(conv, c)).toBe("request");
    expect((await send(a, conv, "hey, want to play?")).error).toBeNull();
    expect((await send(a, conv, "hello??")).error).not.toBeNull();
    expect((await c.c.from("messages").select("body").eq("conversation_id", conv)).data).toHaveLength(1);
    expect((await c.c.rpc("accept_message_request", { conv })).error).toBeNull();
    expect((await send(a, conv, "thanks!")).error).toBeNull();
  });

  it("teens and adults can't message each other, even if they follow each other", async () => {
    expect((await a.c.rpc("start_direct", { other: t1.id })).error?.message).toMatch(/can't message/);
    expect((await t1.c.rpc("start_direct", { other: a.id })).error?.message).toMatch(/can't message/);
    expect((await a.c.rpc("create_group", { title: "Mixed", people: [b.id, t1.id] })).error).not.toBeNull();
    const { data: teenChat, error } = await t1.c.rpc("start_direct", { other: t2.id });
    expect(error).toBeNull();
    expect((await send(t1, teenChat, "practice later?")).error).toBeNull();
  });

  it("teen chats block contact info; adult chats allow it", async () => {
    const { data: teenChat } = await t1.c.rpc("start_direct", { other: t2.id });
    expect((await send(t1, teenChat, "text me 210-555-0142")).error?.message).toMatch(/phone numbers/);
    const { data: adultChat } = await a.c.rpc("start_direct", { other: b.id });
    expect((await send(a, adultChat, "my discord is player#1234")).error).toBeNull();
  });

  it("groups: only mutual follows can be added, up to 20, and non-members can't read", async () => {
    expect((await a.c.rpc("create_group", { title: "Netplay", people: [b.id, c.id] })).error?.message).toMatch(/follow each other/);
    const { data: group, error } = await a.c.rpc("create_group", { title: "Netplay", people: [b.id, d.id] });
    expect(error).toBeNull();
    expect((await send(d, group, "I'm in")).error).toBeNull();
    expect((await c.c.from("messages").select("id").eq("conversation_id", group)).data).toEqual([]);
    // b can't add c (they don't follow each other); b leaving stops b from reading new messages.
    expect((await b.c.rpc("add_group_members", { conv: group, people: [c.id] })).error).not.toBeNull();
    await b.c.rpc("leave_conversation", { conv: group });
    expect((await send(b, group, "still here?")).error).not.toBeNull();
    expect((await b.c.from("messages").select("id").eq("conversation_id", group)).data).toEqual([]);
  });

  it("blocking stops messages, new chats and follows, both ways", async () => {
    const { data: conv } = await a.c.rpc("start_direct", { other: d.id });
    expect((await d.c.from("blocks").insert({ blocker_id: d.id, blocked_id: a.id })).error).toBeNull();
    expect((await send(a, conv, "hello?")).error).not.toBeNull();
    expect((await send(d, conv, "bye")).error).not.toBeNull();
    expect((await a.c.rpc("start_direct", { other: d.id })).error?.message).toMatch(/can't message/);
    expect((await admin.from("follows").select("*").or(`and(follower_id.eq.${a.id},followee_id.eq.${d.id}),and(follower_id.eq.${d.id},followee_id.eq.${a.id})`)).data).toEqual([]);
    expect((await a.c.from("follows").insert({ follower_id: a.id, followee_id: d.id })).error).not.toBeNull();
    // a can't see d's block list.
    expect((await a.c.from("blocks").select("*")).data).toEqual([]);
  });

  it("photos must come from your own folder in that chat (which only the server writes to)", async () => {
    const { data: conv } = await a.c.rpc("start_direct", { other: b.id });
    const bad = await a.c.from("messages").insert({ conversation_id: conv, sender_id: a.id, image_path: `${conv}/${b.id}/${randomUUID()}.webp`, image_width: 1, image_height: 1 });
    expect(bad.error).not.toBeNull();
    const upload = await a.c.storage.from("message-images").upload(`${conv}/${a.id}/x.webp`, new Blob(["x"], { type: "image/webp" }));
    expect(upload.error).not.toBeNull();
  });

  it("a deleted direct chat comes back between mutuals; a declined request stays closed", async () => {
    const { data: conv } = await a.c.rpc("start_direct", { other: b.id });
    await b.c.rpc("leave_conversation", { conv });
    expect((await send(a, conv, "you there?")).error).toBeNull();
    expect(await status(conv, b)).toBe("active");

    const e = await makeUser("DmE");
    const { data: req } = await e.c.rpc("start_direct", { other: b.id });
    expect((await send(e, req, "hi, I'm new")).error).toBeNull();
    await b.c.rpc("leave_conversation", { conv: req }); // b deletes the request
    expect((await send(e, req, "hello??")).error).not.toBeNull();
    expect(await status(req, b)).toBe("left");
  });

  it("teen group names can't carry contact info", async () => {
    const t3 = await makeUser("DmTeen3", { teen: true });
    await mutual(t1, t3);
    expect((await t1.c.rpc("create_group", { title: "text me 210-555-0142", people: [t2.id, t3.id] })).error?.message).toMatch(/Group names/);
    const { data: g, error } = await t1.c.rpc("create_group", { title: "Teen netplay", people: [t2.id, t3.id] });
    expect(error).toBeNull();
    expect((await t1.c.rpc("rename_group", { conv: g, new_title: "add me on snap: tealeaf" })).error?.message).toMatch(/Group names/);
  });

  it("empty direct chats stay out of the inbox", async () => {
    const f = await makeUser("DmF");
    await mutual(a, f);
    await a.c.rpc("start_direct", { other: f.id });
    const inbox = ((await a.c.rpc("my_conversations")).data ?? []) as { members: { id: string }[] }[];
    expect(inbox.some((r) => r.members.some((m) => m.id === f.id))).toBe(false);
  });

  it("you can't send as someone else or into a chat you're not in", async () => {
    const { data: conv } = await a.c.rpc("start_direct", { other: b.id });
    expect((await c.c.from("messages").insert({ conversation_id: conv, sender_id: a.id, body: "spoof" })).error).not.toBeNull();
    expect((await send(c, conv, "let me in")).error).not.toBeNull();
  });
});
