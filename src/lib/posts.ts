import { badgeMain } from "./mainBadge";
import type { Main } from "./characters";
// Loading posts for the feed and post pages (server-side, as the current user so privacy rules apply).
import { characterName } from "./characters";
import { spreadAuthors } from "./feedRank";
import type { ReactionSummary } from "./reactions";
import { FEED_PAGE_SIZE, type FeedGame, type Flair } from "./postConstants";
import { postImageUrl, type PostImage } from "./postImageLinks";
import { postVideoUrl, type PostVideo } from "./postVideoLinks";
import type { PostMediaItem } from "./postMedia";
import { avatarUrl } from "./avatarLinks";
import { regionName } from "./regions";
import { hotScore, type ThreadSort, type TopWindow } from "./threadRank";
import { CLIPS_OF_WEEK, CLIPS_OF_WEEK_DAYS, TWEET_LOOKUPS, isClipPost, pickClipsOfWeek } from "./clipsOfWeek";
import { tweetLinks } from "./embeds";
import { createClient } from "./supabase/server";
import { createGuestClient } from "./supabase/guest";
import { cacheLife } from "next/cache";
import { cache } from "react";
import { orNull } from "@/lib/supabase/loose";

/**
 * The database connection for a viewer: theirs when signed in, the plain guest one otherwise. The
 * guest one reads no cookies, so a guest's Feed can be kept and shared by every server (round 567);
 * it sees exactly what any signed-out visitor sees.
 */
const dbFor = (userId: string | null) => (userId ? createClient() : Promise.resolve(createGuestClient()));

export { FEED_GAMES, FEED_PAGE_SIZE, POST_MAX_LENGTH, type FeedGame } from "./postConstants";

export type QuotedPost =
  | { id: string; body: string; title: string | null; spoiler: boolean; createdAt: string; author: { tag: string; handle: string }; image: PostImage | null; imageCount: number; videoPoster: string | null }
  | "unavailable"; // hidden by privacy rules, removed, or deleted

/** A bracket set quoted in a post (snapshot saved when it was quoted). */
export type SetQuote = {
  source: string;
  externalId: string;
  tournamentName: string | null;
  eventName: string | null;
  roundLabel: string | null;
  p1: { name: string | null; score: number | null };
  p2: { name: string | null; score: number | null };
  winner: 1 | 2 | null;
};

/** A Reels clip quoted in a post. "unavailable" = the clip was hidden by moderators. */
export type ReelQuote = { clipId: string; title: string; channelName: string | null; thumbnailUrl: string | null; game: FeedGame } | "unavailable";

export type Post = {
  id: string;
  body: string;
  /** @handles in the body that are real Smashy players (lowercase): only these become links. */
  mentioned?: string[];
  title: string | null; // set = a discussion thread
  flair: Flair | null; // threads only: question, discussion, analysis...
  replyTo: string | null; // replies only: the reply this one answers (null = answers the thread)
  spoiler: boolean; // the author marked it as having spoilers (results)
  vsCharacter: string | null; // matchup tag: character vs this one
  game: FeedGame;
  character: string | null; // character tag (hub), e.g. "fox"
  createdAt: string;
  editedAt: string | null; // set if the author edited it (allowed for 15 minutes)
  parentId: string | null;
  removedReason: string | null; // set only when moderators removed it (only the author can still see it)
  author: { id: string; tag: string; handle: string; homeCity: string | null; avatarUrl: string | null; main: Main | null };
  likeCount: number;
  replyCount: number;
  repostCount: number;
  likedByMe: boolean;
  savedByMe: boolean; // bookmarked
  pinned: boolean; // pinned to the author's profile
  repostedByMe: boolean;
  reactions: ReactionSummary[]; // emoji reactions (the heart is separate)
  quote: QuotedPost | null; // null = not a quote post
  quoteSet: SetQuote | null; // a bracket set this post is about
  quoteReel: ReelQuote | null; // a Reels clip this post is about
  hostedEvent: HostedEventCard | null; // an event hosted on Smashy (sign-ups, live, or results)
  images: PostImage[]; // photos, in order
  video: PostVideo | null; // the first video (finished ones only), for Reels and link previews
  media: PostMediaItem[]; // photos and videos together, in the order they were added (up to 4, at most 2 videos)
  poll: Poll | null;
  card: null | {
    template: "placed" | "signed_up";
    tournamentSlug: string;
    tournamentName: string;
    eventName: string | null;
    eventStartAt: string | null;
    placement: number | null;
    numEntrants: number | null;
  };
};

/** An event hosted on Smashy, as a card on a post: its current state, and the top 3 once it's over. */
export type HostedEventCard = {
  id: string;
  name: string;
  game: FeedGame;
  online: boolean;
  where: string | null;
  startsAt: string;
  status: "open" | "closed" | "in_progress" | "completed" | "canceled";
  signupsOpen: boolean; // open and not started yet
  players: number;
  cap: number;
  /** tag null: a player or team hidden from this viewer (a teen, for signed-out visitors). */
  podium: { place: number; tag: string | null }[];
};

/** A poll on a post. Totals only (who voted for what is private). */
export type Poll = { options: string[]; closesAt: string; counts: number[]; total: number; myChoice: number | null };

/** One entry in a timeline: a post, or someone's repost of it. */
export type TimelineEntry = {
  key: string;
  at: string;
  post: Post;
  repostedBy: { tag: string; handle: string } | null;
  why?: string | null; // For You only: "Near you · San Antonio", "Popular in Texas", ...
};

const POST_FIELDS = `
  id, body, title, flair, reply_to, spoiler, vs_character, game, character, created_at, edited_at, parent_id, removed_at, removed_reason, quote_of,
  template, tournament_slug, tournament_name, event_name, event_start_at, placement, num_entrants,
  author:profiles!posts_author_id_fkey ( id, tag, home_city, handle, avatar_path, pinned_post_id, mains ),
  quote:quote_of ( id, body, title, spoiler, created_at, removed_at, author:profiles!posts_author_id_fkey ( tag, handle ), images:post_images ( path, width, height, alt, position ), videos:post_videos ( poster_path ) ),
  quote_reel_id,
  hosted_event:hosted_events!posts_hosted_event_id_fkey ( id, name, game, online, location, region, starts_at, status, entrant_cap, removed_at, entrants:hosted_entrants ( count ), guests:hosted_guests ( count ) ),
  quote_reel:reels!posts_quote_reel_id_fkey ( clip_id, title, channel_name, thumbnail_url, game ),
  quote_set:set_refs!posts_quote_set_id_fkey ( source, external_id, tournament_name, event_name, round_label, p1_name, p2_name, p1_score, p2_score, winner ),
  likes:post_likes ( count ),
  reposts:reposts ( count ),
  replies:posts!parent_id ( count ),
  images:post_images ( path, width, height, alt, position ),
  videos:post_videos ( path, poster_path, width, height, duration_ms, position )
`;

