// Which bracket is a major's main event in a game: Smash history names winners, counts tallies and tells
// storylines from it. Plain module (no server-only) so any page or test can use it.

// Side events, by their names: qualifiers, ladders, invitational extras, formats other than plain singles.
// At invitationals (Smash Summit, the Smash World Tour finals) they can be bigger than the main bracket.
const SIDE_EVENT =
  /\b(lcq|last chance|qualifiers?|ladder|mid[- ]?tiers?|low[- ]?tiers?|some tier|squad strike|side events?|redemption|amateurs?|arcadian|vip|swag|iron ?man|rvr|caster|random|wheel|draft|gravity|reverse|swiss|forsaken|roulette|crews?|stock|under ?\d+|\d+ (and|&) under|u\d+)\b/i;
// What's left of a plainly named main bracket ("Melee Singles", "Super Smash Bros. Ultimate 1v1") once the
// game's name and words like "singles" are taken out: nothing.
const PLAIN_EVENT =
  /super smash bros\.?|smash bros\.?|\b(ssbu|ssbm|ssb64|ssb4|ssbb|smash|melee|ultimate|project m|pm|brawl|for wii ?u|wii ?u|64|singles|1v1|1 v 1|main event|main|bracket|tournament|championships?|open|pro)\b|project ?\+|p\+|[^a-z0-9]+/gi;

/** Named as a side event (a qualifier, ladder, VIP or amateur bracket...). */
export const isSideEvent = (name: string) => SIDE_EVENT.test(name);

/**
 * A game's main bracket at a major, from its in-person singles brackets: the biggest that isn't a side
 * event (any bracket when all are), and on a tie the plainly named one. Summit 12's 16-player "Melee
 * Singles", not its 42-player "VIP Bracket".
 */
export function pickMainEvent<T extends { name: string; entrants: number | null }>(candidates: T[]): T | undefined {
  const side = (e: T) => (SIDE_EVENT.test(e.name) ? 1 : 0);
  const plain = (e: T) => (e.name.replace(PLAIN_EVENT, "") === "" ? 0 : 1);
  return [...candidates].sort((a, b) => side(a) - side(b) || (b.entrants ?? 0) - (a.entrants ?? 0) || plain(a) - plain(b))[0];
}
