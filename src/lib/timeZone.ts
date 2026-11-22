// Time zone names sent with a form (plain module: server actions and tests use it).
/** True for a time zone name this server knows ("America/Chicago"); events and leagues save only those (round 635). */
export function isTimeZone(tz: string): boolean {
  if (!tz || tz.length > 60) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
