// Small helpers for the few places where the generated database types (database.types.ts) are stricter
// than the database itself (round 727). They change nothing at run time.

/**
 * A whole-number id column (start.gg player and event ids are `bigint`) filtered by its digits as text,
 * which is how Smashy carries those ids around. The database accepts either form.
 */
export const big = (id: string) => id as unknown as number;
export const bigs = (ids: readonly string[]) => ids as unknown as number[];

/**
 * An argument of a database function that may be null. The generated types can't tell which arguments
 * accept null, so they all look required; this passes null through where the function expects it.
 */
export const orNull = <T>(value: T | null | undefined) => (value ?? null) as T;
