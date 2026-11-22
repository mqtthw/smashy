// Loading highlights (server-side, as the current viewer so privacy rules apply).
import type { GameKey } from "./games";
import type { HighlightType } from "./highlightTypes";
import { createClient } from "./supabase/server";

export type Highlight = {
  id: string;
  type: HighlightType;
  title: string;
  game: GameKey;
  character: string | null;
  vsCharacter: string | null; // matchup: this guide or VOD is about character vs this one
  url: string | null;
  description: string | null;
  guideBody: string | null;
  removed: boolean;
  createdAt: string;
  voteCount: number;
  votedByMe: boolean;
  author: { id: string; tag: string; handle: string };
};

const FIELDS =
  // Name the author link explicitly: highlights also connect to profiles through votes.
  "id, type, title, game, character, vs_character, url, description, guide_body, removed_at, created_at, vote_count, author:profiles!highlights_author_id_fkey(id, tag, handle)";

type Row = {
  id: string;
  type: HighlightType;
  title: string;
  game: GameKey;
  character: string | null;
  vs_character: string | null;
  url: string | null;
  description: string | null;
  guide_body: string | null;
  removed_at: string | null;
  created_at: string;
  vote_count: number;
  author: { id: string; tag: string; handle: string } | null;
};

async function toHighlights(rows: Row[], userId: string | null): Promise<Highlight[]> {
  let voted = new Set<string>();
  const visible = rows.filter((r) => r.author); // author hidden by privacy rules -> hide it too
  if (userId && visible.length) {
    const supabase = await createClient();
    const { data } = await supabase.from("highlight_votes").select("highlight_id").eq("user_id", userId).in("highlight_id", visible.map((r) => r.id)).throwOnError();
    voted = new Set((data ?? []).map((v) => v.highlight_id));
  }
  return visible.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    game: r.game,
    character: r.character,
    vsCharacter: r.vs_character ?? null,
    url: r.url,
    description: r.description,
    guideBody: r.guide_body,
    removed: !!r.removed_at,
    createdAt: r.created_at,
    voteCount: r.vote_count,
    votedByMe: voted.has(r.id),
    author: r.author!,
  }));
}

export async function getAuthorHighlights(authorId: string, userId: string | null): Promise<Highlight[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("highlights").select(FIELDS).eq("author_id", authorId).order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return toHighlights((data ?? []) as unknown as Row[], userId);
}

export async function getHighlight(id: string, userId: string | null): Promise<Highlight | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("highlights").select(FIELDS).eq("id", id).maybeSingle().throwOnError();
  if (!data) return null;
  const [h] = await toHighlights([data as unknown as Row], userId);
  return h ?? null;
}

/** Resource hub: top-voted highlights for a game (optionally one character / one type). */
export async function getTopHighlights(opts: { game: GameKey; character?: string; type?: HighlightType; userId: string | null; limit?: number }) {
  const supabase = await createClient();
  let q = supabase
    .from("highlights")
    .select(FIELDS)
    .eq("game", opts.game)
    .is("removed_at", null)
    .order("vote_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 30);
  if (opts.character) q = q.eq("character", opts.character);
  if (opts.type) q = q.eq("type", opts.type);
  const { data, error } = await q;
  if (error) throw error;
  return toHighlights((data ?? []) as unknown as Row[], opts.userId);
}

/** Full highlights for a list of ids, in the same order (used by search). */
export async function getHighlightsByIds(ids: string[], userId: string | null): Promise<Highlight[]> {
  if (!ids.length) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("highlights").select(FIELDS).in("id", ids);
  if (error) throw error;
  const byId = new Map((await toHighlights((data ?? []) as unknown as Row[], userId)).map((h) => [h.id, h]));
  return ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
}

/** How many highlights each character has in a game (for the character grid). */
export async function getCharacterCounts(game: GameKey): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase.from("highlights").select("character").eq("game", game).is("removed_at", null).not("character", "is", null).limit(5000).throwOnError();
  const counts = new Map<string, number>();
  for (const r of data ?? []) counts.set(r.character as string, (counts.get(r.character as string) ?? 0) + 1);
  return counts;
}

/**
 * Guides and VODs for one matchup (from either character's side), most upvoted first. Character keys
 * must already be checked against the game's character list.
 */
export async function getMatchupHighlights(game: GameKey, a: string, b: string, userId: string | null, limit = 40) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("highlights")
    .select(FIELDS)
    .eq("game", game)
    .is("removed_at", null)
    .or(`and(character.eq.${a},vs_character.eq.${b}),and(character.eq.${b},vs_character.eq.${a})`)
    .order("vote_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return toHighlights((data ?? []) as unknown as Row[], userId);
}

/** How many matchup guides, VODs and discussions a character has against each opponent (either side). */
export async function getMatchupCounts(game: GameKey, character: string): Promise<Map<string, number>> {
  const supabase = await createClient();
  const either = `character.eq.${character},vs_character.eq.${character}`;
  const [{ data: guides }, { data: talk }] = await Promise.all([
    supabase.from("highlights").select("character, vs_character").eq("game", game).is("removed_at", null).not("vs_character", "is", null).or(either).limit(1000),
    supabase.from("posts").select("character, vs_character").eq("game", game).is("parent_id", null).is("removed_at", null).not("vs_character", "is", null).or(either).limit(1000),
  ]);
  const counts = new Map<string, number>();
  for (const r of [...(guides ?? []), ...(talk ?? [])] as { character: string | null; vs_character: string | null }[]) {
    const other = r.character === character ? r.vs_character : r.character;
    if (other) counts.set(other, (counts.get(other) ?? 0) + 1);
  }
  return counts;
}
