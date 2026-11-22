// Character tags in Play chat: "@Fox", "@CaptainFalcon", "@MrGameAndWatch". A tag is the character's
// name with everything but letters and digits removed, matched without caring about case, so it's
// the character's key without its hyphens. Typing one in a game's room pings players who main that
// character in that game and turned on @matchmaking pings (the database does the pinging; the same
// rule lives in supabase/migrations/20261230100000_character_pings.sql, keep them in step).
// Shared by server and browser code.
import { CHARACTERS, type Character } from "./characters";
import type { GameKey } from "./games";

/** The tag text for a character, without the "@": Captain Falcon -> "CaptainFalcon". */
export const characterTagText = (c: Character) =>
  c.name.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/&/g, "And").replace(/[^A-Za-z0-9]/g, "");

/** What a typed tag is compared against: the key without hyphens ("captain-falcon" -> "captainfalcon"). */
export const tagOfKey = (key: string) => key.replace(/-/g, "");

/** Every tag word "@word" in a message, lowercased. */
function tagWords(text: string): string[] {
  return [...text.matchAll(/(?:^|[^A-Za-z0-9_])@([A-Za-z0-9]+)(?![A-Za-z0-9_])/g)].map((m) => m[1].toLowerCase());
}

/** The characters (keys) a message tags in one game's room, in the order typed, at most 3. */
export function taggedCharacters(game: GameKey, text: string): string[] {
  const byTag = new Map(CHARACTERS[game].map((c) => [tagOfKey(c.key), c.key]));
  const out: string[] = [];
  for (const w of tagWords(text)) {
    const key = byTag.get(w);
    if (key && !out.includes(key)) out.push(key);
    if (out.length === 3) break;
  }
  return out;
}

export type ChatPart = { text: string } | { character: string; name: string; tag: string };

/** A chat message split into plain text and this game's character tags (shown with the character's icon). */
export function chatBodyParts(game: GameKey | null, text: string): ChatPart[] {
  if (!game) return [{ text }];
  const byTag = new Map(CHARACTERS[game].map((c) => [tagOfKey(c.key), c]));
  const parts: ChatPart[] = [];
  let last = 0;
  for (const m of text.matchAll(/@([A-Za-z0-9]+)(?![A-Za-z0-9_])/g)) {
    const at = m.index ?? 0;
    if (at > 0 && /[A-Za-z0-9_]/.test(text[at - 1])) continue; // part of a word, like an email
    const c = byTag.get(m[1].toLowerCase());
    if (!c) continue;
    if (at > last) parts.push({ text: text.slice(last, at) });
    parts.push({ character: c.key, name: c.name, tag: m[0] });
    last = at + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

/** Every character tag of every game, lowercased (the chat's contact-info rule lets these through). */
export const ALL_CHARACTER_TAGS: ReadonlySet<string> = new Set(
  Object.values(CHARACTERS).flatMap((list) => list.map((c) => tagOfKey(c.key))),
);

/**
 * Chat text as the contact-info rule should read it: "@matchmaking" and character tags are tags, not
 * social media handles, so they're read as plain words. Every other "@name" is still refused.
 */
export function chatTextForCheck(text: string): string {
  return text.replace(/@([A-Za-z0-9_]+)(?![A-Za-z0-9_]|\.[A-Za-z0-9])/g, (whole, word: string) => {
    const w = word.toLowerCase();
    return w === "matchmaking" || ALL_CHARACTER_TAGS.has(w) ? word : whole;
  });
}

/** Suggestions while typing "@" in a game's room: @matchmaking first, then characters whose tag starts with what's typed. */
export function tagSuggestions(game: GameKey | null, typed: string, limit = 6): string[] {
  const q = typed.toLowerCase();
  const out: string[] = [];
  if (game && "matchmaking".startsWith(q)) out.push("matchmaking");
  if (game) {
    for (const c of CHARACTERS[game]) {
      if (tagOfKey(c.key).startsWith(q)) out.push(characterTagText(c));
      if (out.length >= limit) break;
    }
  }
  return out;
}