type Row = {
  id: string;
  body: string;
  title: string | null;
  flair: Flair | null;
  reply_to: string | null;
  spoiler: boolean;
  vs_character: string | null;
  game: FeedGame;
  character: string | null;
  created_at: string;
  edited_at: string | null;
  parent_id: string | null;
  removed_at: string | null;
  removed_reason: string | null;
  quote_of: string | null;
  template: "placed" | "signed_up" | null;
  tournament_slug: string | null;
  tournament_name: string | null;
  event_name: string | null;
  event_start_at: string | null;
  placement: number | null;
  num_entrants: number | null;
  author: { id: string; tag: string; handle: string; home_city: string | null; avatar_path: string | null; pinned_post_id: string | null; mains: unknown } | null;
  quote: {
    id: string; body: string; title?: string | null; spoiler?: boolean | null; created_at: string; removed_at: string | null; author: { tag: string; handle: string } | null;
    images?: { path: string; width: number; height: number; alt: string; position: number }[];
    videos?: { poster_path: string | null }[];
  } | null;
  likes: { count: number }[];
  reposts: { count: number }[];
  replies: { count: number }[];
  images?: { path: string; width: number; height: number; alt: string; position: number }[];
  videos?: { path: string; poster_path: string; width: number; height: number; duration_ms: number; position?: number }[];
  quote_reel_id: string | null;
  hosted_event?: {
    id: string; name: string; game: FeedGame; online: boolean; location: string | null; region: string | null; starts_at: string;
    status: HostedEventCard["status"]; entrant_cap: number; removed_at: string | null; entrants: { count: number }[]; guests?: { count: number }[];
  } | null;
  quote_reel: { clip_id: string; title: string; channel_name: string | null; thumbnail_url: string | null; game: FeedGame } | null;
  quote_set: {
    source: string; external_id: string; tournament_name: string | null; event_name: string | null; round_label: string | null;
    p1_name: string | null; p2_name: string | null; p1_score: number | null; p2_score: number | null; winner: 1 | 2 | null;
  } | null;
};

/** A post's first photo (for small previews, like a quoted post). */
/** A post's photos and videos in one order (they share positions; ties put photos first). */
function postMedia(
  images: { path: string; width: number; height: number; alt: string; position: number }[] | undefined,
  videos: { path: string; poster_path: string; width: number; height: number; duration_ms: number; position?: number }[] | undefined,
): { images: PostImage[]; video: PostVideo | null; media: PostMediaItem[] } {
  const items = [
    ...(images ?? []).map((i) => ({ pos: i.position, kind: 0, item: { kind: "image" as const, image: { url: postImageUrl(i.path), width: i.width, height: i.height, alt: i.alt } } })),
    ...(videos ?? [])
      .filter((v) => v.path && v.poster_path)
      .map((v) => ({ pos: v.position ?? 0, kind: 1, item: { kind: "video" as const, video: { url: postVideoUrl(v.path), posterUrl: postVideoUrl(v.poster_path), width: v.width, height: v.height, durationMs: v.duration_ms } } })),
  ].sort((a, b) => a.pos - b.pos || a.kind - b.kind);
  const media: PostMediaItem[] = items.map((x) => x.item);
  return {
    media,
    images: media.flatMap((m) => (m.kind === "image" ? [m.image] : [])),
    video: media.flatMap((m) => (m.kind === "video" ? [m.video] : []))[0] ?? null,
  };
}

function firstImage(images: { path: string; width: number; height: number; alt: string; position: number }[] | undefined): PostImage | null {
  const i = [...(images ?? [])].sort((a, b) => a.position - b.position)[0];
  return i ? { url: postImageUrl(i.path), width: i.width, height: i.height, alt: i.alt } : null;
}

