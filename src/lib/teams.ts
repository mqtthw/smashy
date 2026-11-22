// Doubles: the plain logic (no database), so it can be tested.
// A team is one entry in a bracket with two members; see lib/hostedTeams.ts for reading them.

export const TEAM_NAME_MAX = 30;

import type { MessageKey } from "./i18n/core";

/** `error`: a phrase key; the action shows it in the player's language. */
export type PartnerInput = { kind: "handle"; handle: string } | { kind: "name"; name: string } | { kind: "error"; error: MessageKey };

/**
 * What a player typed for their doubles partner: "@handle" is a Smashy account; anything else is the
 * name of someone without one (they're listed by that name, and their partner reports the sets).
 */
export function readPartner(raw: unknown): PartnerInput {
  const text = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!text) return { kind: "error", error: "entering.err.partnerEmpty" };
  if (text.startsWith("@")) {
    const handle = text.slice(1).trim().toLowerCase();
    if (!/^[a-z0-9_]{2,30}$/.test(handle)) return { kind: "error", error: "entering.err.partnerHandle" };
    return { kind: "handle", handle };
  }
  if ([...text].length > TEAM_NAME_MAX) return { kind: "error", error: "entering.err.partnerLong" };
  return { kind: "name", name: text };
}

/** A typed name for one half of a team the host adds: one line, single spaces. Empty when it isn't usable. */
export function cleanTeamName(raw: unknown): string {
  const text = String(raw ?? "").replace(/\s+/g, " ").trim();
  return [...text].length > TEAM_NAME_MAX ? "" : text;
}
