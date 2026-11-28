import { cacheLife } from "next/cache";
import type { GameKey } from "@/lib/games";
import { createGuestClient } from "@/lib/supabase/guest";

// Which matchups have anything at all (round 1015). Crawlers open thousands of matchup pages ("Fox vs
// Marth", every pair in every game) and each visit asked the database twice, on 2026-11-26/27 often while
// it was busy: about 2,700 "the database took longer than 8 s" errors in two days, for pages that were all
// empty (not one matchup guide, VOD or discussion yet). This keeps one short list per game, shared by every
// server, of the pairs that have something a guest can see; guests' visits to the other pairs skip the
// database. Signed-in players still read the database on every visit, so what they post shows at once.

/** The same key for "a vs b" and "b vs a". */
export function matchupKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Pairs in `game` with a matchup guide, VOD or discussion a guest can see, or null if it couldn't be read. */
export async function matchupPairsWithContent(game: GameKey): Promise<string[] | null> {
  "use cache: remote";
  const supabase = createGuestClient();
  const [guides, talk] = await Promise.all([
    supabase.from("highlights").select("character, vs_character").eq("game", game).is("removed_at", null).not("vs_character", "is", null).limit(5000),
    supabase.from("posts").select("character, vs_character").eq("game", game).is("parent_id", null).is("removed_at", null).not("vs_character", "is", null).limit(5000),
  ]);
  if (guides.error || talk.error) {
    cacheLife("seconds"); // try again soon; meanwhile the page reads the database as before
    return null;
  }
  // A new guide or post shows to guests within about 10 minutes.
  cacheLife({ stale: 300, revalidate: 600, expire: 86400 });
  const keys = new Set<string>();
  for (const r of [...(guides.data ?? []), ...(talk.data ?? [])] as { character: string | null; vs_character: string | null }[]) {
    if (r.character && r.vs_character) keys.add(matchupKey(r.character, r.vs_character));
  }
  return [...keys];
}
