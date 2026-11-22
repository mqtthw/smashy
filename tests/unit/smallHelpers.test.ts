// Small plain-logic files that had no tests: page text helpers, paging through a big query,
// reactions, the character Discord list, and the start.gg sign-in helpers.
import { afterEach, describe, expect, it, vi } from "vitest";
import { CHARACTER_DISCORDS, characterDiscord } from "@/lib/characterDiscords";
import { CHARACTERS } from "@/lib/characters";
import { GAME_KEYS, type GameKey } from "@/lib/games";
import { pageAll } from "@/lib/pageAll";
import { ALL_REACTIONS, QUICK_REACTIONS, SCENE_EMOJI_NAME, isValidReaction } from "@/lib/reactions";
import { clip, isUuid, pageMeta } from "@/lib/siteMeta";
import { exchangeCode, fetchIdentity, startggAuthorizeUrl, startggRedirectUri } from "@/lib/startggOAuth";

describe("page text helpers", () => {
  it("clips long text at a word and adds an ellipsis", () => {
    expect(clip("short", 20)).toBe("short");
    expect(clip("  spaced   out  text ", 40)).toBe("spaced out text");
    const cut = clip("Took a set off a Fox for the first time tonight at the weekly", 30);
    expect(cut.length).toBeLessThanOrEqual(30);
    expect(cut.endsWith("…")).toBe(true);
    expect(cut).not.toMatch(/\s…$/);
  });
  it("recognises database ids", () => {
    expect(isUuid("1ed5bf07-9a95-46f6-a014-82cb5ac37b04")).toBe(true);
    expect(isUuid("1ED5BF07-9A95-46F6-A014-82CB5AC37B04")).toBe(true);
    expect(isUuid("1ed5bf07-9a95-46f6-a014-82cb5ac37b0")).toBe(false);
    expect(isUuid("../etc/passwd")).toBe(false);
    expect(isUuid("")).toBe(false);
  });
  it("builds page metadata with matching social titles", () => {
    const meta = pageMeta("Title", "About it", { robots: { index: false } });
    expect(meta).toMatchObject({ title: "Title", description: "About it", openGraph: { title: "Title", siteName: "Smashy" }, twitter: { title: "Title" }, robots: { index: false } });
  });
});

describe("reading a big query in pages", () => {
  const rows = Array.from({ length: 2300 }, (_, i) => i);
  it("keeps asking until a page comes back short", async () => {
    const calls: [number, number][] = [];
    const all = await pageAll<number>(async (from, to) => {
      calls.push([from, to]);
      return { data: rows.slice(from, to + 1), error: null };
    });
    expect(all).toEqual(rows);
    expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });
  it("stops at the limit it was given, and throws the query's error", async () => {
    const some = await pageAll<number>(async (from, to) => ({ data: rows.slice(from, to + 1), error: null }), 1000);
    expect(some.length).toBe(1000);
    await expect(pageAll<number>(async () => ({ data: null, error: new Error("timeout") }))).rejects.toThrow("timeout");
  });
});

describe("reactions", () => {
  it("accepts the curated emoji and scene emoji ids, nothing else", () => {
    for (const r of ALL_REACTIONS) expect(isValidReaction(r)).toBe(true);
    expect(isValidReaction("scene:1ed5bf07-9a95-46f6-a014-82cb5ac37b04")).toBe(true);
    for (const bad of ["", "hello", "🍕", "scene:123", "scene:1ed5bf07-9a95-46f6-a014-82cb5ac37b04x", "🔥🔥"]) expect(isValidReaction(bad), bad).toBe(false);
  });
  it("has no repeats, and the quick ones are part of the full list", () => {
    expect(new Set(ALL_REACTIONS).size).toBe(ALL_REACTIONS.length);
    for (const r of QUICK_REACTIONS) expect(ALL_REACTIONS).toContain(r);
    expect(SCENE_EMOJI_NAME.test("falco_laser")).toBe(true);
    expect(SCENE_EMOJI_NAME.test("Falco Laser")).toBe(false);
  });
});

describe("character Discords", () => {
  it("only lists real characters, each with a name and a Discord invite link", () => {
    for (const game of Object.keys(CHARACTER_DISCORDS) as GameKey[]) {
      expect(GAME_KEYS).toContain(game);
      const known = new Set(CHARACTERS[game].map((c) => c.key));
      for (const [character, d] of Object.entries(CHARACTER_DISCORDS[game] ?? {})) {
        expect(known.has(character), `${game}/${character}`).toBe(true);
        expect(d.name.trim().length, `${game}/${character}`).toBeGreaterThan(0);
        expect(d.invite, `${game}/${character}`).toMatch(/^https:\/\/(discord\.gg|discord\.com\/invite)\/[\w-]+$/);
      }
    }
  });
  it("looks one up, or says there isn't one", () => {
    expect(characterDiscord("melee", "falco")?.invite).toMatch(/^https:\/\/discord\.gg\//);
    expect(characterDiscord("melee", "not-a-character")).toBeNull();
  });
});

describe("start.gg sign-in helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
  it("builds the address start.gg sends people back to, and the sign-in address", () => {
    vi.stubEnv("STARTGG_CLIENT_ID", "client-123");
    expect(startggRedirectUri("https://smashy.example")).toBe("https://smashy.example/link/startgg/callback");
    const url = new URL(startggAuthorizeUrl("https://smashy.example", "state with space"));
    expect(url.origin + url.pathname).toBe("https://start.gg/oauth/authorize");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: "code",
      client_id: "client-123",
      scope: "user.identity", // only "who are you"
      redirect_uri: "https://smashy.example/link/startgg/callback",
      state: "state with space",
    });
    expect(url.search).not.toContain("+");
  });
  it("trades the code for a token and reports start.gg's error when it refuses", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ access_token: "tok" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(exchangeCode("https://smashy.example", "code-1")).resolves.toBe("tok");
    const sent = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(sent).toMatchObject({ grant_type: "authorization_code", code: "code-1", redirect_uri: "https://smashy.example/link/startgg/callback" });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ message: "bad code" }), { status: 400 })));
    await expect(exchangeCode("https://smashy.example", "nope")).rejects.toThrow("bad code");
  });
  it("reads who the token belongs to, and refuses an account with no player", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ data: { currentUser: { id: "42", slug: "user/abc", player: { id: "7", gamerTag: "Bjorn" } } } }))));
    await expect(fetchIdentity("tok")).resolves.toEqual({ userId: 42, playerId: 7, gamerTag: "Bjorn", slug: "user/abc" });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ data: { currentUser: { id: "42", player: null } } }))));
    await expect(fetchIdentity("tok")).rejects.toThrow("didn't return a player");
  });
});
