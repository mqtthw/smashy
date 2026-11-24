// sitemap.xml: the pages search engines should know about. Only what a signed-out guest can see is
// listed (read as a guest, so teen posts and private profiles never appear). Rebuilt every few hours, once
// for all servers.
import type { MetadataRoute } from "next";
import { cacheLife } from "next/cache";
import { CHARACTERS } from "@/lib/characters";
import { GAME_KEYS } from "@/lib/games";
import { majorHref } from "@/lib/handMajors";
import { siteUrl } from "@/lib/siteMeta";
import { createAdminClient } from "@/lib/supabase/admin";
import { createGuestClient, hasSupabase } from "@/lib/supabase/guest";
import { searchablePlayerIds } from "@/lib/playerSearchable";

async function entries(): Promise<MetadataRoute.Sitemap> {
  "use cache: remote"; // shared by every server (round 676): it reads every region's saved events (7 MB)
  const base = siteUrl().origin;
  const url = (path: string) => `${base}${path}`;
  const out: MetadataRoute.Sitemap = [
    { url: url("/"), changeFrequency: "hourly", priority: 1 },
    { url: url("/discuss"), changeFrequency: "hourly", priority: 0.9 },
    { url: url("/events"), changeFrequency: "daily", priority: 0.8 },
    { url: url("/games"), changeFrequency: "weekly", priority: 0.8 },
    { url: url("/reels"), changeFrequency: "daily", priority: 0.6 },
    { url: url("/scenes"), changeFrequency: "weekly", priority: 0.6 },
    { url: url("/strike"), changeFrequency: "monthly", priority: 0.5 },
    { url: url("/play"), changeFrequency: "monthly", priority: 0.5 },
    { url: url("/about"), changeFrequency: "monthly", priority: 0.7 },
    { url: url("/developers"), changeFrequency: "monthly", priority: 0.3 },
    { url: url("/host/about"), changeFrequency: "monthly", priority: 0.7 },
    { url: url("/host/demo"), changeFrequency: "monthly", priority: 0.7 },
    { url: url("/host/results-file"), changeFrequency: "monthly", priority: 0.5 },
    { url: url("/host/guide"), changeFrequency: "monthly", priority: 0.6 },
    { url: url("/host/discord"), changeFrequency: "monthly", priority: 0.5 },
    { url: url("/brackets"), changeFrequency: "daily", priority: 0.7 },
    { url: url("/privacy"), changeFrequency: "yearly", priority: 0.2 },
    { url: url("/terms"), changeFrequency: "yearly", priority: 0.2 },
    { url: url("/seasons"), changeFrequency: "daily", priority: 0.7 },
    { url: url("/history"), changeFrequency: "weekly", priority: 0.6 },
    { url: url("/history/timeline"), changeFrequency: "weekly", priority: 0.5 },
    { url: url("/history/records"), changeFrequency: "weekly", priority: 0.5 },
    { url: url("/help"), changeFrequency: "monthly", priority: 0.4 },
    { url: url("/vods"), changeFrequency: "daily", priority: 0.6 },
    { url: url("/ladder"), changeFrequency: "daily", priority: 0.6 },
    { url: url("/pickem"), changeFrequency: "daily", priority: 0.6 },
    { url: url("/new"), changeFrequency: "daily", priority: 0.6 },
    { url: url("/replays"), changeFrequency: "monthly", priority: 0.5 },
  ];
  for (const g of GAME_KEYS) {
    out.push({ url: url(`/games/${g}`), changeFrequency: "weekly", priority: 0.7 });
    out.push({ url: url(`/discuss?game=${g}`), changeFrequency: "daily", priority: 0.6 });
    for (const c of CHARACTERS[g]) out.push({ url: url(`/games/${g}/${c.key}`), changeFrequency: "weekly", priority: 0.6 });
  }
  if (!hasSupabase()) {
    cacheLife("hours");
    return out;
  }

  const db = createGuestClient();
  const [majors, threads, highlights, scenes, hosted, matchupGuides, matchupPosts] = await Promise.all([
    // Every major in Smash history (round 784): each has a page with its top 8, and "<major> results" is
    // what people search for. Only upcoming tournaments were listed before, so Google wasn't told of these.
    db.from("majors").select("slug, start_at").eq("hidden", false).order("start_at", { ascending: false }).limit(3000),
    db.from("posts").select("id, created_at, edited_at").not("title", "is", null).is("parent_id", null).is("removed_at", null).eq("spoiler", false).order("created_at", { ascending: false }).limit(2000),
    db.from("highlights").select("id, created_at").is("removed_at", null).order("vote_count", { ascending: false }).limit(2000),
    db.from("scenes").select("slug").limit(500),
    db.from("hosted_events").select("id, created_at, status").is("removed_at", null).neq("status", "canceled").order("starts_at", { ascending: false }).limit(1000),
    db.from("highlights").select("game, character, vs_character").is("removed_at", null).not("vs_character", "is", null).limit(2000),
    db.from("posts").select("game, character, vs_character").is("removed_at", null).not("vs_character", "is", null).limit(2000),
  ]);
  for (const m of majors.data ?? []) out.push({ url: url(majorHref(m.slug)), lastModified: m.start_at, changeFrequency: "yearly", priority: 0.6 });
  for (const t of threads.data ?? []) out.push({ url: url(`/post/${t.id}`), lastModified: t.edited_at ?? t.created_at, changeFrequency: "daily", priority: 0.7 });
  for (const h of highlights.data ?? []) out.push({ url: url(`/h/${h.id}`), lastModified: h.created_at, changeFrequency: "monthly", priority: 0.6 });
  for (const s of scenes.data ?? []) out.push({ url: url(`/scenes/${s.slug}`), changeFrequency: "weekly", priority: 0.5 });
  for (const e of hosted.data ?? []) {
    out.push({ url: url(`/host/${e.id}`), lastModified: e.created_at, changeFrequency: "daily", priority: 0.6 });
    // A bracket that has started or finished has its own page worth finding (who beat whom).
    if (e.status === "in_progress" || e.status === "completed") out.push({ url: url(`/host/${e.id}/bracket`), changeFrequency: e.status === "completed" ? "monthly" : "hourly", priority: 0.5 });
  }
  // Public seasons (scenes' rankings): the season tables are server-only, so they're read with the server's client.
  const { data: seasons, error: seasonsError } = await createAdminClient().from("seasons").select("id, updated_at").eq("visibility", "public").is("removed_at", null).order("updated_at", { ascending: false }).limit(500);
  for (const s of seasons ?? []) out.push({ url: url(`/seasons/${s.id}`), lastModified: s.updated_at as string, changeFrequency: "weekly", priority: 0.6 });
  // Matchup pages only once someone has shared something for them (empty pages aren't worth listing).
  const seen = new Set<string>();
  for (const m of [...(matchupGuides.data ?? []), ...(matchupPosts.data ?? [])] as { game: string; character: string | null; vs_character: string | null }[]) {
    if (!m.character || !m.vs_character) continue;
    for (const [a, b] of [[m.character, m.vs_character], [m.vs_character, m.character]]) {
      const path = `/games/${m.game}/${a}/vs/${b}`;
      if (seen.has(path)) continue;
      seen.add(path);
      out.push({ url: url(path), changeFrequency: "weekly", priority: 0.6 });
    }
  }
  // Upcoming start.gg tournaments from the saved region lists (Texas and every other region). These
  // lists are server-only, so they're read with the admin client; only public slugs and dates are used.
  const upcoming = await upcomingTournamentSlugs();
  const listed = new Set(out.map((e) => e.url)); // an upcoming major is already in the list
  for (const slug of upcoming.slugs) if (!listed.has(url(`/events/${slug}`))) out.push({ url: url(`/events/${slug}`), changeFrequency: "daily", priority: 0.6 });
  // Players with a top 8 at a major (round 791, docs/searchable-player-pages-plan.md): their pages are open to
  // search engines; everyone else's player page is marked "don't index". Hidden players are never listed.
  const players = await searchablePlayerIds().catch(() => ({ ids: [] as string[], failed: true }));
  for (const id of players.ids) out.push({ url: url(`/players/${id}`), changeFrequency: "weekly", priority: 0.5 });
  // If a lookup failed, this list is missing pages: keep it for minutes (and try again soon), not hours.
  const failed = [majors, threads, highlights, scenes, hosted, matchupGuides, matchupPosts].some((r) => r.error) || !!seasonsError || upcoming.failed || players.failed;
  if (failed) cacheLife("minutes");
  else cacheLife("hours");
  return out;
}

