import { regionName } from "./regions";
import { HIDDEN_HANDLES } from "./discoveryHidden";
import { badgeMain } from "./mainBadge";
import type { Main } from "./characters";
// Discovery: who to follow, trending hashtags, and the new-player checklist. Server-only.
import "server-only";
import { ADULT_AGE, ageFromBirthdate } from "./age";
import { avatarUrl } from "./avatarLinks";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";
import { createGuestClient } from "./supabase/guest";
import { cacheLife } from "next/cache";

export type Suggestion = { id: string; tag: string; handle: string; homeCity: string | null; avatarUrl: string | null; protected: boolean; why: string; whyKey: "discover.alsoIn" | "discover.playsYourGames"; whyPlace: string | null; main: Main | null };

/**
 * People to follow: same city first, then same region (state/province/country), then people who play your games. Only people in your own age
 * group (teens see teens, adults see adults), never people you follow, blocked or muted.
 */
export async function getWhoToFollow(userId: string, limit = 4): Promise<Suggestion[]> {
  const supabase = await createClient();
  const db = createAdminClient();
  const [{ data: me }, { data: follows }, { data: blocks }, { data: mutes }] = await Promise.all([
    supabase.from("profiles").select("home_city, games, region").eq("id", userId).maybeSingle(),
    supabase.from("follows").select("followee_id").eq("follower_id", userId),
    supabase.from("blocks").select("blocked_id").eq("blocker_id", userId),
    supabase.from("mutes").select("muted_id").eq("muter_id", userId),
  ]);
  if (!me) return [];
  const skip = new Set<string>([userId, ...(follows ?? []).map((f) => f.followee_id), ...(blocks ?? []).map((b) => b.blocked_id), ...(mutes ?? []).map((m) => m.muted_id)]);
  const games = (me.games as string[]) ?? [];
  const { data: candidates } = await supabase
    .from("profiles")
    .select("id, tag, handle, home_city, games, avatar_path, protected, mains, region")
    .overlaps("games", games.length ? games : ["melee"])
    .not("handle", "in", HIDDEN_HANDLES)
    .order("created_at", { ascending: false })
    .limit(80);
  const pool = (candidates ?? []).filter((p) => !skip.has(p.id));
  if (!pool.length) return [];

  // Same age group only (birthdates are private: checked here on the server, never sent).
  const { data: births } = await db.from("private_profile_data").select("user_id, date_of_birth").in("user_id", [userId, ...pool.map((p) => p.id)]);
  const adult = new Map((births ?? []).map((b) => [b.user_id, ageFromBirthdate(b.date_of_birth) >= ADULT_AGE]));
  const meAdult = adult.get(userId) ?? false;
  const city = (me.home_city ?? "").toLowerCase();
  const region = (me.region as string | null) ?? null;
  return pool
    .filter((p) => (adult.get(p.id) ?? false) === meAdult)
    .map((p) => ({
      p,
      sameCity: !!city && (p.home_city ?? "").toLowerCase() === city,
      sameRegion: !!region && p.region === region,
    }))
    .sort((a, b) => Number(b.sameCity) - Number(a.sameCity) || Number(b.sameRegion) - Number(a.sameRegion))
    .slice(0, limit)
    .map(({ p, sameCity, sameRegion }) => ({
      id: p.id,
      tag: p.tag,
      handle: p.handle,
      homeCity: p.home_city,
      avatarUrl: avatarUrl(p.avatar_path),
      protected: !!p.protected,
      main: badgeMain(p.mains),
      why: sameCity ? `Also in ${p.home_city}` : sameRegion ? `Also in ${regionName(region)}` : "Plays your games",
      whyKey: sameCity || sameRegion ? "discover.alsoIn" : "discover.playsYourGames",
      whyPlace: sameCity ? p.home_city : sameRegion ? regionName(region) : null,
    }));
}

/**
 * Hashtags used most in the last 7 days. Counted from posts anyone can see (a guest's view), so the
 * answer is the same for everybody and is kept for 5 minutes and shared (round 748); it used to be
 * recounted from up to 500 posts on every open of Search.
 */
export async function getTrendingTags(limit = 10): Promise<{ tag: string; count: number }[]> {
  "use cache: remote";
  cacheLife({ stale: 120, revalidate: 300, expire: 3600 });
  const supabase = createGuestClient();
  const since = new Date(Date.now() - 7 * 86400e3).toISOString();
  const { data, error } = await supabase.from("posts").select("body").gt("created_at", since).like("body", "%#%").order("created_at", { ascending: false }).limit(500);
  if (error) cacheLife("seconds"); // a failed read isn't kept as "no tags" for minutes
  const counts = new Map<string, { tag: string; count: number }>();
  for (const { body } of data ?? []) {
    const seen = new Set<string>();
    for (const m of String(body).matchAll(/(?:^|[^\w&])#([A-Za-z][A-Za-z0-9_]{1,40})/g)) {
      const key = m[1].toLowerCase();
      if (seen.has(key)) continue; // once per post
      seen.add(key);
      const cur = counts.get(key) ?? { tag: `#${m[1]}`, count: 0 };
      cur.count++;
      counts.set(key, cur);
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

export type ChecklistItem = { key: string; label: string; href: string; done: boolean };

/** Getting started on Smashy: the few things that make it feel like home. Empty when all done. */
export async function getChecklist(userId: string, linked: boolean): Promise<ChecklistItem[]> {
  const supabase = await createClient();
  const [{ data: p }, { count: following }, { count: posts }] = await Promise.all([
    supabase.from("profiles").select("avatar_path, bio, mains").eq("id", userId).maybeSingle(),
    supabase.from("follows").select("followee_id", { count: "exact", head: true }).eq("follower_id", userId),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", userId),
  ]);
  const items: ChecklistItem[] = [
    { key: "picture", label: "Add a profile picture", href: "/profile/edit", done: !!p?.avatar_path },
    { key: "mains", label: "Pick your mains", href: "/profile/edit", done: Array.isArray(p?.mains) && p!.mains.length > 0 },
    { key: "bio", label: "Write a short bio", href: "/profile/edit", done: !!p?.bio },
    { key: "follow", label: "Follow 3 players", href: "/search", done: (following ?? 0) >= 3 },
    { key: "startgg", label: "Link start.gg to show your results", href: "/profile#startgg", done: linked },
    { key: "post", label: "Say hi in the feed", href: "/", done: (posts ?? 0) > 0 },
  ];
  return items.every((i) => i.done) ? [] : items;
}
