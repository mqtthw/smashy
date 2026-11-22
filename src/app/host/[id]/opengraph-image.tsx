// Link preview for an event hosted on Smashy: the name, game, date and time (in the event's time zone),
// online or in person, and how many have signed up. Read as a guest; hidden events get the generic card.
// The host isn't named on the card (a preview never reveals who a teen host is). Finished events show
// the Top 3 instead of the player count (read as a guest, so players hidden from guests stay hidden).
import { createAdminClient } from "@/lib/supabase/admin";
import { hiddenTeamCount } from "@/lib/hiddenTeams";
import { GAMES, isGameKey } from "@/lib/games";
import { BRAND, clip, fitSize, GAME_COLOR, MUTED, OG_SIZE, OG_TYPE, renderOg, siteCard } from "@/lib/ogCard";
import { isUuid } from "@/lib/siteMeta";
import { createGuestClient, hasSupabase } from "@/lib/supabase/guest";

export const alt = "An event on Smashy";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

type Row = {
  name: string;
  game: string;
  online: boolean;
  location: string | null;
  starts_at: string;
  timezone: string;
  status: string;
  removed_at: string | null;
  entrant_cap: number;
  team_size?: number | null;
  entrants: { count: number }[]; guests?: { count: number }[];
};

const inFuture = (iso: string) => Date.parse(iso) > Date.now();
const STATUS: Record<string, string> = { open: "Sign-ups open", closed: "Sign-ups closed", in_progress: "Live now", completed: "Results", canceled: "Canceled" };

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id) || !hasSupabase()) return siteCard();
  const { data } = await createGuestClient()
    .from("hosted_events")
    .select("name, game, online, location, starts_at, timezone, status, removed_at, entrant_cap, team_size, entrants:hosted_entrants ( count ), guests:hosted_guests ( count )")
    .eq("id", id)
    .maybeSingle();
  const e = data as unknown as Row | null;
  if (!e || e.removed_at) return siteCard();

  const game = isGameKey(e.game) ? e.game : null;
  let when = "";
  try {
    when = new Intl.DateTimeFormat("en-US", { timeZone: e.timezone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(e.starts_at));
  } catch {
    when = new Date(e.starts_at).toUTCString();
  }
  // Members plus walk-ins (players the TO added by name), as the event page counts them.
  const players = (e.entrants?.[0]?.count ?? 0) + (e.guests?.[0]?.count ?? 0) + (await hiddenTeamCount(id).catch(() => 0));
  const podium = e.status === "completed" ? await topThree(id) : [];
  const status = STATUS[e.status] ?? "Event";
  const open = e.status === "open" && inFuture(e.starts_at);
  return renderOg({
    label: [game ? GAMES[game].short : null, e.online ? "Online" : "In person", open ? "Sign-ups open" : status].filter(Boolean).join(" · "),
    accent: game ? GAME_COLOR[game] : BRAND,
    children: (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", fontSize: fitSize(e.name, [[24, 76], [40, 62], [999, 50]]), color: "#ffffff", lineHeight: 1.1 }}>{clip(e.name, 70)}</div>
        <div style={{ display: "flex", fontSize: 38, color: "#ffffff" }}>{when}</div>
        {podium.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", columnGap: 36, fontSize: 36, color: "#ffffff" }}>
            {podium.map((p) => (
              <span key={p}>{clip(p, 24)}</span>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", fontSize: 32, color: MUTED }}>
            {clip([e.online ? "🌐 Online" : e.location, `${players} / ${e.entrant_cap} ${e.team_size === 2 ? "teams" : "players"}`].filter(Boolean).join(" · "), 60)}
          </div>
        )}
        <div style={{ display: "flex", fontSize: 28, color: MUTED }}>{open ? "Sign up on Smashy" : "Bracket and results on Smashy"}</div>
      </div>
    ),
  });
}

const MEDALS = ["🥇", "🥈", "🥉"];

/** "🥇 Fox", "🥈 Marth", "🥉 Sheik" from saved placements (ties share a medal; at most 4 names). */
async function topThree(eventId: string): Promise<string[]> {
  const db = createGuestClient();
  // Members and walk-ins (players the TO added by name, and doubles teams) both place.
  const [{ data }, { data: guests }, { data: hiddenTeams }] = await Promise.all([
    db
      .from("hosted_entrants")
      .select("placement, profile:profiles!hosted_entrants_user_id_fkey ( tag )")
      .eq("event_id", eventId)
      .gte("placement", 1)
      .lte("placement", 3)
      .order("placement", { ascending: true })
      .limit(4),
    db.from("hosted_guests").select("tag, placement").eq("event_id", eventId).gte("placement", 1).lte("placement", 3).order("placement", { ascending: true }).limit(4),
    // Teams with a teen are hidden from visitors: their places only, never their names.
    createAdminClient().from("hosted_guests").select("placement").eq("event_id", eventId).eq("members_only", true).gte("placement", 1).lte("placement", 3).limit(4),
  ]);
  // A hidden member (a teen) or hidden team keeps their place, unnamed, so the podium has no gap.
  const placed = [
    ...((data ?? []) as unknown as { placement: number; profile: { tag: string } | null }[]).map((r) => ({ placement: r.placement, tag: r.profile?.tag ?? "Hidden player" })),
    ...((guests ?? []) as { placement: number; tag: string }[]),
    ...((hiddenTeams ?? []) as { placement: number }[]).map((g) => ({ placement: g.placement, tag: "Hidden player" })),
  ];
  return placed
    .sort((a, b) => a.placement - b.placement)
    .slice(0, 4)
    .map((r) => `${MEDALS[r.placement - 1]} ${r.tag}`);
}
