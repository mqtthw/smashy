// The results graphic of a finished event hosted on Smashy: a picture with the event's name, date
// and Top 8, made for posting on X, Discord or Instagram. Built from what a signed-out visitor can
// see, whoever asks (a player hidden from guests shows as "Hidden player"), so it is safe to cache
// and to share. Events that aren't finished, were canceled or were removed have no graphic.
import { hiddenTeamCount } from "@/lib/hiddenTeams";
import { GAMES, isGameKey } from "@/lib/games";
import { BRAND, clip, fitSize, fitWidth, GAME_COLOR, MUTED, oneLine, renderOg } from "@/lib/ogCard";
import { isUuid } from "@/lib/siteMeta";
import { createAdminClient } from "@/lib/supabase/admin";
import { createGuestClient, hasSupabase } from "@/lib/supabase/guest";
import { graphicRows, type GraphicRow } from "@/lib/top8";
import { isLang, localeFor, translate, type Lang, type MessageKey, type Values } from "@/lib/i18n/core";
import { ordinalFor } from "@/lib/i18n/ordinal";

type EventRow = { team_size?: number | null; name: string; game: string; starts_at: string; timezone: string; status: string; format: string; final_format: string | null; removed_at: string | null; entrants: { count: number }[]; guests?: { count: number }[] };
type EntrantRow = { placement: number | null; profile: { tag: string } | null };

const none = () => new Response("There's no results graphic for this event (it isn't finished, or it doesn't exist).", { status: 404, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });

export async function GET(request: Request, { params }: RouteContext<"/host/[id]/top8.png">) {
  const { id } = await params;
  // The picture's language: ?lang= on the link (the event page adds the TO's or player's own), else English.
  const langParam = new URL(request.url).searchParams.get("lang");
  const lang: Lang = isLang(langParam) ? langParam : "en";
  const tr = (key: MessageKey, values?: Values) => translate(lang, key, values);

  if (!isUuid(id) || !hasSupabase()) return none();
  const db = createGuestClient();
  const { data: eventData } = await db
    .from("hosted_events")
    .select("name, game, starts_at, timezone, status, format, final_format, removed_at, team_size, entrants:hosted_entrants ( count ), guests:hosted_guests ( count )")
    .eq("id", id)
    .maybeSingle();
  const e = eventData as unknown as EventRow | null;
  if (!e || e.removed_at || e.status !== "completed") return none();

  const roundRobin = (e.format === "round_robin" || e.format === "swiss") && !e.final_format; // these end in standings, not a Top 8 (unless a final bracket follows)
  // A few more than 8, so a tie at the edge can be seen and left out whole.
  // Members and walk-ins (players the TO added by name, and doubles teams) both place.
  const [{ data: entrantData }, { data: guestData }, { data: hiddenTeams }] = await Promise.all([
    db
      .from("hosted_entrants")
      .select("placement, profile:profiles!hosted_entrants_user_id_fkey ( tag )")
      .eq("event_id", id)
      .gte("placement", 1)
      .order("placement", { ascending: true })
      .limit(16),
    db.from("hosted_guests").select("tag, placement").eq("event_id", id).gte("placement", 1).order("placement", { ascending: true }).limit(16),
    // Teams with a teen are hidden from visitors (so the line above can't see them): only their places
    // are read here, never their names, so the picture shows "Hidden player" there instead of a gap.
    createAdminClient().from("hosted_guests").select("placement").eq("event_id", id).eq("members_only", true).gte("placement", 1).limit(16),
  ]);
  const rows = graphicRows([
    ...((entrantData ?? []) as unknown as EntrantRow[]).map((r) => ({ placement: r.placement, tag: r.profile?.tag ?? null })),
    ...((guestData ?? []) as { tag: string; placement: number | null }[]).map((g) => ({ placement: g.placement, tag: g.tag })),
    ...((hiddenTeams ?? []) as { placement: number | null }[]).map((g) => ({ placement: g.placement, tag: null })),
  ], 8, tr("event.pic.hidden"), (n) => ordinalFor(lang, n));
  if (!rows.length) return none();

  const game = isGameKey(e.game) ? e.game : null;
  const accent = game ? GAME_COLOR[game] : BRAND;
  let when = "";
  try {
    when = new Intl.DateTimeFormat(localeFor(lang), { timeZone: e.timezone, month: "short", day: "numeric", year: "numeric" }).format(new Date(e.starts_at));
  } catch {
    when = new Date(e.starts_at).toDateString();
  }
  // Members plus walk-ins (players the TO added by name), as the event page counts them.
  const players = (e.entrants?.[0]?.count ?? 0) + (e.guests?.[0]?.count ?? 0) + (await hiddenTeamCount(id).catch(() => 0));
  // Up to 4 rows: one big column. More: two columns, read down the left one first.
  const half = rows.length > 4 ? Math.ceil(rows.length / 2) : rows.length;
  const columns = [rows.slice(0, half), rows.slice(half)].filter((c) => c.length);
  const big = columns.length === 1;

  const Row = ({ r }: { r: GraphicRow }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 20, height: big ? 76 : 68, borderBottom: "2px solid #2f3336" }}>
      <div style={{ display: "flex", width: big ? 110 : 96, fontSize: big ? 40 : 34, color: r.place <= 3 ? accent : MUTED }}>{r.label}</div>
      {/* Room left after the place: about 900px in one column, 360px in each of two. */}
      <div style={{ ...oneLine, flex: 1, minWidth: 0, fontSize: fitWidth(clip(r.tag, big ? 30 : 17), big ? 900 : 360, big ? 46 : 40, big ? 30 : 26), color: "#ffffff" }}>{clip(r.tag, big ? 30 : 17)}</div>
    </div>
  );

  const image = await renderOg({
    label: [game ? GAMES[game].short : null, (roundRobin ? tr("event.pic.standings") : tr("event.pic.top", { n: rows.length }))].filter(Boolean).join(" · "),
    accent,
    children: (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", fontSize: fitSize(e.name, [[28, 54], [44, 44], [999, 36]]), color: "#ffffff", lineHeight: 1.1 }}>{clip(e.name, 64)}</div>
        <div style={{ display: "flex", fontSize: 26, color: MUTED }}>{[when, tr(e.team_size === 2 ? "event.pic.teams" : "event.pic.players", { n: players })].join(" · ")}</div>
        <div style={{ display: "flex", gap: 56, marginTop: 6 }}>
          {columns.map((col, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              {col.map((r, j) => (
                <Row key={j} r={r} />
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
  });
  // A TO can still correct a result after the bracket ends: keep copies for minutes, not the hour
  // that link previews get. Not for search engines (the event page is).
  image.headers.set("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
  image.headers.set("X-Robots-Tag", "noindex");
  return image;
}
