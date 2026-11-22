// The results picture of a finished bracket (start.gg or parry.gg, weeklies and majors alike): the
// event's name, date and Top 8, made for posting on X, Discord or Instagram. The same look as a
// Smashy event's (/host/<id>/top8.png). Places come from start.gg's own standings when it has them,
// otherwise from the finished bracket itself (bracketStandings; ?group= picks the final bracket).
import { GAMES } from "@/lib/games";
import { getBracket, isSource } from "@/lib/brackets";
import { bracketStandings } from "@/lib/brackets/podium";
import { getStartggTop8, type StartggTop8 } from "@/lib/brackets/startgg";
import { BRAND, clip, fitSize, fitWidth, GAME_COLOR, MUTED, oneLine, renderOg } from "@/lib/ogCard";
import { graphicRows, type GraphicRow } from "@/lib/top8";
import { isLang, localeFor, translate, type Lang, type MessageKey, type Values } from "@/lib/i18n/core";
import { ordinalFor } from "@/lib/i18n/ordinal";

const none = () => new Response("There's no results graphic for this event (it isn't finished, or it doesn't exist).", { status: 404, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });

export async function GET(request: Request, { params }: { params: Promise<{ source: string; eventId: string }> }) {
  const { source, eventId } = await params;
  const langParam = new URL(request.url).searchParams.get("lang");
  const lang: Lang = isLang(langParam) ? langParam : "en";
  const tr = (key: MessageKey, values?: Values) => translate(lang, key, values);
  if (!isSource(source)) return none();
  const id = decodeURIComponent(eventId);
  const group = new URL(request.url).searchParams.get("group");

  let e: StartggTop8 | null = source === "startgg" ? await getStartggTop8(id).catch(() => null) : null;
  if (!e) {
    // No standings from the site (parry.gg, or a start.gg event it hasn't closed): the bracket's own.
    const b = await getBracket(source, id, group).catch(() => null);
    const places = b ? bracketStandings(b, 12) : null;
    if (!b || !places) return none();
    const players = new Set(b.rounds.flatMap((r) => r.sets.flatMap((x) => x.players.filter((pl) => !!pl).map((pl) => pl!.entrantId))));
    e = {
      eventName: b.event.eventName,
      tournamentName: b.event.tournamentName,
      startAt: b.event.startAt ?? null,
      timezone: b.event.timezone ?? null,
      entrants: b.event.groups.length > 1 ? 0 : players.size, // one phase of several (pools, then a Top 8) isn't the event's size: left off
      game: b.event.game,
      teams: false,
      standings: places.map((r) => ({ placement: r.place, tag: r.player.name, prefix: r.player.prefix })),
      nodes: [],
    };
  }
  const rows = graphicRows(e.standings, 8, tr("event.pic.hidden"), (n) => ordinalFor(lang, n));
  if (!rows.length) return none();

  const accent = e.game ? GAME_COLOR[e.game] : BRAND;
  let when = "";
  if (e.startAt) {
    try {
      when = new Intl.DateTimeFormat(localeFor(lang), { timeZone: e.timezone ?? "UTC", month: "short", day: "numeric", year: "numeric" }).format(new Date(e.startAt * 1000));
    } catch {
      when = new Date(e.startAt * 1000).toDateString();
    }
  }
  // "Genesis X4" over "Melee Singles": the tournament is the big name, the event the small one.
  const title = e.tournamentName || e.eventName;
  // Up to 4 rows: one big column. More: two columns, read down the left one first.
  const half = rows.length > 4 ? Math.ceil(rows.length / 2) : rows.length;
  const columns = [rows.slice(0, half), rows.slice(half)].filter((c) => c.length);
  const big = columns.length === 1;

  const Row = ({ r }: { r: GraphicRow }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 20, height: big ? 76 : 68, borderBottom: "2px solid #2f3336" }}>
      <div style={{ display: "flex", width: big ? 110 : 96, fontSize: big ? 40 : 34, color: r.place <= 3 ? accent : MUTED }}>{r.label}</div>
      <div style={{ ...oneLine, flex: 1, minWidth: 0, fontSize: fitWidth(clip(r.tag, big ? 30 : 17), big ? 900 : 360, big ? 46 : 40, big ? 30 : 26), color: "#ffffff" }}>{clip(r.tag, big ? 30 : 17)}</div>
    </div>
  );

  const image = await renderOg({
    label: [e.game ? GAMES[e.game].short : null, tr("event.pic.top", { n: rows.length })].filter(Boolean).join(" · "),
    accent,
    children: (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", fontSize: fitSize(title, [[28, 54], [44, 44], [999, 36]]), color: "#ffffff", lineHeight: 1.1 }}>{clip(title, 64)}</div>
        <div style={{ display: "flex", fontSize: 26, color: MUTED }}>{[e.tournamentName ? clip(e.eventName, 40) : null, when || null, e.entrants ? tr(e.teams ? "event.pic.teams" : "event.pic.players", { n: e.entrants }) : null].filter(Boolean).join(" · ")}</div>
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
  // start.gg results can still be corrected for a while after an event: minutes, not hours.
  image.headers.set("Cache-Control", "public, max-age=300, s-maxage=1800, stale-while-revalidate=3600");
  image.headers.set("X-Robots-Tag", "noindex");
  return image;
}
