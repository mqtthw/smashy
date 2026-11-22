// Bringing an event's players over from start.gg: the parts that are plain logic (reading the link,
// deciding who gets added), kept apart from the network and database code so they can be tested.
import { cleanTag } from "./handles";
import { cleanPublicText } from "./wordFilter";

/** Smashy brackets hold up to this many players (hosted_events.entrant_cap, seeds 1–512). */
export const IMPORT_MAX = 512;
const TAG_MAX = 30;

export type StartggLink = { kind: "event"; slug: string } | { kind: "tournament"; slug: string };

/**
 * What a pasted start.gg link points at: one event ("tournament/x/event/y"), or a whole tournament
 * ("tournament/x"), which may hold several events. Null when it isn't a start.gg tournament link.
 */
export function readStartggLink(link: string): StartggLink | null {
  const m = String(link ?? "")
    .trim()
    // "admin/" too: TOs often copy the link from their own admin pages.
    .match(/(?:^|[/.])(?:start|smash)\.gg\/(?:admin\/)?(tournament\/[a-z0-9_.~-]+)(?:\/events?\/([a-z0-9_.~-]+))?/i);
  if (!m) return null;
  const tournament = m[1].toLowerCase();
  return m[2] ? { kind: "event", slug: `${tournament}/event/${m[2].toLowerCase()}` } : { kind: "tournament", slug: tournament };
}

/** An event slug we made ourselves (from the buttons that list a tournament's events). */
export function isEventSlug(slug: string): boolean {
  return /^tournament\/[a-z0-9_.~-]+\/event\/[a-z0-9_.~-]+$/.test(slug);
}

export type FoundPlayer = { tag: string; seed: number | null };

export type ImportPlan = {
  /** Who gets added, best seed first. `seed` is null when the event's seed numbers have run out. */
  add: { tag: string; seed: number | null }[];
  /** Already in this event (signed up or a walk-in), or listed twice on start.gg. */
  already: string[];
  /** Tags Smashy won't show (empty, or caught by the word and contact-info filter). */
  blocked: number;
  /** Didn't fit under the event's player cap. */
  noRoom: string[];
};

/** Tags are compared the way the database's unique index does: trimmed, any letter case. */
const sameTagKey = (tag: string) => tag.trim().toLowerCase();

/**
 * Decides who to add. `existingTags` is everyone already in the event, `room` is how many more
 * players fit under the cap, and `highestSeed` is the largest seed already given out (0 if none):
 * the new players are seeded after it, in start.gg's seeding order.
 */
export function planImport(found: FoundPlayer[], existingTags: string[], room: number, highestSeed: number): ImportPlan {
  const taken = new Set(existingTags.map(sameTagKey));
  const plan: ImportPlan = { add: [], already: [], blocked: 0, noRoom: [] };
  // Best seed first; players without a seed keep the order start.gg listed them in (sort is stable).
  const ordered = [...found].sort((a, b) => (a.seed ?? Number.MAX_SAFE_INTEGER) - (b.seed ?? Number.MAX_SAFE_INTEGER));
  let nextSeed = Math.max(0, Math.floor(highestSeed)) + 1;
  for (const player of ordered) {
    // Cut by whole characters (an emoji is one), then tidy again in case the cut left a space.
    const tag = cleanTag([...cleanTag(player.tag)].slice(0, TAG_MAX).join(""));
    if (!tag || cleanPublicText(tag).flagged) {
      plan.blocked++;
      continue;
    }
    const key = sameTagKey(tag);
    if (taken.has(key)) {
      plan.already.push(tag);
      continue;
    }
    if (plan.add.length >= room) {
      plan.noRoom.push(tag);
      continue;
    }
    taken.add(key);
    plan.add.push({ tag, seed: nextSeed <= IMPORT_MAX ? nextSeed : null });
    nextSeed++;
  }
  return plan;
}
