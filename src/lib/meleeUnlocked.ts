// "Challenge in Melee Unlocked" on player pages (round 690). Melee Unlocked (github.com/Hero88go/melee-unlocked)
// is a PC version of Melee whose launcher can send a Slippi match request. The link format its launcher will
// answer is being agreed with hero88go (docs/open-source-plan.md, step 2); until then this returns null and
// no button shows. When it's agreed, build the link here (e.g. `meleeunlocked://challenge?code=ABCD-123`).

/** The link that opens Melee Unlocked with a match request to this Slippi connect code, or null (not ready). */
export function meleeUnlockedChallengeUrl(code: string): string | null {
  void code;
  return null;
}
