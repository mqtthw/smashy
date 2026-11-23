// "Download my data": everything Smashy keeps about you, as one JSON file. Read as you (the
// database's own rules), so it can only ever include your own data.
import { NextResponse } from "next/server";
import { createClient, getVerifiedUserId } from "@/lib/supabase/server";

const PAGE = 1000; // the database hands back at most this many rows per request

export async function GET(request: Request) {
  const userId = await getVerifiedUserId();
  if (!userId) return NextResponse.redirect(new URL("/signin", request.url));
  const supabase = await createClient();
  const one = <T,>(p: PromiseLike<{ data: T | null }>) => Promise.resolve(p).then((r) => r.data ?? []);
  // Lists are read page by page, so nothing is cut off at 1,000 rows.
  const all = async <T,>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> => {
    const rows: T[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await page(from, from + PAGE - 1);
      if (error) throw error;
      rows.push(...(data ?? []));
      if (!data || data.length < PAGE) return rows;
    }
  };

  const [
    { data: auth }, profile, birth, posts, likes, reposts, reactions, following, followers, bookmarks, highlights, blocks, mutes,
    messages, chats, clips, pollVotes, going, mutedWords, savedClips,
  ] = await Promise.all([
    supabase.auth.getUser(),
    one(supabase.from("profiles").select("*").eq("id", userId).maybeSingle()),
    one(supabase.from("private_profile_data").select("date_of_birth").eq("user_id", userId).maybeSingle()),
    all((a, b) => supabase.from("posts").select("id, body, game, character, created_at, edited_at, parent_id, quote_of, removed_at").eq("author_id", userId).order("created_at").range(a, b)),
    all((a, b) => supabase.from("post_likes").select("post_id, created_at").eq("user_id", userId).order("created_at").range(a, b)),
    all((a, b) => supabase.from("reposts").select("post_id, created_at").eq("user_id", userId).order("created_at").range(a, b)),
    all((a, b) => supabase.from("post_reactions").select("post_id, emoji, created_at").eq("user_id", userId).order("created_at").range(a, b)),
    all((a, b) => supabase.from("follows").select("followee:profiles!follows_followee_id_fkey ( handle ), status, created_at").eq("follower_id", userId).order("created_at").range(a, b)),
    all((a, b) => supabase.from("follows").select("follower:profiles!follows_follower_id_fkey ( handle ), status, created_at").eq("followee_id", userId).order("created_at").range(a, b)),
    all((a, b) => supabase.from("bookmarks").select("post_id, created_at").eq("user_id", userId).order("created_at").range(a, b)),
    all((a, b) => supabase.from("highlights").select("*").eq("author_id", userId).order("created_at").range(a, b)),
    all((a, b) => supabase.from("blocks").select("blocked:profiles!blocks_blocked_id_fkey ( handle ), created_at").eq("blocker_id", userId).order("created_at").range(a, b)),
    all((a, b) => supabase.from("mutes").select("muted:profiles!mutes_muted_id_fkey ( handle ), created_at").eq("muter_id", userId).order("created_at").range(a, b)),
    all((a, b) => supabase.from("messages").select("conversation_id, body, image_path, created_at, deleted_at").eq("sender_id", userId).order("created_at").range(a, b)),
    all((a, b) => supabase.from("conversation_members").select("conversation_id, role, status, joined_at").eq("user_id", userId).order("joined_at").range(a, b)),
    all((a, b) => supabase.from("reel_submissions").select("platform, clip_id, game, status, created_at").eq("user_id", userId).order("created_at").range(a, b)),
    all((a, b) => supabase.from("poll_votes").select("post_id, choice, created_at").eq("user_id", userId).order("created_at").range(a, b)),
    all((a, b) => supabase.from("event_rsvps").select("event_kind, event_ref, event_name, starts_at, status, created_at").eq("user_id", userId).order("created_at").range(a, b)),
    one(supabase.from("muted_words").select("words, updated_at").eq("user_id", userId).maybeSingle()),
    all((a, b) => supabase.from("saved_clips").select("clip_id, created_at").eq("user_id", userId).order("created_at").range(a, b)),
  ]);

  const data = {
    exported_at: new Date().toISOString(),
    note: "Everything Smashy keeps about your account. Photos are listed by file name; your messages are the ones you sent.",
    account: { id: userId, email: auth.user?.email ?? null, created_at: auth.user?.created_at ?? null },
    profile,
    date_of_birth: (birth as { date_of_birth?: string } | null)?.date_of_birth ?? null,
    posts,
    likes,
    reposts,
    reactions,
    following,
    followers,
    bookmarks,
    highlights,
    blocks,
    mutes,
    chats,
    messages_sent: messages,
    clips_shared: clips,
    poll_votes: pollVotes,
    events_going: going,
    muted_words: (mutedWords as { words?: string[] } | null)?.words ?? [],
    saved_clips: savedClips,
  };
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="smashy-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
