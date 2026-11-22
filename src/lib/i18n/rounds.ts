// Round names in the visitor's language. The bracket code names rounds in English ("Winners
// Semi-Final", "Losers Round 2", "Grand Final", "Winner of B": see bracketEngine.ts roundLabel and
// hostedBracket.ts), and other code and tests rely on that, so the English is translated only where
// it's shown. start.gg uses the same names. Anything not recognized is shown as it is.
// Plain logic, safe anywhere.
import type { MessageKey, Values } from "./core";

type Tr = (key: MessageKey, values?: Values) => string;

/** "Final", "Semi-Final", "Quarter-Final", "Round 3" (without a Winners/Losers side). */
function plainRound(label: string, t: Tr): string | null {
  if (/^Finals?$/i.test(label)) return t("hostbracket.round.final");
  if (/^Semi-?Finals?$/i.test(label)) return t("hostbracket.round.semi");
  if (/^Quarter-?Finals?$/i.test(label)) return t("hostbracket.round.quarter");
  const round = /^Round (\d+)$/i.exec(label);
  if (round) return t("hostbracket.round.round", { n: Number(round[1]) });
  return null;
}

/** A round, part or empty-slot label in the visitor's language ("Winners Final" → "Final de Winners"). */
export function localRound(label: string, t: Tr): string {
  if (/^Grand Finals?$/i.test(label)) return t("hostbracket.round.grandFinal");
  if (/^Grand Finals? Reset$/i.test(label)) return t("hostbracket.round.grandFinalReset");
  const side = /^(Winners|Losers) (.+)$/i.exec(label);
  if (side) {
    const round = plainRound(side[2], t);
    if (round === null) return label;
    return t(side[1].toLowerCase() === "winners" ? "hostbracket.round.winners" : "hostbracket.round.losers", { round });
  }
  const plain = plainRound(label, t);
  if (plain !== null) return plain;
  const pool = /^Pool (\w+)$/.exec(label);
  if (pool) return t("hostbracket.round.pool", { n: pool[1] });
  if (label === "Pool") return t("hostbracket.round.poolOnly");
  if (label === "Swiss rounds") return t("hostbracket.round.swissRounds");
  if (label === "Final bracket") return t("hostbracket.round.finalBracket");
  const feeder = /^(Winner|Loser) of (.+)$/.exec(label);
  if (feeder) return t(feeder[1] === "Winner" ? "hostbracket.round.winnerOf" : "hostbracket.round.loserOf", { id: feeder[2] });
  return label;
}

/**
 * The "who am I waiting for" line from feederStatus ("Being played now: Bob 1–0 Cara", "Bob vs Cara
 * is about to start on Setup 2") in the visitor's language. Names and setups stay as they are.
 */
export function localFeeder(text: string, t: Tr): string {
  const live = /^Being played now: (.+)$/.exec(text);
  if (live) return t("hostbracket.feeder.live", { players: live[1] });
  const on = /^(.+) is about to start on (.+)$/.exec(text);
  if (on) return t("hostbracket.feeder.readyOn", { players: on[1], setup: on[2] });
  const ready = /^(.+) is about to start$/.exec(text);
  if (ready) return t("hostbracket.feeder.ready", { players: ready[1] });
  return text;
}
