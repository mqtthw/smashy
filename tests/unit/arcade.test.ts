import { describe, expect, it } from "vitest";
import { ARCADE_FIRST_DAY, dayNumber, HL_STATS, HL_TOPIC_LEN, hlIsHigher, hlMajorCards, hlNext, hlStart, hlStats, hlTopic, hlValue, majorHint, majorOptions, majorPuzzlePool, matchOptions, pickDaily, shareSquares, type ArcadeMajor, type HlCard, type HlStat } from "@/lib/arcade";

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

  describe("Higher or lower (the chain)", () => {
    const player = (n: number, wins: number, top8s: number): HlCard => ({ id: `p:melee:${n}`, name: `P${n}`, game: "melee", year: null, wins, top8s });
    const major = (n: number, entrants: number): HlCard => ({ id: `m:melee:${n}`, name: `M${n}`, game: "melee", year: 2010 + n, entrants });
    const pool = [...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => player(n, n % 4, n * 3)), ...[1, 2, 3, 4, 5, 6, 7].map((n) => major(n, n * 100))];
    let i = 0;
    const rand = () => (i++ * 0.37) % 1;

    it("keeps the bigger half of each game's majors", () => {
      const cards = hlMajorCards(list);
      expect(cards.every((c) => c.entrants !== undefined && c.year !== null)).toBe(true);
      expect(cards.length).toBeLessThan(list.length); // the one without a size and the smaller ones are left out
    });

    it("plays only the topics with enough cards", () => {
      expect(hlStats(pool)).toEqual(["entrants", "wins", "top8s"]);
      expect(hlStats(pool.filter((c) => c.year === null))).toEqual(["wins", "top8s"]);
      expect(hlStart([], rand)).toBeNull();
    });

    it("never deals a tie, a repeat or a card without the topic's number", () => {
      for (let n = 0; n < 60; n++) {
        const shown = pool[n % pool.length];
        const stat: HlStat = shown.year === null ? (n % 2 ? "wins" : "top8s") : "entrants";
        const used = new Set([pool[(n + 3) % pool.length].id]);
        const next = hlNext(pool, stat, shown, used, n % 20, rand);
        if (!next) continue;
        expect(next.id).not.toBe(shown.id);
        expect(used.has(next.id)).toBe(false);
        expect(hlValue(next, stat)).toBeDefined();
        expect(hlValue(next, stat)).not.toBe(hlValue(shown, stat));
      }
    });

    it("deals closer numbers as the streak grows", () => {
      const majors = Array.from({ length: 30 }, (_, n) => major(n + 1, (n + 1) * 50));
      const shown = majors[14]; // 750
      const gap = (streak: number) => {
        let sum = 0;
        for (let n = 0; n < 40; n++) sum += Math.abs(hlValue(hlNext(majors, "entrants", shown, new Set(), streak, () => n / 40)!, "entrants")! - 750);
        return sum / 40;
      };
      expect(gap(15)).toBeLessThan(gap(0) / 2);
    });

    it("changes the topic every five right answers", () => {
      expect(hlTopic(HL_STATS, "wins", 3, rand)).toBe("wins");
      expect(hlTopic(HL_STATS, "wins", 0, rand)).toBe("wins");
      expect(hlTopic(HL_STATS, "wins", HL_TOPIC_LEN, rand)).not.toBe("wins");
      expect(hlTopic(["wins"], "wins", HL_TOPIC_LEN, rand)).toBe("wins");
    });

    it("says whether higher is right", () => {
      expect(hlIsHigher(major(1, 100), major(2, 200), "entrants")).toBe(true);
      expect(hlIsHigher(player(1, 3, 9), player(2, 1, 12), "wins")).toBe(false);
      expect(hlIsHigher(player(1, 3, 9), player(2, 1, 12), "top8s")).toBe(true);
    });
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
    expect(playerHint(player({}), answer)).toEqual({ right: false, wins: "higher", top8s: "higher", firstYear: "lower", lastYear: "same", main: false, region: null });
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

import { addResult, clock, liveStreak, readStats, setsRank, untilNextPuzzle } from "@/lib/arcade";

describe("the Arcade's streaks and scores", () => {
  it("counts a run of solved days, once a day, and ends it on a miss or a skipped day", () => {
    let s = readStats("");
    s = addResult(s, 5, true);
    s = addResult(s, 5, false); // the same day again changes nothing
    expect(s).toMatchObject({ last: 5, won: true, streak: 1, played: 1, wins: 1 });
    s = addResult(s, 6, true);
    expect(s.streak).toBe(2);
    expect(liveStreak(s, 7)).toBe(2); // still alive before today's is played
    expect(liveStreak(s, 8)).toBe(0); // a day was skipped
    s = addResult(s, 8, true);
    expect(s).toMatchObject({ streak: 1, best: 2 });
    s = addResult(s, 9, false);
    expect(s).toMatchObject({ streak: 0, best: 2, played: 4, wins: 3 });
    expect(liveStreak(s, 9)).toBe(0);
  });

  it("reads a damaged record as an empty one", () => {
    expect(readStats("{oops")).toMatchObject({ last: 0, streak: 0 });
    expect(readStats('{"last":"x","streak":-4,"won":"yes"}')).toMatchObject({ last: 0, streak: 0, won: false });
  });

  it("counts down to midnight UTC", () => {
    expect(untilNextPuzzle(ARCADE_FIRST_DAY)).toBe(86400_000);
    expect(untilNextPuzzle(ARCADE_FIRST_DAY + 86400_000 - 1000)).toBe(1000);
    expect(clock(7 * 3600_000 + 4 * 60_000 + 9000)).toBe("07:04:09");
    expect(clock(-5)).toBe("00:00:00");
  });

  it("greets a score out of ten", () => {
    expect([10, 8, 5, 4].map((n) => setsRank(n, 10))).toEqual(["perfect", "top8", "pools", "out"]);
  });
});

import { regionHint } from "@/lib/arcade";
import { PLAYER_REGIONS } from "@/lib/arcadeRegions";

describe("Guess the player's region hint", () => {
  it("says same region, same country or another country, and nothing when one isn't known", () => {
    const ca = { country: "United States", place: "California" };
    expect(regionHint(ca, { country: "United States", place: "california " })).toBe("place");
    expect(regionHint(ca, { country: "United States", place: "NY" })).toBe("country");
    expect(regionHint(ca, { country: "United States", place: null })).toBe("country");
    expect(regionHint(ca, { country: "Japan", place: "Kantō" })).toBe("other");
    expect(regionHint(ca, { country: null })).toBeNull();
    expect(playerHint(player({ ...ca }), player({ slug: "2", ...ca })).region).toBe("place");
  });

  it("has SmashWiki's regions with one spelling per country, each for at least one game", () => {
    const all = Object.values(PLAYER_REGIONS);
    expect(all.length).toBeGreaterThan(500);
    expect(all.every((r) => r.country && r.games.length > 0)).toBe(true);
    expect(all.some((r) => /^(usa|united states of america|the netherlands)$/i.test(r.country) || r.country === "united states")).toBe(false);
    expect(PLAYER_REGIONS.mang0).toMatchObject({ country: "United States", place: "California" });
  });
});
