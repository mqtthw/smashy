// The bot's slash commands: every description in all four languages, within Discord's 100-character limit.
import { describe, expect, it } from "vitest";
import { COMMANDS } from "../../scripts/discord-commands-list.mjs";

type Cmd = { name: string; description: string; description_localizations?: Record<string, string>; options?: Cmd[] };
const all = (list: Cmd[]): Cmd[] => list.flatMap((c) => [c, ...all(c.options ?? [])]);

describe("Discord commands", () => {
  it("has every command the bot answers", () => {
    expect((COMMANDS as Cmd[]).map((c) => c.name).sort()).toEqual(["bracket", "next", "player", "results", "season", "smashy", "upcoming"]);
  });
  it("describes everything in English, Spanish, Japanese and French, under 100 characters", () => {
    for (const c of all(COMMANDS as Cmd[])) {
      const texts = [c.description, ...Object.values(c.description_localizations ?? {})];
      expect(Object.keys(c.description_localizations ?? {}).sort(), c.name).toEqual(["es-419", "es-ES", "fr", "ja"]);
      for (const t of texts) {
        expect(t.length, `${c.name}: ${t}`).toBeGreaterThan(0);
        expect(t.length, `${c.name}: ${t}`).toBeLessThanOrEqual(100);
      }
    }
  });
});
