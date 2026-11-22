// Brackets from any source, behind one set of functions.
import "server-only";
import { getParryggBracket, getParryggSet, resolveParryggLink } from "./parrygg";
import { getStartggBracket, getStartggPodium, getStartggSet, resolveStartggLink } from "./startgg";
import { podium, type Podium } from "./podium";
import { BRACKET_SOURCES, bracketPath, type Bracket, type BracketSource, type SetDetail } from "./types";

export function isSource(value: unknown): value is BracketSource {
  return typeof value === "string" && (BRACKET_SOURCES as string[]).includes(value);
}

export function getBracket(source: BracketSource, eventId: string, groupId?: string | null): Promise<Bracket | null> {
  return source === "startgg" ? getStartggBracket(eventId, groupId) : getParryggBracket(eventId, groupId);
}

/**
 * A finished event's Top 3. start.gg: its own final standings (any pool page of a finished event
 * shows it). Otherwise, read from the bracket when it's the event's final one.
 */
export async function getEventPodium(source: BracketSource, bracket: Bracket): Promise<Podium | null> {
  // Only finished brackets ask (an upcoming or running event has no final standings yet).
  if (source === "startgg" && bracket.finished) {
    const top = await getStartggPodium(bracket.event.eventId).catch(() => null);
    if (top) return top;
  }
  return podium(bracket);
}

export function getSet(source: BracketSource, id: string): Promise<SetDetail | null> {
  return source === "startgg" ? getStartggSet(id) : getParryggSet(id);
}

/** A pasted start.gg or parry.gg link -> the Smashy bracket page for it (or null if we can't tell). */
export async function bracketPathForLink(url: string): Promise<string | null> {
  const s = url.trim();
  if (/start\.gg\//i.test(s)) {
    const r = await resolveStartggLink(s).catch(() => null);
    return r ? bracketPath("startgg", r.eventId, r.groupId) : null;
  }
  if (/parry\.gg\//i.test(s)) {
    const r = await resolveParryggLink(s).catch(() => null);
    return r ? bracketPath("parrygg", r.eventId, r.groupId) : null;
  }
  return null;
}
