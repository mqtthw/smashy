import type { Lang } from "./core";

/** A placement as an ordinal: "1st", "22nd" in English, "1.º", "22.º" in Spanish. */
export function ordinalFor(lang: Lang, n: number): string {
  if (lang === "es") return `${n}.º`;
  if (lang === "ja") return `${n}位`;
  if (lang === "fr") return n === 1 ? "1er" : `${n}e`;
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
}
