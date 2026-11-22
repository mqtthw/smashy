// Messages, play requests and the ladder need a birthday on file (round 692, migration
// 20270125280000_birthday_needed_to_message.sql). The database says so in English, starting "Add your
// birthday"; the app shows its own phrase in the reader's language instead.

/** Whether a database error is the "add your birthday first" rule. */
export function isBirthdayNeeded(error: { message?: string } | null | undefined): boolean {
  return /^Add your birthday/.test(error?.message ?? "");
}
