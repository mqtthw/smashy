// The Discord bot against the real database: linking a server with a code (admins only, once, not expired),
// then /bracket and /results answering with the linked member's events as a visitor sees them (teens not named),
// /next telling someone without a Discord sign-in how to get one, and unlinking.
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { admin, cleanup, hasDb, makeUser, type TestUser } from "./helpers";

vi.mock("server-only", () => ({}));
for (const line of (() => { try { return readFileSync(new URL("../../.env.local", import.meta.url), "utf8").split(/\r?\n/); } catch { return []; } })()) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const GUILD = "100000000000000042";
const ADMIN = String(1 << 5);
type Answer = { type: number; data: { content: string; flags: number } };

describe.skipIf(!hasDb)("Discord bot", () => {
  let host: TestUser, adult: TestUser, teen: TestUser;
  let eventId = "";

  beforeAll(async () => {
    [host, adult, teen] = await Promise.all([makeUser("BotHost"), makeUser("BotAdult"), makeUser("BotTeen", { teen: true })]);
    const { data: ev, error } = await admin.from("hosted_events").insert({ host_id: host.id, name: "TestDb Bot Weekly", game: "melee", starts_at: new Date(Date.now() + 86400_000).toISOString() }).select("id").single();
    if (error) throw error;
    eventId = ev!.id;
    await admin.from("hosted_events").update({ starts_at: new Date(Date.now() - 86400_000).toISOString(), status: "completed" }).eq("id", eventId);
    await admin.from("hosted_entrants").insert([{ event_id: eventId, user_id: adult.id, placement: 1 }, { event_id: eventId, user_id: teen.id, placement: 2 }]);
    await admin.from("hosted_guests").insert({ event_id: eventId, tag: "Walky", placement: 3 });
  });

  afterAll(async () => {
    await admin.from("discord_servers").delete().eq("guild_id", GUILD);
    await cleanup();
  });

  it("links a server with a fresh code, admins only, once", async () => {
    const { answer } = await import("@/lib/discordBot");
    const ask = (name: string, extra: object = {}) => answer({ type: 2, guild_id: GUILD, locale: "en-US", data: { name }, ...extra }) as Promise<Answer>;
    const connect = (code: string, permissions = ADMIN) =>
      answer({ type: 2, guild_id: GUILD, locale: "en-US", member: { user: { id: "200000000000000001" }, permissions }, data: { name: "smashy", options: [{ name: "connect", type: 1, options: [{ name: "code", type: 3, value: code }] }] } }) as Promise<Answer>;

    expect((await ask("bracket")).data.content).toContain("isn't linked");
    await admin.from("discord_link_codes").insert([
      { code: "BOTTEST1", host_id: host.id, expires_at: new Date(Date.now() + 600_000).toISOString() },
      { code: "BOTOLD22", host_id: host.id, expires_at: new Date(Date.now() - 1000).toISOString() },
    ]);
    expect((await connect("BOTTEST1", "2048")).data.content).toContain("Only server admins");
    expect((await connect("BOTOLD22")).data.content).toContain("didn't work");
    expect((await connect("bottest1")).data.content).toContain("linked");
    expect((await connect("BOTTEST1")).data.content).toContain("didn't work"); // used once

    // /bracket and /results: the last finished event, a teen not named.
    const results = (await ask("results")).data.content;
    expect(results).toContain("TestDb Bot Weekly");
    expect(results).toContain("🥇 TestDbBotAdult");
    expect(results).toContain("🥉 Walky");
    expect(results).not.toContain("TestDbBotTeen");
    expect(results).toContain("🥈 A player (sign in to see)"); // the teen keeps 2nd, unnamed (no gap)
    expect((await ask("bracket")).data.content).toContain("TestDb Bot Weekly");
    expect((await ask("upcoming")).data.content).toContain("Nothing coming up");

    // In a public season: /results says so, with the season's link.
    const { data: season } = await admin.from("seasons").insert({ owner_id: host.id, name: "TestDb Bot Season", game: "melee", starts_on: "2026-01-01", ends_on: "2026-12-31", points: [[1, 100]] }).select("id").single();
    await admin.from("season_events").insert({ season_id: season!.id, source: "smashy", ref: eventId, name: "TestDb Bot Weekly", held_on: "2026-11-12", results: [{ key: "g:walky", name: "Walky", place: 1 }] });
    expect((await ask("results")).data.content).toContain(`Counts toward TestDb Bot Season`);
    // /season: the host's season, as standings text (no events with placements counted here, so it says so).
    const seasonText = (await ask("season")).data.content;
    expect(seasonText).toContain("TestDb Bot Season");
    expect(seasonText).toContain("🥇 Walky · 100 pts");
    // /player: an adult by tag; a teen is never found (profiles are read as a signed-out visitor).
    const askPlayer = (tag: string) => answer({ type: 2, guild_id: GUILD, locale: "en-US", data: { name: "player", options: [{ name: "tag", type: 3, value: tag }] } }) as Promise<Answer>;
    const adultText = (await askPlayer("testdbbotadult")).data.content;
    expect(adultText).toContain("**TestDbBotAdult**");
    expect(adultText).toContain("/u/");
    expect((await askPlayer("TestDbBotTeen")).data.content).toContain("No Smashy player");
    expect((await askPlayer("TestDbBot")).data.content).not.toContain("TestDbBotTeen");
    const askSeason = (player: string) => answer({ type: 2, guild_id: GUILD, locale: "en-US", data: { name: "season", options: [{ name: "player", type: 3, value: player }] } }) as Promise<Answer>;
    const walkyText = (await askSeason("walky")).data.content;
    expect(walkyText).toContain("**Walky** is #1 with 100 pts from 1 event");
    expect(walkyText).toContain("#p-g-walky");
    expect((await askSeason("Nobody Here")).data.content).toContain("no one called \"Nobody Here\"");
    await admin.from("seasons").delete().eq("id", season!.id);

    // Spanish for a Spanish Discord.
    expect((await answer({ type: 2, guild_id: GUILD, locale: "es-ES", data: { name: "results" } }) as Answer).data.content).toContain("resultados");
  });

  it("answers /next for someone without a Discord sign-in, and unlinks", async () => {
    const { answer, nextSetText } = await import("@/lib/discordBot");
    expect(await nextSetText({ type: 2, locale: "en-US", user: { id: "200000000000000099" }, data: { name: "next" } })).toContain("sign in to Smashy with Discord");
    const off = (await answer({ type: 2, guild_id: GUILD, locale: "en-US", member: { user: { id: "200000000000000001" }, permissions: ADMIN }, data: { name: "smashy", options: [{ name: "disconnect", type: 1 }] } })) as Answer;
    expect(off.data.content).toContain("no longer linked");
    expect((await admin.from("discord_servers").select("guild_id").eq("guild_id", GUILD)).data).toHaveLength(0);
  });
});
