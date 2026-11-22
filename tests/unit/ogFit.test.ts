// Fitting text on share pictures: wide tags get a smaller size than narrow ones of the same length.
import { describe, expect, it, vi } from "vitest";

vi.mock("next/og", () => ({ ImageResponse: class {} }));

const { fitWidth, textEms } = await import("@/lib/ogCard");

describe("fitWidth", () => {
  it("keeps short tags at the biggest size", () => {
    expect(fitWidth("Walky", 1040, 84, 40)).toBe(84);
  });
  it("shrinks wide tags more than narrow ones of the same length", () => {
    expect(textEms("WWWWWWWWWW")).toBeGreaterThan(textEms("iiiiiiiiii"));
    expect(fitWidth("W".repeat(20), 1040, 84, 40)).toBeLessThan(fitWidth("i".repeat(20), 1040, 84, 40));
  });
  it("never goes below the smallest size", () => {
    expect(fitWidth("W".repeat(30), 1040, 84, 40)).toBe(40);
  });
  it("counts Japanese as full width", () => {
    expect(textEms("スマッシュ")).toBe(5);
  });
});
