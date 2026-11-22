// Smash history: top 8 VODs for a major's game. A YouTube, Twitch or Streamable video (the set-VOD
// check) or a YouTube playlist, with an optional label. Admins add them; members suggest them and an
// admin approves (like moments). Links only.
import "server-only";
import { connection } from "next/server";
import { isGameKey, type GameKey } from "./games";
import type { HandProblem } from "./handMajors";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";
import { readVodLink } from "./vods";
import { cleanPublicText } from "./wordFilter";

export const MAX_VODS_PER_DAY = 10;

export type MajorVod = { id: string; majorSlug: string; game: GameKey; url: string; label: string | null; provider: string; status: string };

/** A YouTube playlist link, tidied ("https://www.youtube.com/playlist?list=…"), or null. */
export function readPlaylistLink(raw: string): string | null {
  const text = raw.trim();
  const m = text.match(/^(?:https?:\/\/)?(?:(?:www|m)\.)?youtube\.com\/(?:playlist|watch)\?(?:.*&)?list=([A-Za-z0-9_-]{10,64})/);
  return m ? `https://www.youtube.com/playlist?list=${m[1]}` : null;
}

/** Checks a VOD link and label. A watch link that's part of a playlist is kept as that one video. */
export function checkMajorVod(url: string, label: string, game: string): { url: string; label: string | null; game: GameKey } | { error: HandProblem } {
  if (!isGameKey(game)) return { error: { key: "history.err.pickGame", values: { n: 1 } } };
  const video = readVodLink(url);
  const tidy = video?.url ?? readPlaylistLink(url);
  if (!tidy) return { error: { key: "history.vod.err.link" } };
  const l = cleanPublicText(label.replace(/\s+/g, " "));
  if (l.flagged) return { error: { key: "history.err.wording" } };
  return { url: tidy, label: l.text.slice(0, 80) || null, game };
}

export function vodProvider(url: string): string {
  if (/youtube\.com|youtu\.be/.test(url)) return url.includes("/playlist?") ? "YouTube playlist" : "YouTube";
  if (/twitch\.tv/.test(url)) return "Twitch";
  return "Streamable";
}

/**
 * Adds a top 8 VOD to a shown major: approved right away for an admin, waiting for review otherwise
 * (a few a day per member).
 */
export async function addMajorVod(
  userId: string,
  isAdmin: boolean,
  input: { majorSlug: string; game: string; url: string; label: string },
): Promise<{ ok?: boolean; approved?: boolean; error?: HandProblem }> {
  const checked = checkMajorVod(input.url, input.label, input.game);
  if ("error" in checked) return checked;
  const db = createAdminClient();
  const { data: major } = await db.from("majors").select("slug").eq("slug", input.majorSlug).eq("hidden", false).maybeSingle();
  if (!major) return { error: { key: "history.report.err.pick" } };
  if (!isAdmin) {
    const { count } = await db
      .from("major_vods")
      .select("id", { count: "exact", head: true })
      .eq("suggested_by", userId)
      .gt("created_at", new Date(Date.now() - 86400_000).toISOString());
    if ((count ?? 0) >= MAX_VODS_PER_DAY) return { error: { key: "history.suggest.err.perDay", values: { n: MAX_VODS_PER_DAY } } };
  }
  const row = isAdmin
    ? { status: "approved", added_by: userId, reviewed_at: new Date().toISOString() }
    : { status: "pending", suggested_by: userId };
  const { error } = await db.from("major_vods").insert({ major_slug: input.majorSlug, game: checked.game, url: checked.url, label: checked.label, ...row });
  if (error) return { error: { key: error.code === "23505" ? "history.vod.err.exists" : "history.err.saveFailed" } };
  return { ok: true, approved: isAdmin };
}

type Row = { id: string; major_slug: string; game: GameKey; url: string; label: string | null; status: string };
const toVod = (r: Row): MajorVod => ({ id: r.id, majorSlug: r.major_slug, game: r.game, url: r.url, label: r.label, provider: vodProvider(r.url), status: r.status });

/** Approved VODs of these majors, by major slug. */
export async function getMajorVods(slugs: string[]): Promise<Map<string, MajorVod[]>> {
  const out = new Map<string, MajorVod[]>();
  if (!slugs.length) return out;
  const { data, error } = await (await createClient())
    .from("major_vods")
    .select("id, major_slug, game, url, label, status")
    .eq("status", "approved")
    .in("major_slug", slugs)
    .order("created_at");
  if (error) throw error;
  for (const r of (data ?? []) as Row[]) out.set(r.major_slug, [...(out.get(r.major_slug) ?? []), toVod(r)]);
  return out;
}

/** Admin: VODs waiting for review (with the major's name and who suggested it), and the latest approved. */
export async function getMajorVodsForAdmin(): Promise<{ pending: (MajorVod & { majorName: string; by: string | null })[]; recent: (MajorVod & { majorName: string; by: string | null })[] }> {
  await connection();
  const db = createAdminClient();
  const sel = "id, major_slug, game, url, label, status, major:majors ( name ), by:profiles!major_vods_suggested_by_fkey ( handle )";
  const [pending, recent] = await Promise.all([
    db.from("major_vods").select(sel).eq("status", "pending").order("created_at").limit(50),
    db.from("major_vods").select(sel).eq("status", "approved").order("reviewed_at", { ascending: false }).limit(15),
  ]);
  if (pending.error) throw pending.error;
  if (recent.error) throw recent.error;
  type R = Row & { major: { name: string } | null; by: { handle: string | null } | null };
  const map = (rows: unknown) => ((rows ?? []) as R[]).map((r) => ({ ...toVod(r), majorName: r.major?.name ?? r.major_slug, by: r.by?.handle ?? null }));
  return { pending: map(pending.data), recent: map(recent.data) };
}

/** Admin: approve or reject a suggested VOD, or take an approved one down (`approve` = false). */
export async function reviewMajorVod(id: string, approve: boolean, adminId: string) {
  const { error } = await createAdminClient()
    .from("major_vods")
    .update({ status: approve ? "approved" : "rejected", added_by: adminId, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
