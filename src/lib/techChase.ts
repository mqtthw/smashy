// The Arcade's tech-chase trainer (round 946, Matthew: "a simple browser game that implements mechanics from
// melee, maybe a techchase simulator … wasd and spacebar"). The rules, apart from the drawing: a knocked-down
// dummy gets up one of four ways, and the player has to be on the right spot and grab in the short moment
// after the dummy stops being invincible. A reaction game inspired by the mechanic, drawn with plain shapes;
// it doesn't copy Melee's frame data.

export type TechOption = "left" | "right" | "inPlace" | "missed";
export const TECH_OPTIONS: TechOption[] = ["left", "right", "inPlace", "missed"];
/** The three spots on the stage: -1 left, 0 centre (where the dummy lands), 1 right. */
export type Slot = -1 | 0 | 1;
export const techSlot = (o: TechOption): Slot => (o === "left" ? -1 : o === "right" ? 1 : 0);

export const FALL_MS = 420; // the knockdown, before the wait
export const WHIFF_MS = 380; // a missed grab leaves the player stuck this long
export const START_LIVES = 3;

/** How long the get-up is invincible and how long the opening after it lasts: both shrink as grabs add up. */
export function techTimings(grabs: number) {
  return { rollMs: Math.max(300, 560 - 12 * grabs), openMs: Math.max(170, 430 - 10 * grabs), missedOpenMs: Math.max(230, 540 - 12 * grabs) };
}

/** One knockdown: what the dummy does, how long it lies there first, then its invincible time and its opening. */
export type TechRound = { option: TechOption; waitMs: number; rollMs: number; openMs: number };

/** `rand` gives 0..1 numbers (Math.random in the browser, a fixed list in tests). A missed tech has no invincible time. */
export function newRound(grabs: number, rand: () => number): TechRound {
  const option = TECH_OPTIONS[Math.min(TECH_OPTIONS.length - 1, Math.floor(rand() * TECH_OPTIONS.length))];
  const t = techTimings(grabs);
  return { option, waitMs: 500 + Math.floor(rand() * 700), rollMs: option === "missed" ? 0 : t.rollMs, openMs: option === "missed" ? t.missedOpenMs : t.openMs };
}

export type Judge = "grab" | "early" | "late" | "wrongSpot";
/** A grab pressed `sinceMs` after the dummy chose, with the player on `slot`. Before it chose, sinceMs is negative. */
export function judgeGrab(round: TechRound, sinceMs: number, slot: Slot): Judge {
  if (sinceMs < 0) return "early";
  if (slot !== techSlot(round.option)) return "wrongSpot";
  if (sinceMs < round.rollMs) return "early";
  return sinceMs <= round.rollMs + round.openMs ? "grab" : "late";
}

/** How long after the opening began the grab came. */
export const reactionMs = (round: TechRound, sinceMs: number) => Math.max(0, Math.round(sinceMs - round.rollMs));

export const moveSlot = (slot: Slot, by: -1 | 1): Slot => Math.max(-1, Math.min(1, slot + by)) as Slot;

export const average = (list: number[]) => (list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : 0);
