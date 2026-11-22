// "I want to play now" (round 398): play requests (asking, answering, limits, blocks, age bands),
// saved codes only reaching the other player after a yes, friends' "Looking to play", and @matchmaking
// pings with their cooldowns, and character pings (@Fox) for players who main them.
import { afterAll, describe, expect, it } from "vitest";
import { admin, cleanup, guest, hasDb, makeUser } from "./helpers";

describe.skipIf(!hasDb)("play now", () => {
  afterAll(cleanup);

  it("asks, answers and shares codes only between the two players", async () => {
    const [a, b, c, teen] = await Promise.all([makeUser("PnAda"), makeUser("PnBen"), makeUser("PnCat"), makeUser("PnTeen", { teen: true })]);
    // Saved codes: only the owner reads them; contact info is refused.
    expect((await a.c.from("play_codes").insert({ user_id: a.id, game: "melee", code: "ADA#111" })).error).toBeNull();
    expect((await b.c.from("play_codes").insert({ user_id: b.id, game: "melee", code: "BEN#222" })).error).toBeNull();
    expect((await a.c.from("play_codes").insert({ user_id: a.id, game: "ultimate", code: "call 555 123 4567" })).error).not.toBeNull();
    expect((await c.c.from("play_codes").insert({ user_id: a.id, game: "brawl", code: "NOPE#1" })).error).not.toBeNull();
    for (const who of [b.c, c.c, guest()]) expect((await who.from("play_codes").select("code").eq("user_id", a.id)).data ?? []).toEqual([]);

    // No asking yourself, a teen (different age band), or an unknown game. Tables can't be written directly.
    expect((await a.c.rpc("ask_to_play", { p_to: a.id, p_game: "melee" })).error).not.toBeNull();
    expect((await a.c.rpc("ask_to_play", { p_to: teen.id, p_game: "melee" })).error?.code).toBe("P0403");
    expect((await a.c.rpc("ask_to_play", { p_to: b.id, p_game: "general" })).error).not.toBeNull();
    expect((await a.c.from("play_requests").insert({ from_id: a.id, to_id: b.id, game: "melee" })).error).not.toBeNull();
    expect((await guest().rpc("ask_to_play", { p_to: b.id, p_game: "melee" })).error).not.toBeNull();

    // Ada asks Ben; Ben gets an alert; asking again right away is refused.
    const asked = await a.c.rpc("ask_to_play", { p_to: b.id, p_game: "melee" });
    expect(asked.error).toBeNull();
    const id = asked.data as string;
    expect((await a.c.rpc("ask_to_play", { p_to: b.id, p_game: "melee" })).error?.code).toBe("P0409");
    const { data: alert } = await admin.from("notifications").select("actor_id, event_name, event_href").eq("user_id", b.id).eq("type", "play_request").single();
    expect(alert).toEqual({ actor_id: a.id, event_name: "melee", event_href: "/play?room=melee#requests" });

    // Both see it; nobody else does. No codes before a yes.
    expect((await b.c.from("play_requests").select("id").eq("id", id)).data).toHaveLength(1);
    expect((await a.c.from("play_requests").select("id").eq("id", id)).data).toHaveLength(1);
    expect((await c.c.from("play_requests").select("id").eq("id", id)).data ?? []).toEqual([]);
    expect((await b.c.rpc("play_request_codes", { p_id: id })).data ?? []).toEqual([]);

    // Only Ben answers; Cat and Ada can't. A yes alerts Ada and shares both codes, with them only.
    expect((await c.c.rpc("answer_play_request", { p_id: id, p_accept: true })).error).not.toBeNull();
    expect((await a.c.rpc("answer_play_request", { p_id: id, p_accept: true })).error).not.toBeNull();
    expect((await b.c.rpc("answer_play_request", { p_id: id, p_accept: true })).data).toBe("accepted");
    expect((await b.c.rpc("answer_play_request", { p_id: id, p_accept: false })).error?.code).toBe("P0409");
    expect((await admin.from("notifications").select("type").eq("user_id", a.id).eq("type", "play_accepted")).data).toHaveLength(1);
    expect((await a.c.rpc("play_request_codes", { p_id: id })).data).toEqual([{ from_code: "ADA#111", to_code: "BEN#222" }]);
    expect((await b.c.rpc("play_request_codes", { p_id: id })).data).toEqual([{ from_code: "ADA#111", to_code: "BEN#222" }]);
    expect((await c.c.rpc("play_request_codes", { p_id: id })).data ?? []).toEqual([]);

    // A block hides the request and its codes, and stops new ones.
    expect((await b.c.from("blocks").insert({ blocker_id: b.id, blocked_id: a.id })).error).toBeNull();
    expect((await a.c.from("play_requests").select("id").eq("id", id)).data ?? []).toEqual([]);
    expect((await a.c.rpc("play_request_codes", { p_id: id })).data ?? []).toEqual([]);
    expect((await a.c.rpc("ask_to_play", { p_to: b.id, p_game: "melee" })).error?.code).toBe("P0403");

    // Cancelling: only the asker, only while it's open.
    const second = (await c.c.rpc("ask_to_play", { p_to: a.id, p_game: "ultimate" })).data as string;
    await a.c.rpc("cancel_play_request", { p_id: second });
    expect((await admin.from("play_requests").select("status").eq("id", second).single()).data?.status).toBe("pending");
    await c.c.rpc("cancel_play_request", { p_id: second });
    expect((await admin.from("play_requests").select("status").eq("id", second).single()).data?.status).toBe("cancelled");
  });

  it("limits requests to 10 an hour", async () => {
    const asker = await makeUser("PnAsker");
    const people = await Promise.all(Array.from({ length: 11 }, (_, i) => makeUser(`PnP${i}`)));
    for (const p of people.slice(0, 10)) expect((await asker.c.rpc("ask_to_play", { p_to: p.id, p_game: "melee" })).error).toBeNull();
    expect((await asker.c.rpc("ask_to_play", { p_to: people[10].id, p_game: "melee" })).error?.code).toBe("P0429");
  });

  it("shows friends' Looking to play, and keeps settings to their owner", async () => {
    const [a, b, c] = await Promise.all([makeUser("PnFrA"), makeUser("PnFrB"), makeUser("PnFrC")]);
    await admin.from("follows").insert([
      { follower_id: a.id, followee_id: b.id, status: "active" },
      { follower_id: b.id, followee_id: a.id, status: "active" },
      { follower_id: a.id, followee_id: c.id, status: "active" }, // one-way: not a friend
    ]);
    // Asking for 10 hours is cut to 3.
    const until = new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString();
    expect((await b.c.from("play_settings").insert({ user_id: b.id, looking_game: "melee", looking_until: until })).error).toBeNull();
    const { data: s } = await b.c.from("play_settings").select("looking_until").eq("user_id", b.id).single();
    expect(Date.parse(s!.looking_until) - Date.now()).toBeLessThan(3 * 60 * 60 * 1000 + 60_000);
    // Others can't read or change it, or set when someone last pinged.
    expect((await a.c.from("play_settings").select("user_id").eq("user_id", b.id)).data ?? []).toEqual([]);
    expect((await a.c.from("play_settings").update({ ping_games: ["melee"] }).eq("user_id", b.id).select("user_id")).data ?? []).toEqual([]);
    expect((await b.c.from("play_settings").update({ last_ping_at: null }).eq("user_id", b.id)).error).not.toBeNull();

    const { data: friends } = await a.c.rpc("play_friends");
    expect((friends as { id: string; looking_game: string | null }[]).map((f) => [f.id, f.looking_game])).toEqual([[b.id, "melee"]]);
    // Switched off: still a friend, not looking.
    await b.c.from("play_settings").update({ looking_until: null }).eq("user_id", b.id);
    expect(((await a.c.rpc("play_friends")).data as { looking_game: string | null }[])[0].looking_game).toBeNull();
    expect((await guest().rpc("play_friends")).error).not.toBeNull();
  });

  it("pings @matchmaking subscribers once per 30 minutes", async () => {
    // The ping goes to real members who turned pings on for this room; skip if there are any.
    const room = "smash64";
    const { count } = await admin.from("play_settings").select("user_id", { count: "exact", head: true }).contains("ping_games", [room]);
    if (count) return;
    const [sender, fan, other, blocker, teen] = await Promise.all([makeUser("PnSend"), makeUser("PnFan"), makeUser("PnOther"), makeUser("PnBlock"), makeUser("PnTeenFan", { teen: true })]);
    for (const u of [fan, blocker, teen]) expect((await u.c.from("play_settings").insert({ user_id: u.id, ping_games: [room] })).error).toBeNull();
    await other.c.from("play_settings").insert({ user_id: other.id, ping_games: ["melee"] });
    await blocker.c.from("blocks").insert({ blocker_id: blocker.id, blocked_id: sender.id });
    expect((await fan.c.from("play_settings").update({ ping_games: ["general"] }).eq("user_id", fan.id)).error).not.toBeNull();

    // Without the tag, nothing; "@matchmakingbot" isn't the tag either.
    await sender.c.from("chat_messages").insert({ room, author_id: sender.id, body: "anyone around? @matchmakingbot" });
    expect((await admin.from("notifications").select("id").eq("type", "play_ping").in("user_id", [fan.id, other.id, blocker.id, teen.id])).data).toEqual([]);

    await new Promise((r) => setTimeout(r, 5200)); // chat slow mode
    expect((await sender.c.from("chat_messages").insert({ room, author_id: sender.id, body: "@matchmaking games?" })).error).toBeNull();
    const { data: pinged } = await admin.from("notifications").select("user_id, actor_id, event_href").eq("type", "play_ping").in("user_id", [fan.id, other.id, blocker.id, teen.id]);
    expect(pinged).toEqual([{ user_id: fan.id, actor_id: sender.id, event_href: `/play?room=${room}` }]);

    // A second ping inside 30 minutes posts the message but alerts nobody.
    await new Promise((r) => setTimeout(r, 5200));
    expect((await sender.c.from("chat_messages").insert({ room, author_id: sender.id, body: "@matchmaking still looking" })).error).toBeNull();
    expect((await admin.from("notifications").select("id").eq("type", "play_ping").eq("user_id", fan.id)).data).toHaveLength(1);
  }, 60_000);

  it("pings players who main a tagged character (round 448)", async () => {
    // Its own room: the test above leaves players with 64 pings on until the end.
    const room = "smash4";
    const { count } = await admin.from("play_settings").select("user_id", { count: "exact", head: true }).contains("ping_games", [room]);
    expect(count, "real members have Smash 4 pings on; pick another room").toBe(0);
    const [sender, foxy, falcon, quiet, mario] = await Promise.all([makeUser("PcSend"), makeUser("PcFox"), makeUser("PcFalcon"), makeUser("PcQuiet"), makeUser("PcMario")]);
    const main = (character: string) => [{ game: room, character }];
    await admin.from("profiles").update({ mains: main("fox") }).eq("id", foxy.id);
    await admin.from("profiles").update({ mains: main("captain-falcon") }).eq("id", falcon.id);
    await admin.from("profiles").update({ mains: main("fox") }).eq("id", quiet.id); // mains Fox, but pings off
    await admin.from("profiles").update({ mains: main("mario") }).eq("id", mario.id);
    for (const u of [foxy, falcon, mario]) expect((await u.c.from("play_settings").insert({ user_id: u.id, ping_games: [room] })).error).toBeNull();

    // Character tags pass the chat's contact-info rule; other "@names" still don't.
    expect((await sender.c.from("chat_messages").insert({ room: "general", author_id: sender.id, body: "follow @someone123" })).error).not.toBeNull();
    expect((await sender.c.from("chat_messages").insert({ room, author_id: sender.id, body: "need @Fox or @captainfalcon practice" })).error).toBeNull();
    const { data: pinged } = await admin.from("notifications").select("user_id, actor_id, event_href")
      .eq("type", "play_ping_main").in("user_id", [foxy.id, falcon.id, quiet.id, mario.id]).order("event_href");
    expect(pinged).toEqual([
      { user_id: falcon.id, actor_id: sender.id, event_href: `/play?room=${room}&char=captain-falcon` },
      { user_id: foxy.id, actor_id: sender.id, event_href: `/play?room=${room}&char=fox` },
    ]);

    // Same 30-minute sender cooldown as @matchmaking.
    await new Promise((r) => setTimeout(r, 5200)); // chat slow mode
    expect((await sender.c.from("chat_messages").insert({ room, author_id: sender.id, body: "@Mario anyone?" })).error).toBeNull();
    expect((await admin.from("notifications").select("id").eq("type", "play_ping_main").eq("user_id", mario.id)).data).toEqual([]);
  }, 60_000);
});
