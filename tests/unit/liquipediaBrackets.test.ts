import { describe, expect, it } from "vitest";
import { bracketsSql, parseBrackets } from "../../tools/liquipedia/bracket-to-sql.mjs";

const TEXT = `@manual/2013-evo-2013 manual-melee-1 melee https://liquipedia.net/smash/EVO/2013/Singles_Bracket
#Losers Round 1
Shroomed~2~Axe~1~1
Reno~W~PB＆J~~1
Ether~~Mr. F~W~2
Tie~~Tied~~0
Mew2King~FF~Hax~W~2
Toph~W~Hello~-~1
#Grand Finals
Wobbles~0/1~Mango~3/3~2
`;

describe("Liquipedia brackets read by hand", () => {
  it("reads scores, wins without a score, a grand final and its reset", () => {
    const [b] = parseBrackets(TEXT);
    expect(b).toMatchObject({ slug: "manual/2013-evo-2013", eventId: "manual-melee-1", game: "melee" });
    expect(b.sets).toEqual([
      { round: "Losers Round 1", p1: "Shroomed", p2: "Axe", s1: 2, s2: 1, winner: 1 },
      { round: "Losers Round 1", p1: "Reno", p2: "PB&J", s1: null, s2: null, winner: 1 },
      { round: "Losers Round 1", p1: "Ether", p2: "Mr. F", s1: null, s2: null, winner: 2 },
      { round: "Grand Finals", p1: "Wobbles", p2: "Mango", s1: 0, s2: 3, winner: 2 },
      { round: "Grand Finals (reset)", p1: "Wobbles", p2: "Mango", s1: 1, s2: 3, winner: 2 },
    ]);
  });

  it("the bold name decides a set whose scores don't", () => {
    const [b] = parseBrackets("@m e melee\n#R\nA~~B~~2\nC~1~D~1~1\n");
    expect(b.sets.map((s: { winner: number }) => s.winner)).toEqual([2, 1]);
  });

  it("writes SQL that is safe to run twice, with quotes escaped", () => {
    const sql = bracketsSql(parseBrackets("@manual/x manual-melee-1 melee\n#R\nO'Brien~2~B~0~1\n"));
    expect(sql).toContain("('manual/x|manual-melee-1|1', 'manual/x', 'manual-melee-1', 'melee', 'Bracket', 'R', 10, 'O''Brien', 2, 'B', 0, 1)");
    expect(sql).toContain("on conflict (set_id) do update");
  });

  it("a set before any bracket line is an error", () => {
    expect(() => parseBrackets("A~1~B~0~1")).toThrow();
  });
});
