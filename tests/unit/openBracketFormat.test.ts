import { describe, expect, it } from "vitest";
import { buildElimination, buildFinal, buildRoundRobin, buildSwissRound, finalPlacements, reportResult, swissDropped, swissSeeds, type EngineSet } from "@/lib/bracketEngine";
import { toOpenBracketFormat, type ObfInput, type ObfPlayer, type ObfSet, type ObfTournament } from "@/lib/openBracketFormat";
// The official Open Bracket Format v1.0 schema, copied unchanged from
// github.com/openbracketformat/openbracketformat (MIT License: fixtures/openBracketFormat.LICENSE.md).
import schema from "./fixtures/openBracketFormat-v1.0.schema.json";

// ---------- A small checker for the parts of JSON Schema the official file uses ----------

type Schema = {
  $ref?: string;
  type?: string;
  enum?: unknown[];
  properties?: Record<string, Schema>;
  required?: string[];
  additionalProperties?: boolean;
  items?: Schema;
  minimum?: number;
  minLength?: number;
  format?: string;
};
const root = schema as unknown as Schema & { definitions: Record<string, Schema> };

function problems(value: unknown, s: Schema, path = "$"): string[] {
  const out: string[] = [];
  if (s.$ref) out.push(...problems(value, root.definitions[s.$ref.replace("#/definitions/", "")], path));
  if (s.enum && !s.enum.includes(value)) out.push(`${path}: ${JSON.stringify(value)} isn't one of ${s.enum.join(", ")}`);
  if (s.type === "string") {
    if (typeof value !== "string") out.push(`${path}: not text`);
    else {
      if (s.minLength !== undefined && value.length < s.minLength) out.push(`${path}: too short`);
      if (s.format === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) out.push(`${path}: not a date`);
    }
  }
  if (s.type === "integer") {
    if (!Number.isInteger(value)) out.push(`${path}: not a whole number`);
    else if (s.minimum !== undefined && (value as number) < s.minimum) out.push(`${path}: below ${s.minimum}`);
  }
  if (s.type === "array") {
    if (!Array.isArray(value)) out.push(`${path}: not a list`);
    else if (s.items) value.forEach((v, i) => out.push(...problems(v, s.items!, `${path}[${i}]`)));
  }
  if (s.type === "object") {
    if (typeof value !== "object" || value === null || Array.isArray(value)) out.push(`${path}: not an object`);
    else {
      for (const k of s.required ?? []) if (!(k in value)) out.push(`${path}: missing ${k}`);
      for (const [k, v] of Object.entries(value)) {
        const prop = s.properties?.[k];
        if (prop) out.push(...problems(v, prop, `${path}.${k}`));
        else if (s.additionalProperties === false) out.push(`${path}: field ${k} isn't in the format`);
      }
    }
  }
  return out;
}

/** What a reader actually gets: the file after a trip through JSON, checked against the schema. */
const check = (file: ObfTournament) => problems(JSON.parse(JSON.stringify(file)), root);

// ---------- Building and playing brackets ----------

const ids = (n: number) => Array.from({ length: n }, (_, i) => `id-${i + 1}`);
const seedNo = (id: string | null) => Number(id?.slice(3) ?? 999);

function apply(sets: EngineSet[], changed: EngineSet[]): EngineSet[] {
  const m = new Map(sets.map((s) => [s.key, s]));
  for (const c of changed) m.set(c.key, c);
  return [...m.values()];
}

type Decide = (s: EngineSet) => { winner: 1 | 2; score: [number, number] } | undefined;

/** Play every set that's ready (up to `limit`): the better seed wins 2-0 unless `decide` says otherwise. */
function play(sets: EngineSet[], decide?: Decide, limit = 500): EngineSet[] {
  for (let n = 0; n < limit; n++) {
    const next = sets.find((s) => s.state === "ready");
    if (!next) return sets;
    const better: 1 | 2 = seedNo(next.p[0].id) < seedNo(next.p[1].id) ? 1 : 2;
    const r = decide?.(next) ?? { winner: better, score: (better === 1 ? [2, 0] : [0, 2]) as [number, number] };
    sets = apply(sets, reportResult(sets, next.key, r.winner, r.score));
  }
  return sets;
}

