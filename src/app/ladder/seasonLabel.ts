// A ladder season's name in the visitor's language: "Fall 2026" / "Otoño 2026" for 2026-Q4.
// (seasonName in lib/ladder.ts is the English one.)
import type { MessageKey, Values } from "@/lib/i18n/core";

export function seasonLabel(season: string, t: (key: MessageKey, values?: Values) => string): string {
  const m = /^(\d{4})-Q([1-4])$/.exec(season);
  return m ? t(`play.ladder.season.${m[2] as "1" | "2" | "3" | "4"}`, { year: m[1] }) : season;
}
