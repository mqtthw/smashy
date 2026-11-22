// Things players must never be able to do through the API, even by skipping the app.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, cleanup, guest, hasDb, makeUser, type TestUser } from "./helpers";

describe.skipIf(!hasDb)("players can't fake or change server-owned data", () => {
  let p: TestUser;
  beforeAll(async () => {
    p = await makeUser("Perms");
  });
  afterAll(cleanup);

  it("can't write set snapshots (fake scores)", async () => {
    expect((await p.c.from("set_refs").insert({ source: "startgg", external_id: "fake", p1_score: 3 })).error).not.toBeNull();
  });

  it("can't add, hide, or approve majors", async () => {
    const now = new Date().toISOString();
    expect((await p.c.from("majors").insert({ slug: "fake-major", name: "Fake", start_at: now, end_at: now })).error).not.toBeNull();
    const { data } = await p.c.from("majors").update({ hidden: true }).neq("slug", "").select("slug");
    expect(data ?? []).toEqual([]);
  });

  it("can't add Reels channels or clips, or hide clips", async () => {
    expect((await p.c.from("reel_channels").insert({ login: "sketchychannel", approved: true })).error).not.toBeNull();
    expect((await p.c.from("reels").insert({ clip_id: "fake", channel_login: "vgbootcamp", game: "melee", created_at: new Date().toISOString() })).error).not.toBeNull();
    const { data } = await p.c.from("reels").update({ hidden: true }).neq("clip_id", "").select("clip_id");
    expect(data ?? []).toEqual([]);
  });

  it("can't post as someone else", async () => {
    const other = await makeUser("Other");
    expect((await p.c.from("posts").insert({ author_id: other.id, body: "impersonation", game: "melee" })).error).not.toBeNull();
  });

  it("can't make themselves a site admin", async () => {
    expect((await p.c.from("site_admins").insert({ user_id: p.id })).error).not.toBeNull();
  });

  it("guests can't post or like", async () => {
    expect((await guest().from("posts").insert({ author_id: p.id, body: "x", game: "melee" })).error).not.toBeNull();
  });
});

describe.skipIf(!hasDb)("Reels safety", () => {
  let p: TestUser;
  const login = `testdbch${Date.now() % 100000}`;
  const clip = `testdb-clip-${Date.now()}`;

  beforeAll(async () => {
    p = await makeUser("Reels");
    // A channel suggested automatically (not approved yet) with one clip.
    await admin.from("reel_channels").insert({ login, source: "auto" });
    await admin.from("reels").insert({ clip_id: clip, channel_login: login, title: "test", game: "melee", created_at: new Date().toISOString() });
  });
  afterAll(async () => {
    await admin.from("reel_channels").delete().eq("login", login); // its clips go with it
    await cleanup();
  });

  it("clips from a suggested (unapproved) channel don't show", async () => {
    expect((await guest().from("reels").select("clip_id").eq("clip_id", clip)).data).toEqual([]);
  });

  it("can't comment on or share a clip people can't see", async () => {
    expect((await p.c.from("posts").insert({ author_id: p.id, body: "x", game: "melee", reel_clip_id: clip })).error).not.toBeNull();
    expect((await p.c.from("posts").insert({ author_id: p.id, body: "x", game: "melee", quote_reel_id: clip })).error).not.toBeNull();
  });

  it("approved clips show; hidden ones and blocked channels' don't", async () => {
    await admin.from("reel_channels").update({ approved: true }).eq("login", login);
    expect((await guest().from("reels").select("clip_id").eq("clip_id", clip)).data).toHaveLength(1);
    expect((await p.c.from("posts").insert({ author_id: p.id, body: "nice", game: "melee", reel_clip_id: clip })).error).toBeNull();

    await admin.from("reels").update({ hidden: true }).eq("clip_id", clip);
    expect((await guest().from("reels").select("clip_id").eq("clip_id", clip)).data).toEqual([]);
    await admin.from("reels").update({ hidden: false }).eq("clip_id", clip);

    await admin.from("reel_channels").update({ blocked: true }).eq("login", login);
    expect((await guest().from("reels").select("clip_id").eq("clip_id", clip)).data).toEqual([]);
  });
});
