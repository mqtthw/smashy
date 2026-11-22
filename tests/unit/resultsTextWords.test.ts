// The copied results text in the reader's language: only the title and the "full bracket" line change.
import { describe, expect, it } from "vitest";
import { resultsText } from "@/lib/resultsText";
import { translate } from "@/lib/i18n/core";

const placements = [{ id: "a", place: 1 }, { id: "b", place: 2 }, { id: "c", place: 4 }];
const tags: Record<string, string> = { a: "Fox", b: "Marth", c: "Puff" };

describe("resultsText words", () => {
  it("stays English by default", () => {
    expect(resultsText("Weekly #3", placements, (id) => tags[id], "https://x.test/e")).toBe("Weekly #3: results\n🥇 Fox\n🥈 Marth\n4. Puff\nFull bracket: https://x.test/e");
  });
  it("uses the given language's title and link line", () => {
    const t = (key: Parameters<typeof translate>[1], values?: Parameters<typeof translate>[2]) => translate("es", key, values);
    const text = resultsText("Weekly #3", placements, (id) => tags[id], "https://x.test/e", 8, { title: (n) => t("event.copy.title", { event: n }), full: (u) => t("event.copy.full", { url: u }) });
    expect(text).toBe("Weekly #3: resultados\n🥇 Fox\n🥈 Marth\n4. Puff\nBracket completo: https://x.test/e");
  });
});
