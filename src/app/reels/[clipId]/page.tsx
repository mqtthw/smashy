import type { Metadata } from "next";
import { localeFor } from "@/lib/i18n/core";
import TranslateButton from "@/components/ui/TranslateButton";
import ClipLikeButton from "@/components/reels/ClipLikeButton";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import PostCard from "@/components/feed/PostCard";
import TalkComposer from "@/components/feed/TalkComposer";
import GameBadge from "@/components/GameBadge";
import ClipEmbed, { YouTubeNotice } from "@/components/reels/ClipEmbed";
import LiveReportButton from "@/components/play/LiveReportButton";
import ShareButton from "@/components/ui/ShareButton";
import { clipUrl } from "@/lib/reelLinks";
import { unixNow } from "@/lib/format";
import { getReelComments, getReelQuotes } from "@/lib/posts";
import { getReel } from "@/lib/reels";
import { ownPictureMeta } from "@/lib/siteMeta";
import { getUserId } from "@/lib/supabase/server";
import { twitchTime } from "@/lib/twitch";
import { postAboutReel } from "../actions";
import { ClipSkeleton } from "@/components/ui/Skeleton";
import { LangProvider } from "@/lib/i18n/client";
import { getLang, getT } from "@/lib/i18n/server";
import { signInPath } from "@/lib/returnTo";
import NewTab from "@/components/ui/NewTab";

async function load(props: PageProps<"/reels/[clipId]">) {
  const { clipId } = await props.params;
  return getReel(decodeURIComponent(clipId)).catch(() => null);
}

export async function generateMetadata(props: PageProps<"/reels/[clipId]">): Promise<Metadata> {
  const reel = await load(props);
  if (!reel) return { title: "Clip" };
  return ownPictureMeta(reel.title || "Clip", `A clip from ${reel.channelName ?? reel.channelLogin} on Smashy Reels.`);
}

async function ClipContent(props: PageProps<"/reels/[clipId]">) {
  // A video from a post (Reels mixes them in): its page is the post.
  const raw = decodeURIComponent((await props.params).clipId);
  if (/^post-[0-9a-f-]{36}$/.test(raw)) redirect(`/post/${raw.slice(5)}`);
  const reel = await load(props);
  if (!reel) notFound();
  const userId = await getUserId();
  const supabase = await createClient();
  const [comments, quotes, { data: myLike }, t, lang] = await Promise.all([
    getReelComments(reel.clipId, userId),
    getReelQuotes(reel.clipId, userId),
    userId ? supabase.from("reel_likes").select("clip_id").eq("user_id", userId).eq("clip_id", reel.clipId).maybeSingle() : Promise.resolve({ data: null }),
    getT(),
    getLang(),
  ]);
  const now = unixNow();

  return (
    <LangProvider lang={lang}>
    <article className="flex flex-col">
      <div className="flex flex-col gap-3 px-4 pt-4">
        <ClipEmbed clipId={reel.clipId} platform={reel.platform} title={reel.title} autoplay />
        <div className="flex flex-col gap-1">
          <h1 className="text-title font-bold">{reel.title || t("media.reels.untitled")}</h1>
          {reel.title && <TranslateButton text={reel.title} source={{ kind: "reel", id: reel.clipId }} />}
          <p className="flex flex-wrap items-center gap-x-2 text-meta text-muted">
            <GameBadge game={reel.game} />
            <span>{reel.channelName ?? reel.channelLogin}</span>
            <span>· {t("media.reels.views", { n: reel.views, count: new Intl.NumberFormat(localeFor(lang), { notation: "compact" }).format(reel.views) })}</span>
            {reel.sharedBy && (
              <span>
                · {t("media.reels.sharedBy")} <Link href={`/u/${reel.sharedBy.handle}`} className="font-semibold text-foreground hover:underline">{reel.sharedBy.tag}</Link>
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/reels" className="btn btn-sm btn-primary">{t("media.clip.keepWatching")}</Link>
          <ClipLikeButton clipId={reel.clipId} liked={!!myLike} count={reel.likes} signedIn={!!userId} />
          {reel.videoId && reel.vodOffset !== null && (
            <a
              href={`https://www.twitch.tv/videos/${reel.videoId}?t=${twitchTime(Math.max(0, reel.vodOffset - 60))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-outline"
            >
              {t("media.reels.watchFullSet")}
            <NewTab /></a>
          )}
          <ShareButton path={`/reels/${encodeURIComponent(reel.clipId)}`} title={reel.title || "A clip on Smashy"} label={t("media.reels.shareClip")} className="btn btn-sm btn-ghost" />
          <a href={clipUrl(reel)} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost">
            {t(reel.platform === "youtube" ? "media.clip.onYouTube" : "media.clip.onTwitch")}
          <NewTab /></a>
        </div>
        {reel.platform === "youtube" && <YouTubeNotice />}
        {userId && (
          <div className="flex justify-end">
            <LiveReportButton kind="reel" targetId={reel.clipId} />
          </div>
        )}
      </div>

      <section aria-labelledby="talk" className="mt-3 flex flex-col gap-3 border-t border-line px-4 py-4">
        <h2 id="talk" className="font-bold">{t("media.clip.talk")}</h2>
        {userId ? (
          <TalkComposer action={postAboutReel} hidden={{ clip_id: reel.clipId }} placeholder={t("media.clip.whatDoYouThink")} thing="clip" />
        ) : (
          <p className="text-muted"><Link href={signInPath(`/reels/${(await props.params).clipId}`)} className="link">{t("media.clip.join")}</Link> {t("media.clip.joinRest")}</p>
        )}
      </section>

      <section aria-label={t("media.clip.comments")} className="border-t border-line">
        {comments.length === 0 ? (
          <p className="p-4 text-muted">{t("media.clip.noComments")}</p>
        ) : (
          <div className="flex flex-col divide-y divide-line">
            {comments.map((p) => <div key={p.id}><PostCard post={p} now={now} viewerId={userId} /></div>)}
          </div>
        )}
      </section>

      {quotes.length > 0 && (
        <section aria-labelledby="shared" className="border-t border-line">
          <h2 id="shared" className="px-4 pt-4 font-bold">{t("media.clip.sharedOnFeeds")}</h2>
          <div className="flex flex-col divide-y divide-line">
            {quotes.map((p) => <div key={p.id}><PostCard post={p} now={now} viewerId={userId} /></div>)}
          </div>
        </section>
      )}
    </article>
    </LangProvider>
  );
}

export default function ClipPage(props: PageProps<"/reels/[clipId]">) {
  return (
    <section>
      <div className="px-4 pt-4">
        <Link href="/reels" className="text-meta text-muted hover:text-foreground">← Reels</Link>
      </div>
      <Suspense fallback={<ClipSkeleton />}>
        <ClipContent {...props} />
      </Suspense>
    </section>
  );
}