function everyone(n: number, change: Record<string, Partial<ObfPlayer>> = {}): Map<string, ObfPlayer> {
  return new Map(
    ids(n).map((id, i) => [id, { tag: `Tag${i + 1}`, handle: `tag${i + 1}`, walkIn: false, seed: i + 1, joinedAt: `2026-11-10T20:00:${String(i).padStart(2, "0")}+00:00`, ...change[id] }]),
  );
}

function fileOf(sets: EngineSet[], format: ObfInput["event"]["format"], players: Map<string, ObfPlayer>, games: Record<string, { stage: string; winner: 1 | 2 }[]> = {}, more: Partial<ObfInput["event"]> = {}): ObfTournament {
  return toOpenBracketFormat({
    event: {
      id: "event-1",
      name: "Tuesday Night Melee 12",
      gameName: "Super Smash Bros. Melee",
      format,
      startsAt: "2026-11-11T02:00:00Z", // 8 pm on the 10th in Texas
      timezone: "America/Chicago",
      online: false,
      location: "The Arcade",
      region: null,
      rulesetName: "Standard Melee",
      host: { tag: "Hostess", handle: "hostess" },
      challongeUrl: null,
      ...more,
    },
    origin: "https://smashy.example",
    sets: sets.map((set) => ({ set, games: games[set.key] ?? [], completedAt: set.state === "done" ? "2026-11-11T03:00:00+00:00" : null })),
    players,
    generatedAt: "2026-11-11T05:00:00.000Z",
  });
}

/** Every player's sets must form one line from their first set to their last, with matching back-links. */
function expectChains(file: ObfTournament) {
  const byId = new Map(file.sets.map((s) => [s.setID, s]));
  for (const e of file.entrants) {
    const mine = file.sets.filter((s) => s.entrant1ID === e.entrantID || s.entrant2ID === e.entrantID);
    const nextOf = (s: ObfSet) => (s.entrant1ID === e.entrantID ? s.entrant1NextSetID : s.entrant2NextSetID);
    const prevOf = (s: ObfSet) => (s.entrant1ID === e.entrantID ? s.entrant1PrevSetID : s.entrant2PrevSetID);
    if (mine.length === 0) continue;
    const starts = mine.filter((s) => !prevOf(s));
    expect(starts.length, `${e.entrantID} has one first set`).toBe(1);
    let at: ObfSet | undefined = starts[0];
    let seen = 0;
    while (at && seen <= mine.length) {
      seen++;
      const nextId = nextOf(at);
      const next: ObfSet | undefined = nextId ? byId.get(nextId) : undefined;
      if (nextId) {
        expect(next, `${e.entrantID}: next set ${nextId} is in the file`).toBeDefined();
        expect(prevOf(next!), `${e.entrantID}: back-link of ${nextId}`).toBe(at.setID);
      }
      at = next;
    }
    expect(seen, `${e.entrantID} reaches all their sets`).toBe(mine.length);
  }
}

describe("the schema checker", () => {
  it("catches files that break the format", () => {
    expect(problems({ event: {}, sets: [], entrants: [] }, root)).toContain("$.event: missing name");
    expect(problems({ event: { name: "x", extra: 1 }, sets: [], entrants: [] }, root)).toContain("$.event: field extra isn't in the format");
    expect(problems({ event: { name: "x" }, sets: [{ setID: "1", entrant1Result: "won" }], entrants: [{ entrantID: "" }] }, root).length).toBe(2);
    expect(problems({ event: { name: "x", date: "11/10/2026" }, sets: [], entrants: [{ entrantID: "a", initialSeed: 0 }] }, root).length).toBe(2);
    expect(problems({ event: { name: "x" }, sets: [], entrants: [] }, root)).toEqual([]);
  });
});

