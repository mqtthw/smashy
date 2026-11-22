// The Smashy Discord bot's answers (docs/discord-bot-plan.md). A server is linked to one Smashy member;
// /bracket, /upcoming and /results answer with that member's events, read as a signed-out visitor would
// see them (teens aren't named). /next answers only to the person asking, about their own sets.
// Answers are in the asker's Discord language. Server-only.
import { HIDDEN_HANDLES } from "./discoveryHidden";
import "server-only";
import { createAdminClient } from "./supabase/admin";
import { createGuestClient } from "./supabase/guest";
import { siteUrl } from "./siteMeta";
import { localeFor, pickLang, translate, type Lang, type MessageKey, type Values } from "./i18n/core";
import { plain } from "./discordMessages";
import { getMyActiveHostedSets } from "./hostedEvents";
import { getMySets } from "./brackets/startgg";
import { currentSeasonOf, getSeasonEvents, getStandings, seasonRanksFor, seasonsCounting } from "./seasons";
import { characterName, parseMains } from "./characters";
import { GAMES } from "./games";
import { findStandingRow, movementMark, standingRowId, standingsText } from "./seasonsMath";
import { commandOf, canManageServer, readCode, reply, userIdOf, type Interaction } from "./discordInteractions";
import { OFFICIAL_HANDLE } from "./officialHost";

const link = (path: string) => `<${new URL(path, siteUrl()).toString()}>`;
type Tr = (key: MessageKey, values?: Values) => string;
const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

type HostedRow = { id: string; name: string; starts_at: string; timezone: string | null; status: string };

async function linkedHost(guildId: string | undefined): Promise<{ id: string; tag: string; handle: string } | null> {
  if (!guildId || !/^\d{5,25}$/.test(guildId)) return null;
  const db = createAdminClient();
  const { data } = await db.from("discord_servers").select("host_id").eq("guild_id", guildId).maybeSingle();
  if (!data) return null;
  const { data: p } = await db.from("profiles").select("id, tag, handle").eq("id", data.host_id).maybeSingle();
  return (p as { id: string; tag: string; handle: string } | null) ?? null;
}

/** The member's own events (main brackets, not extra ones), as a visitor sees them. */
async function eventsOf(host: { id: string; handle: string }): Promise<HostedRow[]> {
  const q = createGuestClient().from("hosted_events").select("id, name, starts_at, timezone, status");
  // Smashy's own account (round 457): its events are the official ones, run by site admins.
  const { data } = await (host.handle === OFFICIAL_HANDLE ? q.or(`host_id.eq.${host.id},official.eq.true`) : q.eq("host_id", host.id))
    .is("parent_id", null)
    .neq("status", "canceled")
    .order("starts_at", { ascending: false })
    .limit(60);
  return (data ?? []) as HostedRow[];
}

function when(e: HostedRow, lang: Lang): string {
  const zone = e.timezone || "America/Chicago";
  try {
    return new Date(e.starts_at).toLocaleString(localeFor(lang), { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: zone, timeZoneName: "short" });
  } catch {
    return new Date(e.starts_at).toUTCString();
  }
}

const upcomingOf = (events: HostedRow[], now: number) =>
  events.filter((e) => (e.status === "open" || e.status === "closed") && Date.parse(e.starts_at) > now - 6 * 3600_000).sort((a, b) => a.starts_at.localeCompare(b.starts_at));

