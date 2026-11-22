import { describe, expect, it } from "vitest";
import { liquipediaSearch } from "@/lib/liquipedia";

describe("liquipediaSearch", () => {
  it("searches Liquipedia's Smash wiki for the tournament's name", () => {
    expect(liquipediaSearch(" Genesis 5 ")).toBe("https://liquipedia.net/smash/index.php?search=Genesis%205");
    expect(liquipediaSearch("Kumite in Texas / Low Tier City 6")).toBe("https://liquipedia.net/smash/index.php?search=Kumite%20in%20Texas%20%2F%20Low%20Tier%20City%206");
  });
});
