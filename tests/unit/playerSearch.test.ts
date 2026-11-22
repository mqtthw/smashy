// Looking up start.gg players who may not be on Smashy (round 245).
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanPlayerQuery, playerRef, rankPlayerHits, startggProfileSlug, type PlayerMatch } from "@/lib/playerSearch";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: () => {} }));
const rememberPlayers = vi.fn<(players: { playerId: string; tag: string }[]) => Promise<void>>(async () => {});
vi.mock("@/lib/playerIndex", () => ({ rememberPlayers: (players: { playerId: string; tag: string }[]) => rememberPlayers(players) }));

describe("cleanPlayerQuery", () => {
  it("trims, squeezes spaces and caps the length", () => {
    expect(cleanPlayerQuery("  Mk  Leo ")).toBe("Mk Leo");
    expect(cleanPlayerQuery("x".repeat(80))).toHaveLength(30);
  });
  it("is null when there's too little to search for", () => {
    expect(cleanPlayerQuery("")).toBeNull();
    expect(cleanPlayerQuery(" m ")).toBeNull();
  });
});

describe("startggProfileSlug", () => {
  it("reads a start.gg profile link in the forms people paste", () => {
    expect(startggProfileSlug("https://www.start.gg/user/3f297e74")).toBe("user/3f297e74");
    expect(startggProfileSlug("start.gg/user/3F297E74/details")).toBe("user/3f297e74");
    expect(startggProfileSlug("user/3f297e74")).toBe("user/3f297e74");
  });
  it("leaves ordinary tags alone, even ones that mention users", () => {
    expect(startggProfileSlug("mkleo")).toBeNull();
    expect(startggProfileSlug("superuser/abc")).toBeNull();
    expect(startggProfileSlug("user/leo")).toBeNull(); // not a profile code
  });
});

describe("playerRef: which player an admin means", () => {
  it("reads a Smashy player page link, a bare player id, or a start.gg profile link", () => {
    expect(playerRef("https://smashy.gg/players/222927")).toEqual({ id: "222927" });
    expect(playerRef(" /players/222927?x=1 ")).toEqual({ id: "222927" });
    expect(playerRef("222927")).toEqual({ id: "222927" });
    expect(playerRef("https://www.start.gg/user/3f297e74")).toEqual({ slug: "user/3f297e74" });
  });
  it("is null for anything else, so nobody is hidden by accident", () => {
    expect(playerRef("mkleo")).toBeNull();
    expect(playerRef("")).toBeNull();
    expect(playerRef("https://smashy.gg/sets/startgg/109942833")).toBeNull(); // a set, not a player
    expect(playerRef("https://www.start.gg/tournament/evo-2019/event/x/brackets/547680/1026739")).toBeNull();
  });
});

describe("rankPlayerHits", () => {
  const m = (playerId: string, tag: string, tournament: string, prefix: string | null = null): PlayerMatch => ({ playerId, tag, prefix, tournament });
  it("puts the exact tag first, then tags that start with it, then the most seen", () => {
    const hits = rankPlayerHits("leo", [
      m("1", "Leonidas", "A"),
      m("1", "Leonidas", "B"),
      m("1", "Leonidas", "C"),
      m("2", "MkLeo", "A", "LG"),
      m("2", "MkLeo", "B", "LG"),
      m("3", "leo", "C"),
      m("4", "Leof", "A"),
    ]);
    expect(hits.map((h) => h.tag)).toEqual(["leo", "Leonidas", "Leof", "MkLeo"]);
  });
  it("lists a player once, with their latest tag, sponsor and tournament, and how many they were in", () => {
    const [hit] = rankPlayerHits("mkleo", [m("2", "MkLeo", "Newest", "LG"), m("2", "MKLeo", "Older", "T1"), m("2", "MkLeo", "Oldest", "")]);
    expect(hit).toEqual({ playerId: "2", tag: "MkLeo", prefix: "LG", seenAt: "Newest", count: 3 });
  });
  it("matches whatever the capitals, and stops at the limit", () => {
    expect(rankPlayerHits("MKLEO", [m("9", "Mkleofan", "A"), m("2", "mkleo", "A")])[0].playerId).toBe("2");
    expect(rankPlayerHits("a", Array.from({ length: 30 }, (_, i) => m(String(i), `a${i}`, "T")), 12)).toHaveLength(12);
  });
});