async function topEight(eventId: string, hiddenName: string): Promise<Map<number, string[]>> {
  const guest = createGuestClient();
  const [{ data: people }, { data: walkIns }, { data: hiddenTeams }] = await Promise.all([
    guest.from("hosted_entrants").select("user_id, placement").eq("event_id", eventId).lte("placement", 8).limit(64),
    guest.from("hosted_guests").select("tag, placement").eq("event_id", eventId).lte("placement", 8).limit(64),
    // Teams with a teen are hidden from visitors: only their places are read, never their names.
    createAdminClient().from("hosted_guests").select("placement").eq("event_id", eventId).eq("members_only", true).lte("placement", 8).limit(64),
  ]);
  const ids = ((people ?? []) as { user_id: string }[]).map((p) => p.user_id);
  const { data: profiles } = ids.length ? await guest.from("profiles").select("id, tag").in("id", ids) : { data: [] };
  const tagOf = new Map(((profiles ?? []) as { id: string; tag: string }[]).map((p) => [p.id, p.tag]));
  const out = new Map<number, string[]>();
  const add = (place: number, tag: string | undefined) => tag && out.set(place, [...(out.get(place) ?? []), plain(tag)]);
  // Hidden players (teens) and hidden teams keep their place, unnamed, so the list has no gaps.
  for (const p of (people ?? []) as { user_id: string; placement: number }[]) add(p.placement, tagOf.get(p.user_id) ?? hiddenName);
  for (const g of (walkIns ?? []) as { tag: string; placement: number }[]) add(g.placement, g.tag);
  for (const g of (hiddenTeams ?? []) as { placement: number }[]) add(g.placement, hiddenName);
  return out;
}

async function resultsText(e: HostedRow, t: Tr): Promise<string> {
  const [top, seasons] = await Promise.all([topEight(e.id, t("season.hiddenPlayer")), seasonsCounting("smashy", [e.id]).catch(() => [])]);
  const lines = [...top.entries()].sort((a, b) => a[0] - b[0]).map(([place, tags]) => `${MEDAL[place] ?? `${place}.`} ${tags.join(", ")}`);
  // The season(s) this event counts toward, so players can check the standings.
  const counts = seasons.slice(0, 3).map((s) => t("alert.bot.countsToward", { season: plain(s.name), url: link(`/seasons/${s.id}`) }));
  return [t("alert.bot.resultsTitle", { event: plain(e.name) }), ...lines, t("alert.bot.fullBracket", { url: link(`/host/${e.id}/bracket`) }), ...counts].join("\n");
}

async function connect(i: Interaction, t: Tr, code: string | undefined) {
  if (!canManageServer(i)) return reply(t("alert.bot.adminsOnly"), true);
  const clean = readCode(code);
  const db = createAdminClient();
  const { data: row } = clean ? await db.from("discord_link_codes").select("host_id, expires_at").eq("code", clean).maybeSingle() : { data: null };
  if (!row || Date.parse(row.expires_at as string) < Date.now()) return reply(t("alert.bot.badCode", { url: link("/host/discord") }), true);
  await db.from("discord_link_codes").delete().eq("code", clean!);
  const { error } = await db.from("discord_servers").upsert({ guild_id: i.guild_id, host_id: row.host_id, linked_by: userIdOf(i), linked_at: new Date().toISOString() }, { onConflict: "guild_id" });
  if (error) return reply(t("alert.bot.error"), true);
  const { data: p } = await db.from("profiles").select("tag").eq("id", row.host_id).maybeSingle();
  return reply(t("alert.bot.connected", { name: plain((p?.tag as string | undefined) ?? "") }));
}

type PlayerRow = { id: string; tag: string; handle: string; home_city: string | null; mains: unknown };

/**
 * /player: a Smashy member by tag or @handle, read the way a signed-out visitor reads profiles (so teens'
 * and private profiles never come back): mains, home city, current season ranks and a link. Works in any
 * server, linked or not. An exact tag or handle first; otherwise the only partial match, or a short list.
 */
