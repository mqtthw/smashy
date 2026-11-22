"use client";

// A tweet linked in a post, as a Smashy-made card (round 622): who posted it, the words, the first photo
// or a video's picture, and the date. The whole card opens the tweet on X. No script from X runs here.
// While it loads, a grey placeholder; if X doesn't answer, the plain link card.
import { useEffect, useRef, useState } from "react";
import EmbedPlayer from "@/components/highlights/EmbedPlayer";
import { Bone } from "@/components/ui/Skeleton";
import { useLang, useT } from "@/lib/i18n/client";
import type { TweetCard } from "@/lib/tweetCard";
import NewTab from "@/components/ui/NewTab";

export default function TweetEmbed({ id, href }: { id: string; href: string }) {
  const [tweet, setTweet] = useState<TweetCard | null | undefined>(undefined);
  const t = useT();
  const lang = useLang();

  // Asked for only when the card nears the screen: posts in the Feed's hidden game tabs and far down
  // the list don't each ask X (round 630).
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let live = true;
    const load = () =>
      fetch(`/api/tweet/${id}`)
        .then((r) => r.json() as Promise<{ tweet: TweetCard | null }>)
        .then((d) => live && setTweet(d.tweet ?? null))
        .catch(() => live && setTweet(null));
    const seen = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        seen.disconnect();
        void load();
      }
    }, { rootMargin: "800px 0px" });
    seen.observe(el);
    return () => {
      live = false;
      seen.disconnect();
    };
  }, [id]);

  if (tweet === undefined) {
    return (
      <div ref={box} aria-hidden="true" className="flex flex-col gap-2 rounded-xl border border-line p-3">
        <div className="flex items-center gap-2">
          <Bone className="size-9 rounded-full" />
          <Bone className="h-4 w-32" />
        </div>
        <Bone className="h-4 w-full" />
        <Bone className="h-4 w-2/3" />
      </div>
    );
  }
  if (!tweet) return <EmbedPlayer embed={{ kind: "link", provider: "X", href, host: "x.com" }} />;

  const date = tweet.createdAt ? new Date(tweet.createdAt) : null;
  const pic = tweet.picture;
  return (
    <a href={href} target="_blank" rel="nofollow ugc noopener noreferrer" className="block rounded-xl border border-line p-3 hover:bg-surface">
      <span className="flex items-center gap-2">
        {tweet.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tweet.avatar} alt="" width={36} height={36} loading="lazy" className="size-9 shrink-0 rounded-full bg-surface-2 object-cover" />
        ) : (
          <span className="size-9 shrink-0 rounded-full bg-surface-2" />
        )}
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate font-bold">{tweet.name}</span>
          <span className="block truncate text-meta text-muted">@{tweet.handle}</span>
        </span>
        <span aria-hidden="true" className="shrink-0 text-lg font-bold text-muted">𝕏</span>
      </span>
      {tweet.text && <span className="mt-2 block whitespace-pre-line break-words text-sm">{tweet.text}</span>}
      {pic && (
        <span className="relative mt-2 block overflow-hidden rounded-lg bg-surface-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pic.url} alt="" width={pic.width} height={pic.height} loading="lazy" decoding="async" className="max-h-[28rem] w-full object-cover" />
          {pic.video && (
            <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-black/60 pl-1 text-2xl text-white">▶</span>
            </span>
          )}
        </span>
      )}
      <span className="mt-2 flex items-center justify-between gap-2 text-meta text-muted">
        <span>{date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString(lang, { month: "short", day: "numeric", year: "numeric" }) : ""}</span>
        <span>{pic?.video ? t("media.hl.watchOn", { provider: "X" }) : t("media.hl.open")}<NewTab /></span>
      </span>
    </a>
  );
}