describe("asking start.gg", () => {
  const reply = (body: unknown) => ({ ok: true, status: 200, statusText: "OK", json: async () => body });
  const found = (tournament: string, players: [number, string][]) =>
    reply({ data: { tournaments: { nodes: [{ name: tournament, participants: { nodes: players.map(([id, gamerTag]) => ({ gamerTag, prefix: "", player: { id } })) } }, { name: "Empty", participants: { nodes: [] } }] } } });
  const sent = (fetchMock: ReturnType<typeof vi.fn>, call: number) => JSON.parse(fetchMock.mock.calls[call][1].body) as { query: string; variables: Record<string, unknown> };

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    rememberPlayers.mockClear();
  });

  it("searches featured tournaments and the viewer's region, and merges the players", async () => {
    vi.stubEnv("STARTGG_API_TOKEN", "test-token");
    const fetchMock = vi.fn().mockResolvedValueOnce(found("Major A", [[222927, "MkLeo"]])).mockResolvedValueOnce(found("Major B", [[222927, "MkLeo"]])).mockResolvedValueOnce(found("Texas Weekly", [[5, "mkleofan"]]));
    vi.stubGlobal("fetch", fetchMock);
    const { searchStartggPlayers } = await import("@/lib/startggPlayers");

    const res = await searchStartggPlayers("mkleo", "US-TX");
    expect(res.partial).toBe(false);
    expect(res.hits.map((h) => [h.playerId, h.tag, h.count])).toEqual([["222927", "MkLeo", 2], ["5", "mkleofan", 1]]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(sent(fetchMock, 0).query).toContain("isFeatured: true");
    expect([sent(fetchMock, 0).variables.page, sent(fetchMock, 1).variables.page]).toEqual([1, 2]);
    expect(sent(fetchMock, 2).variables).toMatchObject({ q: "mkleo", countryCode: "US", addrState: "TX" });
    // Everyone who matched goes on Smashy's saved list of players.
    expect(rememberPlayers.mock.calls[0][0].map((p) => p.playerId)).toEqual(["222927", "222927", "5"]);
  });

  it("keeps what it found when part of the search fails, and says so", async () => {
    vi.stubEnv("STARTGG_API_TOKEN", "test-token");
    const failed = reply({ errors: [{ message: "An unknown error has occurred" }] });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(found("Major A", [[222927, "MkLeo"]])).mockResolvedValueOnce(failed).mockResolvedValueOnce(failed));
    const { searchStartggPlayers } = await import("@/lib/startggPlayers");
    const res = await searchStartggPlayers("mkleo", "US-TX");
    expect(res.partial).toBe(true);
    expect(res.hits).toHaveLength(1);
  });

  it("fails (and so isn't saved) when start.gg answers none of it", async () => {
    vi.stubEnv("STARTGG_API_TOKEN", "test-token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({ errors: [{ message: "An unknown error has occurred" }] })));
    const { searchStartggPlayers } = await import("@/lib/startggPlayers");
    await expect(searchStartggPlayers("mkleo", "US-TX")).rejects.toThrow(/start\.gg request failed/);
  });

  it("a set page shows the sponsor from that tournament, and saves the one the player has today", async () => {
    vi.stubEnv("STARTGG_API_TOKEN", "test-token");
    const slot = (entrantId: number, then: { gamerTag: string; prefix: string }, today: { id: number; gamerTag: string; prefix: string | null }) => ({
      prereqType: null,
      prereqId: null,
      prereqPlacement: null,
      entrant: { id: entrantId, name: `${then.prefix} | ${then.gamerTag}`, initialSeedNum: 1, participants: [{ ...then, player: today }] },
      standing: { stats: { score: { value: 3 } } },
    });
    const doubles = { prereqType: null, prereqId: null, prereqPlacement: null, entrant: { id: 3, name: "A / B", initialSeedNum: 2, participants: [{ gamerTag: "A", prefix: "", player: { id: 1, gamerTag: "A", prefix: null } }, { gamerTag: "B", prefix: "", player: { id: 2, gamerTag: "B", prefix: null } }] }, standing: null };
    const set = (slots: unknown[]) =>
      reply({ data: { set: { id: 22278297, identifier: "J", round: -5, fullRoundText: "Losers Semi-Final", state: 3, winnerId: 11, completedAt: 1_564_979_000, slots, phaseGroup: { id: 1026991 }, startedAt: null, stream: null, event: { id: 328730, name: "Ultimate", slug: "tournament/evo-2019/event/ultimate", state: "COMPLETED", videogame: { id: 1386 }, tournament: { name: "Evo 2019", slug: "tournament/evo-2019" } }, games: [] } } });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(set([slot(10, { gamerTag: "Samsora", prefix: "eUnited" }, { id: 7648, gamerTag: "Samsora", prefix: null }), slot(11, { gamerTag: "MkLeo", prefix: "Echo Fox | MVG" }, { id: 222927, gamerTag: "MkLeo", prefix: "LG" })]))
      .mockResolvedValueOnce(set([slot(11, { gamerTag: "MkLeo", prefix: "Echo Fox | MVG" }, { id: 222927, gamerTag: "MkLeo", prefix: "LG" }), doubles]));
    vi.stubGlobal("fetch", fetchMock);
    const { getStartggSet } = await import("@/lib/brackets/startgg");

    const shown = await getStartggSet("22278297");
    expect(shown?.players.map((p) => [p?.name, p?.prefix])).toEqual([["Samsora", "eUnited"], ["MkLeo", "Echo Fox | MVG"]]); // as it was in 2019
    expect(rememberPlayers.mock.calls[0][0]).toEqual([{ playerId: "7648", tag: "Samsora", prefix: null }, { playerId: "222927", tag: "MkLeo", prefix: "LG" }]); // as it is now
    expect(sent(fetchMock, 0).query).toContain("player { id gamerTag prefix }");

    await getStartggSet("22278298"); // a team has no one player to save
    expect(rememberPlayers.mock.calls[1][0]).toEqual([{ playerId: "222927", tag: "MkLeo", prefix: "LG" }]);
  });

  it("reads only a player's tag, sponsor and profile code: never a name, photo, place or birthday", async () => {
    vi.stubEnv("STARTGG_API_TOKEN", "test-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reply({ data: { player: { id: 222927, gamerTag: "MkLeo", prefix: "LG", user: { slug: "user/3f297e74" } } } }))
      .mockResolvedValueOnce(reply({ data: { user: { slug: "user/3f297e74", player: { id: 222927, gamerTag: "MkLeo", prefix: null } } } }))
      .mockResolvedValueOnce(reply({ data: { player: null } }));
    vi.stubGlobal("fetch", fetchMock);
    const { getStartggPlayer, getStartggPlayerBySlug } = await import("@/lib/startggPlayers");

    expect(await getStartggPlayer("222927")).toEqual({ playerId: "222927", tag: "MkLeo", prefix: "LG", profileUrl: "https://www.start.gg/user/3f297e74" });
    expect(await getStartggPlayerBySlug("user/3f297e74")).toEqual({ playerId: "222927", tag: "MkLeo", prefix: null, profileUrl: "https://www.start.gg/user/3f297e74" });
    expect(await getStartggPlayer("1")).toBeNull();
    expect(rememberPlayers.mock.calls.map((c) => c[0].map((p) => p.tag))).toEqual([["MkLeo"], ["MkLeo"]]); // found players are saved; "no such player" isn't
    for (const call of [0, 1]) expect(sent(fetchMock, call).query).not.toMatch(/\b(name|images|location|birthday|email|bio|genderPronoun)\b/);

    // Ids and links that can't be real never reach start.gg.
    expect(await getStartggPlayer("abc")).toBeNull();
    expect(await getStartggPlayerBySlug("user/../x")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