describe("a finished double elimination bracket", () => {
  const sets = play(buildElimination(ids(5), { double: true, bestOf: 3 }));
  const file = fileOf(sets, "double_elim", everyone(5));

  it("follows the official format", () => {
    expect(check(file)).toEqual([]);
    expect(file.version).toBe("v1.0");
  });

  it("describes the event", () => {
    expect(file.event).toMatchObject({
      name: "Tuesday Night Melee 12",
      date: "2026-11-10",
      gameName: "Super Smash Bros. Melee",
      tournamentStructure: "double-elim",
      phases: [{ phaseID: "bracket", phaseStructure: "double-elim" }],
      ruleset: "Standard Melee",
      originURL: "https://smashy.example/host/event-1",
      numberEntrants: 5,
    });
    expect(file.event.other).toMatchObject({ source: "Smashy", status: "completed", location: "The Arcade", host: { tag: "Hostess", smashyHandle: "hostess" }, generatedAt: "2026-11-11T05:00:00.000Z" });
    expect(file.event.other).not.toHaveProperty("challongeURL");
  });

  it("lists every player with their seed and placement", () => {
    expect(file.entrants.map((e) => [e.entrantID, e.entrantTag, e.initialSeed])).toEqual(ids(5).map((id, i) => [id, `Tag${i + 1}`, i + 1]));
    const places = new Map(finalPlacements(sets).map((p) => [p.id, p.place]));
    for (const e of file.entrants) expect(e.finalPlacement).toBe(places.get(e.entrantID));
    expect(file.entrants[0]).toMatchObject({ finalPlacement: 1, other: { smashyHandle: "tag1", profileURL: "https://smashy.example/u/tag1" } });
  });

  it("holds the sets that were played, and no byes", () => {
    const realSets = sets.filter((s) => s.state === "done");
    expect(sets.some((s) => s.state === "bye")).toBe(true); // 5 players: the top seeds start with byes
    expect(file.sets.map((s) => s.setID).sort()).toEqual(realSets.map((s) => s.key).sort());
    for (const s of file.sets) {
      expect(s.status).toBe("completed");
      expect(s.entrant1ID && s.entrant2ID).toBeTruthy();
      expect([s.entrant1Result, s.entrant2Result].sort()).toEqual(["lose", "win"]);
      expect(s.setFormat).toBe("bestof3");
      expect(s.phaseID).toBe("bracket");
      expect(s.other.url).toBe(`https://smashy.example/host/set/${s.setID}`);
    }
    const gf = file.sets.find((s) => s.roundID === "Grand Final")!;
    expect(gf).toMatchObject({ entrant1ID: "id-1", entrant1Result: "win", entrant1Score: 2, entrant2Score: 0, other: { side: "grand-final" } });
    expect(gf.entrant1NextSetID).toBeUndefined(); // the winners-side player won: no reset
    expect(file.sets.some((s) => s.roundID === "Grand Final Reset")).toBe(false);
  });

  it("links each player's sets in order, straight through byes", () => {
    expectChains(file);
    // Seed 1 had a bye in the first round: their first set has nothing before it.
    const first = file.sets.find((s) => s.entrant1ID === "id-1" || s.entrant2ID === "id-1")!;
    expect(first.entrant1ID === "id-1" ? first.entrant1PrevSetID : first.entrant2PrevSetID).toBeUndefined();
  });
});

