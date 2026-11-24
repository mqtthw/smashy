// Following any start.gg player (round 797): a private list of players a member keeps up with, on Smashy or
// not, to see where they compete next. Only the member sees their own list (player_follows' rules). And the
// daily alert when one of them signs up for a tournament (round 799).
import "server-only";
import { newSignups } from "./followedSignups";
import { translatorsFor } from "./i18n/recipients";
import { playersHidingStats } from "./playerStats";
import { getPlayerUpcoming } from "./startggPlayers";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";

/** How many players one member may follow (each one is a start.gg lookup on the Events page). */
export const MAX_PLAYER_FOLLOWS = 100;
/** How many of them the Events page looks up at once. */
export const FOLLOWS_SHOWN = 12;

export type PlayerFollow = { playerId: string; tag: string };

/** The players a member follows, latest first. */
export async function getPlayerFollows(userId: string | null): Promise<PlayerFollow[]> {
  if (!userId) return [];
  const db = await createClient();
  const { data, error } = await db.from("player_follows").select("player_id, tag").eq("user_id", userId).order("created_at", { ascending: false }).limit(MAX_PLAYER_FOLLOWS);
  if (error) throw error;
  return (data ?? []).map((r) => ({ playerId: r.player_id, tag: r.tag }));
}

/** Whether a member follows this player. */
export async function followsPlayer(userId: string | null, playerId: string): Promise<boolean> {
  if (!userId) return false;
  const db = await createClient();
  const { data } = await db.from("player_follows").select("player_id").eq("user_id", userId).eq("player_id", playerId).maybeSingle();
  return !!data;
}

/** Followed players looked at per daily run (one start.gg request each), longest-unchecked first. */
export const SIGNUP_CHECKS_PER_RUN = 150;

/**
 * The daily job (round 799): for followed players, their upcoming tournaments on start.gg; a tournament not
 * seen before sends each follower an alert ("MkLeo signed up for Genesis X4", opening the tournament). The
 * first look at a player only remembers. Players who asked not to be listed, or hide their stats, are
 * skipped. Stops at `until` or when start.gg is busy. Returns how many players were looked at and alerts sent.
 */
export async function sendFollowedSignups({ until }: { until: number }): Promise<{ players: number; alerts: number }> {
  const db = createAdminClient();
  const { data: follows, error } = await db.from("player_follows").select("user_id, player_id, tag").limit(20000);
  if (error) throw error;
  const byPlayer = new Map<string, { tag: string; users: string[] }>();
  for (const f of follows ?? []) {
    const p = byPlayer.get(f.player_id) ?? { tag: f.tag, users: [] };
    p.users.push(f.user_id);
    byPlayer.set(f.player_id, p);
  }
  if (!byPlayer.size) return { players: 0, alerts: 0 };
  const hidden = await playersHidingStats([...byPlayer.keys()]);
  const ids = [...byPlayer.keys()].filter((id) => !hidden.has(id));
  const { data: checks, error: checksError } = await db.from("followed_player_checks").select("player_id, checked_at, known_slugs").in("player_id", ids);
  if (checksError) throw checksError;
  const check = new Map((checks ?? []).map((c) => [c.player_id, c]));
  // Never looked at first, then the longest ago.
  const queue = ids.sort((a, b) => (check.get(a)?.checked_at ?? "").localeCompare(check.get(b)?.checked_at ?? "")).slice(0, SIGNUP_CHECKS_PER_RUN);

  let players = 0;
  let alerts = 0;
  for (const playerId of queue) {
    if (Date.now() > until) break;
    let upcoming;
    try {
      upcoming = await getPlayerUpcoming(playerId);
    } catch (e) {
      console.error("Followed player check stopped", e instanceof Error ? e.message : e);
      break; // start.gg busy or down: the rest wait for tomorrow
    }
    players++;
    const before = check.get(playerId);
    const { announce, remember } = newSignups(before ? before.known_slugs : null, upcoming.map((u) => u.slug));
    await db.from("followed_player_checks").upsert({ player_id: playerId, checked_at: new Date().toISOString(), known_slugs: remember });
    if (!announce.length) continue;
    const who = byPlayer.get(playerId)!;
    const tr = await translatorsFor(who.users);
    const rows = announce.flatMap((slug) => {
      const event = upcoming.find((u) => u.slug === slug)!;
      return who.users.map((user_id) => ({
        user_id,
        actor_id: null,
        type: "event_update",
        event_name: tr(user_id)("alert.followSignup", { tag: who.tag, event: event.name }).slice(0, 200),
        event_href: `/events/${slug}`,
      }));
    });
    const { error: sendError } = await db.from("notifications").insert(rows);
    if (sendError) console.error("Followed player alerts failed", sendError.message);
    else alerts += rows.length;
  }
  return { players, alerts };
}
