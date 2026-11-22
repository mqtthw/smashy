// One way to write a set's score, wherever it shows (set pages, brackets, lists, link previews).
// A DQ is saved as -1 games. It reads "DQ", and the player it was against reads "W" (their game
// count means nothing in a DQ). Everything else is the number of games won.

/** One side's score as text. `blank` is what to show when there is no number (not played, or the site only recorded who won). */
export function scoreText(mine: number | null | undefined, theirs: number | null | undefined, blank = ""): string {
  if (mine === -1) return "DQ";
  if (theirs === -1) return "W";
  return mine == null ? blank : String(mine);
}

/** Both sides, left to right: "2–1", "W–DQ". */
export function scoreLine(a: number | null | undefined, b: number | null | undefined, blank = "0"): string {
  return `${scoreText(a, b, blank)}–${scoreText(b, a, blank)}`;
}
