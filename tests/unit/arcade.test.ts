import { describe, expect, it } from "vitest";
import { ARCADE_FIRST_DAY, dayNumber, hlAnswer, hlPool, hlRound, majorHint, majorOptions, majorPuzzlePool, matchOptions, pickDaily, shareSquares, type ArcadeMajor } from "@/lib/arcade";

const major = (over: Partial<ArcadeMajor>): ArcadeMajor => ({ slug: "tournament/a", name: "A", game: "melee", date: "2016-01-15T00:00:00Z", entrants: 100, top8: ["1", "2", "3", "4", "5", "6", "7", "8"], ...over });
const list = [
  major({ slug: "tournament/genesis-3", name: "Genesis 3", entrants: 1800 }),
  major({ slug: "tournament/the-big-house-6", name: "The Big House 6", date: "2016-10-07T00:00:00Z", entrants: 1500 }),
  major({ slug: "manual/apex-2009", name: "Apex", date: "2009-08-01T00:00:00Z", entrants: null }),
  major({ slug: "manual/apex-2010", name: "Apex", date: "2010-08-01T00:00:00Z", entrants: 200, top8: ["a", "b"] }),
  major({ slug: "tournament/genesis-3", name: "Genesis 3", game: "ultimate", entrants: 900 }),
];

describe("the Arcade", () => {
  it("numbers the days from the first one, by UTC day", () => {
    expect(dayNumber(ARCADE_FIRST_DAY)).toBe(1);
    expect(dayNumber(ARCADE_FIRST_DAY + 86400_000 - 1)).toBe(1);
    expect(dayNumber(ARCADE_FIRST_DAY + 86400_000)).toBe(2);
    expect(dayNumber(ARCADE_FIRST_DAY - 5)).toBe(1);
  });

  it("gives everyone the same pick on a day, and moves on the next days", () => {
    const items = Array.from({ length: 50 }, (_, i) => i);
    expect(pickDaily(items, 3)).toBe(pickDaily(items, 3));
    expect(new Set(Array.from({ length: 30 }, (_, d) => pickDaily(items, d + 1))).size).toBeGreaterThan(15);
    expect(pickDaily([], 1)).toBeNull();
  });

  it("only makes a puzzle of a major with a full top 8 and a known size", () => {
    expect(majorPuzzlePool(list).map((m) => `${m.slug}|${m.game}`)).toEqual(["tournament/genesis-3|melee", "tournament/genesis-3|ultimate", "tournament/the-big-house-6|melee"]);
  });

  it("offers the game's majors by name, with the year where two share a name", () => {
    expect(majorOptions(list, "melee").map((o) => o.name)).toEqual(["Apex (2009)", "Apex (2010)", "Genesis 3", "The Big House 6"]);
    expect(majorOptions(list, "ultimate")).toHaveLength(1);
  });

  it("finds choices by any typed words and leaves out earlier guesses", () => {
    const options = majorOptions(list, "melee");
    expect(matchOptions(options, "big 6", []).map((o) => o.name)).toEqual(["The Big House 6"]);
    expect(matchOptions(options, "apex", ["manual/apex-2009"]).map((o) => o.name)).toEqual(["Apex (2010)"]);
    expect(matchOptions(options, "  ", [])).toEqual([]);
  });

  it("says whether the answer was later or earlier, and bigger or smaller", () => {
    const [apex09, apex10, g3] = majorOptions(list, "melee");
    expect(majorHint(apex10, g3)).toEqual({ right: false, year: "higher", entrants: "higher" });
    expect(majorHint(g3, apex10)).toEqual({ right: false, year: "lower", entrants: "lower" });
    expect(majorHint(apex09, g3).entrants).toBeNull();
    expect(majorHint(g3, g3)).toEqual({ right: true, year: "same", entrants: "same" });
  });

  it("writes the squares to share", () => {
    expect(shareSquares([false, false, true], 5)).toBe("🟥🟥🟩 3/5");
    expect(shareSquares([false, false, false, false, false], 5)).toBe("🟥🟥🟥🟥🟥 X/5");
  });

  it("makes Higher or lower rounds from two majors of one game, never a tie", () => {
    const pool = hlPool(list);
    expect(pool).toHaveLength(4); // the one without a size is left out
    let i = 0;
    const rand = () => ((i++ * 0.37) % 1);
    for (let n = 0; n < 50; n++) {
      const r = hlRound(pool, rand);
      if (!r) continue;
      expect(r.a.game).toBe(r.b.game);
      expect(r.a).not.toBe(r.b);
      if (r.question === "entrants") expect(r.a.entrants).not.toBe(r.b.entrants);
      else expect(r.a.date).not.toBe(r.b.date);
    }
    expect(hlRound([], Math.random)).toBeNull();
    const [g3, tbh] = pool;
    expect(hlAnswer({ question: "entrants", a: tbh, b: g3 })).toBe("b");
    expect(hlAnswer({ question: "first", a: tbh, b: g3 })).toBe("b");
  });
});

import { pickSome, playerGameOfDay, playerHint, playerPuzzlePool, setsShare, PLAYER_GAME_TURNS, type PlayerOption } from "@/lib/arcade";

const player = (over: Partial<PlayerOption>): PlayerOption => ({ slug: "1", name: "A", wins: 0, top8s: 3, firstYear: 2015, lastYear: 2019, main: "fox", mainName: "Fox", ...over });

describe("the Arcade's player games", () => {
  it("only makes a puzzle of a player with a major win or six top 8s", () => {
    const pool = playerPuzzlePool([player({ slug: "3", top8s: 6 }), player({ slug: "2" }), player({ slug: "1", wins: 1, top8s: 1 })]);
    expect(pool.map((p) => p.slug)).toEqual(["1", "3"]);
  });

  it("gives every game a turn", () => {
    expect(playerGameOfDay(1)).toBe("melee");
    expect(playerGameOfDay(PLAYER_GAME_TURNS.length + 2)).toBe("ultimate");
    expect(new Set(PLAYER_GAME_TURNS).size).toBe(6);
  });

  it("compares a guess with the answer, and says nothing about mains it doesn't know", () => {
    const answer = player({ slug: "9", wins: 5, top8s: 20, firstYear: 2010, lastYear: 2019, main: "marth" });
    expect(playerHint(player({}), answer)).toEqual({ right: false, wins: "higher", top8s: "higher", firstYear: "lower", lastYear: "same", main: false });
    expect(playerHint(player({ main: null }), answer).main).toBeNull();
    expect(playerHint(answer, answer).right).toBe(true);
  });

  it("picks different sets for a round, and writes the score to share", () => {
    let i = 0;
    const picked = pickSome([1, 2, 3, 4, 5], 3, () => ((i++ * 0.41) % 1));
    expect(new Set(picked).size).toBe(3);
    expect(pickSome([1, 2], 5, Math.random)).toHaveLength(2);
    expect(setsShare([true, false, true])).toBe("🟩🟥🟩 2/3");
  });
});