describe("special cases in elimination brackets", () => {
  it("a grand final reset is both finalists' next set", () => {
    const sets = play(buildElimination(ids(11), { double: true, bestOf: 3, bestOfTop: 5 }), (s) => (s.bracket === "GF" ? { winner: 2, score: [1, 3] } : undefined));
    const file = fileOf(sets, "double_elim", everyone(11));
    expect(check(file)).toEqual([]);
    expectChains(file);
    const gf = file.sets.find((s) => s.roundID === "Grand Final")!;
    const reset = file.sets.find((s) => s.roundID === "Grand Final Reset")!;
    expect(gf).toMatchObject({ entrant1NextSetID: reset.setID, entrant2NextSetID: reset.setID, entrant1Score: 1, entrant2Score: 3, setFormat: "bestof5" });
    expect(reset).toMatchObject({ entrant1PrevSetID: gf.setID, entrant2PrevSetID: gf.setID, status: "completed" });
    expect(file.entrants.filter((e) => e.finalPlacement === 1).length).toBe(1);
    expect(file.entrants.every((e) => e.finalPlacement !== undefined)).toBe(true);
  });

  it("a DQ is marked, has no score, and ends that player's event", () => {
    let sets = buildElimination(ids(4), { double: true, bestOf: 3 });
    const first = sets.find((s) => s.p.some((p) => p.id === "id-1"))!;
    const slot = first.p[0].id === "id-1" ? 1 : 2;
    sets = apply(sets, reportResult(sets, first.key, slot === 1 ? 2 : 1, slot === 1 ? [-1, 0] : [0, -1]));
    sets = play(sets);
    const file = fileOf(sets, "double_elim", everyone(4));
    expect(check(file)).toEqual([]);
    expectChains(file);
    const dq = file.sets.find((s) => s.setID === first.key)!;
    expect(slot === 1 ? [dq.entrant1Result, dq.entrant2Result] : [dq.entrant2Result, dq.entrant1Result]).toEqual(["dq", "win"]);
    expect(dq.entrant1Score).toBeUndefined();
    expect(dq.entrant2Score).toBeUndefined();
    expect(slot === 1 ? dq.entrant1NextSetID : dq.entrant2NextSetID).toBeUndefined();
    expect(file.sets.filter((s) => s.entrant1ID === "id-1" || s.entrant2ID === "id-1").length).toBe(1);
  });

  it("single elimination: losers are out, rounds are named plainly", () => {
    const file = fileOf(play(buildElimination(ids(4), { double: false, bestOf: 3 })), "single_elim", everyone(4));
    expect(check(file)).toEqual([]);
    expectChains(file);
    expect(file.event.tournamentStructure).toBe("single-elim");
    expect(file.sets.map((s) => s.roundID).sort()).toEqual(["Final", "Semi-Final", "Semi-Final"]);
    expect(file.entrants.map((e) => e.finalPlacement)).toEqual([1, 2, 3, 3]);
    const semi = file.sets.find((s) => s.roundID === "Semi-Final")!;
    const loserNext = semi.entrant1Result === "lose" ? semi.entrant1NextSetID : semi.entrant2NextSetID;
    expect(loserNext).toBeUndefined();
  });

  it("reads seeds off the bracket itself, even when the saved seeds are missing", () => {
    const file = fileOf(play(buildElimination(ids(6), { double: true, bestOf: 3 })), "double_elim", everyone(6, { "id-1": { seed: null }, "id-4": { seed: 99 } }));
    expect(file.entrants.map((e) => [e.entrantID, e.initialSeed])).toEqual(ids(6).map((id, i) => [id, i + 1]));
  });
});

describe("players without a public profile, and walk-ins", () => {
  const sets = play(buildElimination(ids(4), { double: true, bestOf: 3 }));
  const players = everyone(4, { "id-2": { tag: null, handle: null }, "id-3": { walkIn: true, handle: null, tag: "Walker" } });
  players.delete("id-4"); // their sign-up row is gone (a deleted account)
  const file = fileOf(sets, "double_elim", players);

  it("never names a hidden player or gives out their Smashy id", () => {
    expect(check(file)).toEqual([]);
    const text = JSON.stringify(file);
    expect(text).not.toContain("id-2");
    expect(text).not.toContain("Tag2");
    expect(text).not.toContain("tag2");
    expect(text).not.toContain("id-4");
    expect(file.entrants.find((e) => e.initialSeed === 2)).toEqual({ entrantID: "hidden-1", initialSeed: 2, finalPlacement: 2, other: { nameHidden: true } });
    expect(file.entrants.find((e) => e.initialSeed === 4)).toMatchObject({ entrantID: "hidden-2", other: { nameHidden: true } });
    // Their sets still count, under the stand-in id.
    expect(file.sets.filter((s) => s.entrant1ID === "hidden-1" || s.entrant2ID === "hidden-1").length).toBeGreaterThan(0);
    expectChains(file);
  });

  it("marks walk-ins and links accounts", () => {
    expect(file.entrants.find((e) => e.entrantID === "id-3")).toMatchObject({ entrantTag: "Walker", other: { walkIn: true } });
    expect(file.entrants.find((e) => e.entrantID === "id-1")).toMatchObject({ entrantTag: "Tag1", other: { smashyHandle: "tag1" } });
  });
});

