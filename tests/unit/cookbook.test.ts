import { describe, expect, it } from "vitest";
import { cookbookUrl } from "@/lib/essentials";

describe("cookbookUrl", () => {
  it("links Melee characters with a cookbook", () => {
    expect(cookbookUrl("melee", "captain-falcon")).toBe("https://cookbook.gg/captain-falcon");
    expect(cookbookUrl("melee", "mr-game-and-watch")).toBe("https://cookbook.gg/game-and-watch");
  });
  it("is null for characters and games without one", () => {
    expect(cookbookUrl("melee", "marth")).toBeNull();
    expect(cookbookUrl("ultimate", "captain-falcon")).toBeNull();
  });
});
