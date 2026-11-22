import { describe, expect, it } from "vitest";
import { dedupeRsvps } from "@/lib/rsvpDedupe";

const row = (kind: string, name: string, at: string, user = "u1") => ({ user_id: user, event_kind: kind, event_name: name, starts_at: at });

describe("dedupeRsvps", () => {
  it("drops the expected-weekly RSVP once the posted tournament has one too", () => {
    const rows = [row("tournament", "The Contract #225", "2026-11-10T01:00:00Z"), row("weekly", "The Contract #225", "2026-11-10T01:00:00Z")];
    expect(dedupeRsvps(rows).map((r) => r.event_kind)).toEqual(["tournament"]);
  });
  it("keeps different events, other people's RSVPs, and other weeks", () => {
    const rows = [
      row("tournament", "The Contract #225", "2026-11-10T01:00:00Z"),
      row("weekly", "The Contract #226", "2026-11-17T01:00:00Z"),
      row("weekly", "The Contract #225", "2026-11-10T01:00:00Z", "u2"),
    ];
    expect(dedupeRsvps(rows)).toHaveLength(3);
  });
});
