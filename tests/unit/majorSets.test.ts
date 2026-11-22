import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));

import type { MajorEvent } from "@/lib/majorEvents";
import {
  asMeeting,
  bracketCharacters,
  charactersFor,
  finalPhases,
  mainBrackets,
  mostPlayed,
  startggCharacterKey,
  tagOnly,
  toSavedSet,
  winnerCharacters,
  winnerIds,
  type MajorCharacters,
  type MajorSetRow,
  type RawMajorSet,
  type RawPhase,
} from "@/lib/majorSets";

const phase = (id: number, phaseOrder: number, numSeeds: number | null, name = `P${id}`): RawPhase => ({ id, name, phaseOrder, numSeeds });

describe("finalPhases", () => {
  it("keeps the small phases at the end of a bracket (top 64, top 8), not pools", () => {
    const got = finalPhases([phase(3, 3, 8, "Top 8"), phase(1, 1, 2400, "Pools"), phase(2, 2, 64, "Top 64")]);
    expect(got.map((p) => p.name)).toEqual(["Top 64", "Top 8"]);
  });
  it("stops at the first big phase going back (top 128 isn't saved when top 32 follows it)", () => {
    expect(finalPhases([phase(1, 1, 128), phase(2, 2, 32)]).map((p) => p.id)).toEqual([2]);
  });
  it("takes the last phase when it's one big bracket", () => {
    expect(finalPhases([phase(1, 1, 300, "Bracket")]).map((p) => p.name)).toEqual(["Bracket"]);
    expect(finalPhases([phase(1, 1, null)]).map((p) => p.id)).toEqual([1]);
  });
});

const slot = (id: number, name: string, playerId: number | null, score: number | null) => ({
  entrant: { id, name, participants: [{ gamerTag: tagOnly(name), player: playerId == null ? null : { id: playerId } }] },
  standing: { stats: { score: { value: score } } },
});
const pick = (entrant: number, name: string) => ({ entrant: { id: entrant }, character: { name } });
function set(over: Partial<RawMajorSet>): RawMajorSet {
  return {
    id: 501,
    fullRoundText: "Grand Final",
    round: 7,
    winnerId: 11,
    completedAt: 1_500_000_000,
    phaseGroup: { phase: { id: 2 } },
    slots: [slot(11, "C9 | Mang0", 1000, 3), slot(12, "Armada", 6189, 2)],
    games: [{ selections: [pick(11, "Fox"), pick(12, "Peach")] }, { selections: [pick(11, "Falco"), pick(12, "Peach")] }, { selections: [pick(11, "Fox"), pick(12, "Fox")] }],
    ...over,
  };
}
const at = { majorSlug: "tournament/genesis-4", eventId: "77", game: "melee" as const, phases: new Map([["2", phase(2, 2, 8, "Top 8")]]) };

describe("toSavedSet", () => {
  it("keeps both players, the score, the winner and each game's characters", () => {
    const row = toSavedSet(set({}), at)!;
    expect(row).toMatchObject({
      set_id: "501",
      phase: "Top 8",
      round: "Grand Final",
      p1_id: "1000",
      p1_name: "C9 | Mang0",
      p1_score: 3,
      p1_chars: ["Fox", "Falco", "Fox"],
      p2_id: "6189",
      p2_score: 2,
      p2_chars: ["Peach", "Peach", "Fox"],
      winner: 1,
      completed_at: new Date(1_500_000_000_000).toISOString(),
    });
  });
  it("puts a phase's losers round right after its winners round", () => {
    const w = toSavedSet(set({ round: 3 }), at)!.sort_order;
    const l = toSavedSet(set({ round: -3 }), at)!.sort_order;
    expect(l).toBe(w + 1);
    expect(w).toBe(2006);
  });
  it("leaves out DQs, byes and unfinished sets", () => {
    expect(toSavedSet(set({ slots: [slot(11, "A", 1, -1), slot(12, "B", 2, 0)] }), at)).toBeNull();
    expect(toSavedSet(set({ slots: [slot(11, "A", 1, null)] }), at)).toBeNull();
    expect(toSavedSet(set({ winnerId: null }), at)).toBeNull();
    expect(toSavedSet(set({ winnerId: 99 }), at)).toBeNull();
  });
  it("keeps a deleted account's set without a player id, and sets without characters", () => {
    const row = toSavedSet(set({ slots: [slot(11, "Deleted user", null, 3), slot(12, "Armada", 6189, 0)], games: null }), at)!;
    expect(row.p1_id).toBeNull();
    expect(row.p1_chars).toEqual([]);
    expect(row.winner).toBe(1);
  });
});

