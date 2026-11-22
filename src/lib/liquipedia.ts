// Links to Liquipedia's Smash wiki (Matthew, 2026-11-17: "use Liquipedia to archive smash history").
// Links only: Liquipedia doesn't allow reading its pages automatically, and its data API needs an
// approved request (docs/liquipedia-request.md). A search link lands on the tournament's page when the
// name matches one, and on Liquipedia's search results otherwise.

/** A link that finds a tournament on Liquipedia's Smash wiki by name. */
export function liquipediaSearch(name: string): string {
  return `https://liquipedia.net/smash/index.php?search=${encodeURIComponent(name.trim())}`;
}
