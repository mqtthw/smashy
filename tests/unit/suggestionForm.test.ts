import { describe, expect, it } from "vitest";
import { cleanLink, readSuggestion } from "@/lib/suggestionForm";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

describe("Help build Smashy form (round 653)", () => {
  it("keeps http(s) links and adds https:// to bare ones", () => {
    expect(cleanLink("")).toBeNull();
    expect(cleanLink("cookbook.gg/fox")).toBe("https://cookbook.gg/fox");
    expect(cleanLink("http://example.com/a")).toBe("http://example.com/a");
    expect(cleanLink("javascript:alert(1)")).toBe(false);
    expect(cleanLink("not a link")).toBe(false);
    expect(cleanLink("localhost")).toBe(false);
  });
  it("needs a link for a resource, words for the rest", () => {
    expect(readSuggestion(form({ kind: "resource", details: "a doc" }))).toEqual({ error: "needLink" });
    expect(readSuggestion(form({ kind: "feedback", details: "hi" }))).toEqual({ error: "needDetails" });
    expect(readSuggestion(form({ kind: "local", link: "start.gg/tournament/x" }))).toMatchObject({ ok: { kind: "local", link: "https://start.gg/tournament/x" } });
    expect(readSuggestion(form({ kind: "nope", details: "hello" }))).toEqual({ error: "kind" });
    expect(readSuggestion(form({ kind: "feedback", details: "x".repeat(2001) }))).toEqual({ error: "tooLong" });
  });
  it("keeps the game and character only where they fit", () => {
    const r = readSuggestion(form({ kind: "resource", game: "melee", character: "Fox", link: "https://cookbook.gg/fox", contact: "u/someone" }));
    expect(r).toEqual({ ok: { kind: "resource", game: "melee", character: "Fox", link: "https://cookbook.gg/fox", details: "", contact: "u/someone" } });
    const h = readSuggestion(form({ kind: "history", game: "chess", character: "Fox", details: "Missing Apex 2015 doubles" }));
    expect(h).toMatchObject({ ok: { game: null, character: null } });
  });
});
