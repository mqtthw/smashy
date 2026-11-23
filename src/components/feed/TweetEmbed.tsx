"use client";

// A tweet linked in a post, as a Smashy-made card (round 622): who posted it, the words, the first photo
// or a video's picture, and the date. The whole card opens the tweet on X. No script from X runs here.
// While it loads, a grey placeholder; if X doesn't answer, the plain link card.
// Round 720: a tweet with a video has a play button. Pressing it swaps the card for X's own embedded
// tweet (an iframe), where the video plays without leaving Smashy. Nothing from X loads until that
// press, so the Feed stays as light as before. (X's video files can't be played directly: its video
// server refuses other sites.)
import { useEffect, useRef, useState } from "react";
import EmbedPlayer from "@/components/highlights/EmbedPlayer";
import { Bone } from "@/components/ui/Skeleton";
import { useLang, useT } from "@/lib/i18n/client";
import type { TweetCard } from "@/lib/tweetCard";
import NewTab from "@/components/ui/NewTab";
import { usePageShown } from "@/lib/usePageShown";

export default function TweetEmbed({ id, href }: { id: string; href: string }) {
  const [tweet, setTweet] = useState<TweetCard | null | undefined>(undefined);
  const [playing, setPlaying] = useState(false);
  usePageShown(() => setPlaying(false)); // leaving the page stops the video (back to the card)
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
  const dateText = date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString(lang, { month: "short", day: "numeric", year: "numeric" }) : "";
  const linkProps = { href, target: "_blank", rel: "nofollow ugc noopener noreferrer" } as const;
  if (playing) return <XPlayer id={tweet.id} title={t("media.hl.tweetBy", { name: tweet.name })} />;
  const head = (
    <>
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
    </>
  );

  // A video: the card isn't one big link (a button can't sit inside a link). The picture is the play
  // button; the top and the bottom line still open the tweet on X.
  if (pic?.video) {
    return (
      <div className="rounded-xl border border-line p-3">
        <a {...linkProps} className="block rounded-lg hover:bg-surface">{head}</a>
        <button type="button" onClick={() => setPlaying(true)} aria-label={t("media.hl.playVideo")} className="relative mt-2 block w-full overflow-hidden rounded-lg bg-surface-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pic.url} alt="" width={pic.width} height={pic.height} loading="lazy" decoding="async" className="max-h-[28rem] w-full object-cover" />
          <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-black/60 pl-1 text-2xl text-white">▶</span>
          </span>
        </button>
        <a {...linkProps} className="mt-2 flex items-center justify-between gap-2 text-meta text-muted hover:text-foreground">
          <span>{dateText}</span>
          <span>{t("media.hl.watchOn", { provider: "X" })}<NewTab /></span>
        </a>
      </div>
    );
  }

  return (
    <a {...linkProps} className="block rounded-xl border border-line p-3 hover:bg-surface">
      {head}
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
        <span>{dateText}</span>
        <span>{pic?.video ? t("media.hl.watchOn", { provider: "X" }) : t("media.hl.open")}<NewTab /></span>
      </span>
    </a>
  );
}

/**
 * X's own embedded tweet, in an iframe (the same page X's embed script would create, without running
 * that script here). It tells its height by message; until then a guess. Dark or light to match Smashy.
 */
function XPlayer({ id, title }: { id: string; title: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(560);
  const [theme] = useState(() => {
    const chosen = document.documentElement.getAttribute("data-theme");
    return chosen === "light" || chosen === "dark" ? chosen : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== "https://platform.twitter.com" || e.source !== frame.current?.contentWindow) return;
      // { "twttr.embed": { method: "twttr.private.resize", params: [{ height }] } }
      const params = (e.data as { "twttr.embed"?: { method?: string; params?: { height?: number }[] } } | null)?.["twttr.embed"];
      const h = params?.method === "twttr.private.resize" ? params.params?.[0]?.height : undefined;
      if (typeof h === "number" && h > 100 && h < 3000) setHeight(Math.ceil(h));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
  return (
    <iframe
      ref={frame}
      src={`https://platform.twitter.com/embed/Tweet.html?id=${id}&dnt=true&theme=${theme}&hideThread=true`}
      title={title}
      height={height}
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
      className="w-full rounded-xl"
    />
  );
}
