// Beginner videos for the New players page (round 911): real gameplay, explained by players, instead
// of paragraphs (Matthew: "wordy essays usually aren't enough, players prefer to see real visuals from
// in game"). Nothing is picked by Smashy's own judgement of what's correct: these are the videos the
// character communities already list for their own beginners (CHARACTER_LIBRARIES in essentials.ts),
// found by their titles. A new beginner video added there shows up here by itself.
import { toEmbed } from "./embeds";
import { CHARACTER_LIBRARIES } from "./essentials";
import type { GameKey } from "./games";

export type StarterVideo = { title: string; by?: string; url: string; /** null: about the game as a whole, not one character */ character: string | null };

// Videos about the game as a whole, shown first and without a character's name (YouTube ids).
const GENERAL = ["NQPTlCJ02iA", "A0MXyJxa6Ik", "ta3L35wsE6o"];

// Videos a character's community lists as a "beginner's guide" that aren't for someone new to the game, by YouTube
// id (Matthew, round 967: Mew2King's "How to embarrass with Pichu" "doesnt belong in the new players videos"). They
// stay on their character's own page.
const NOT_FOR_NEW_PLAYERS = ["Q3yexswM15Q"];

const youtubeId = (url: string) => {
  const e = toEmbed(url);
  return e?.kind === "player" && e.provider === "YouTube" ? (e.src.match(/\/embed\/([A-Za-z0-9_-]+)/)?.[1] ?? null) : null;
};

/** "Beginner ZSS guide (video)" -> "Beginner ZSS guide" */
const tidy = (title: string) => title.replace(/\s*\((?:video|video playlist|playlist)[^)]*\)\s*$/i, "").replace(/\s*\(video, ([^)]*)\)\s*$/i, " ($1)");

/**
 * Up to `max` single videos (not playlists: those have no still picture and don't play in place) whose
 * title says they're for beginners, the general ones first, then one per character in the libraries'
 * own order. Combo and setup videos are left out: they assume the basics.
 */
export function starterVideos(game: GameKey, max = 6): StarterVideo[] {
  const seen = new Set<string>();
  const general: (StarterVideo & { rank: number })[] = [];
  const byCharacter: StarterVideo[] = [];
  for (const [character, lib] of Object.entries(CHARACTER_LIBRARIES[game] ?? {})) {
    let taken = false;
    for (const l of lib.links) {
      const id = youtubeId(l.url);
      if (!id || seen.has(id) || NOT_FOR_NEW_PLAYERS.includes(id)) continue;
      const rank = GENERAL.indexOf(id);
      if (rank >= 0) {
        seen.add(id);
        general.push({ title: tidy(l.title), by: l.by, url: l.url, character: null, rank });
      } else if (!taken && /beginner/i.test(l.title) && !/combo|setup/i.test(l.title)) {
        // One part of a series is enough ("…, part 1" from Marth's library; not "part 2" from Lucina's).
        const series = l.title.replace(/,? part \d+.*$/i, "").toLowerCase();
        if (seen.has(series)) continue;
        seen.add(series);
        seen.add(id);
        taken = true;
        byCharacter.push({ title: tidy(l.title), by: l.by, url: l.url, character });
      }
    }
  }
  general.sort((a, b) => a.rank - b.rank);
  return [...general.map((v): StarterVideo => ({ title: v.title, by: v.by, url: v.url, character: null })), ...byCharacter].slice(0, max);
}