describe("characters", () => {
  it("orders by games played", () => {
    expect(mostPlayed(["Falco", "Fox", "Fox", "Sheik"])).toEqual(["Fox", "Falco", "Sheik"]);
  });
  it("maps start.gg names to Smashy's stock icon keys", () => {
    expect(startggCharacterKey("Rosalina")).toBe("rosalina-and-luma");
    expect(startggCharacterKey("Banjo-Kazooie")).toBe("banjo-and-kazooie");
    expect(startggCharacterKey("Pokemon Trainer")).toBe("pokemon-trainer");
    expect(startggCharacterKey("Mr. Game & Watch")).toBe("mr-game-and-watch");
    expect(startggCharacterKey("Captain Falcon")).toBe("captain-falcon");
  });
  it("sums a bracket's sets per player, by id and by tag", () => {
    const rows = [toSavedSet(set({}), at)!, toSavedSet(set({ id: 502, games: [{ selections: [pick(11, "Falco"), pick(12, "Peach")] }, { selections: [pick(11, "Falco")] }] }), at)!];
    const chars = bracketCharacters(rows);
    expect(chars["1000"]).toEqual(["Falco", "Fox"]); // Falco 3 games, Fox 2
    expect(chars["name:mang0"]).toEqual(["Falco", "Fox"]);
    expect(chars["6189"]).toEqual(["Peach", "Fox"]);
  });

  const chars: MajorCharacters = new Map([["manual/2016-genesis-3|manual-melee-1", new Map([["1000", ["Fox", "Falco"]], ["name:ppmd", ["Falco", "Marth"]], ["6189", ["Peach"]]])]]);
  it("finds a top 8 placing's characters by id, by an admin's link, then by tag", () => {
    const get = (name: string, playerId: string | null, links?: Map<string, string>, hidden?: Set<string> | null) =>
      charactersFor(chars, "manual/2016-genesis-3", "manual-melee-1", { place: 1, name, playerId }, links, hidden);
    expect(get("Mango", "1000")).toEqual(["Fox", "Falco"]);
    expect(get("Armada", null, new Map([["armada", "6189"]]))).toEqual(["Peach"]);
    expect(get("Liquid | PPMD", null)).toEqual(["Falco", "Marth"]);
    expect(get("Nobody", null)).toEqual([]);
  });
  it("shows nothing for players who asked not to be listed, or when that couldn't be checked", () => {
    const row = { place: 1, name: "Mango", playerId: "1000" };
    expect(charactersFor(chars, "manual/2016-genesis-3", "manual-melee-1", row, undefined, new Set(["1000"]))).toEqual([]);
    expect(charactersFor(chars, "manual/2016-genesis-3", "manual-melee-1", row, undefined, null)).toEqual([]);
  });
  it("uses the bracket Smash history names the winner from", () => {
    const ev = (eventId: string, entrants: number, online = false): MajorEvent => ({
      majorSlug: "manual/2016-genesis-3",
      eventId,
      game: "melee",
      name: "Melee Singles",
      entrants,
      teams: false,
      online,
      top8: [{ place: 1, name: "Armada", playerId: "6189" }],
    });
    const events = [ev("manual-melee-2", 100), ev("manual-melee-1", 1000), ev("manual-melee-3", 5000, true)];
    expect(winnerCharacters(events, "melee", chars)).toEqual(["Peach"]);
    expect(winnerIds(events)).toEqual(["6189", "6189", "6189"]);
  });
});

describe("mainBrackets", () => {
  it("keeps each major's biggest bracket per game, biggest first", () => {
    const c = (majorSlug: string, eventId: string, game: "melee" | "ultimate", entrants: number) => ({ majorSlug, eventId, game, entrants, top8: [] });
    const got = mainBrackets([c("a", "1", "melee", 500), c("a", "2", "melee", 900), c("a", "3", "ultimate", 2000), c("b", "4", "melee", 1200)]);
    expect(got.map((x) => x.eventId)).toEqual(["3", "4", "2"]);
  });
});

describe("asMeeting", () => {
  const row = (over: Partial<MajorSetRow>): MajorSetRow => ({
    ...toSavedSet(set({}), at)!,
    major: { name: "GENESIS 4", start_at: "2017-01-20T00:00:00Z" },
    ...over,
  });
  it("reads a set from the first player's side either way round", () => {
    expect(asMeeting(row({}), "1000", "6189", new Map())).toMatchObject({ aWon: true, aScore: 3, bScore: 2, aChars: ["Fox", "Falco"], bChars: ["Peach", "Fox"] });
    expect(asMeeting(row({}), "6189", "1000", new Map())).toMatchObject({ aWon: false, aScore: 2, bScore: 3, aChars: ["Peach", "Fox"] });
  });
  it("counts a tag an admin linked as that player", () => {
    const linked = row({ p1_id: null, p1_name: "Deleted user" });
    expect(asMeeting(linked, "1000", "6189", new Map())).toBeNull();
    expect(asMeeting(row({ p1_id: null, p1_name: "C9 | Mango" }), "1000", "6189", new Map([["mango", "1000"]]))?.aWon).toBe(true);
  });
  it("ignores sets against someone else", () => {
    expect(asMeeting(row({}), "1000", "4465", new Map())).toBeNull();
  });
});

describe("charactersFor with hand-added characters", () => {
  const row = { place: 1, name: "Ken", playerId: null, characters: ["Marth", "Captain Falcon"] };
  it("uses the source's characters when no start.gg sets were saved, and start.gg's when they were", () => {
    expect(charactersFor(new Map(), "manual/2004-game-over", "manual-melee-1", row)).toEqual(["Marth", "Captain Falcon"]);
    const chars: MajorCharacters = new Map([["manual/2004-game-over|manual-melee-1", new Map([["name:ken", ["Fox"]]])]]);
    expect(charactersFor(chars, "manual/2004-game-over", "manual-melee-1", row)).toEqual(["Fox"]);
  });
  it("shows nothing when hidden players couldn't be checked", () => {
    expect(charactersFor(new Map(), "m", "e", row, undefined, null)).toEqual([]);
  });
});
