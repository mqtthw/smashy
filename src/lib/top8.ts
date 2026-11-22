// Who goes on an event's results graphic (the "Top 8" picture a TO posts after a bracket), and how
// their places read.

/** 1 → "1st", 2 → "2nd", 3 → "3rd", 11 → "11th", 21 → "21st". */
export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

export type GraphicRow = { place: number; label: string; tag: string };

/**
 * The rows of the graphic, best first, at most `max`. Players who tied share a place ("5th" twice).
 * A tied group is never cut in half (naming one of two 7th places would be unfair): if the group
 * doesn't fit, the graphic stops before it. `tag` null is a player guests can't see.
 */
export function graphicRows(entrants: { placement: number | null; tag: string | null }[], max = 8, hiddenName = "Hidden player", label: (n: number) => string = ordinal): GraphicRow[] {
  const placed = entrants
    .filter((e): e is { placement: number; tag: string | null } => typeof e.placement === "number" && e.placement >= 1)
    .sort((a, b) => a.placement - b.placement || (a.tag ?? "￿").localeCompare(b.tag ?? "￿"));
  const rows: GraphicRow[] = [];
  for (let i = 0; i < placed.length; ) {
    let j = i;
    while (j < placed.length && placed[j].placement === placed[i].placement) j++;
    const group = placed.slice(i, j);
    if (rows.length + group.length > max) {
      // A tie bigger than the whole graphic (a 12-way tie for 1st can't happen in a bracket, but a
      // tiny round robin can tie everyone): show as many as fit rather than nothing.
      if (!rows.length) group.slice(0, max).forEach((e) => rows.push({ place: e.placement, label: label(e.placement), tag: e.tag ?? hiddenName }));
      break;
    }
    group.forEach((e) => rows.push({ place: e.placement, label: label(e.placement), tag: e.tag ?? hiddenName }));
    i = j;
  }
  return rows;
}

/** "Top 8", "Top 4"… or "Final standings" for a round robin (everyone has a place there). */
export function graphicTitle(rows: number, roundRobin: boolean): string {
  return roundRobin ? "Final standings" : `Top ${rows}`;
}