/** Public URL of a scene emoji image in Supabase Storage. */
export function sceneEmojiUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/scene-emojis/${path}`;
}

/** Reactions on these posts, grouped per post: [{ key: "🔥", count, mine }, ...], biggest first. */
async function loadReactions(ids: string[], userId: string | null): Promise<Map<string, ReactionSummary[]>> {
  const out = new Map<string, ReactionSummary[]>();
  if (!ids.length) return out;
  const supabase = await dbFor(userId);
  const { data, error } = await supabase.from("post_reactions").select("post_id, emoji, user_id").in("post_id", ids).limit(5000);
  // A guest's read goes into the copy every guest shares: a failure must not be kept as "no reactions" (round 636).
  if (error && !userId) throw error;
  const rows = data ?? [];
  // Scene emojis: look up their name and image.
  const sceneIds = [...new Set(rows.filter((r) => r.emoji.startsWith("scene:")).map((r) => r.emoji.slice(6)))];
  const scene = new Map<string, { name: string; url: string }>();
  if (sceneIds.length) {
    const { data: emojis } = await supabase.from("scene_emojis").select("id, name, image_path").in("id", sceneIds);
    for (const e of emojis ?? []) scene.set(e.id, { name: e.name, url: sceneEmojiUrl(e.image_path) });
  }
  const tally = new Map<string, Map<string, ReactionSummary>>();
  for (const r of rows) {
    if (r.emoji.startsWith("scene:") && !scene.has(r.emoji.slice(6))) continue; // emoji no longer approved
    const perPost = tally.get(r.post_id) ?? new Map<string, ReactionSummary>();
    const cur = perPost.get(r.emoji) ?? { key: r.emoji, count: 0, mine: false, scene: scene.get(r.emoji.slice(6)) ?? null };
    cur.count++;
    if (r.user_id === userId) cur.mine = true;
    perPost.set(r.emoji, cur);
    tally.set(r.post_id, perPost);
  }
  for (const [postId, m] of tally) out.set(postId, [...m.values()].sort((a, b) => b.count - a.count));
  return out;
}

/** The top 3 of finished hosted events (for their cards). */
async function loadPodiums(eventIds: string[], userId: string | null): Promise<Map<string, { place: number; tag: string | null }[]>> {
  const out = new Map<string, { place: number; tag: string | null }[]>();
  if (!eventIds.length) return out;
  const supabase = await dbFor(userId);
  // Loaded here, not at the top: this file is also read by unit tests, where server-only modules can't load.
  const { createAdminClient } = await import("./supabase/admin");
  // Members and walk-ins (players the TO added by name, and doubles teams) both place.
  const [{ data }, { data: guests }, { data: hiddenTeams }] = await Promise.all([
    supabase
      .from("hosted_entrants")
      .select("event_id, placement, profile:profiles!hosted_entrants_user_id_fkey ( tag )")
      .in("event_id", eventIds)
      .gte("placement", 1)
      .lte("placement", 3)
      .order("placement"),
    supabase.from("hosted_guests").select("id, event_id, placement, tag").in("event_id", eventIds).gte("placement", 1).lte("placement", 3).order("placement"),
    // Teams with a teen, which a signed-out viewer can't see: their places only, never their names.
    createAdminClient().from("hosted_guests").select("id, event_id, placement").in("event_id", eventIds).eq("members_only", true).gte("placement", 1).lte("placement", 3),
  ]);
  const seen = new Set(((guests ?? []) as { id: string }[]).map((g) => g.id));
  const placed = [
    // A member hidden from this viewer (a teen) keeps their place, unnamed.
    ...((data ?? []) as unknown as { event_id: string; placement: number; profile: { tag: string } | null }[]).map((r) => ({ event_id: r.event_id, placement: r.placement, tag: r.profile?.tag ?? null })),
    ...((guests ?? []) as { event_id: string; placement: number; tag: string }[]),
    ...((hiddenTeams ?? []) as { id: string; event_id: string; placement: number }[]).filter((g) => !seen.has(g.id)).map((g) => ({ event_id: g.event_id, placement: g.placement, tag: null })),
  ].sort((a, b) => a.placement - b.placement);
  for (const r of placed) out.set(r.event_id, [...(out.get(r.event_id) ?? []), { place: r.placement, tag: r.tag }]);
  return out;
}

/** The @handles written in a post, lowercase (same pattern LinkifiedText links). */
export function mentionsIn(body: string): string[] {
  return [...new Set([...body.matchAll(/(?:^|(?<=[^\w&]))@([A-Za-z0-9_]{3,20})/g)].map((m) => m[1].toLowerCase()))];
}

/**
 * Which of these handles are Smashy players this viewer can see (round 579): "@DrevisSSB on X" named
 * someone on X, and its link led to "Page not found" (the page checker's one broken link).
 */
async function realHandles(handles: string[], userId: string | null): Promise<Set<string>> {
  const wanted = [...new Set(handles)].slice(0, 200);
  if (!wanted.length) return new Set();
  const supabase = await dbFor(userId);
  const { data, error } = await supabase.from("profiles").select("handle").in("handle", wanted);
  if (error && !userId) throw error; // shared guest copy (round 636)
  return new Set((data ?? []).map((p) => p.handle as string));
}

/** Polls on these posts, with totals and the viewer's own vote. */
async function loadPolls(ids: string[], userId: string | null): Promise<Map<string, Poll>> {
  const out = new Map<string, Poll>();
  if (!ids.length) return out;
  const supabase = await dbFor(userId);
  const { data: polls, error } = await supabase.from("polls").select("post_id, options, closes_at").in("post_id", ids);
  if (error && !userId) throw error; // shared guest copy (round 636)
  if (!polls?.length) return out;
  const pollIds = polls.map((p) => p.post_id as string);
  const [{ data: counts }, { data: mine }] = await Promise.all([
    supabase.rpc("poll_results", { posts: pollIds }),
    userId ? supabase.from("poll_votes").select("post_id, choice").eq("user_id", userId).in("post_id", pollIds) : Promise.resolve({ data: [] }),
  ]);
  const myVote = new Map(((mine ?? []) as { post_id: string; choice: number }[]).map((v) => [v.post_id, v.choice]));
  for (const p of polls) {
    const options = p.options as string[];
    const tally = options.map(() => 0);
    for (const c of (counts ?? []) as { post_id: string; choice: number; votes: number }[]) {
      if (c.post_id === p.post_id && c.choice < tally.length) tally[c.choice] = Number(c.votes);
    }
    out.set(p.post_id, { options, closesAt: p.closes_at, counts: tally, total: tally.reduce((a, b) => a + b, 0), myChoice: myVote.get(p.post_id) ?? null });
  }
  return out;
}

type PostExtras = {
  reactions: Map<string, ReactionSummary[]>;
  polls: Map<string, Poll>;
  liked: Set<string>;
  reposted: Set<string>;
  saved: Set<string>;
};

/**
 * What goes with a set of posts besides the posts themselves: reactions, polls, and (signed in) which
 * ones you liked, reposted and saved. All at once (round 564: likes, reposts and saves used to wait
 * for reactions and polls), and only needs the ids, so it can start before the posts are loaded.
 */
export async function postExtras(ids: string[], userId: string | null): Promise<PostExtras> {
  const mine = async () => {
    if (!userId || !ids.length) return [new Set<string>(), new Set<string>(), new Set<string>()];
    const supabase = await createClient();
    const [{ data: likes }, { data: reposts }, { data: marks }] = await Promise.all([
      supabase.from("post_likes").select("post_id").eq("user_id", userId).in("post_id", ids),
      supabase.from("reposts").select("post_id").eq("user_id", userId).in("post_id", ids),
      supabase.from("bookmarks").select("post_id").eq("user_id", userId).in("post_id", ids),
    ]);
    return [new Set((likes ?? []).map((l) => l.post_id)), new Set((reposts ?? []).map((r) => r.post_id)), new Set((marks ?? []).map((m) => m.post_id))];
  };
  const [reactions, polls, [liked, reposted, saved]] = await Promise.all([loadReactions(ids, userId), loadPolls(ids, userId), mine()]);
  return { reactions, polls, liked, reposted, saved };
}

async function toPosts(rows: Row[], userId: string | null, extrasStarted?: Promise<PostExtras>): Promise<Post[]> {
  const finishedEvents = [...new Set(rows.flatMap((r) => (r.hosted_event?.status === "completed" ? [r.hosted_event.id] : [])))];
  const [{ reactions, polls, liked, reposted, saved }, podiums, players] = await Promise.all([
    extrasStarted ?? postExtras(rows.map((r) => r.id), userId),
    loadPodiums(finishedEvents, userId),
    realHandles(rows.flatMap((r) => mentionsIn(r.body)), userId),
  ]);
  return rows
    .filter((r) => r.author) // author hidden by privacy rules -> hide the post too
    .map((r) => ({
      id: r.id,
      body: r.body,
      title: r.title ?? null,
      flair: r.flair ?? null,
      replyTo: r.reply_to ?? null,
      spoiler: !!r.spoiler,
      vsCharacter: r.vs_character ?? null,
      game: r.game,
      character: r.character,
      createdAt: r.created_at,
      editedAt: r.edited_at,
      parentId: r.parent_id,
      removedReason: r.removed_at ? r.removed_reason ?? "other" : null,
      author: { id: r.author!.id, tag: r.author!.tag, handle: r.author!.handle, homeCity: r.author!.home_city, avatarUrl: avatarUrl(r.author!.avatar_path), main: badgeMain(r.author!.mains) },
      likeCount: r.likes[0]?.count ?? 0,
      replyCount: r.replies[0]?.count ?? 0,
      repostCount: r.reposts[0]?.count ?? 0,
      likedByMe: liked.has(r.id),
      savedByMe: saved.has(r.id),
      pinned: r.author!.pinned_post_id === r.id,
      repostedByMe: reposted.has(r.id),
      reactions: reactions.get(r.id) ?? [],
      ...postMedia(r.images, r.videos),
      poll: polls.get(r.id) ?? null,
      mentioned: mentionsIn(r.body).filter((h) => players.has(h)),
      quote: !r.quote_of
        ? null
        : r.quote && r.quote.author && !r.quote.removed_at
          ? {
              id: r.quote.id,
              body: r.quote.body,
              title: r.quote.title ?? null,
              spoiler: !!r.quote.spoiler,
              createdAt: r.quote.created_at,
              author: r.quote.author,
              image: firstImage(r.quote.images),
              imageCount: r.quote.images?.length ?? 0,
              // A quoted video post: its still picture (only finished videos come back).
              videoPoster: r.quote.videos?.[0]?.poster_path ? postVideoUrl(r.quote.videos[0].poster_path) : null,
            }
          : "unavailable",
      hostedEvent:
        r.hosted_event && !r.hosted_event.removed_at
          ? {
              id: r.hosted_event.id,
              name: r.hosted_event.name,
              game: r.hosted_event.game,
              online: r.hosted_event.online,
              where: r.hosted_event.online ? r.hosted_event.region : r.hosted_event.location,
              startsAt: r.hosted_event.starts_at,
              status: r.hosted_event.status,
              signupsOpen: r.hosted_event.status === "open" && Date.parse(r.hosted_event.starts_at) > Date.now(),
              players: (r.hosted_event.entrants?.[0]?.count ?? 0) + (r.hosted_event.guests?.[0]?.count ?? 0), // members plus walk-ins
              cap: r.hosted_event.entrant_cap,
              podium: podiums.get(r.hosted_event.id) ?? [],
            }
          : null,
      quoteReel: !r.quote_reel_id
        ? null
        : r.quote_reel
          ? { clipId: r.quote_reel.clip_id, title: r.quote_reel.title, channelName: r.quote_reel.channel_name, thumbnailUrl: r.quote_reel.thumbnail_url, game: r.quote_reel.game }
          : "unavailable",
      quoteSet: r.quote_set
        ? {
            source: r.quote_set.source,
            externalId: r.quote_set.external_id,
            tournamentName: r.quote_set.tournament_name,
            eventName: r.quote_set.event_name,
            roundLabel: r.quote_set.round_label,
            p1: { name: r.quote_set.p1_name, score: r.quote_set.p1_score },
            p2: { name: r.quote_set.p2_name, score: r.quote_set.p2_score },
            winner: r.quote_set.winner,
          }
        : null,
      card:
        r.template && r.tournament_slug && r.tournament_name
          ? {
              template: r.template,
              tournamentSlug: r.tournament_slug,
              tournamentName: r.tournament_name,
              eventName: r.event_name,
              eventStartAt: r.event_start_at,
              placement: r.placement,
              numEntrants: r.num_entrants,
            }
          : null,
    }));
}

/** Words and phrases the viewer muted (posts containing them stay out of their feeds). */
// The viewer's mutes are read once per request (React cache, round 665): a page with several post lists
// asked for them again for each one, and warmMutes starts reading them alongside the posts.
const mutedWordList = cache(async (userId: string | null): Promise<string[]> => {
  if (!userId) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("muted_words").select("words").eq("user_id", userId).maybeSingle();
  return ((data?.words as string[] | undefined) ?? []).map((w) => w.toLowerCase()).filter(Boolean);
});

/** True if the post (or the post it quotes) mentions a muted word. Whole words, ignoring case. */
export function hasMutedWord(post: Pick<Post, "body" | "quote" | "poll"> & { title?: string | null }, words: string[]): boolean {
  if (!words.length) return false;
  const quote = post.quote && post.quote !== "unavailable" ? post.quote : null;
  const text = [post.title ?? "", post.body, quote?.title ?? "", quote?.body ?? "", ...(post.poll?.options ?? [])].join(" ").toLowerCase();
  return words.some((w) => {
    const i = text.indexOf(w);
    if (i < 0) return false;
    // "fox" shouldn't hide "foxtrot": check the characters around each match.
    const isWordChar = (c: string | undefined) => !!c && /[\p{L}\p{N}_]/u.test(c);
    for (let at = i; at >= 0; at = text.indexOf(w, at + 1)) {
      if (!isWordChar(text[at - 1]) || !isWordChar(w[0])) {
        if (!isWordChar(text[at + w.length]) || !isWordChar(w[w.length - 1])) return true;
      }
    }
    return false;
  });
}

/** People the viewer muted (their posts and reposts stay out of the viewer's feeds). */
const mutedIds = cache(async (userId: string | null): Promise<Set<string>> => {
  if (!userId) return new Set();
  const supabase = await createClient();
  const { data } = await supabase.from("mutes").select("muted_id").eq("muter_id", userId);
  return new Set((data ?? []).map((m) => m.muted_id as string));
});

/** Starts reading the viewer's mutes now, so withoutMuted doesn't wait for them after the posts. */
function warmMutes(userId: string | null) {
  if (!userId) return;
  void mutedIds(userId).catch(() => {});
  void mutedWordList(userId).catch(() => {});
}

/** Leaves out posts from people the viewer muted and posts with their muted words (never their own). */
async function withoutMuted(posts: Post[], userId: string | null): Promise<Post[]> {
  if (!userId || !posts.length) return posts;
  const [muted, words] = await Promise.all([mutedIds(userId), mutedWordList(userId)]);
  return posts.filter((p) => p.author.id === userId || (!muted.has(p.author.id) && !hasMutedWord(p, words)));
}

/**
 * Posts and reposts, newest first, from the `feed_items` view (which applies the viewer's privacy
 * rules). `before` is a timestamp cursor for "Older posts".
 */
async function getTimeline(opts: { game?: FeedGame; actorId?: string; following?: boolean; feedOnly?: boolean; before?: string; userId: string | null }) {
  const supabase = await dbFor(opts.userId);
  // "following" uses a view that filters to people the viewer follows inside the database
  // (passing followed ids in the URL broke past ~1,000 follows).
  let q = supabase.from(opts.following ? "following_feed_items" : "feed_items").select("kind, post_id, actor_id, at").order("at", { ascending: false }).limit(FEED_PAGE_SIZE + 1);
  if (opts.feedOnly) q = q.is("ruleset_id", null).is("set_ref_id", null).is("reel_clip_id", null); // ruleset, set and clip discussions live on their own pages
  if (opts.game) q = q.eq("game", opts.game);
  if (opts.actorId) q = q.eq("actor_id", opts.actorId);
  if (opts.before) q = q.lt("at", opts.before);
  const [muted, words] = opts.actorId ? [new Set<string>(), [] as string[]] : await Promise.all([mutedIds(opts.userId), mutedWordList(opts.userId)]);
  // Leave muted people's posts and reposts out of the page itself, so pages stay full.
  if (muted.size) q = q.not("actor_id", "in", `(${[...muted].join(",")})`);
  const { data: items, error } = await q;
  if (error) throw error;

  // A view's columns all look optional to the generated types; these four are always set.
  const page = ((items ?? []) as { post_id: string; actor_id: string; kind: string; at: string }[]).slice(0, FEED_PAGE_SIZE);
  const postIds = [...new Set(page.map((i) => i.post_id))];
  const reposterIds = [...new Set(page.filter((i) => i.kind === "repost").map((i) => i.actor_id))];
  // Likes, reactions and polls only need the ids: they load alongside the posts (round 671).
  const extras = postExtras(postIds, opts.userId);
  extras.catch(() => {}); // awaited below; this only keeps an early failure from going unhandled
  const [{ data: rows }, { data: reposters }] = await Promise.all([
    postIds.length ? supabase.from("posts").select(POST_FIELDS).in("id", postIds) : Promise.resolve({ data: [] }),
    reposterIds.length ? supabase.from("profiles").select("id, tag, handle").in("id", reposterIds) : Promise.resolve({ data: [] }),
  ]);
  const posts = new Map((await toPosts((rows ?? []) as unknown as Row[], opts.userId, extras)).map((p) => [p.id, p]));
  const people = new Map(((reposters ?? []) as { id: string; tag: string; handle: string }[]).map((p) => [p.id, p]));

  const entries: TimelineEntry[] = page.flatMap((i): TimelineEntry[] => {
    const post = posts.get(i.post_id);
    if (!post || muted.has(post.author.id) || muted.has(i.actor_id)) return [];
    if (post.author.id !== opts.userId && hasMutedWord(post, words)) return [];
    if (i.kind === "repost") {
      const by = people.get(i.actor_id);
      if (!by) return [];
      return [{ key: `r-${i.post_id}-${i.actor_id}`, at: i.at, post, repostedBy: { tag: by.tag, handle: by.handle } }];
    }
    return [{ key: `p-${i.post_id}`, at: i.at, post, repostedBy: null }];
  });
  return { entries, hasMore: (items ?? []).length > FEED_PAGE_SIZE, cursor: page.length ? page[page.length - 1].at : null };
}

/** Following feed: posts and reposts by people you follow (and yourself). `followedIds` is no longer needed (the database works it out) and is ignored. */
export function getFollowingFeed(opts: { followedIds?: string[]; game?: FeedGame; before?: string; userId: string }) {
  return getTimeline({ game: opts.game, before: opts.before, userId: opts.userId, feedOnly: true, following: true });
}

/** The main feed: everyone's posts and reposts. */
export function getFeed(opts: { game?: FeedGame; before?: string; userId: string | null }) {
  return getTimeline({ ...opts, feedOnly: true });
}

type RankedRow = { post_id: string; score: number; reason: string | null; reason_detail: string | null };

/** The short "why you're seeing this" line for a ranked post. */
function whyLabel(r: RankedRow, post: Post): string | null {
  switch (r.reason) {
    case "tournament":
      return r.reason_detail ? `Also at ${r.reason_detail}` : "From a tournament you went to";
    case "character": {
      const name = post.game !== "general" ? characterName(post.game, post.character) : null;
      return name ? `Because you're into ${name}` : null;
    }
    case "city":
      return r.reason_detail ? `Near you · ${r.reason_detail}` : "Near you";
    case "interacts":
      return "You often interact with them";
    case "region":
      return `Popular in ${regionName(r.reason_detail)}`;
    case "texas":
      return "Popular in Texas";
    case "popular":
      return "Popular on Smashy";
    default:
      return null;
  }
}