export async function playerText(raw: string, t: Tr, lang: Lang): Promise<string> {
  const q = raw.trim().replace(/^@/, "").slice(0, 40);
  if (q.length < 2) return t("alert.bot.playerShort");
  const needle = q.replace(/[,()\\%_]/g, " ").trim();
  if (needle.length < 2) return t("alert.bot.playerShort");
  const { data } = await createGuestClient()
    .from("profiles")
    .select("id, tag, handle, home_city, mains")
    .or(`tag.ilike.%${needle}%,handle.ilike.%${needle.toLowerCase()}%`)
    .not("handle", "in", HIDDEN_HANDLES)
    .limit(10);
  const found = (data ?? []) as PlayerRow[];
  const lower = q.toLowerCase();
  const exact = found.filter((p) => p.tag.toLowerCase() === lower || p.handle.toLowerCase() === lower);
  const pick = exact[0] ?? (found.length === 1 ? found[0] : null);
  if (!pick) {
    if (!found.length) return t("alert.bot.playerNone", { tag: plain(q), url: link(`/search?q=${encodeURIComponent(q)}&tab=people`) });
    return [t("alert.bot.playerMany", { tag: plain(q) }), ...found.slice(0, 5).map((p) => `• **${plain(p.tag)}** (@${p.handle}): ${link(`/u/${p.handle}`)}`)].join("\n");
  }
  const mains = parseMains(pick.mains).map((m) => `${characterName(m.game, m.character) ?? m.character} (${GAMES[m.game].short})`);
  const ranks = await seasonRanksFor([`u:${pick.id}`], null).catch(() => []);
  const lines = [`**${plain(pick.tag)}** (@${pick.handle})`];
  if (mains.length) lines.push(t("alert.bot.playerMains", { mains: mains.join(", ") }));
  if (pick.home_city) lines.push(t("alert.bot.playerHome", { city: plain(pick.home_city) }));
  for (const r of ranks.filter((r) => r.current).slice(0, 3)) {
    lines.push(`🏆 ${t("alert.bot.playerRank", { rank: r.rank, players: r.players, season: plain(r.name), points: translate(lang, "season.pts", { n: r.points }) })}`);
  }
  lines.push(link(`/u/${pick.handle}`));
  return lines.join("\n");
}

/** The answer to a command (except /next, which is slow: see nextSetText). */
export async function answer(i: Interaction): Promise<object> {
  const lang = pickLang(i.locale ?? null);
  const t: Tr = (key, values) => translate(lang, key, values);
  const { path, options } = commandOf(i);
  try {
    if (path[0] === "smashy" && path[1] === "connect") return await connect(i, t, options.code);
    if (path[0] === "smashy" && path[1] === "disconnect") {
      if (!canManageServer(i)) return reply(t("alert.bot.adminsOnly"), true);
      await createAdminClient().from("discord_servers").delete().eq("guild_id", i.guild_id ?? "");
      return reply(t("alert.bot.disconnected"));
    }
    if (path[0] === "player") return reply(await playerText(options.tag ?? "", t, lang));
    const host = await linkedHost(i.guild_id);
    if (!host) return reply(t("alert.bot.notLinked", { url: link("/host/discord") }), true);
    const events = await eventsOf(host);
    const now = Date.now();
    const name = plain(host.tag);
    if (path[0] === "bracket") {
      const live = events.find((e) => e.status === "in_progress");
      if (live) return reply(t("alert.bot.live", { event: plain(live.name), url: link(`/host/${live.id}/bracket`) }));
      const next = upcomingOf(events, now)[0];
      if (next) return reply(t("alert.bot.nextEvent", { event: plain(next.name), when: when(next, lang), url: link(`/host/${next.id}`) }));
      const last = events.find((e) => e.status === "completed");
      if (last) return reply(await resultsText(last, t));
      return reply(t("alert.bot.nothing", { name }));
    }
    if (path[0] === "upcoming") {
      const next = upcomingOf(events, now).slice(0, 5);
      if (!next.length) return reply(t("alert.bot.noUpcoming", { name, url: link(`/u/${host.handle}?tab=events`) }));
      return reply([t("alert.bot.upcomingTitle", { name }), ...next.map((e) => `• **${plain(e.name)}**, ${when(e, lang)}: ${link(`/host/${e.id}`)}`)].join("\n"));
    }
    if (path[0] === "season") {
      const season = await currentSeasonOf(host.id);
      if (!season) return reply(t("alert.bot.noSeason", { name }));
      // As a signed-out visitor sees it (teens unnamed), with rank changes, like Copy as text.
      const rows = await getStandings(season, await getSeasonEvents(season.id), null);
      if (!rows.some((r) => r.rank !== null)) return reply(t("alert.bot.seasonEmpty", { season: plain(season.name), url: link(`/seasons/${season.id}`) }));
      const pts = (n: number) => translate(lang, "season.pts", { n });
      if (options.player) {
        // One player's line: their rank, points and events, or how far they are from being ranked.
        const row = findStandingRow(rows, options.player.slice(0, 60));
        const seasonName = plain(season.name);
        const url = link(`/seasons/${season.id}`);
        if (!row) return reply(t("alert.bot.seasonNoPlayer", { player: plain(options.player.slice(0, 60)), season: seasonName, url }));
        const events = translate(lang, "season.events", { n: row.events });
        const rowUrl = link(`/seasons/${season.id}#${standingRowId(row.key)}`);
        if (row.rank === null) return reply(t("alert.bot.seasonUnranked", { player: plain(row.name), season: seasonName, events, need: season.minEvents, url: rowUrl }));
        const moved = movementMark(row.movement ?? null, translate(lang, "season.move.new"));
        return reply(t("alert.bot.seasonPlayer", { rank: row.rank, player: plain(row.name), season: seasonName, points: pts(row.points), events, url: rowUrl }) + (moved ? ` (${moved})` : ""));
      }
      return reply(standingsText(plain(season.name), rows.map((r) => ({ ...r, name: plain(r.name) })), link(`/seasons/${season.id}`), translate(lang, "season.hiddenPlayer"), pts, 10, translate(lang, "season.move.new")));
    }
    if (path[0] === "results") {
      const last = events.find((e) => e.status === "completed");
      return reply(last ? await resultsText(last, t) : t("alert.bot.noResults"));
    }
    return reply(t("alert.bot.unknown"), true);
  } catch (e) {
    console.error("discord bot:", path.join(" "), e instanceof Error ? e.message : e);
    return reply(t("alert.bot.error"), true);
  }
}

