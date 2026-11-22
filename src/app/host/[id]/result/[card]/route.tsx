// One player's result picture for a finished event hosted on Smashy: "3rd of 24" with their tag,
// the event and the date, made for posting on X, Discord or Instagram. The address ends in the
// player's handle: /host/<event>/result/<handle>.png. Built from what a signed-out visitor can see,
// whoever asks: a player hidden from guests, a walk-in without an account, or someone who didn't
// place has no picture (404). Same look as the event's Top 8 graphic (top8.png).
import { hiddenTeamCount } from "@/lib/hiddenTeams";
import { GAMES, isGameKey } from "@/lib/games";
import { HANDLE_RE } from "@/lib/handles";
import { BRAND, clip, fitWidth, GAME_COLOR, MUTED, oneLine, renderOg } from "@/lib/ogCard";
import { isUuid } from "@/lib/siteMeta";
import { createGuestClient, hasSupabase } from "@/lib/supabase/guest";
import { isLang, localeFor, translate, type Lang, type MessageKey, type Values } from "@/lib/i18n/core";
import { ordinalFor } from "@/lib/i18n/ordinal";

type EventRow = { name: string; game: string; starts_at: string; timezone: string; status: string; removed_at: string | null; entrants: { count: number }[]; guests?: { count: number }[] };

const none = () => new Response("There's no result picture here (the event isn't finished, or this player has no public result in it).", { status: 404, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });

export async function GET(request: Request, { params }: RouteContext<"/host/[id]/result/[card]">) {
  const { id, card } = await params;
  // The picture's language: ?lang= on the link (the event page adds the TO's or player's own), else English.
  const langParam = new URL(request.url).searchParams.get("lang");
  const lang: Lang = isLang(langParam) ? langParam : "en";
  const tr = (key: MessageKey, values?: Values) => translate(lang, key, values);

  const handle = card.endsWith(".png") ? card.slice(0, -4).toLowerCase() : "";
  if (!isUuid(id) || !HANDLE_RE.test(handle) || !hasSupabase()) return none();
  const db = createGuestClient();
  const [{ data: eventData }, { data: profile }] = await Promise.all([
    db.from("hosted_events").select("name, game, starts_at, timezone, status, removed_at, entrants:hosted_entrants ( count ), guests:hosted_guests ( count )").eq("id", id).maybeSingle(),
    db.from("profiles").select("id, tag").eq("handle", handle).maybeSingle(),
  ]);
  const e = eventData as unknown as EventRow | null;
  const player = profile as { id: string; tag: string } | null;
  if (!e || e.removed_at || e.status !== "completed" || !player) return none();
  const { data: entrant } = await db.from("hosted_entrants").select("placement").eq("event_id", id).eq("user_id", player.id).maybeSingle();
  let place = (entrant as { placement: number | null } | null)?.placement ?? null;
  let teamName: string | null = null;
  if (!place) {
    // Doubles: the place is the team's. Read as a visitor too, so a team with a teen (hidden from
    // visitors) has no picture, the same as a hidden player.
    const { data: mine } = await db.from("hosted_team_members").select("team:hosted_guests!inner ( tag, placement, event_id )").eq("user_id", player.id).eq("team.event_id", id).maybeSingle();
    const team = (mine as unknown as { team: { tag: string; placement: number | null } } | null)?.team;
    if (team?.placement) {
      place = team.placement;
      teamName = team.tag;
    }
  }
  if (!place || place < 1) return none();

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

  const image = await renderOg({
    label: [game ? GAMES[game].short : null, tr("event.pic.result")].filter(Boolean).join(" · "),
    accent,
    children: (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
          <div style={{ display: "flex", fontSize: 150, lineHeight: 1, color: place <= 3 ? accent : "#ffffff", letterSpacing: -3 }}>{ordinalFor(lang, place)}</div>
          {players >= place && <div style={{ display: "flex", fontSize: 44, color: MUTED }}>{tr("event.pic.of", { n: players })}</div>}
        </div>
        {/* Sized by how wide the tag is (WWWW is far wider than iiii), cut off with "…" if still too wide. */}
        <div style={{ ...oneLine, fontSize: fitWidth(clip(teamName ?? player.tag, 30), 1040, 84, 40), color: "#ffffff", lineHeight: 1.1 }}>{clip(teamName ?? player.tag, 30)}</div>
        {/* The event name is shortened on its own, so the date always shows. */}
        <div style={{ ...oneLine, fontSize: 32, color: MUTED }}>{`${clip(e.name, 44)} · ${when}`}</div>
      </div>
    ),
  });
  // A TO can still correct a result after the bracket ends: keep copies for minutes, not the hour
  // that link previews get. Not for search engines.
  image.headers.set("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
  image.headers.set("X-Robots-Tag", "noindex");
  return image;
}
