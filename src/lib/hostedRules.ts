// The stage rules for an event hosted on Smashy: its ruleset, or every common stage for the game if
// it has none. Server-only (reads the ruleset as the viewer).
import "server-only";
import type { HostedEvent } from "./hostedEvents";
import { STAGES } from "./rulesetFields";
import { getRuleset } from "./scenes";
import { rulesFromRuleset, type StrikeRules } from "./striking";

export async function eventRules(event: Pick<HostedEvent, "rulesetId" | "game">): Promise<StrikeRules> {
  const ruleset = event.rulesetId ? await getRuleset(event.rulesetId).catch(() => null) : null;
  const raw = (ruleset?.latest?.rules ?? {}) as Record<string, unknown>;
  return rulesFromRuleset(raw, STAGES[event.game]);
}