/** /next: the asker's own next set (a Smashy bracket first, then start.gg if they linked it). */
export async function nextSetText(i: Interaction): Promise<string> {
  const lang = pickLang(i.locale ?? null);
  const t: Tr = (key, values) => translate(lang, key, values);
  try {
    const discordId = userIdOf(i);
    const db = createAdminClient();
    const { data: userId } = discordId ? await db.rpc("user_by_discord", { discord_user_id: discordId }) : { data: null };
    if (!userId) return t("alert.bot.nextNoAccount", { url: link("/signin") });
    const hosted = await getMyActiveHostedSets(userId as string, db);
    const mine = hosted[0];
    if (mine) {
      const state = t(mine.state === "ready" ? "alert.bot.state.ready" : mine.state === "live" ? "alert.bot.state.live" : "alert.bot.state.waiting");
      return t("alert.bot.nextHosted", { event: plain(mine.eventName), set: plain(mine.identifier ?? "?"), opponent: plain(mine.opponent ?? t("alert.bot.tbd")), state, url: link(`/host/set/${mine.id}`) });
    }
    const { data: link_ } = await db.from("startgg_links").select("startgg_user_id").eq("user_id", userId).maybeSingle();
    if (link_?.startgg_user_id) {
      const events = await getMySets(Number(link_.startgg_user_id)).catch(() => []);
      for (const e of events) {
        if (e.status.kind !== "up" && e.status.kind !== "next") continue;
        const set = e.status.set;
        const other = set.players[set.me === 0 ? 1 : 0];
        const state = t(e.status.kind === "up" ? "alert.bot.state.ready" : "alert.bot.state.waiting");
        return t("alert.bot.nextStartgg", { event: plain(`${e.tournamentName}: ${e.eventName}`), opponent: plain(other?.name ?? t("alert.bot.tbd")), state, url: link("/my-sets") });
      }
    }
    return t("alert.bot.nextNone");
  } catch (e) {
    console.error("discord bot: /next", e instanceof Error ? e.message : e);
    return t("alert.bot.error");
  }
}

/** Sends a slow answer as the original reply (Discord gives 15 minutes for this). */
export async function sendFollowup(i: Interaction, content: string): Promise<void> {
  if (!i.application_id || !i.token) return;
  await fetch(`https://discord.com/api/v10/webhooks/${i.application_id}/${i.token}/messages/@original`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: content.slice(0, 1990), allowed_mentions: { parse: [] } }),
    signal: AbortSignal.timeout(8000),
  }).catch((e) => console.error("discord bot: follow-up failed", e instanceof Error ? e.message : e));
}
