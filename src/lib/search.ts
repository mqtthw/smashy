import { badgeMain } from "./mainBadge";
import { HIDDEN_HANDLES } from "./discoveryHidden";
import type { Main } from "./characters";
// Search across people, posts, highlights, and characters (server-side, as the current viewer,
// so privacy rules apply: guests never get teens' profiles, posts, or highlights).
import { avatarUrl } from "./avatarLinks";
import { CHARACTERS } from "./characters";
import { GAMES, GAME_KEYS, type GameKey } from "./games";
import { matchCharacter } from "./hashtags";
import { createClient } from "./supabase/server";

export type CharacterHit = { game: GameKey; key: string; name: string };
export type PersonHit = {
  tag: string; handle: string; homeCity: string | null; bio: string | null; avatarUrl: string | null; main: Main | null;
  crew?: string | null; lfgDoubles?: boolean;
};

type PersonRow = { tag: string; handle: string; home_city: string | null; bio: string | null; avatar_path: string | null; mains: unknown; crew: string | null; lfg_doubles: boolean };
const PERSON_FIELDS = "tag, handle, home_city, bio, avatar_path, mains, crew, lfg_doubles";
const toHit = (p: PersonRow): PersonHit => ({
  tag: p.tag, handle: p.handle, homeCity: p.home_city, bio: p.bio, avatarUrl: avatarUrl(p.avatar_path), main: badgeMain(p.mains), crew: p.crew, lfgDoubles: p.lfg_doubles,
});

/** People looking for a doubles partner, or in a crew / college. Same privacy rules as search. */
export async function findPeople(filter: { doubles?: boolean; crew?: string }, limit = 50): Promise<PersonHit[]> {
  const supabase = await createClient();
  let q = supabase.from("profiles").select(PERSON_FIELDS).not("handle", "in", HIDDEN_HANDLES).order("created_at", { ascending: false }).limit(limit);
  if (filter.doubles) q = q.eq("lfg_doubles", true);
  if (filter.crew) q = q.ilike("crew", literal(filter.crew.replace(/[,()]/g, " ").trim()));
  const { data } = await q;
  return ((data ?? []) as PersonRow[]).map(toHit);
}

/** Characters whose name/nickname matches, across all games ("falcon", "puff", "fal" -> Falco & Falcon). */
export function searchCharacters(q: string): CharacterHit[] {
  const needle = q.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  if (needle.length < 2) return [];
  const hits: CharacterHit[] = [];
  for (const game of GAME_KEYS) {
    const exact = matchCharacter(game, needle);
    for (const c of CHARACTERS[game]) {
      if (c.key === exact || c.name.toLowerCase().replace(/[^a-z0-9 ]/g, "").includes(needle)) hits.push({ game, key: c.key, name: c.name });
    }
  }
  // Exact/nickname matches first, then by game order.
  return hits.sort((a, b) => Number(b.name.toLowerCase() === needle) - Number(a.name.toLowerCase() === needle)).slice(0, 12);
}

export function characterLabel(h: CharacterHit) {
  return `${h.name} (${GAMES[h.game].short})`;
}

/** Escape % and _ so user text is matched literally in ilike. */
const literal = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function searchPeople(q: string, limit = 20): Promise<PersonHit[]> {
  // Commas and parentheses have meaning in the filter syntax; drop them.
  const needle = q.replace(/^@/, "").replace(/[,()]/g, " ").trim();
  if (needle.length < 2) return [];
  const supabase = await createClient();
  const pattern = `%${literal(needle)}%`;
  const { data } = await supabase
    .from("profiles")
    .select(PERSON_FIELDS)
    .or(`tag.ilike.${pattern},handle.ilike.${pattern.toLowerCase()},crew.ilike.${pattern}`)
    .not("handle", "in", HIDDEN_HANDLES)
    .limit(limit);
  return ((data ?? []) as PersonRow[]).map(toHit);
}

/** Post ids matching the words (newest first). Full post data is loaded by the caller. */
export async function searchPostIds(q: string, limit = 30): Promise<string[]> {
  if (q.trim().length < 2) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("id")
    .is("parent_id", null)
    .textSearch("search_vec", q, { type: "websearch", config: "english" })
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => r.id);
}

/** Highlight ids matching the words, most upvoted first. */
export async function searchHighlightIds(q: string, limit = 20): Promise<string[]> {
  if (q.trim().length < 2) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("highlights")
    .select("id")
    .is("removed_at", null)
    .textSearch("search_vec", q, { type: "websearch", config: "english" })
    .order("vote_count", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => r.id);
}