/**
 * For You: ranked by the database (`for_you_feed`): engagement that fades with age, boosted for the
 * viewer's city, Texas, games, characters, people they interact with, and tournaments they went to.
 * `page` starts at 0.
 */
export async function getForYouFeed(opts: { game?: FeedGame; page: number; asOf?: string; userId: string | null; region?: string | null }) {
  const supabase = await dbFor(opts.userId);
  const { data, error } = await supabase.rpc("for_you_feed", {
    p_game: orNull(opts.game),
    p_limit: FEED_PAGE_SIZE + 1,
    p_offset: opts.page * FEED_PAGE_SIZE,
    // Pages of one browsing session are ranked as of the same moment, so they don't repeat or skip.
    p_as_of: orNull(opts.asOf),
    // The viewer's region (visitors: their rough location); signed-in people's comes from their profile.
    p_region: orNull(opts.region),
  });
  if (error) throw error;
  const ranked = ((data ?? []) as RankedRow[]).slice(0, FEED_PAGE_SIZE);
  const ids = ranked.map((r) => r.post_id);
  const [found, muted, words] = await Promise.all([getPostsByIds(ids, opts.userId), mutedIds(opts.userId), mutedWordList(opts.userId)]);
  const posts = new Map(found.map((p) => [p.id, p]));
  const entries: TimelineEntry[] = ranked.flatMap((r) => {
    const post = posts.get(r.post_id);
    return post && !muted.has(post.author.id) && (post.author.id === opts.userId || !hasMutedWord(post, words)) ? [{ key: `p-${post.id}`, at: post.createdAt, post, repostedBy: null, why: whyLabel(r, post) }] : [];
  });
  return { entries: spreadAuthors(entries), hasMore: (data ?? []).length > FEED_PAGE_SIZE };
}

