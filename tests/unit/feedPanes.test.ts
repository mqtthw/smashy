// The Feed's instant game tabs (round 559): which game's list the address bar asks for.
import { describe, expect, it } from "vitest";
import { urlGame } from "@/components/feed/FeedPanes";

const q = (s: string) => new URLSearchParams(s);

describe("urlGame", () => {
  it("is the game in the address, or All without one", () => {
    expect(urlGame(q("game=melee"))).toBe("melee");
    expect(urlGame(q(""))).toBe("all");
    expect(urlGame(q("view=following&game=ultimate"))).toBe("ultimate");
  });
  it("is nothing on later pages, which aren't preloaded", () => {
    expect(urlGame(q("game=melee&page=2"))).toBeNull();
    expect(urlGame(q("before=2026-11-19T00:00:00Z"))).toBeNull();
  });
  it("is nothing before the address is known", () => {
    expect(urlGame(null)).toBeNull();
  });
});
