// Posts the weekly "Clips of the week" thread (round 843; the words are in clipsOfWeekPost.ts). Run by
// the daily job; does something only on Mondays (UTC), once per week.
import "server-only";
import { getClipsOfWeekItems } from "./clipsOfWeekData";
import { CLIPS_POST_COUNT, CLIPS_POST_HANDLE, compilationText, videoLinkIn, type CompilationClip } from "./clipsOfWeekPost";
import { siteUrl } from "./siteMeta";
import { createAdminClient } from "./supabase/admin";

/** "posted", or why not: "not Monday", "already posted", "no clips", "no account". */
export async function postClipsOfWeek(now = new Date()): Promise<string> {
  if (now.getUTCDay() !== 1) return "not Monday";
  const db = createAdminClient();
  const { data: account } = await db.from("profiles").select("id").eq("handle", CLIPS_POST_HANDLE).maybeSingle();
  if (!account) return "no account";
  // Read as a signed-out visitor: only clips anyone may see go into a public post.
  const items = await getClipsOfWeekItems(undefined, null, { limit: CLIPS_POST_COUNT });
  if (!items.length) return "no clips";
  const origin = siteUrl().origin;
  const clips: CompilationClip[] = items.map((i) => ({
    handle: i.handle,
    tag: i.tag,
    words: i.words,
    smashyUrl: `${origin}${i.href}`,
    videoUrl: i.post ? videoLinkIn(i.post.body) : null,
  }));
  const { title, body } = compilationText(clips, now);
  // Once a week: the daily job can run more than once on a Monday.
  const { data: already } = await db.from("posts").select("id").eq("author_id", account.id).eq("title", title).limit(1);
  if (already?.length) return "already posted";
  const { error } = await db.from("posts").insert({ author_id: account.id, game: "general", title, flair: "news", body });
  if (error) throw error;
  return "posted";
}