/**
 * A guest's first page of For You (one game, or all, in their region): the same for every guest there,
 * so it's kept for a minute and shared by every server (round 567) instead of built on each visit.
 */
export async function getGuestForYouFeed(game: FeedGame | undefined, region: string | null) {
  "use cache: remote";
  cacheLife({ stale: 30, revalidate: 60, expire: 600 });
  return getForYouFeed({ game, page: 0, userId: null, region });
}

/** A person's history on their profile: their posts and their reposts. */
export function getProfileTimeline(opts: { authorId: string; before?: string; userId: string | null }) {
  return getTimeline({ actorId: opts.authorId, before: opts.before, userId: opts.userId });
}

/** A profile's Replies or Media tab: their replies, or their posts with photos or a video. Newest first. */
export async function getProfilePosts(opts: { authorId: string; kind: "replies" | "media"; before?: string; userId: string | null }) {
  const supabase = await createClient();
  const before = opts.before ?? "9999-12-31";
  let lists: { id: string; created_at: string }[][];
  if (opts.kind === "media") {
    // Posts with photos and posts with a video (a post has one or the other), read side by side and
    // merged. Only finished videos count (the table's own rules show nothing else).
    const [withPhotos, withVideo] = await Promise.all([
      supabase.from("posts").select("id, created_at, images:post_images!inner ( position )").eq("author_id", opts.authorId).lt("created_at", before).order("created_at", { ascending: false }).limit(FEED_PAGE_SIZE + 1),
      supabase.from("posts").select("id, created_at, videos:post_videos!inner ( status )").eq("author_id", opts.authorId).lt("created_at", before).order("created_at", { ascending: false }).limit(FEED_PAGE_SIZE + 1),
    ]);
    if (withPhotos.error) throw withPhotos.error;
    if (withVideo.error) throw withVideo.error;
    lists = [withPhotos.data ?? [], withVideo.data ?? []];
  } else {
    const { data, error } = await supabase.from("posts").select("id, created_at").not("parent_id", "is", null).eq("author_id", opts.authorId).lt("created_at", before).order("created_at", { ascending: false }).limit(FEED_PAGE_SIZE + 1);
    if (error) throw error;
    lists = [data ?? []];
  }
  const seen = new Set<string>();
  const rows = lists
    .flat()
    .filter((r) => !seen.has(r.id) && seen.add(r.id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, FEED_PAGE_SIZE + 1);
  const page = rows.slice(0, FEED_PAGE_SIZE);
  const posts = await getPostsByIds(page.map((r) => r.id), opts.userId);
  return { posts, hasMore: rows.length > FEED_PAGE_SIZE, cursor: page.at(-1)?.created_at ?? null };
}

/** Your saved posts, most recently saved first. */
export async function getSavedPosts(userId: string): Promise<Post[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("bookmarks").select("post_id").eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
  return getPostsByIds((data ?? []).map((b) => b.post_id as string), userId);
}

/** Full posts for a list of ids, in the same order (used by search). */
/** Posts linked to a hosted event (the host's promotion post, shared results), newest first. */
export async function getHostedEventPosts(eventId: string, userId: string | null, limit = 5): Promise<Post[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("id")
    .eq("hosted_event_id", eventId)
    .is("parent_id", null)
    .is("removed_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  return getPostsByIds(((data ?? []) as { id: string }[]).map((p) => p.id), userId);
}

export async function getPostsByIds(ids: string[], userId: string | null): Promise<Post[]> {
  if (!ids.length) return [];
  const supabase = await dbFor(userId);
  // The extras only need the ids: they load alongside the posts instead of after them (round 564).
  const extras = postExtras(ids, userId);
  extras.catch(() => {}); // awaited below; this only keeps an early failure from going unhandled
  const { data, error } = await supabase.from("posts").select(POST_FIELDS).in("id", ids);
  if (error) throw error;
  const byId = new Map((await toPosts((data ?? []) as unknown as Row[], userId, extras)).map((p) => [p.id, p]));
  return ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
}

/**
 * Posts whose video can go in Reels (round 421): top-level posts from the last 30 days with a
 * finished video of a minute or less, tagged with one of `games`, newest 60. The posts table's own
 * rules apply (teen posts need sign-in, removed posts and blocked people are left out); spoiler posts
 * are skipped (Reels would show the result before anyone chose to look), and so are people and words
 * the viewer muted.
 */
export async function getReelPostVideos(games: readonly string[], userId: string | null): Promise<Post[]> {
  if (!games.length) return [];
  warmMutes(userId);
  // The candidates come from a list shared by everyone (round 724), so only the posts themselves are read
  // per visit, as the viewer: the table's rules still decide who sees what.
  const posts = await getPostsByIds(await reelPostVideoIds([...games].sort()), userId);
  // Checked again on the fresh rows: the shared list can be a minute old.
  return withoutMuted(posts.filter((p) => p.video && p.video.durationMs <= 60_000 && !p.spoiler && !p.removedReason), userId);
}

/**
 * Ids of the posts whose video could go in Reels for these games, newest 60. The same for every viewer, so
 * it's kept for a minute and shared by every server (round 724): signed in, Reels used to wait for this
 * lookup and then for the posts, one after the other, on every visit. Read with the admin connection so a
 * signed-in teen's posts are candidates too; nothing but ids leaves here, and getPostsByIds reads each post
 * as the viewer.
 */
async function reelPostVideoIds(games: string[]): Promise<string[]> {
  "use cache: remote";
  cacheLife({ stale: 30, revalidate: 60, expire: 600 });
  const { createAdminClient } = await import("./supabase/admin");
  const since = new Date(Date.now() - 30 * 86400e3).toISOString();
  const { data, error } = await createAdminClient({ forPage: true })
    .from("posts")
    .select("id, videos:post_videos!inner ( duration_ms )")
    .is("parent_id", null)
    .is("removed_at", null)
    .eq("spoiler", false)
    .in("game", games)
    .lte("videos.duration_ms", 60_000)
    .gt("created_at", since)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw error;
  return (data ?? []).map((r) => r.id as string);
}

/**
 * "Clips of the week" (round 751): the most liked clip posts of the last 7 days, one per player, best
 * first. The posts are read as the viewer, so blocks, mutes and the table's rules apply.
 */
export async function getClipsOfWeek(game: FeedGame | undefined, userId: string | null, opts: { limit?: number; perAuthor?: number } = {}): Promise<ClipPick[]> {
  warmMutes(userId);
  // Three times as many as will be shown: a pick this viewer can't see (a block, a mute, a protected
  // account they don't follow) drops out below, and the next one takes its place (round 765).
  const ids = await clipsOfWeekIds(game ?? null, (opts.limit ?? CLIPS_OF_WEEK) * 3, opts.perAuthor ?? 1, userId ? "member" : "guest");
  const posts = await getPostsByIds(ids.filter((id) => !id.startsWith(REEL_PICK)), userId);
  const shown = new Map((await withoutMuted(posts.filter((p) => !p.spoiler && !p.removedReason), userId)).map((p) => [p.id, p]));
  // In the picked order: posts and Reels clips together (round 759).
  return ids.flatMap((id): ClipPick[] => {
    if (id.startsWith(REEL_PICK)) return [{ kind: "reel", clipId: id.slice(REEL_PICK.length) }];
    const post = shown.get(id);
    return post ? [{ kind: "post", post }] : [];
  });
}

/** One pick: a clip post, or a clip in Reels (by its clip id; clipsOfWeekData.ts reads it). */
export type ClipPick = { kind: "post"; post: Post } | { kind: "reel"; clipId: string };
const REEL_PICK = "reel:";

/**
 * The week's picks, as ids, kept for 10 minutes and shared. Two lists (round 765):
 * - "guest": counted from posts anyone can see, so a teen's or a protected account's post is never
 *   shown to someone signed out.
 * - "member": counted from every post, read with the admin connection like reelPostVideoIds above.
 *   The first version used the guest list for everybody, which left out the week's most liked clips
 *   when their author counted as a teen (a teen, or no birthday on file), though members see those
 *   posts in the Feed. Nothing but ids leaves here: getPostsByIds reads each post as the viewer, so
 *   the table's rules still decide who sees what.
 */
async function clipsOfWeekIds(game: FeedGame | null, limit: number, perAuthor: number, audience: "guest" | "member"): Promise<string[]> {
  "use cache: remote";
  cacheLife({ stale: 300, revalidate: 600, expire: 3600 });
  const since = new Date(Date.now() - CLIPS_OF_WEEK_DAYS * 86400e3).toISOString();
  const db = audience === "member" ? (await import("./supabase/admin")).createAdminClient({ forPage: true }) : createGuestClient();
  let q = db
    .from("posts")
    .select("id, author_id, body, like_count, reaction_count, created_at, videos:post_videos ( status )")
    .is("parent_id", null)
    .is("removed_at", null)
    .is("ruleset_id", null)
    .is("set_ref_id", null)
    .is("reel_clip_id", null)
    .eq("spoiler", false)
    .gt("created_at", since)
    .or("like_count.gt.0,reaction_count.gt.0");
  if (game) q = q.eq("game", game);
  const { data, error } = await q.order("like_count", { ascending: false }).limit(300);
  if (error) {
    cacheLife("seconds"); // a failed read isn't kept as "no clips" for minutes
    return [];
  }
  const rows = (data ?? []).map((r) => ({
    id: r.id,
    authorId: r.author_id,
    body: r.body,
    likes: r.like_count + r.reaction_count,
    createdAt: r.created_at,
    hasVideo: (r.videos ?? []).some((v) => v.status === "ready"),
  }));
  // Clips shared as X links count too (round 752): a link alone doesn't say whether the tweet has a
  // video, so the most liked such posts are looked up (the same kept read their cards use). A tweet
  // that's gone, or X not answering, just means that post isn't counted this time.
  const linked = rows
    .filter((r) => !isClipPost(r) && tweetLinks(r.body, 1).length > 0)
    .sort((a, b) => b.likes - a.likes)
    .slice(0, TWEET_LOOKUPS);
  // Loaded here, not at the top: tweets.ts is server-only, and unit tests load this file.
  const { getTweetCard } = linked.length ? await import("./tweets") : { getTweetCard: null };
  await Promise.all(
    linked.map(async (r) => {
      if (!getTweetCard) return;
      const card = await getTweetCard(tweetLinks(r.body, 1)[0].id).catch(() => null);
      if (card?.picture?.video) r.hasVideo = true;
    }),
  );
  // Clips in Reels count too (round 759, Matthew): the liked ones from the same 7 days, by when they
  // were made or shared. Each channel counts as one "player" for the one-spot rule. A failed read
  // only leaves Reels out this time.
  let reels = createGuestClient()
    .from("reels")
    .select("clip_id, channel_login, like_count, created_at, submitted_at")
    .eq("hidden", false)
    .eq("unavailable", false)
    .eq("low_quality", false)
    .gt("like_count", 0)
    .or(`created_at.gt.${since},submitted_at.gt.${since}`);
  if (game && game !== "general") reels = reels.eq("game", game);
  const liked = game === "general" ? { data: [], error: null } : await reels.order("like_count", { ascending: false }).limit(100);
  if (liked.error) cacheLife("seconds");
  for (const r of liked.data ?? []) {
    rows.push({ id: `${REEL_PICK}${r.clip_id}`, authorId: `channel:${r.channel_login}`, body: "", likes: r.like_count, createdAt: r.submitted_at ?? r.created_at, hasVideo: true });
  }
  return pickClipsOfWeek(rows, limit, perAuthor);
}

/** The still picture of the video in the first tweet a post links, or null (for the Clips of the week card). */
export async function tweetVideoStill(body: string): Promise<string | null> {
  const first = tweetLinks(body, 1)[0];
  if (!first) return null;
  const { getTweetCard } = await import("./tweets");
  const card = await getTweetCard(first.id).catch(() => null);
  return card?.picture?.video ? card.picture.url : null;
}

/** Recent posts tagged with a character (resource hub). */
export async function getCharacterPosts(game: FeedGame, character: string, userId: string | null, limit = 20) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_FIELDS)
    .eq("game", game)
    .eq("character", character)
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return toPosts((data ?? []) as unknown as Row[], userId);
}

