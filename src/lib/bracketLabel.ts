// A bracket's name without the game in it, for lists where the game is already clear (round 876). start.gg
// names come as organizers typed them: "Super Smash Bros. Melee - Singles", "Melee - 1v1 Singles", "MAIN
// EVENT", "SSBM Singles". Side by side on a player page they read like a raw data dump.
import { GAMES, type GameKey } from "./games";

const NAMES: Record<GameKey, string[]> = {
  melee: ["super smash bros. melee", "super smash bros melee", "smash bros. melee", "smash melee", "ssbm", "melee"],
  ultimate: ["super smash bros. ultimate", "super smash bros ultimate", "smash bros. ultimate", "smash ultimate", "smash ult", "ssbu", "ultimate", "ult"],
  pplus: ["project plus", "project+", "pplus", "p+"],
  smash64: ["super smash bros. 64", "super smash bros 64", "smash 64", "ssb64", "64"],
  brawl: ["super smash bros. brawl", "super smash bros brawl", "ssbb", "brawl"],
  smash4: ["super smash bros. for wii u", "super smash bros. 4", "smash 4", "sm4sh", "wii u"],
};
const escape = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** "Super Smash Bros. Melee - 1v1 Singles" -> "Singles"; "MAIN EVENT" -> "Main Event"; "" stays the game. */
export function bracketLabel(name: string, game: GameKey): string {
  let out = name.trim();
  for (const w of NAMES[game] ?? []) {
    // The game's name as a whole word at the start or end, with any dash, colon or bullet beside it.
    out = out.replace(new RegExp(`^${escape(w)}(?![a-z0-9])\\s*[-–—:|·]?\\s*`, "i"), "");
    out = out.replace(new RegExp(`\\s*[-–—:|·(]?\\s*${escape(w)}\\)?$`, "i"), "");
  }
  out = out.replace(/^1v1\s+/i, "").replace(/\s+/g, " ").trim();
  if (!out) return GAMES[game].short;
  // Shouted names ("MAIN EVENT") in title case; mixed case ("Top 8 Bracket") is left as typed.
  if (out === out.toUpperCase() && /[A-Z]{3}/.test(out)) out = out.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());
  return out.charAt(0).toUpperCase() + out.slice(1);
}
