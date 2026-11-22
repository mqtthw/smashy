import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));

import { pickStartggEvent, toStandings } from "@/lib/majorStandings";

const solo = (placement: number, name: string, id: number) => ({ placement, entrant: { name, participants: [{ player: { id } }] } });
const MELEE = 1;
const ULTIMATE = 1386;

describe("toStandings", () => {
  it("keeps every placing, best first, with player ids for singles", () => {
    const rows = toStandings([solo(17, "C", 3), solo(1, "A", 1), solo(9, "B", 2)], false);
    expect(rows).toEqual([
      { place: 1, name: "A", playerId: "1" },
      { place: 9, name: "B", playerId: "2" },
      { place: 17, name: "C", playerId: "3" },
    ]);
  });

  it("gives teams no player id", () => {
    const team = { placement: 1, entrant: { name: "A + B", participants: [{ player: { id: 1 } }, { player: { id: 2 } }] } };
    expect(toStandings([team], true)).toEqual([{ place: 1, name: "A + B", playerId: null }]);
  });

  it("leaves out deleted accounts and empty places", () => {
    expect(toStandings([solo(1, "A", 1), solo(2, "Deleted User", 9), { placement: 3, entrant: null }], false)).toEqual([{ place: 1, name: "A", playerId: "1" }]);
    expect(toStandings(null, false)).toEqual([]);
  });
});

describe("pickStartggEvent", () => {
  const ev = (id: number, game: number, numEntrants: number, extra: { isOnline?: boolean; maxPlayers?: number } = {}) => ({
    id,
    numEntrants,
    isOnline: extra.isOnline ?? false,
    videogame: { id: game },
    teamRosterSize: { maxPlayers: extra.maxPlayers ?? 1 },
  });

  it("takes the biggest in-person singles bracket of the game", () => {
    const events = [ev(1, MELEE, 200), ev(2, MELEE, 600), ev(3, MELEE, 900, { maxPlayers: 2 }), ev(4, MELEE, 1000, { isOnline: true }), ev(5, ULTIMATE, 2000)];
    expect(pickStartggEvent(events, "melee", 620)?.id).toBe(2);
  });

  it("refuses a bracket whose size is off by more than a quarter", () => {
    expect(pickStartggEvent([ev(2, MELEE, 600)], "melee", 1000)).toBeNull();
    expect(pickStartggEvent([ev(2, MELEE, 600)], "melee", null)?.id).toBe(2);
    expect(pickStartggEvent([ev(5, ULTIMATE, 2000)], "melee", 600)).toBeNull();
  });
});