/** Posts containing a hashtag (e.g. "combovideo"), newest first. */
export async function getHashtagPosts(tag: string, userId: string | null, limit = 30) {
  if (!/^[A-Za-z][A-Za-z0-9_]{1,40}$/.test(tag)) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_FIELDS)
    // Whole hashtag only: "#fox" shouldn't match "#foxtech", and "_" is a normal character, not a
    // wildcard. (The tag is letters, digits and "_" only, checked above, so it's safe in a pattern.)
    .filter("body", "imatch", `#${tag}([^A-Za-z0-9_]|$)`)
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return toPosts((data ?? []) as unknown as Row[], userId);
}

/** Discussion on a ruleset: top-level posts, newest first. */
export async function getRulesetDiscussion(rulesetId: string, userId: string | null) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_FIELDS)
    .eq("ruleset_id", rulesetId)
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return toPosts((data ?? []) as unknown as Row[], userId);
}

/** The saved snapshot id for a bracket set, if anyone has talked about it yet. */
export async function getSetRefId(source: string, externalId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("set_refs").select("id").eq("source", source).eq("external_id", externalId).maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

/** Comments on a Reels clip, newest first. */
export async function getReelComments(clipId: string, userId: string | null) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_FIELDS)
    .eq("reel_clip_id", clipId)
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return toPosts((data ?? []) as unknown as Row[], userId);
}

