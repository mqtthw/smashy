// One event can hold two RSVPs: "going" on the expected weekly page before the organizer posts it, then
// again on the real tournament page once it's up (The Contract #225 showed twice on a profile).

type Row = { user_id?: string; event_kind: string; event_name: string; starts_at: string };

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Drops weekly RSVPs that the same person also made on the posted tournament (same name, start within 3 hours). */
export function dedupeRsvps<T extends Row>(rows: T[]): T[] {
  const tournaments = rows.filter((r) => r.event_kind === "tournament");
  return rows.filter(
    (r) =>
      r.event_kind !== "weekly" ||
      !tournaments.some(
        (t) =>
          (t.user_id ?? "") === (r.user_id ?? "") &&
          norm(t.event_name) === norm(r.event_name) &&
          Math.abs(Date.parse(t.starts_at) - Date.parse(r.starts_at)) <= 3 * 3600_000,
      ),
  );
}
