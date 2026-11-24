// Which of a followed player's upcoming tournaments are new since the last daily look (round 799). Plain
// logic, tested; the job that uses it is in playerFollows.ts.

/** How many tournament addresses are remembered per player (start.gg lists 10 upcoming at most). */
export const KNOWN_KEEP = 40;

/**
 * `known`: the tournaments seen before, or null on the first look (then nothing is announced: they were
 * already in those before anyone was told to watch). Returns the new ones to announce and what to remember:
 * the current ones first, then older ones, so a tournament that drops off start.gg's short list and comes
 * back isn't announced twice.
 */
export function newSignups(known: string[] | null, current: string[]): { announce: string[]; remember: string[] } {
  const seen = new Set(known ?? []);
  const announce = known === null ? [] : [...new Set(current)].filter((slug) => !seen.has(slug));
  const remember = [...new Set([...current, ...(known ?? [])])].slice(0, KNOWN_KEEP);
  return { announce, remember };
}
