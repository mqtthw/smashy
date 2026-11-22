import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));

import { bestPerMajor, gameEntrants, toMajorEvents, toTop8, winnersByGame, type RawMajorEvent } from "@/lib/majorEvents";

const solo = (placement: number, name: string, id: number) => ({ placement, entrant: { name, participants: [{ player: { id } }] } });
const team = (placement: number, name: string) => ({ placement, entrant: { name, participants: [{ player: { id: 1 } }, { player: { id: 2 } }] } });

function event(over: Partial<RawMajorEvent>): RawMajorEvent {
  return { id: 1, name: "Melee Singles", state: "COMPLETED", numEntrants: 1365, isOnline: false, videogame: { id: 1 }, teamRosterSize: null, standings: { nodes: [] }, ...over };
}

// Genesis 5 (2018), as start.gg lists it.
const GENESIS_5: RawMajorEvent[] = [
  event({ id: 10, standings: { nodes: [solo(2, "Liquid | Hungrybox", 1004), solo(1, "PG | Plup", 1000), solo(9, "Ninth", 9), solo(7, "A", 7), solo(7, "B", 8)] } }),
  event({ id: 11, name: "Wii U Singles", numEntrants: 674, videogame: { id: 3 }, standings: { nodes: [solo(1, "Echo Fox | MVG | MKLeo", 2000)] } }),
  event({ id: 12, name: "Melee Doubles", numEntrants: 317, teamRosterSize: { maxPlayers: 2 }, standings: { nodes: [team(1, "Plup / Mew2King")] } }),
  event({ id: 13, name: "Smash 64 Singles", numEntrants: 90, videogame: { id: 4 }, standings: { nodes: [] } }), // no standings: skipped
  event({ id: 14, name: "Tekken 7", videogame: { id: 999 }, standings: { nodes: [solo(1, "Someone", 5)] } }), // not Smash: skipped
];

describe("toTop8", () => {
  it("keeps places 1 to 8 (ties included), best first, with the start.gg player id for singles", () => {
    expect(toTop8(GENESIS_5[0].standings!.nodes, false)).toEqual([
      { place: 1, name: "PG | Plup", playerId: "1000" },
      { place: 2, name: "Liquid | Hungrybox", playerId: "1004" },
      { place: 7, name: "A", playerId: "7" },
      { place: 7, name: "B", playerId: "8" },
    ]);
  });
  it("names teams without a player id", () => {
    expect(toTop8([team(1, "Plup / Mew2King")], true)).toEqual([{ place: 1, name: "Plup / Mew2King", playerId: null }]);
  });
});

describe("a major's saved events", () => {
  const saved = toMajorEvents("genesis-5", GENESIS_5);

  it("keeps Smash events with standings", () => {
    expect(saved.map((e) => [e.eventId, e.game, e.teams])).toEqual([["10", "melee", false], ["11", "smash4", false], ["12", "melee", true]]);
  });

  it("names each game's singles winner, in game order (doubles and online events don't count)", () => {
    const online = toMajorEvents("x", [event({ id: 20, numEntrants: 5000, isOnline: true, standings: { nodes: [solo(1, "Online winner", 3)] } })]);
    expect(winnersByGame([...saved, ...online])).toEqual([{ game: "melee", name: "PG | Plup" }, { game: "smash4", name: "Echo Fox | MVG | MKLeo" }]);
  });

  it("gives each game's own entrant count", () => {
    expect(gameEntrants(saved, "smash4")).toBe(674);
    expect(gameEntrants(saved, "melee")).toBe(1365);
    expect(gameEntrants(saved, "ultimate")).toBeNull();
  });
});

describe("bestPerMajor", () => {
  const row = (slug: string, game: "melee" | "smash4", place: number, startAt: string, entrants = 100, eventName = "Singles") =>
    ({ slug, majorName: slug, startAt, game, eventName, entrants, place, side: /amateur|doubles/i.test(eventName) });

  it("keeps each major and game once, its main bracket first, newest first", () => {
    const out = bestPerMajor([
      row("genesis-5", "melee", 2, "2018-01-19"),
      row("genesis-5", "melee", 1, "2018-01-19", 50, "Amateur Bracket"), // a side event: the main bracket's place shows
      row("genesis-5", "smash4", 5, "2018-01-19"),
      row("the-big-house-8", "melee", 1, "2018-10-05"),
    ]);
    expect(out.map((r) => [r.slug, r.game, r.place, r.eventName])).toEqual([
      ["the-big-house-8", "melee", 1, "Singles"],
      ["genesis-5", "melee", 2, "Singles"],
      ["genesis-5", "smash4", 5, "Singles"],
    ]);
  });

  it("keeps a side bracket when the player has no main-bracket placing there", () => {
    const out = bestPerMajor([row("shine-2018", "melee", 3, "2018-08-24", 80, "Melee Doubles"), row("shine-2018", "melee", 1, "2018-08-24", 40, "Amateur Bracket")]);
    expect(out.map((r) => [r.place, r.eventName])).toEqual([[1, "Amateur Bracket"]]);
  });
});
