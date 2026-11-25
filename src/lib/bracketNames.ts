// The brackets line under an online tournament on Events → Online (round 840): start.gg brackets often
// repeat the tournament's name ("Alrest Series" → "Alrest Series #1", "Alrest Series #2"), so the line
// read the name over and over. Each bracket shows only what's left after the tournament's name.
// Plain logic, so it can be tested.

/** Bracket names without the tournament's name in front; ones that are only the tournament's name are dropped. */
export function shortBracketNames(tournament: string, names: string[]): string[] {
  const t = tournament.trim().toLowerCase();
  const out: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    let rest = name.toLowerCase().startsWith(t) ? name.slice(t.length) : name;
    rest = rest.replace(/^[\s\-–—:|·,]+/, "").trim();
    if (!rest || rest.toLowerCase() === t) continue;
    if (!out.includes(rest)) out.push(rest);
  }
  return out;
}
