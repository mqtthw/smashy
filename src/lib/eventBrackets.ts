// Several brackets in one event (a Redemption bracket, a second game, a side event): the plain logic.
// Each extra bracket is its own hosted event tied to the main one; this file names them and decides
// who comes over when a host fills one bracket from another. No database here, so it can be tested.

export const BRACKET_NAME_MIN = 2;
export const BRACKET_NAME_MAX = 30;
export const EVENT_NAME_MAX = 80;
export const MAX_EXTRA_BRACKETS = 8;
const SEED_MAX = 512;

/** A bracket's own short name as typed: one line, single spaces, at most 30 characters. */
export function cleanBracketName(raw: unknown): string {
  return [...String(raw ?? "").replace(/\s+/g, " ").trim()].slice(0, BRACKET_NAME_MAX).join("").trim();
}

/**
 * What an extra bracket is called everywhere a single name is shown (notifications, results, posts):
 * "Otaku Zone #12: Redemption". Event names hold 80 characters, so a long main name is cut to fit
 * and the bracket's own name always shows in full.
 */
export function bracketFullName(mainName: string, bracketName: string): string {
  const label = cleanBracketName(bracketName);
  const room = EVENT_NAME_MAX - label.length - 2;
  const main = [...mainName.replace(/\s+/g, " ").trim()].slice(0, Math.max(1, room)).join("").trim();
  return `${main}: ${label}`;
}

/** The place a "bring over the players who are out" cut starts at for a field this size: the half that goes out first (32 players: 17th and lower). */
export function defaultCut(players: number): number {
  let size = 2;
  while (size < players) size *= 2;
  return Math.max(2, size / 2 + 1);
}

export type BringPlayer = { id: string; tag: string; guest: boolean; seed: number | null };

export type BringPlan = {
  /** Who gets added, best finisher first. `seed` is null once the seed numbers have run out. */
  add: (BringPlayer & { place: number | null; seed: number | null })[];
  /** Already in this bracket. */
  already: string[];
  /** Disqualified in the bracket they'd come from (they left or never showed), so they're left out. */
  leftOut: string[];
  /** Still playing in the bracket they'd come from (nobody is taken out of a bracket they're in). */
  stillIn: number;
  /** Finished above the cut. */
  above: number;
  /** Didn't fit under this bracket's player cap. */
  noRoom: string[];
};

const tagKey = (tag: string) => tag.trim().toLowerCase();

/**
 * Decides who comes over from another bracket of the same event.
 *
 * `places`: where each player whose run in that bracket is over finished (a player still in it has
 * none). With `cut` set, only players who placed `cut` or lower come over, so nobody still playing
 * is ever moved; with `cut` null, everyone signed up comes over, placed or not.
 *
 * Players with an account are matched by account, walk-ins by tag (they have a new id in every
 * bracket). New players are seeded after `highestSeed`, best finisher first, then by the seed they
 * had in the bracket they come from.
 */
export function planBringOver(opts: {
  players: BringPlayer[];
  places: Map<string, number>;
  cut: number | null;
  disqualified: Set<string>;
  hereIds: Set<string>;
  hereTags: string[];
  room: number;
  highestSeed: number;
}): BringPlan {
  const { players, places, cut, disqualified, hereIds } = opts;
  const takenTags = new Set(opts.hereTags.map(tagKey));
  const plan: BringPlan = { add: [], already: [], leftOut: [], stillIn: 0, above: 0, noRoom: [] };
  const far = Number.MAX_SAFE_INTEGER;
  const ordered = [...players].sort(
    (a, b) => (places.get(a.id) ?? far) - (places.get(b.id) ?? far) || (a.seed ?? far) - (b.seed ?? far) || a.tag.localeCompare(b.tag),
  );
  let nextSeed = Math.max(0, Math.floor(opts.highestSeed)) + 1;
  for (const p of ordered) {
    const place = places.get(p.id) ?? null;
    if (cut !== null) {
      if (place === null) {
        plan.stillIn++;
        continue;
      }
      if (place < cut) {
        plan.above++;
        continue;
      }
    }
    if (disqualified.has(p.id)) {
      plan.leftOut.push(p.tag);
      continue;
    }
    if (p.guest ? takenTags.has(tagKey(p.tag)) : hereIds.has(p.id)) {
      plan.already.push(p.tag);
      continue;
    }
    if (plan.add.length >= opts.room) {
      plan.noRoom.push(p.tag);
      continue;
    }
    if (p.guest) takenTags.add(tagKey(p.tag));
    plan.add.push({ ...p, place, seed: nextSeed <= SEED_MAX ? nextSeed : null });
    nextSeed++;
  }
  return plan;
}
