// Plain-text results for pasting into Discord, a group chat or social media:
//   "Weekly #3: results
//    🥇 Fox
//    🥈 Marth
//    🥉 Sheik
//    4. Puff
//    5. Peach, Falco
//    ...
//    Full bracket: https://…"
const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

/** The two lines around the places, in the reader's language (English when not given). */
export type ResultsWords = { title: (name: string) => string; full: (url: string) => string };
const ENGLISH: ResultsWords = { title: (name) => `${name}: results`, full: (url) => `Full bracket: ${url}` };

export function resultsText(name: string, placements: { id: string; place: number }[], tagOf: (id: string) => string | null, url: string, top = 8, words: ResultsWords = ENGLISH): string {
  const byPlace = new Map<number, string[]>();
  for (const p of placements) {
    if (p.place > top) continue;
    const tag = tagOf(p.id);
    if (!tag) continue;
    byPlace.set(p.place, [...(byPlace.get(p.place) ?? []), tag]);
  }
  const lines = [...byPlace.entries()].sort((a, b) => a[0] - b[0]).map(([place, tags]) => `${MEDAL[place] ?? `${place}.`} ${tags.join(", ")}`);
  return [words.title(name), ...lines, words.full(url)].join("\n");
}

const ORDINAL: Record<number, string> = { 2: "2nd", 3: "3rd" };

/**
 * One line for link previews: "🏆 Fox won · 2nd Marth · 3rd Sheik, Puff". Ties share a place.
 * Returns null when nobody has 1st yet.
 */
export function winnersLine(placements: { id: string; place: number }[], tagOf: (id: string) => string | null): string | null {
  const at = (place: number) => placements.filter((p) => p.place === place).map((p) => tagOf(p.id)).filter((t): t is string => !!t);
  const first = at(1);
  if (!first.length) return null;
  const parts = [`🏆 ${first.join(", ")} won`];
  for (const place of [2, 3]) {
    const tags = at(place);
    if (tags.length) parts.push(`${ORDINAL[place]} ${tags.join(", ")}`);
  }
  return parts.join(" · ");
}
