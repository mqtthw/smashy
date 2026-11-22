// Age helpers: Smashy is 13+, and members without a birthday on file are treated as teens.

export const MIN_AGE = 13;
export const ADULT_AGE = 18;

/** Parse "YYYY-MM-DD" into a real calendar date, or null if invalid / in the future. */
export function parseBirthdate(value: string | null | undefined): string | null {
  const m = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  const real = date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
  if (!real || y < 1900 || date.getTime() > Date.now()) return null;
  return value!;
}

/** Whole years old today. */
export function ageFromBirthdate(birthdate: string, today = new Date()): number {
  const [y, m, d] = birthdate.split("-").map(Number);
  let age = today.getUTCFullYear() - y;
  const beforeBirthday =
    today.getUTCMonth() + 1 < m || (today.getUTCMonth() + 1 === m && today.getUTCDate() < d);
  if (beforeBirthday) age--;
  return age;
}

/**
 * The birthday from a form's month / day / year fields: "blank" when all three are empty (it's
 * optional), "partial" when only some are, "bad" for a date that doesn't exist, else the date.
 */
export function birthdateFromForm(formData: FormData): { kind: "blank" } | { kind: "partial" } | { kind: "bad" } | { kind: "date"; date: string } {
  const parts = ["year", "month", "day"].map((k) => String(formData.get(k) ?? "").trim());
  if (parts.every((p) => !p)) return { kind: "blank" };
  if (parts.some((p) => !p)) return { kind: "partial" };
  const date = parseBirthdate(`${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`);
  return date ? { kind: "date", date } : { kind: "bad" };
}

// Cookie names
export const AGE_BLOCK_COOKIE = "smashy_age_block"; // under 13: stop immediate retries in this browser
