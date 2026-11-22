import { describe, expect, it } from "vitest";
import { resultsText, winnersLine } from "@/lib/resultsText";

describe("resultsText", () => {
  const tags: Record<string, string> = { a: "Fox", b: "Marth", c: "Sheik", d: "Puff", e: "Peach", f: "Falco", g: "Ness" };
  it("lists medals, shared places and the link, up to the top 8", () => {
    const text = resultsText(
      "Weekly #3",
      [{ id: "a", place: 1 }, { id: "b", place: 2 }, { id: "c", place: 3 }, { id: "d", place: 4 }, { id: "e", place: 5 }, { id: "f", place: 5 }, { id: "g", place: 9 }],
      (id) => tags[id] ?? null,
      "https://smashy.example/host/1",
    );
    expect(text).toBe("Weekly #3: results\n🥇 Fox\n🥈 Marth\n🥉 Sheik\n4. Puff\n5. Peach, Falco\nFull bracket: https://smashy.example/host/1");
  });
});

describe("winnersLine", () => {
  const tag = (id: string) => ({ a: "Fox", b: "Marth", c: "Sheik", d: "Puff" })[id] ?? null;
  it("names 1st to 3rd, with ties sharing a place", () => {
    expect(winnersLine([{ id: "a", place: 1 }, { id: "b", place: 2 }, { id: "c", place: 3 }, { id: "d", place: 3 }], tag)).toBe("🏆 Fox won · 2nd Marth · 3rd Sheik, Puff");
  });
  it("is null with no winner yet", () => {
    expect(winnersLine([], tag)).toBeNull();
  });
});
