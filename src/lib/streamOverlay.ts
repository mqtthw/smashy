// Stream overlays for brackets hosted on Smashy (OBS / Streamlabs browser sources, about
// 1280 x 160, see-through). The page reloads itself every 5 seconds.
import { localeFor, translate, type Lang, type MessageKey, type Values } from "./i18n/core";
import { localRound } from "./i18n/rounds";

type Tr = (key: MessageKey, values?: Values) => string;
import "server-only";
import type { EngineSet } from "./bracketEngine";
import { bracketPlayers, loadEngineSets, setStations, toBracket } from "./hostedBracket";
import { getHostedEvent } from "./hostedEvents";
import { liveScore, type LiveState } from "./liveSet";
import { pickStreamSet } from "./streamSet";
import { upNext } from "./commentary";
import { createClient } from "./supabase/server";

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPES[c]);

const STYLE = `html,body{margin:0;background:transparent;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#fff}
.bar{display:flex;align-items:stretch;margin:12px;border-radius:14px;overflow:hidden;background:rgba(14,17,22,.88);box-shadow:0 4px 18px rgba(0,0,0,.35)}
.p{flex:1;display:flex;align-items:center;gap:16px;padding:14px 22px;font-size:40px;font-weight:700;min-width:0}
.p.r{flex-direction:row-reverse;text-align:right}
.n{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.s{font-variant-numeric:tabular-nums;font-size:52px;font-weight:800;min-width:1ch;text-align:center;color:#ff5a4f}
.w .n{color:#ffd166}
.mid{display:flex;align-items:center;padding:0 18px;font-size:22px;color:#9aa4b2;background:rgba(255,255,255,.06)}
.sub{margin:0 12px;font-size:20px;color:#e6e9ee;text-shadow:0 1px 3px rgba(0,0,0,.8)}`;

