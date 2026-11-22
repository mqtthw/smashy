// The waitlist for a full event: the plain logic (no database), so it can be tested.

export type Waiting = { userId: string; tag: string | null; handle: string | null };

/** Where this person stands in the line, counting from 1 (null = not waiting). */
export function waitlistPosition(line: Pick<Waiting, "userId">[], userId: string | null): number | null {
  if (!userId) return null;
  const i = line.findIndex((w) => w.userId === userId);
  return i < 0 ? null : i + 1;
}

/**
 * The line as names, for the event page: the people this viewer can see, in order, and how many
 * more are waiting that they can't (a teen's profile, for someone who isn't signed in).
 */
export function waitlistNames(line: Waiting[], max = 12): { names: string[]; more: number } {
  const visible = line.filter((w) => w.tag).map((w) => w.tag as string);
  const names = visible.slice(0, max);
  return { names, more: line.length - names.length };
}
