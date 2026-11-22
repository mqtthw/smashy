// What a screen reader says for a set's box in a bracket: the round, who is playing, and the score
// or where it stands. (The box itself is a link; without this it was only "Set C: open details".)
import { scoreText } from "./score";
import type { BracketSet, SetPlayer } from "./types";

export function setLabel(s: Pick<BracketSet, "roundLabel" | "identifier" | "players" | "waitingOn" | "state">): string {
  const [a, b] = s.players;
  const name = (p: SetPlayer | null, i: 0 | 1) => p?.name ?? s.waitingOn[i] ?? "to be decided";
  const where = `${s.roundLabel}${s.identifier ? `, set ${s.identifier}` : ""}`;
  const who = `${name(a, 0)} against ${name(b, 1)}`;
  let state = s.state === "live" ? "being played now" : "not played yet";
  if (s.state === "done" && a && b) {
    const [winner, loser] = a.won ? [a, b] : [b, a];
    const score = [scoreText(winner.score, loser.score), scoreText(loser.score, winner.score)];
    state = `final, ${winner.name} won${loser.score === -1 ? " by DQ" : score[0] && score[1] ? ` ${score[0]} to ${score[1]}` : ""}`;
  }
  return `${where}: ${who}, ${state}. Open the set.`;
}