/** Feed posts that quote a Reels clip, newest first. */
export async function getReelQuotes(clipId: string, userId: string | null) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_FIELDS)
    .eq("quote_reel_id", clipId)
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return toPosts((data ?? []) as unknown as Row[], userId);
}

/** Comments on a bracket set, newest first. */
export async function getSetComments(setRefId: string, userId: string | null) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_FIELDS)
    .eq("set_ref_id", setRefId)
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return toPosts((data ?? []) as unknown as Row[], userId);
}

/** Feed posts that quote a bracket set, newest first. */
export async function getSetQuotes(setRefId: string, userId: string | null) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_FIELDS)
    .eq("quote_set_id", setRefId)
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return toPosts((data ?? []) as unknown as Row[], userId);
}

/** One post and its replies (oldest first), or null if missing / not visible. */
export async function getPostWithReplies(id: string, userId: string | null) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  // The post's own likes, reactions and poll only need its id: they load alongside the post (round 668).
  const mainExtras = postExtras([id], userId);
  mainExtras.catch(() => {}); // awaited below; this only keeps an early failure from going unhandled
  const [{ data: post }, { data: replies }] = await Promise.all([
    supabase.from("posts").select(POST_FIELDS).eq("id", id).maybeSingle(),
    // The newest 500 (a busy thread's latest replies matter most); the page sorts them itself.
    supabase.from("posts").select(POST_FIELDS).eq("parent_id", id).order("created_at", { ascending: false }).limit(500),
  ]);
  if (!post) return null;
  // The post and its replies are finished side by side (they used to wait for each other).
  const [[main], list] = await Promise.all([
    toPosts([post as unknown as Row], userId, mainExtras),
    toPosts((replies ?? []) as unknown as Row[], userId),
  ]);
  if (!main) return null;
  return { post: main, replies: list.reverse() };
}

