import { describe, expect, it } from "vitest";
import { pickMainEvent } from "@/lib/mainEvent";

const e = (name: string, entrants: number | null) => ({ name, entrants });
const pick = (...list: ReturnType<typeof e>[]) => pickMainEvent(list)?.name;

describe("pickMainEvent", () => {
  it("takes the biggest bracket", () => {
    expect(pick(e("Melee Singles", 909), e("Melee Doubles Ladder", 168), e("Melee Singles $1000 Pot Bonus", 233))).toBe("Melee Singles");
  });

  it("skips side events bigger than the main bracket (invitationals)", () => {
    expect(pick(e("VIP Bracket", 42), e("Melee Singles", 16), e("Wheel! Of! Bullshit!", 8))).toBe("Melee Singles");
    expect(pick(e("Swag Bracket", 24), e("Sami Singles", 18), e("Melee Singles", 18))).toBe("Melee Singles");
    expect(pick(e("Melee LCQ (FRIDAY)", 236), e("Melee Mid-Tiers (SATURDAY)", 143), e("Melee Championships", 40))).toBe("Melee Championships");
    expect(pick(e("Last Chance Qualifier", 132), e("Arcadian", 111), e("2GG Championship", 21))).toBe("2GG Championship");
    expect(pick(e("Salty Swag Ladder", 514), e("Forsaken Bracket", 16), e("Gods and Gatekeepers", 8))).toBe("Gods and Gatekeepers");
    expect(pick(e("Low Tier", 153), e("Smash 64 Singles", 153))).toBe("Smash 64 Singles");
    expect(pick(e("RvR Bo5 1 Stock", 16), e("Melee Singles", 16), e("Some Tier Iron Man", 8))).toBe("Melee Singles");
  });

  it("keeps the only bracket even when it's a side event", () => {
    expect(pick(e("Wii U Side Event", 22))).toBe("Wii U Side Event");
    expect(pick(e("All-Star Random Singles", 28))).toBe("All-Star Random Singles");
  });

  it("doesn't mistake ordinary main-bracket names for side events", () => {
    for (const name of ["Ultimate Singles (192 ENTRANT CAP)", "Melee Singles - Main Bracket", "Tera - Singles", "Super Smash Bros. Ultimate single 1vs1", "Smash 64 Singles - Waterfall", "Brawl Singles - Top 16 Invite"])
      expect(pick(e(name, 100), e("Ultimate Ladder - Side Event", 120))).toBe(name);
  });
});
