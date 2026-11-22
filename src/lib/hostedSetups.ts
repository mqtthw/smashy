// A night that runs itself: for an event that says how many setups the venue has, hand each called
// set the next free "Setup N" and tell its players where to go. The choosing is plain logic
// (lib/setups.ts); this reads and saves. Server-only.
import "server-only";
import { playOrder, type BracketKind } from "./bracketEngine";
import { discordCalls } from "./discord";
import { accountsBehind } from "./hostedTeams";
import { freshLive, type LiveState } from "./liveSet";
import { planSetups } from "./setups";
import { createAdminClient } from "./supabase/admin";
import { translatorsFor } from "./i18n/recipients";

type Row = {
  id: string;
  identifier: string | null;
  p1_id: string | null;
  p2_id: string | null;
  bracket: BracketKind;
  round: number;
  pool: number | null;
  idx: number;
  live: LiveState | null;
  updated_at: string;
};

/**
 * Give free setups to the sets waiting for one. Does nothing for an event without a setups count,
 * or one that isn't running. Safe to call whenever something changed (a set was called, a set
 * finished, the TO moved a set): it only ever fills setups that are free right now. Never throws:
 * a set without a setup can still be played and given one by hand.
 */
export async function assignSetups(eventId: string): Promise<number> {
  try {
    const db = createAdminClient();
    const { data: ev } = await db.from("hosted_events").select("name, setups, status").eq("id", eventId).maybeSingle();
    const count = (ev?.setups as number | null | undefined) ?? null;
    if (!ev || !count || ev.status !== "in_progress") return 0;
    const { data } = await db
      .from("hosted_sets")
      .select("id, identifier, p1_id, p2_id, bracket, round, pool, idx, live, updated_at")
      .eq("event_id", eventId)
      .in("state", ["ready", "live"])
      .limit(1000);
    const rows = (data ?? []) as Row[];
    const plan = planSetups(
      count,
      rows.map((r) => ({
        id: r.id,
        players: [r.p1_id, r.p2_id],
        station: r.live?.station ?? null,
        calledAt: Date.parse(r.live?.calledAt ?? r.updated_at),
        // Earlier rounds first; within a round, the order the sets sit in the bracket (A before B).
        order: playOrder(r) * 100_000 + (r.pool ?? 0) * 1_000 + r.idx,
      })),
    );
    if (!plan.length) return 0;
    const byId = new Map(rows.map((r) => [r.id, r]));
    const now = new Date().toISOString();
    const given: { row: Row; station: string }[] = [];
    for (const { id, station } of plan) {
      const row = byId.get(id)!;
      // Only if nobody touched the set since we read it (a player may be striking a stage right now):
      // otherwise it's picked up the next time this runs.
      const { data: saved } = await db
        .from("hosted_sets")
        .update({ live: { ...(row.live ?? freshLive()), station, stationAt: now }, updated_at: now })
        .eq("id", id)
        .eq("updated_at", row.updated_at)
        .in("state", ["ready", "live"])
        .select("id");
      if (saved?.length) given.push({ row, station });
    }
    if (!given.length) return 0;
    // Tell the players where to go (a team's members with accounts; walk-ins have nobody to tell).
    const accounts = await accountsBehind(given.flatMap((g) => [g.row.p1_id, g.row.p2_id]), db);
    const trOf = await translatorsFor([...accounts.values()].flat()); // each in their own language
    const notes = given.flatMap((g) =>
      [g.row.p1_id, g.row.p2_id]
        .flatMap((id) => (id ? (accounts.get(id) ?? []) : []))
        .map((user_id) => ({ user_id, actor_id: null, type: "event_update", event_name: trOf(user_id)("alert.ev.onStation", { event: ev.name as string, station: g.station }).slice(0, 200), event_href: `/host/set/${g.row.id}` })),
    );
    if (notes.length) {
      const { error } = await db.from("notifications").insert(notes);
      if (error) console.error("setup notifications failed", error.message);
    }
    await discordCalls(eventId, given.map((g) => ({ identifier: g.row.identifier, p1: g.row.p1_id, p2: g.row.p2_id, station: g.station })));
    return given.length;
  } catch (e) {
    console.error("assigning setups failed", e instanceof Error ? e.message : e);
    return 0;
  }
}
