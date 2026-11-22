import { describe, expect, it } from "vitest";
import { emptyCast } from "@/components/ui/EmptyState";
import { stockIconUrl } from "@/lib/mainBadge";

describe("emptyCast", () => {
  it("gives three characters with stock icons for every game the empty pages can show", () => {
    for (const game of [null, "melee", "ultimate", "pplus", "general", "smash64"]) {
      const cast = emptyCast(game);
      expect(cast, String(game)).toHaveLength(3);
      for (const m of cast) expect(stockIconUrl(m), `${game}: ${m.character}`).toBeTruthy();
    }
  });
});