describe("games", () => {
  it("are passed on only when they add up to the set's score", () => {
    const sets = play(buildElimination(ids(4), { double: true, bestOf: 3 }));
    const [a, b, c] = sets.filter((s) => s.state === "done");
    const w = (s: EngineSet) => s.winner!;
    const file = fileOf(sets, "double_elim", everyone(4), {
      [a.key]: [{ stage: "Battlefield", winner: w(a) }, { stage: "", winner: w(a) }],
      [b.key]: [{ stage: "Battlefield", winner: w(b) }], // one game recorded, but the set was 2-0
      [c.key]: [{ stage: "Dream Land", winner: w(c) }, { stage: "Fountain of Dreams", winner: w(c) === 1 ? 2 : 1 }, { stage: "Battlefield", winner: w(c) }], // 2-1, but saved as 2-0
    });
    expect(check(file)).toEqual([]);
    const win = (slot: 1 | 2) => (w(a) === slot ? "win" : "lose");
    expect(file.sets.find((s) => s.setID === a.key)!.games).toEqual([
      { gameNumber: 1, stage: "Battlefield", entrant1Result: win(1), entrant2Result: win(2) },
      { gameNumber: 2, entrant1Result: win(1), entrant2Result: win(2) },
    ]);
    expect(file.sets.find((s) => s.setID === b.key)!.games).toBeUndefined();
    expect(file.sets.find((s) => s.setID === c.key)!.games).toBeUndefined();
  });
});

