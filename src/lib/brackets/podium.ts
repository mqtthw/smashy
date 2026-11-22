// Top 3 of a finished elimination bracket, read from the bracket itself (no extra request):
// 1st and 2nd from the last Grand Final (or the final in single elimination), 3rd from the
// Losers Final. Returns null when the bracket isn't finished or doesn't look like one.
import { SIDE } from "./phases";
import type { Bracket, BracketSet, SetPlayer } from "./types";

export type Podium = { first: SetPlayer; second: SetPlayer; third: SetPlayer | null };

const decided = (s: BracketSet) => s.state === "done" && !!s.players[0] && !!s.players[1] && (s.players[0].won || s.players[1].won);
const winner = (s: BracketSet) => (s.players[0]!.won ? s.players[0]! : s.players[1]!);
const loser = (s: BracketSet) => (s.players[0]!.won ? s.players[1]! : s.players[0]!);

/**
 * Only the event's final bracket decides its Top 3: the last phase, when that phase is a single
 * bracket (a pool's winner isn't the event's winner). Side brackets listed after the main one
 * (Amateur, Redemption...) don't count: their winner isn't the event's winner either.
 */
export function isFinalGroup(b: Bracket): boolean {
  const main = b.event.groups.filter((g) => !SIDE.test(g.phase));
  const groups = main.length ? main : b.event.groups;
  if (!groups.length) return true;
  const last = groups.at(-1)!.phase;
  const inLast = groups.filter((g) => g.phase === last);
  return inLast.length === 1 && inLast[0].id === b.groupId;
}

export function podium(b: Bracket): Podium | null {
  if (!isFinalGroup(b)) return null;
  if (!b.finished || (b.type !== "double" && b.type !== "single")) return null;
  const winners = b.rounds.filter((r) => r.winnersSide);
  const losers = b.rounds.filter((r) => !r.winnersSide);
  if (!winners.length) return null;
  // The deciding set: the last played set of the highest winners-side round that has one. start.gg
  // puts the Grand Final and its reset in the same round, so the later of the two decides (a reset
  // that wasn't needed has no played set, so the first Grand Final counts).
  const top = [...winners].sort((x, y) => y.round - x.round);
  let final: BracketSet | null = null;
  for (const r of top) {
    const played = r.sets.filter(decided);
    final = played.reduce<BracketSet | null>((last, s) => (!last || s.completedAt == null || last.completedAt == null || s.completedAt >= last.completedAt ? s : last), null);
    if (final) break;
  }
  if (!final) return null;
  let third: SetPlayer | null = null;
  if (b.type === "double" && losers.length) {
    const lf = [...losers].sort((x, y) => x.round - y.round)[0]; // losers rounds are negative: the lowest is the Losers Final
    const set = lf.sets.find(decided);
    if (set) third = loser(set);
  }
  return { first: winner(final), second: loser(final), third };
}

/**
 * The places a finished elimination bracket decides, best first, up to `max` players: 1st and 2nd
 * from the podium, then everyone knocked out in the same round shares a place (double elimination:
 * losers rounds from the Losers Final back, so 3rd, 4th, 5th ×2, 7th ×2; single elimination:
 * winners rounds from the final back, so 3rd ×2, 5th ×4). A tie that doesn't fit is left out whole.
 * For brackets with no standings from their site (parry.gg, or a start.gg event not closed yet).
 */
export function bracketStandings(b: Bracket, max = 8): { place: number; player: SetPlayer }[] | null {
  const top = podium(b);
  if (!top) return null;
  const out = [{ place: 1, player: top.first }, { place: 2, player: top.second }];
  const seen = new Set([top.first.entrantId, top.second.entrantId]);
  const rounds =
    b.type === "double"
      ? b.rounds.filter((r) => !r.winnersSide).sort((x, y) => x.round - y.round) // -5 (Losers Final), -4, ...
      : b.rounds.filter((r) => r.winnersSide).sort((x, y) => y.round - x.round);
  for (const r of rounds) {
    if (out.length >= max) break;
    const out_ = r.sets.filter(decided).map(loser).filter((p) => !seen.has(p.entrantId));
    if (!out_.length) continue;
    if (out.length + out_.length > max) break;
    const place = out.length + 1;
    for (const p of out_) {
      seen.add(p.entrantId);
      out.push({ place, player: p });
    }
  }
  return out;
}

/** A player's tag with their sponsor prefix: "LG | Fred". */
export const tagOf = (p: SetPlayer) => (p.prefix ? `${p.prefix} | ${p.name}` : p.name);

/** The Top 3 as numbered entries for resultsText ("Copy results"). */
export function podiumPlacements(top: Podium): { id: string; place: number; tag: string }[] {
  const out = [{ id: "1", place: 1, tag: tagOf(top.first) }, { id: "2", place: 2, tag: tagOf(top.second) }];
  if (top.third) out.push({ id: "3", place: 3, tag: tagOf(top.third) });
  return out;
}

/** One line for link previews: "🏆 Ann won · 2nd Bo · 3rd Cy". */
export function podiumLine(top: Podium): string {
  return [`🏆 ${tagOf(top.first)} won`, `2nd ${tagOf(top.second)}`, ...(top.third ? [`3rd ${tagOf(top.third)}`] : [])].join(" · ");
}
