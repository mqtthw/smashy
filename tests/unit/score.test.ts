import { describe, expect, it } from "vitest";
import { scoreLine, scoreText } from "@/lib/brackets/score";

describe("writing a set's score", () => {
  it("shows games won as numbers, including zero", () => {
    expect(scoreText(2, 0)).toBe("2");
    expect(scoreText(0, 2)).toBe("0");
    expect(scoreLine(2, 1)).toBe("2–1");
  });
  it("writes a DQ as DQ and the other player as W, whichever side it is", () => {
    expect(scoreText(-1, 0)).toBe("DQ");
    expect(scoreText(0, -1)).toBe("W");
    expect(scoreLine(0, -1)).toBe("W–DQ");
    expect(scoreLine(-1, 0)).toBe("DQ–W");
  });
  it("uses the blank when there is no number", () => {
    expect(scoreText(null, null)).toBe("");
    expect(scoreText(undefined, 2, "–")).toBe("–");
    expect(scoreLine(null, null)).toBe("0–0");
  });
});
