// Hashtags and character nicknames. Shared by server and browser.
//
// Understands community tags like #SSBU_CLOUD, #SSBM_Fox, #Melee_Falco, #PPlus_Marth,
// plus bare names/nicknames (#fox, #puff, #ICs, #GnW) when the game is known.
import { CHARACTERS } from "./characters";
import type { GameKey } from "./games";

const GAME_PREFIXES: Record<string, GameKey> = {
  ssbu: "ultimate", ultimate: "ultimate", smashultimate: "ultimate", ssbult: "ultimate", ult: "ultimate",
  ssbm: "melee", melee: "melee", smashmelee: "melee",
  pplus: "pplus", projectplus: "pplus", ssbpp: "pplus", pp: "pplus",
  ssb64: "smash64", smash64: "smash64", n64: "smash64", "64": "smash64",
  ssbb: "brawl", brawl: "brawl", smashbrawl: "brawl",
  ssb4: "smash4", smash4: "smash4", sm4sh: "smash4", ssbwu: "smash4", ssbwiiu: "smash4", ssb3ds: "smash4",
};

// Community nicknames -> character key (checked against each game's roster).
const NICKNAMES: Record<string, string> = {
  falcon: "captain-falcon", cf: "captain-falcon", cptfalcon: "captain-falcon",
  puff: "jigglypuff", jiggs: "jigglypuff", jiggly: "jigglypuff",
  ics: "ice-climbers", icies: "ice-climbers", icys: "ice-climbers", iceclimbers: "ice-climbers",
  gnw: "mr-game-and-watch", gw: "mr-game-and-watch", gameandwatch: "mr-game-and-watch", mrgameandwatch: "mr-game-and-watch",
  dk: "donkey-kong", ganon: "ganondorf", doc: "dr-mario", drmario: "dr-mario",
  yl: "young-link", younglink: "young-link", tl: "toon-link", toonlink: "toon-link",
  zss: "zero-suit-samus", zerosuit: "zero-suit-samus", mk: "meta-knight", metaknight: "meta-knight",
  ddd: "king-dedede", dedede: "king-dedede", krool: "king-k-rool", kingkrool: "king-k-rool",
  pt: "pokemon-trainer", trainer: "pokemon-trainer", pokemontrainer: "pokemon-trainer",
  pac: "pac-man", pacman: "pac-man", bayo: "bayonetta", minmin: "min-min",
  banjo: "banjo-and-kazooie", aegis: "pyra-and-mythra", pyra: "pyra-and-mythra", mythra: "pyra-and-mythra",
  wft: "wii-fit-trainer", wiifit: "wii-fit-trainer", rosa: "rosalina-and-luma", rosalina: "rosalina-and-luma",
  duckhunt: "duck-hunt", dh: "duck-hunt", littlemac: "little-mac", mac: "little-mac",
  megaman: "mega-man", bowserjr: "bowser-jr", jr: "bowser-jr", piranha: "piranha-plant", plant: "piranha-plant",
  darksamus: "dark-samus", darkpit: "dark-pit", diddy: "diddy-kong", diddykong: "diddy-kong",
  sheik: "sheik", sheikah: "sheik", zelda: "zelda", dedede_: "king-dedede",
  brawler: "mii-brawler", swordfighter: "mii-swordfighter", gunner: "mii-gunner",
  zard: "charizard", ivy: "ivysaur", squirt: "squirtle",
};

const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Find a character in a game's roster by name, key, or nickname. */
export function matchCharacter(game: GameKey, word: string): string | null {
  const w = compact(word);
  if (!w) return null;
  const roster = CHARACTERS[game];
  const direct = roster.find((c) => compact(c.key) === w || compact(c.name) === w);
  if (direct) return direct.key;
  const nick = NICKNAMES[w];
  return nick && roster.some((c) => c.key === nick) ? nick : null;
}

export type ParsedTag = { raw: string; game: GameKey | null; character: string | null };

/** "#SSBU_CLOUD" -> { game: ultimate, character: cloud }. Bare "#fox" uses `fallbackGame`. */
export function parseHashtag(tag: string, fallbackGame?: GameKey | null): ParsedTag {
  const raw = tag.replace(/^#/, "");
  const parts = raw.split(/[_-]/).filter(Boolean);
  if (parts.length >= 2) {
    const game = GAME_PREFIXES[parts[0].toLowerCase()];
    if (game) return { raw, game, character: matchCharacter(game, parts.slice(1).join("")) };
  }
  // Also handle "#SSBUCloud" / "#MeleeFox" (prefix glued on).
  const lower = raw.toLowerCase();
  for (const [prefix, game] of Object.entries(GAME_PREFIXES)) {
    if (prefix.length >= 4 && lower.startsWith(prefix) && lower.length > prefix.length) {
      const character = matchCharacter(game, lower.slice(prefix.length));
      if (character) return { raw, game, character };
    }
  }
  if (fallbackGame) return { raw, game: fallbackGame, character: matchCharacter(fallbackGame, raw) };
  return { raw, game: null, character: null };
}

export const HASHTAG_RE = /(^|[^\w&])#([A-Za-z][A-Za-z0-9_]{1,40})/g;

/** All hashtags in a post body. */
export function findHashtags(text: string): string[] {
  return [...text.matchAll(HASHTAG_RE)].map((m) => m[2]);
}

/** The first character a post's hashtags point to, if any. */
export function characterFromText(text: string, postGame: GameKey | null): { game: GameKey; character: string } | null {
  for (const tag of findHashtags(text)) {
    const p = parseHashtag(tag, postGame);
    if (p.game && p.character) return { game: p.game, character: p.character };
  }
  return null;
}