function page(title: string, body: string): Response {
  const doc = `<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex">
<meta http-equiv="refresh" content="5"><title>${esc(title)}</title><style>${STYLE}</style></head><body>${body}</body></html>`;
  return new Response(doc, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

/** "  ·  Mon 7:00 PM CST" in the event's own time zone (what the stream audience sees), or nothing. */
function startTime(iso: string, timeZone: string, lang: Lang): string {
  try {
    const when = new Intl.DateTimeFormat(localeFor(lang), { timeZone, weekday: "short", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(iso));
    return `  ·  ${esc(when)}`;
  } catch {
    return "";
  }
}

/**
 * The overlay for one hosted event: with a set id, that set; without one, it follows the event
 * (the set pickStreamSet chooses: the one on the "Stream" setup if the TO named one), so the browser source never needs changing between sets.
 * Read as a guest (a browser source isn't signed in): players hidden from guests show as "Player".
 */
export async function overlayResponse(eventId: string, setId: string | null, knownLive?: LiveState | null, lang: Lang = "en"): Promise<Response> {
  const t: Tr = (key, values) => translate(lang, key, values);
  const event = await getHostedEvent(eventId);
  if (!event || event.removed) return new Response("Not found", { status: 404 }); // removed by moderators: no overlay either
  const [sets, players, setups] = await Promise.all([loadEngineSets(event.id), bracketPlayers(event.id), setId ? {} : setStations(event.id)]);
  const set: EngineSet | null = setId ? (sets.find((s) => s.key === setId) ?? null) : pickStreamSet(sets, setups);
  if (setId && !set) return new Response("Not found", { status: 404 });
  // Before the bracket starts, keep the source alive: it picks up the first set once it does.
  if (!set) return page(event.name, `<div class="sub">${esc(event.name)}  ·  ${esc(t("event.overlay.soon"))}${startTime(event.startsAt, event.timezone, lang)}</div>`);

  // The per-set route already read this set's live state; the event overlay reads it here.
  const live =
    knownLive !== undefined
      ? knownLive
      : (((await (await createClient()).from("hosted_sets").select("live").eq("id", set.key).maybeSingle()).data?.live as LiveState | null) ?? null);
  const roundName = toBracket(event, sets, players, set.pool).rounds.flatMap((r) => r.sets).find((s) => s.id === set.key)?.roundLabel;
  const round = roundName ? localRound(roundName, t) : t("event.overlay.set", { id: set.identifier ?? "" });
  const name = (i: 0 | 1) => {
    const pid = set.p[i].id;
    return pid ? (players.get(pid)?.tag ?? t("event.overlay.player")) : t("event.overlay.tbd");
  };
  // Finished sets show the final score; live ones count the games reported so far.
  const score: [number, number] =
    set.state === "done" ? [Math.max(0, set.score[0] ?? 0), Math.max(0, set.score[1] ?? 0)] : live?.games ? liveScore(live) : [0, 0];
  const stage = set.state === "live" && live?.stage ? `${t("event.overlay.game", { n: (live.games?.length ?? 0) + 1 })} · ${live.stage}` : "";
  const line = [event.name, round, t("event.details.bestOf", { n: set.bestOf }), stage].filter(Boolean).join("  ·  ");
  return page(
    `${name(0)} vs ${name(1)}`,
    `<div class="bar">
<div class="p${set.winner === 1 ? " w" : ""}"><span class="n">${esc(name(0))}</span><span class="s">${score[0]}</span></div>
<div class="mid">vs</div>
<div class="p r${set.winner === 2 ? " w" : ""}"><span class="n">${esc(name(1))}</span><span class="s">${score[1]}</span></div>
</div>
<div class="sub">${esc(line)}</div>`,
  );
}

const NEXT_STYLE = `.box{margin:12px;border-radius:14px;overflow:hidden;background:rgba(14,17,22,.88);box-shadow:0 4px 18px rgba(0,0,0,.35);max-width:760px}
.h{padding:10px 18px;font-size:22px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#ff5a4f;background:rgba(255,255,255,.06)}
.row{display:flex;align-items:baseline;gap:14px;padding:10px 18px;font-size:28px;font-weight:700;border-top:1px solid rgba(255,255,255,.08)}
.row .n{flex:1;min-width:0}
.row .r{flex-shrink:0;font-size:18px;font-weight:600;color:#9aa4b2}
.row .v{color:#9aa4b2;font-weight:600}`;

/**
 * "Up next" for a stream: the sets that can be played now, earliest in the bracket first, leaving
 * out the one the score overlay follows. Read as a guest, like the score overlay.
 */
export async function upNextResponse(eventId: string, lang: Lang = "en"): Promise<Response> {
  const t: Tr = (key, values) => translate(lang, key, values);
  const event = await getHostedEvent(eventId);
  if (!event || event.removed) return new Response("Not found", { status: 404 });
  const [sets, players, setups] = await Promise.all([loadEngineSets(event.id), bracketPlayers(event.id), setStations(event.id)]);
  const onStream = pickStreamSet(sets, setups);
  const coming = upNext(sets, onStream?.state === "done" ? null : (onStream?.key ?? null));
  const doc = (body: string) =>
    new Response(
      `<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="10"><title>${esc(t("event.overlay.upNext"))}</title><style>${STYLE}${NEXT_STYLE}</style></head><body>${body}</body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
    );
  // Nothing to show (not started, between rounds, or over): an empty, see-through source.
  if (!coming.length) return doc("");
  const label = new Map<string, string>();
  for (const pool of new Set(coming.map((s) => s.pool))) {
    for (const r of toBracket(event, sets, players, pool).rounds) for (const s of r.sets) label.set(s.id, s.roundLabel);
  }
  const name = (pid: string | null) => esc(pid ? (players.get(pid)?.tag ?? t("event.overlay.player")) : t("event.overlay.tbd"));
  const rows = coming
    .map((s) => `<div class="row"><span class="n">${name(s.p[0].id)} <span class="v">vs</span> ${name(s.p[1].id)}</span><span class="r">${esc(label.has(s.key) ? localRound(label.get(s.key)!, t) : t("event.overlay.set", { id: s.identifier ?? "" }))}</span></div>`)
    .join("");
  return doc(`<div class="box"><div class="h">${esc(t("event.overlay.upNext"))}</div>${rows}</div>`);
}