type SavedList = { tournaments?: { slug?: string; startAt?: number | string | null; endAt?: number | string | null }[] } | null;

async function upcomingTournamentSlugs(): Promise<{ slugs: string[]; failed: boolean }> {
  const db = createAdminClient();
  // Only each saved list's upcoming tournaments (round 710): the finished ones ("recent") were 87% of the
  // 7.4 MB read for every region, and the database took about 0.37 s to send it all.
  const [regions, texas] = await Promise.all([
    db.from("region_events").select("tournaments:data->tournaments"),
    db.from("events_sync").select("tournaments:data->tournaments").eq("id", 1).maybeSingle(),
  ]);
  const lists = [...(regions.data ?? []), texas.data].map((r) => ({ tournaments: (r?.tournaments ?? undefined) as NonNullable<SavedList>["tournaments"] }));
  const now = Math.floor(Date.now() / 1000);
  const slugs = new Set<string>();
  for (const list of lists) {
    for (const t of list?.tournaments ?? []) {
      const end = Number(t.endAt ?? 0) || Number(t.startAt ?? 0) + 12 * 3600;
      if (t.slug && /^[a-z0-9-]+$/i.test(t.slug) && end > now) slugs.add(t.slug);
    }
  }
  return { slugs: [...slugs].slice(0, 5000), failed: !!regions.error || !!texas.error };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return entries();
}
