// Search across every character's resource library and course list (the curated links in
// essentials.ts), so search finds "armada peach", "fox combo" or "how do I ledge trap" even though
// those links aren't in the database. Safe in the browser.
import { characterName } from "./characters";
import { CHARACTER_COURSES, CHARACTER_LIBRARIES, GAME_ESSENTIALS, LIBRARY_SECTIONS, libraryType, type CommunityLink, type Essential } from "./essentials";
import { GAMES, type GameKey } from "./games";
import { matchCharacter } from "./hashtags";

/** `character` is null for a game-wide resource (Melee essentials and general resources). */
export type LibraryHit = { game: GameKey; character: string | null; name: string; section: string; link: CommunityLink };

const SECTION_LABEL = new Map(LIBRARY_SECTIONS);
const words = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean);

/** Filler in questions ("how do I ledge trap as fox") that shouldn't have to match anything. */
const FILLER = new Set(
  "a an and as at be best but by can do does doing for from get getting good help how i im in into is it its me my of on or play playing should the to vs what whats when where which who why with you your".split(" "),
);

/** Same idea, different spelling: the query word also matches these. */
const ALIASES: Record<string, string[]> = {
  edgeguard: ["edgeguarding", "edge"],
  edgeguarding: ["edgeguard", "edge"],
  ledgetrap: ["ledge"],
  ledgetrapping: ["ledge"],
  recover: ["recovery", "recovering"],
  recovery: ["recover", "recovering"],
  kill: ["kills", "killing", "ko"],
  ko: ["kill", "kills"],
  di: ["survival", "sdi"],
  oos: ["out", "shield"],
  beginner: ["beginners", "basics", "basic", "new", "starter"],
  combo: ["combos", "comboing", "bread", "confirm", "confirms"],
  matchup: ["matchups", "mu"],
  mu: ["matchup", "matchups"],
  frame: ["frames"],
};

/** Characters a search names, word by word ("how to beat puff as fox" → Jigglypuff, Fox), Melee and Ultimate first. */
export function charactersIn(q: string): { game: GameKey; character: string; name: string }[] {
  const terms = words(q).filter((w) => w.length >= 2 && !FILLER.has(w));
  const out: { game: GameKey; character: string; name: string }[] = [];
  for (const game of ["melee", "ultimate", "pplus", "smash64", "brawl", "smash4"] as GameKey[]) {
    for (const t of terms) {
      const key = matchCharacter(game, t);
      if (key && !out.some((o) => o.game === game && o.character === key)) out.push({ game, character: key, name: characterName(game, key) ?? key });
    }
  }
  return out;
}

/** Every link a search can find: game essentials and general resources, character libraries, courses. */
function* entries(): Generator<{ game: GameKey; character: string | null; link: CommunityLink; section: string; about?: string }> {
  for (const [game, list] of Object.entries(GAME_ESSENTIALS) as [GameKey, Essential[]][]) {
    for (const e of list) {
      // The description only supports a match ("fox" in "tested on Marth and Fox" isn't a Fox resource).
      yield { game, character: null, link: { group: "General Melee", title: e.title, url: e.url, by: e.credit?.replace(/^By /, "").replace(/\.$/, "") }, section: e.general ? "General resources" : "Essentials", about: e.why };
    }
  }
  for (const [game, libs] of Object.entries(CHARACTER_LIBRARIES) as [GameKey, NonNullable<(typeof CHARACTER_LIBRARIES)[GameKey]>][]) {
    for (const [character, lib] of Object.entries(libs)) {
      for (const link of lib.links) yield { game, character, link, section: SECTION_LABEL.get(libraryType(link)) ?? "" };
    }
  }
  for (const [game, chars] of Object.entries(CHARACTER_COURSES) as [GameKey, NonNullable<(typeof CHARACTER_COURSES)[GameKey]>][]) {
    for (const [character, courses] of Object.entries(chars)) {
      for (const c of courses) {
        const link: CommunityLink = { group: "General Melee", title: `${c.title}: ${c.note}`, url: c.url, by: c.paid ? `${c.by} (paid course)` : c.by };
        yield { game, character, link, section: "Courses" };
      }
    }
  }
}

/**
 * Finds resources that actually fit the question. Filler words are ignored; every other word must
 * match the link's title or author, or name its character (nicknames like "puff" count), with the
 * section ("Combo videos") and game only as supporting matches. Something must hit the title or
 * author, unless the search is just a character, so weak matches don't show up. A word naming the
 * character ranks highest, then title, then author. A link shared by two characters appears once.
 */
export function searchLibrary(q: string, limit = 20, only?: { game: GameKey; character: string }): LibraryHit[] {
  const all = words(q).filter((w) => w.length >= 2);
  const terms = all.filter((w) => !FILLER.has(w)).slice(0, 8);
  if (!terms.length) return [];
  const hits: { hit: LibraryHit; score: number }[] = [];
  for (const { game, character, link, section, about } of entries()) {
    if (only && (game !== only.game || character !== only.character)) continue;
    const name = character ? (characterName(game, character) ?? character) : GAMES[game].short;
    const charWords = character ? words(name) : [];
    const gameWords = new Set(words(`${GAMES[game].short} ${game === "ultimate" ? "ssbu" : game === "melee" ? "ssbm" : ""}`));
    const title = words(link.title);
    const by = words(link.by ?? "");
    const sectionWords = words(`${section} ${about ?? ""}`);
    let score = 0;
    let strong = false; // a title or author match
    let onlyCharacter = true;
    const ok = terms.every((t) => {
      const forms = [t, ...(ALIASES[t] ?? [])];
      const has = (list: string[]) => list.some((w) => forms.some((f) => w.startsWith(f)));
      if (character && (has(charWords) || matchCharacter(game, t) === character)) return (score += 4);
      if (gameWords.has(t)) return true;
      onlyCharacter = false;
      if (has(title)) return (strong = true), (score += 3);
      if (has(by)) return (strong = true), (score += 2);
      if (has(sectionWords)) return (score += 1);
      // "ledgetrap" written as one word still finds "ledge trap"
      if (t.length > 6 && title.join("").includes(t)) return (strong = true), (score += 2);
      return false;
    });
    // Inside one character's library, naming the character alone ("marth" on Marth's page) shows everything.
    if (!ok || !(strong || onlyCharacter)) continue;
    // Shared links (Peach and Daisy share a library): prefer the copy whose title names the character.
    // The whole name ("mr game watch"), so the word "watch" alone doesn't count as naming Mr. Game & Watch.
    const named = charWords.length && ` ${title.join(" ")} `.includes(` ${charWords.join(" ")} `) ? 0.5 : 0;
    // On a tie, the game-wide pick (e.g. Slippi itself) comes before a library link that mentions it.
    const gameWide = character ? 0 : 1;
    hits.push({ hit: { game, character, name, section, link }, score: score + named + gameWide });
  }
  const seen = new Set<string>();
  return hits
    .sort((a, b) => b.score - a.score)
    .filter(({ hit }) => !seen.has(hit.link.url) && seen.add(hit.link.url))
    .slice(0, limit)
    .map(({ hit }) => hit);
}
