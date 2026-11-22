// Fills Smashy's saved list of start.gg players (the startgg_players table) with everyone who
// entered a recent tournament in one region, so Search > Players finds locals by tag from day one.
// After that the list keeps growing by itself as people use the site.
//
// Usage: node scripts/seed/startgg-players.mjs [--region US-TX] [--days 180] [--max-attendees 600] [--limit N] [--apply]
//   Without --apply it's a dry run: it reads start.gg, prints what it would save and writes nothing.
//   --limit N stops after N tournaments (for a quick look).
//
// What it reads: for each past tournament in the region that had a Smash event, the sign-up list's
// tags, sponsor prefixes and player ids. Nothing else: no names, photos or locations.
// Tournaments with more than --max-attendees people are skipped: those are multi-game majors whose
// sign-up lists are mostly people who play other games.
//
// It's slow on purpose: one start.gg request every 2 seconds, because the live site shares the
// same allowance (80 requests a minute). Texas over 180 days takes roughly 10 to 15 minutes.
// Safe to run again and safe to stop: players already saved are left exactly as they are
// (including anyone hidden), only new ones are added.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
};
const apply = args.includes("--apply");
const region = flag("region", "US-TX");
const days = Number(flag("days", "180"));
const maxAttendees = Number(flag("max-attendees", "600"));
const limit = Number(flag("limit", "0"));
if (!/^[A-Z]{2}(-[A-Z0-9]{1,3})?$/.test(region) || !(days > 0 && days <= 730) || !(maxAttendees > 0)) {
  console.error("Usage: node scripts/seed/startgg-players.mjs [--region US-TX] [--days 180] [--max-attendees 600] [--limit N] [--apply]");
  process.exit(1);
}

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => /^\w+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const say = (m) => console.log(`${apply ? "" : "[dry run] "}${m}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const GAMES = [1, 1386, 33602, 4, 5, 3, 29]; // the Smash games Smashy covers (src/lib/games.ts)
const PACE_MS = 2000;
const TOURNAMENTS_PER_REQUEST = 4; // 4 tournaments x 90 sign-ups stays under start.gg's 1,000 objects per request
const FIRST_PAGE = 90;
const BIG_PAGE = 450;
const PLAYER = `gamerTag prefix player { id }`;

let requests = 0;
let lastAt = 0;
async function startgg(query, variables) {
  for (let attempt = 0; ; attempt++) {
    const wait = lastAt + PACE_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastAt = Date.now();
    requests++;
    const res = await fetch("https://api.start.gg/gql/alpha", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.STARTGG_API_TOKEN}` },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(30_000),
    }).catch((e) => ({ ok: false, status: 0, statusText: String(e), json: async () => ({}) }));
    const json = await res.json().catch(() => ({}));
    const message = json.errors?.[0]?.message ?? json.message ?? res.statusText;
    if (res.ok && !json.errors) return json.data;
    if (attempt >= 3) throw new Error(`start.gg request failed: ${message}`);
    const busy = res.status === 429 || /rate limit/i.test(message ?? "");
    say(`  start.gg said "${message}"; waiting ${busy ? 30 : 5} seconds and trying again`);
    await sleep(busy ? 30_000 : 5_000);
  }
}

const [countryCode, addrState] = region.split("-");
const now = Math.floor(Date.now() / 1000);
const LIST = `query SeedPlayers($page: Int!, $games: [ID]!, $after: Timestamp!, $before: Timestamp!, $countryCode: String, $addrState: String) {
  tournaments(query: { page: $page, perPage: ${TOURNAMENTS_PER_REQUEST}, sortBy: "startAt desc", filter: { past: true, videogameIds: $games, afterDate: $after, beforeDate: $before, countryCode: $countryCode, addrState: $addrState } }) {
    pageInfo { total totalPages }
    nodes { id name startAt numAttendees participants(query: { page: 1, perPage: ${FIRST_PAGE} }) { pageInfo { totalPages } nodes { ${PLAYER} } } }
  }
}`;
const MORE = `query SeedMore($id: ID!, $page: Int!) { tournament(id: $id) { participants(query: { page: $page, perPage: ${BIG_PAGE} }) { pageInfo { totalPages } nodes { ${PLAYER} } } } }`;

/** player id -> row. Tournaments come newest first, so the first time a player is seen is their latest tag. */
const players = new Map();
function keep(nodes, seenAt) {
  for (const p of nodes ?? []) {
    const tag = p.gamerTag?.trim().slice(0, 100);
    const id = Number(p.player?.id);
    if (!tag || !Number.isSafeInteger(id) || id <= 0 || players.has(id)) continue;
    players.set(id, { player_id: id, tag, prefix: p.prefix?.trim().slice(0, 100) || null, last_seen_at: seenAt });
  }
}

say(`Reading tournaments in ${region} from the last ${days} days (one start.gg request every ${PACE_MS / 1000} seconds)…`);
let tournaments = 0;
let skipped = 0;
for (let page = 1, totalPages = 1; page <= totalPages; page++) {
  const data = await startgg(LIST, { page, games: GAMES, after: now - days * 86400, before: now, countryCode, addrState });
  totalPages = data.tournaments.pageInfo.totalPages ?? 1;
  if (page === 1) say(`${data.tournaments.pageInfo.total} tournaments to read (${totalPages} requests, plus extra ones for sign-up lists over ${FIRST_PAGE}).`);
  for (const t of data.tournaments.nodes ?? []) {
    tournaments++;
    if ((t.numAttendees ?? 0) > maxAttendees) {
      skipped++;
      say(`  skipping ${t.name} (${t.numAttendees} people: over --max-attendees)`);
      continue;
    }
    const seenAt = new Date((t.startAt ?? now) * 1000).toISOString();
    if ((t.participants?.pageInfo?.totalPages ?? 1) <= 1) {
      keep(t.participants?.nodes, seenAt);
    } else {
      // A long sign-up list: read it again in bigger pages.
      for (let p = 1, pages = 1; p <= pages; p++) {
        const more = await startgg(MORE, { id: t.id, page: p });
        pages = more.tournament?.participants?.pageInfo?.totalPages ?? 1;
        keep(more.tournament?.participants?.nodes, seenAt);
      }
    }
    if (limit && tournaments >= limit) break;
  }
  if (page % 10 === 0) say(`  ${tournaments} tournaments read, ${players.size} players so far`);
  if (limit && tournaments >= limit) break;
}

const rows = [...players.values()];
say(`Read ${tournaments} tournaments (${skipped} skipped) in ${requests} start.gg requests: ${rows.length} different players.`);
say(`A few of them: ${rows.slice(0, 8).map((r) => (r.prefix ? `${r.prefix} | ${r.tag}` : r.tag)).join(", ")}`);

if (!apply) {
  say("Nothing was saved. Run again with --apply to save them.");
} else {
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
  let added = 0;
  for (let i = 0; i < rows.length; i += 500) {
    // Only new players are added; anyone already saved (hidden or not) is left exactly as they are.
    const { data, error } = await db.from("startgg_players").upsert(rows.slice(i, i + 500), { onConflict: "player_id", ignoreDuplicates: true }).select("player_id");
    if (error) throw error;
    added += data?.length ?? 0;
  }
  say(`Saved ${added} new players (${rows.length - added} were already on the list).`);
}