describe("a round robin", () => {
  const sets = play(buildRoundRobin(ids(10), { bestOf: 3 }));
  const file = fileOf(sets, "round_robin", everyone(10));

  it("follows the format, with a phase per pool and no bracket links", () => {
    expect(check(file)).toEqual([]);
    expect(file.event).toMatchObject({ tournamentStructure: "round-robin", phases: [{ phaseID: "pool-1", phaseStructure: "round-robin" }, { phaseID: "pool-2", phaseStructure: "round-robin" }] });
    expect(file.sets.length).toBe(sets.length);
    for (const s of file.sets) {
      expect(["pool-1", "pool-2"]).toContain(s.phaseID);
      expect(s.other).toMatchObject({ side: "round-robin", pool: Number(s.phaseID.slice(5)) });
      expect(s.roundID).toMatch(/^Round \d+$/);
      expect(s.entrant1NextSetID ?? s.entrant2NextSetID ?? s.entrant1PrevSetID ?? s.entrant2PrevSetID).toBeUndefined();
    }
  });

  it("ranks everyone together and seeds them in seeding order", () => {
    expect(file.entrants.map((e) => e.initialSeed)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const places = new Map(finalPlacements(sets).map((p) => [p.id, p.place]));
    for (const e of file.entrants) expect(e.finalPlacement).toBe(places.get(e.entrantID));
  });

  it("falls back to sign-up order when nobody was seeded", () => {
    const unseeded = everyone(10);
    for (const [, p] of unseeded) p.seed = null;
    unseeded.get("id-7")!.joinedAt = "2026-11-10T19:00:00+00:00"; // signed up first
    const seeded = fileOf(sets, "round_robin", unseeded);
    expect(seeded.entrants.map((e) => e.entrantID).slice(0, 3)).toEqual(["id-7", "id-1", "id-2"]);
  });
});

describe("a bracket still being played", () => {
  it("shows what's known so far and no placements", () => {
    let sets = play(buildElimination(ids(8), { double: true, bestOf: 3 }), undefined, 2);
    const live = sets.find((s) => s.state === "ready")!;
    sets = sets.map((s) => (s.key === live.key ? { ...s, state: "live" as const } : s));
    const file = fileOf(sets, "double_elim", everyone(8), { [live.key]: [{ stage: "Battlefield", winner: 1 }] });
    expect(check(file)).toEqual([]);
    expect(file.event.other.status).toBe("in_progress");
    expect(file.entrants.every((e) => e.finalPlacement === undefined)).toBe(true);
    expect(file.sets.filter((s) => s.status === "completed").length).toBe(2);
    const started = file.sets.find((s) => s.setID === live.key)!;
    expect(started).toMatchObject({ status: "started", games: [{ gameNumber: 1, stage: "Battlefield", entrant1Result: "win", entrant2Result: "lose" }] });
    expect(started.entrant1Result ?? started.entrant1Score).toBeUndefined();
    // Sets nobody has reached yet are in the file (the bracket's shape), without players or results.
    const final = file.sets.find((s) => s.roundID === "Grand Final")!;
    expect(final).toMatchObject({ status: "pending" });
    expect(final.entrant1ID ?? final.entrant2ID ?? final.entrant1Result).toBeUndefined();
    // A finished set already points its players at their next sets, even though those aren't played yet.
    const done = file.sets.find((s) => s.status === "completed")!;
    expect(done.entrant1NextSetID && done.entrant2NextSetID).toBeTruthy();
    expect(file.sets.some((s) => s.roundID === "Grand Final Reset")).toBe(false);
  });
});

describe("a Swiss event", () => {
  // 5 players, the usual 3 rounds: every round has a bye, which isn't a set anyone played.
  let sets = play(buildSwissRound(ids(5).map((id, i) => ({ id, seed: i + 1 })), [], { bestOf: 3 }));
  for (let round = 2; round <= 3; round++) {
    const dropped = swissDropped(sets);
    sets = play([...sets, ...buildSwissRound(swissSeeds(sets).filter((p) => !dropped.has(p.id)), sets, { bestOf: 3 })]);
  }
  const file = fileOf(sets, "swiss", everyone(5));

  it("follows the format: one phase, rounds as rounds, byes left out, no bracket links", () => {
    expect(check(file)).toEqual([]);
    expect(file.event).toMatchObject({ tournamentStructure: "swiss", phases: [{ phaseID: "bracket", phaseStructure: "swiss" }], numberEntrants: 5 });
    expect(file.sets).toHaveLength(6); // 2 sets a round for 3 rounds; the 3 byes aren't listed
    expect([...new Set(file.sets.map((x) => x.roundID))]).toEqual(["Round 1", "Round 2", "Round 3"]);
    for (const x of file.sets) {
      expect(x.other).toMatchObject({ side: "swiss" });
      expect(x.entrant1NextSetID ?? x.entrant2NextSetID ?? x.entrant1PrevSetID ?? x.entrant2PrevSetID).toBeUndefined();
    }
  });

  it("gives every player their final place from the standings", () => {
    const places = new Map(finalPlacements(sets).map((p) => [p.id, p.place]));
    expect(file.entrants.map((e) => e.finalPlacement).sort()).toEqual([...places.values()].sort());
    expect(Math.min(...places.values())).toBe(1);
  });
});

describe("pools into a final bracket", () => {
  const pools = play(buildRoundRobin(ids(10), { bestOf: 3 }));
  const waiting = fileOf(pools, "round_robin", everyone(10), {}, { finalFormat: "double_elim" });
  const sets = play([...pools, ...buildFinal(pools, 4, { double: true, bestOf: 3 })]);
  const file = fileOf(sets, "round_robin", everyone(10), {}, { finalFormat: "double_elim" });

  it("doesn't call the event finished while the final bracket hasn't been started", () => {
    expect(check(waiting)).toEqual([]);
    expect(waiting.entrants.every((e) => e.finalPlacement === undefined)).toBe(true);
  });

  it("follows the format, with a phase per pool and one for the final bracket", () => {
    expect(check(file)).toEqual([]);
    expect(file.event.tournamentStructure).toBe("round-robin into double-elim");
    expect(file.event.phases).toEqual([
      { phaseID: "pool-1", phaseStructure: "round-robin" },
      { phaseID: "pool-2", phaseStructure: "round-robin" },
      { phaseID: "final", phaseStructure: "double-elim" },
    ]);
    const final = file.sets.filter((x) => x.phaseID === "final");
    expect(final.length).toBeGreaterThanOrEqual(6); // 4 players, double elimination
    // Listed in the order played: every pool set before the first set of the final.
    expect(file.sets.findIndex((x) => x.phaseID === "final")).toBe(file.sets.length - final.length);
    expect(final.some((x) => x.entrant1NextSetID || x.entrant2NextSetID)).toBe(true); // bracket sets lead into one another
    expect(file.sets.filter((x) => x.phaseID !== "final").every((x) => !x.entrant1NextSetID && !x.entrant2NextSetID)).toBe(true); // pool sets don't
  });

  it("places everyone and keeps the seeds the event started with", () => {
    const places = new Map(finalPlacements(sets).map((p) => [p.id, p.place]));
    expect(file.entrants.map((e) => [e.entrantID, e.finalPlacement])).toEqual(ids(10).map((id) => [id, places.get(id)]));
    expect(file.entrants.map((e) => e.initialSeed)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});