export const THREADS_PAGE_SIZE = 25;

/**
 * Discussion threads for a board (a game, or all games): Hot, New, or Top for a time window, with an
 * optional flair. Hot looks at the last 30 days. Returns one page plus whether there's more.
 */
export async function getThreads(opts: {
  game?: FeedGame;
  flair?: Flair;
  noReplies?: boolean; // only threads nobody has replied to yet
  sort: ThreadSort;
  window?: TopWindow;
  page?: number;
  userId: string | null;
}): Promise<{ posts: Post[]; hasMore: boolean }> {
  const page = Math.max(0, opts.page ?? 0);
  warmMutes(opts.userId);
  const supabase = await createClient();
  let q = supabase.from("posts").select("id, created_at, like_count, reply_count").not("title", "is", null).is("parent_id", null).is("removed_at", null);
  if (opts.game) q = q.eq("game", opts.game);
  if (opts.flair) q = q.eq("flair", opts.flair);
  if (opts.noReplies) q = q.eq("reply_count", 0);
  const nowMs = Date.now();
  const since = (days: number) => new Date(nowMs - days * 86_400_000).toISOString();
  let ids: string[];
  let hasMore: boolean;
  if (opts.sort === "hot") {
    // A quiet board shouldn't look empty: after the last 30 days' threads come older ones, newest first.
    // Both lists are read at once (round 673; the older ones used to wait for the recent ones).
    let older = supabase.from("posts").select("id").not("title", "is", null).is("parent_id", null).is("removed_at", null).lte("created_at", since(30));
    if (opts.game) older = older.eq("game", opts.game);
    if (opts.flair) older = older.eq("flair", opts.flair);
    if (opts.noReplies) older = older.eq("reply_count", 0);
    const [{ data, error }, { data: old }] = await Promise.all([
      q.gt("created_at", since(30)).order("created_at", { ascending: false }).limit(400),
      older.order("created_at", { ascending: false }).limit(400),
    ]);
    if (error) throw error;
    const ranked = ((data ?? []) as { id: string; created_at: string; like_count: number | null; reply_count: number | null }[])
      .map((r) => ({ id: r.id, score: hotScore({ likeCount: r.like_count ?? 0, replyCount: r.reply_count ?? 0, createdAt: r.created_at }, nowMs) }))
      .sort((a, b) => b.score - a.score);
    ranked.push(...((old ?? []) as { id: string }[]).slice(0, 400 - ranked.length).map((r) => ({ id: r.id, score: 0 })));
    ids = ranked.slice(page * THREADS_PAGE_SIZE, (page + 1) * THREADS_PAGE_SIZE).map((r) => r.id);
    hasMore = ranked.length > (page + 1) * THREADS_PAGE_SIZE;
  } else {
    if (opts.sort === "top") {
      const days = { week: 7, month: 30, year: 365, all: 0 }[opts.window ?? "week"];
      if (days) q = q.gt("created_at", since(days));
      q = q.order("like_count", { ascending: false }).order("reply_count", { ascending: false }).order("created_at", { ascending: false });
    } else {
      q = q.order("created_at", { ascending: false });
    }
    const { data, error } = await q.range(page * THREADS_PAGE_SIZE, (page + 1) * THREADS_PAGE_SIZE);
    if (error) throw error;
    const rows = (data ?? []) as { id: string }[];
    ids = rows.slice(0, THREADS_PAGE_SIZE).map((r) => r.id);
    hasMore = rows.length > THREADS_PAGE_SIZE;
  }
  return { posts: await withoutMuted(await getPostsByIds(ids, opts.userId), opts.userId), hasMore };
}

/** Threads and posts tagged with a matchup (either side's point of view), most liked first. */
export async function getMatchupPosts(game: FeedGame, a: string, b: string, userId: string | null, limit = 20): Promise<Post[]> {
  warmMutes(userId);
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("id")
    .eq("game", game)
    .is("parent_id", null)
    .is("removed_at", null)
    .or(`and(character.eq.${a},vs_character.eq.${b}),and(character.eq.${b},vs_character.eq.${a})`)
    .order("like_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return withoutMuted(await getPostsByIds((data ?? []).map((r) => r.id as string), userId), userId);
}
