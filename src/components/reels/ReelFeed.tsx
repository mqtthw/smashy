"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import Form from "next/form";
import Link from "next/link";
import { clipUrl, embedUrl, platformName } from "@/lib/reelLinks";
import type { Reel } from "@/lib/reels";
import { GAMES, type GameKey } from "@/lib/games";
import { YouTubeNotice } from "./ClipEmbed";
import LiveReportButton from "@/components/play/LiveReportButton";
import ShareButton from "@/components/ui/ShareButton";
import { myLikedClipIds, mySavedClipIds, toggleReelLike, toggleSavedClip } from "@/app/reels/actions";
import { toggleLike } from "@/app/feed-actions";
import { runAction, showToast } from "@/components/ui/Toaster";
import TranslateButton from "@/components/ui/TranslateButton";
import ReelAge from "./ReelAge";
import { useLang, useT } from "@/lib/i18n/client";
import type { Lang, MessageKey, Values } from "@/lib/i18n/base";
import SignInLink from "@/components/ui/SignInLink";
import NewTab from "@/components/ui/NewTab";

type TFn = (key: MessageKey, values?: Values) => string;

const noop = () => () => {};

// Clips watched on this device, oldest first. Kept only in this browser; the ids are sent with each
// batch request so watched clips come last (they're public clip ids, nothing about the viewer).
const SEEN_KEY = "smashy-reels-seen";
const MAX_SEEN = 300;
const WATCHED_AFTER_MS = 2000; // on screen this long counts as watched (not just scrolled past)
const HINT_KEY = "smashy-reels-hint"; // the "swipe up" hint shows until someone moves to a second clip
const SOUND_KEY = "smashy-reels-sound"; // "0" = this person turned sound off

function readSeen(): string[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function markSeen(clipId: string) {
  try {
    const next = [...readSeen().filter((id) => id !== clipId), clipId].slice(-MAX_SEEN);
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(next));
  } catch {
    // storage blocked (private mode): just don't remember
  }
}

const compactEn = new Intl.NumberFormat("en-US", { notation: "compact" });
const compactEs = new Intl.NumberFormat("es", { notation: "compact" });
const compactJa = new Intl.NumberFormat("ja-JP", { notation: "compact" });
const compactFr = new Intl.NumberFormat("fr-FR", { notation: "compact" });
const compactFor = (lang: Lang) => (lang === "es" ? compactEs : lang === "ja" ? compactJa : lang === "fr" ? compactFr : compactEn);

function vodTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h${String(m).padStart(2, "0")}m${String(s % 60).padStart(2, "0")}s`;
}

/** One round button in the clip's action row, with a small label or count under it. */
function Action({ label, count, children }: { label: string; count?: string; children: React.ReactNode }) {
  return (
    <span className="flex flex-col items-center gap-0.5 text-[11px] font-semibold text-white/80">
      {children}
      <span aria-hidden="true">{count ?? label}</span>
    </span>
  );
}
const roundBtn = "flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 active:scale-95";

/** The ⋯ menu: watch the full set, open on Twitch/YouTube, report. */
function MoreMenu({ reel, signedIn, active }: { reel: Reel; signedIn: boolean; active: boolean }) {
  const t = useT();
  const ref = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!active && ref.current) ref.current.open = false; // moved to another clip
  }, [active]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) ref.current.open = false;
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);
  return (
    <details ref={ref} className="relative" onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary className={`${roundBtn} cursor-pointer list-none [&::-webkit-details-marker]:hidden`} aria-label={t("media.reels.more")}>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
      </summary>
      <div className="absolute bottom-12 right-0 z-30 flex w-56 flex-col gap-1 rounded-xl border border-white/10 bg-neutral-900 p-2 text-sm text-white shadow-xl">
        {reel.post ? (
          // A video from a post: everything (replies, reporting) happens on the post.
          <Link href={`/post/${reel.post.id}`} className="rounded-lg px-3 py-2 hover:bg-white/10">{t("media.reels.openPost")}</Link>
        ) : (<>
        {reel.videoId && reel.vodOffset !== null && (
          <a href={`https://www.twitch.tv/videos/${reel.videoId}?t=${vodTime(Math.max(0, reel.vodOffset - 60))}`} target="_blank" rel="noopener noreferrer" className="rounded-lg px-3 py-2 hover:bg-white/10">
            {t("media.reels.watchFullSet")}
          <NewTab /></a>
        )}
        <a href={clipUrl({ platform: reel.platform === "youtube" ? "youtube" : "twitch", clipId: reel.clipId })} target="_blank" rel="noopener noreferrer" className="rounded-lg px-3 py-2 hover:bg-white/10">
          {t(reel.platform === "youtube" ? "media.reels.openYouTube" : "media.reels.openTwitch")}
        <NewTab /></a>
        <Link href={`/reels/${encodeURIComponent(reel.clipId)}`} className="rounded-lg px-3 py-2 hover:bg-white/10">{t("media.reels.clipPage")}</Link>
        {signedIn && (
          <span className="px-3 py-2">
            <LiveReportButton kind="reel" targetId={reel.clipId} above className="text-sm text-white/70 hover:text-white" />
          </span>
        )}
        </>)}
      </div>
    </details>
  );
}

type ItemProps = {
  reel: Reel;
  active: boolean;
  hostname: string | null;
  signedIn: boolean;
  liked: boolean;
  likedAtLoad: boolean; // already counted in reel.likes when it loaded
  saved: boolean;
  onLike: (liked: boolean) => void;
  onSave: (saved: boolean) => void;
  frameRef?: (el: HTMLIFrameElement | null) => void;
  sound: boolean;
  soundPress: number; // goes up each time someone presses the sound button / "Tap for sound"
  onEnded?: () => void; // a post's video finished playing
};

/** A video from a post, played by the browser itself (Smashy stores the file). */
function PostVideoPlayer({ src, poster, sound, title, onEnded }: { src: string; poster: string | null; sound: boolean; title: string; onEnded?: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  // React only sets "muted" when the element is created, so keep it in step with the sound button here.
  useEffect(() => {
    if (ref.current) ref.current.muted = !sound;
  }, [sound]);
  return (
    <video
      ref={ref}
      src={src}
      poster={poster ?? undefined}
      autoPlay
      muted={!sound}
      playsInline
      controls
      preload="auto"
      onEnded={onEnded}
      aria-label={title}
      className="h-full w-full bg-black object-contain"
    />
  );
}

/**
 * One clip, full screen: the player on a blurred copy of its own thumbnail, then the title and the
 * action row. Only the clip on screen loads a player (muted, autoplay); the rest show a still.
 */
function ReelItem({ reel, active, hostname, signedIn, liked: clipLiked, likedAtLoad: clipLikedAtLoad, saved, onLike, onSave, frameRef, sound, soundPress, onEnded }: ItemProps) {
  const t = useT();
  const compact = compactFor(useLang());
  const post = reel.post;
  const tall = reel.platform === "youtube" || (!!post && post.height > post.width);
  // A post's video: the heart likes the post itself.
  const [postLiked, setPostLiked] = useState(post?.likedByMe ?? false);
  const liked = post ? postLiked : clipLiked;
  const likedAtLoad = post ? post.likedByMe : clipLikedAtLoad;
  const pagePath = post ? `/post/${post.id}` : `/reels/${encodeURIComponent(reel.clipId)}`;
  // Twitch's player only takes "muted or not" when it loads, so changing it reloads the clip. Decide it
  // when the clip comes on screen, and again only when someone presses the sound button (not when sound
  // switches on by itself after their first tap, which would restart the clip).
  const [twitchMuted, setTwitchMuted] = useState(!sound);
  const [seen, setSeen] = useState({ active, soundPress });
  if (seen.active !== active || seen.soundPress !== soundPress) {
    setSeen({ active, soundPress });
    if (active) setTwitchMuted(!sound);
  }
  const likes = reel.likes + (liked ? 1 : 0) - (likedAtLoad ? 1 : 0);
  const like = async () => {
    const next = !liked;
    if (post) {
      setPostLiked(next);
      if (!(await runAction(() => toggleLike(post.id, next)))) setPostLiked(!next);
      return;
    }
    onLike(next);
    if (!(await runAction(() => toggleReelLike(reel.clipId, next)))) onLike(!next);
  };
  const save = async () => {
    const next = !saved;
    onSave(next);
    if (!(await runAction(() => toggleSavedClip(reel.clipId, next)))) onSave(!next);
  };

  return (
    // overflow-clip, not -hidden: the blurred backdrop is drawn 25% larger, and a "hidden" box can still be
    // scrolled by the browser, so tapping a report reason slid the whole clip sideways.
    <article className="relative flex h-full flex-col overflow-clip bg-neutral-950 text-white" aria-label={reel.title || t("media.reels.clip")}>
      {/* Blurred backdrop from the clip's own thumbnail, so wide clips don't float in empty space. */}
      {reel.thumbnailUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={reel.thumbnailUrl} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover opacity-35 blur-2xl" />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" aria-hidden="true" />

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pt-14 md:px-16">
        <div className={`relative overflow-hidden rounded-xl bg-black shadow-2xl ring-1 ring-white/10 ${tall ? "aspect-[9/16] h-full max-h-[62dvh] max-w-full" : "aspect-video w-full"}`}>
          {active && post ? (
            <PostVideoPlayer src={post.videoUrl} poster={reel.thumbnailUrl} sound={sound} title={reel.title || t("media.reels.clip")} onEnded={onEnded} />
          ) : active && hostname && reel.platform !== "smashy" ? (
            <iframe
              ref={frameRef}
              // Twitch starts with sound when it's on. YouTube always starts muted and is unmuted through
              // its player, so switching sound doesn't restart the Short.
              src={embedUrl({ platform: reel.platform, clipId: reel.clipId }, hostname, true, true, reel.platform === "youtube" || twitchMuted)}
              title={reel.title || t("media.reels.frameTitle", { platform: platformName(reel.platform) })}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
              className="h-full w-full"
            />
          ) : reel.thumbnailUrl ? (
            // Twitch's or YouTube's own thumbnail (a plain image request, not optimized through Next)
            // eslint-disable-next-line @next/next/no-img-element
            <img src={reel.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : null}
        </div>
      </div>

      <div className="relative flex flex-col gap-3 px-4 pb-4 pt-3 md:px-16">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="line-clamp-2 text-lg font-bold leading-snug drop-shadow">{reel.title || t("media.reels.untitled")}</h2>
          {reel.title && <TranslateButton text={reel.title} source={{ kind: "reel", id: reel.clipId }} tone="dark" />}
          <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-white/75">
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold text-white">{GAMES[reel.game].short}</span>
            {post ? (
              <>
                <Link href={`/u/${post.authorHandle}`} className="font-semibold text-white/90 hover:underline">{reel.channelName ?? reel.channelLogin}</Link>
                <span>· {t("media.reels.fromPost")}</span>
              </>
            ) : (
              <>
                <span className="font-semibold text-white/90">{reel.channelName ?? reel.channelLogin}</span>
                <span>· {t("media.reels.views", { n: reel.views, count: compact.format(reel.views) })}</span>
              </>
            )}
            <ReelAge at={reel.createdAt} />
            {reel.sharedBy && (
              <span>
                · {t("media.reels.sharedBy")} <Link href={`/u/${reel.sharedBy.handle}`} className="font-semibold text-white hover:underline">{reel.sharedBy.tag}</Link>
              </span>
            )}
          </p>
        </div>
        <div className="flex items-start justify-between gap-2">
          <Action label={t("media.reels.like")} count={likes > 0 ? compact.format(likes) : t("media.reels.like")}>
            {signedIn ? (
              <button type="button" onClick={like} aria-pressed={liked} aria-label={t(liked ? "media.reels.unlike" : "media.reels.like")} className={roundBtn}>
                <svg viewBox="0 0 24 24" aria-hidden="true" className={`h-6 w-6 ${liked ? "fill-like stroke-like" : "fill-none stroke-current"}`} strokeWidth={2}>
                  <path d="M12 21s-7.5-4.6-9.5-9.3C1.2 8.4 3.3 5 6.8 5c2 0 3.4 1.1 4.2 2.4C11.8 6.1 13.2 5 15.2 5c3.5 0 5.6 3.4 4.3 6.7C19.5 16.4 12 21 12 21z" />
                </svg>
              </button>
            ) : (
              <SignInLink aria-label={t("media.reels.signInToLike")} className={roundBtn}>
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-none stroke-current" strokeWidth={2}>
                  <path d="M12 21s-7.5-4.6-9.5-9.3C1.2 8.4 3.3 5 6.8 5c2 0 3.4 1.1 4.2 2.4C11.8 6.1 13.2 5 15.2 5c3.5 0 5.6 3.4 4.3 6.7C19.5 16.4 12 21 12 21z" />
                </svg>
              </SignInLink>
            )}
          </Action>
          <Action label={t("media.reels.comment")} count={reel.comments > 0 ? compact.format(reel.comments) : t("media.reels.comment")}>
            <Link href={pagePath} aria-label={t("media.reels.commentsCount", { n: reel.comments })} className={roundBtn}>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-none stroke-current" strokeWidth={2}><path d="M4 5h16v11H8l-4 4z" /></svg>
            </Link>
          </Action>
          {!post && <Action label={t(saved ? "media.reels.saved" : "media.reels.save")}>
            {signedIn ? (
              <button type="button" onClick={save} aria-pressed={saved} aria-label={t(saved ? "media.reels.unsave" : "media.reels.saveClip")} className={roundBtn}>
                <svg viewBox="0 0 24 24" aria-hidden="true" className={`h-6 w-6 stroke-current ${saved ? "fill-current" : "fill-none"}`} strokeWidth={2}><path d="M6 3h12v18l-6-4-6 4z" /></svg>
              </button>
            ) : (
              <SignInLink aria-label={t("media.reels.signInToSave")} className={roundBtn}>
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-none stroke-current" strokeWidth={2}><path d="M6 3h12v18l-6-4-6 4z" /></svg>
              </SignInLink>
            )}
          </Action>}
          <Action label={t("media.reels.share")}>
            <ShareButton path={pagePath} title={reel.title || "A clip on Smashy"} label={t("media.reels.shareClip")} className={roundBtn} />
          </Action>
          <Action label={t("media.reels.more")}>
            <MoreMenu reel={reel} signedIn={signedIn} active={active} />
          </Action>
        </div>
        {reel.platform === "youtube" && (
          <div className="text-white/60 [&_a]:text-white/80">
            <YouTubeNotice />
          </div>
        )}
      </div>
    </article>
  );
}

/** "For you" plus one tab per game (each opens /reels?game=...). While searching, the tabs keep the search. */
function GameTabs({ games, current, query, t }: { games: GameKey[]; current: GameKey | null; query: string | null; t: TFn }) {
  const href = (g: GameKey | null) => {
    const p = new URLSearchParams();
    if (g) p.set("game", g);
    if (query) p.set("q", query);
    const qs = p.toString();
    return qs ? `/reels?${qs}` : "/reels";
  };
  const tab = (active: boolean) =>
    `shrink-0 rounded-full px-3 py-1 text-sm font-semibold backdrop-blur transition ${active ? "bg-white text-black" : "bg-black/40 text-white/85 hover:bg-black/60"}`;
  return (
    <nav aria-label={t("media.reels.chooseGame")} className="flex min-w-0 gap-1.5 overflow-x-auto [scrollbar-width:none]">
      <Link href={href(null)} className={tab(current === null)} aria-current={current === null ? "page" : undefined}>{t(query ? "media.reels.allGames" : "media.reels.forYou")}</Link>
      {games.map((g) => (
        <Link key={g} href={href(g)} className={tab(current === g)} aria-current={current === g ? "page" : undefined}>
          {GAMES[g].short}
        </Link>
      ))}
    </nav>
  );
}

export default function ReelFeed({
  initial,
  hasMore: initialHasMore,
  loadMore,
  signedIn = false,
  games = [],
  game = null,
  query = null,
}: {
  initial: Reel[];
  hasMore: boolean;
  loadMore: (offset: number, seen: string[], game: string | null, query: string | null) => Promise<{ reels: Reel[]; hasMore: boolean }>;
  signedIn?: boolean;
  games?: GameKey[];
  game?: GameKey | null;
  query?: string | null; // search results (round 713) instead of the usual feed
}) {
  const t = useT();
  const [searchOpen, setSearchOpen] = useState(false);
  const [reels, setReels] = useState<Reel[]>(initial);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  // Likes already counted in each clip's number when it loaded (so the count doesn't jump).
  const [likedAtLoad, setLikedAtLoad] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!signedIn) return;
    void mySavedClipIds().then((ids) => setSavedIds(new Set(ids))).catch(() => {});
    void myLikedClipIds()
      .then((ids) => {
        setLikedAtLoad(new Set(ids));
        setLikedIds(new Set(ids));
      })
      .catch(() => {});
  }, [signedIn]);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [active, setActive] = useState(0);
  // Next.js keeps a page you leave alive but hidden (React Activity), so a playing clip kept its sound
  // going after you left Reels (round 503). Hidden = no clip is active: its player goes away, and the
  // clip loads again when you come back. The cleanup runs as the page is hidden; the setup runs again
  // when it's shown. (The pattern in Next's "preserving UI state" guide.)
  const [shown, setShown] = useState(true);
  useLayoutEffect(() => {
    setShown(true); // eslint-disable-line react-hooks/set-state-in-effect -- shown again after being hidden
    return () => setShown(false);
  }, []);
  // The "swipe up" hint: for people who have never moved past the first clip.
  const hintSeen = useSyncExternalStore(noop, () => {
    try {
      return !!window.localStorage.getItem(HINT_KEY);
    } catch {
      return true;
    }
  }, () => true);
  const [moved, setMoved] = useState(false);
  const hint = !hintSeen && !moved;
  // The server picks the first clips before it knows what this device watched. If any of them were
  // watched already, swap in a reordered first batch before playing anything.
  const [ready, setReady] = useState(false);
  // What was watched when the page opened. It stays the same while scrolling, so every batch is
  // cut from the same order (clips watched during this visit are already on screen anyway).
  const seenAtStart = useRef<string[]>([]);
  const loading = useRef(false);
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement | null>(null);
  // Twitch only plays embeds when told which site they're on ("parent"); that's known in the browser.
  const hostname = useSyncExternalStore(noop, () => window.location.hostname, () => null);

  // Sound: on by default, but browsers only allow it after the person has tapped, clicked, swiped or
  // pressed a key on the page. Until then clips play muted. Turning it off is remembered on this device.
  const soundPref = useSyncExternalStore(
    (cb) => {
      window.addEventListener("smashy:reels-sound", cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener("smashy:reels-sound", cb);
        window.removeEventListener("storage", cb);
      };
    },
    () => {
      try {
        return window.localStorage.getItem(SOUND_KEY) !== "0";
      } catch {
        return true;
      }
    },
    () => true,
  );
  const setSoundPref = (on: boolean) => {
    try {
      window.localStorage.setItem(SOUND_KEY, on ? "1" : "0");
    } catch {}
    window.dispatchEvent(new Event("smashy:reels-sound"));
  };
  const [activated, setActivated] = useState(false);
  const [soundPress, setSoundPress] = useState(0);
  useEffect(() => {
    const check = () => {
      if ((navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive) setActivated(true);
    };
    const on = () => setActivated(true);
    // A tap inside the player counts too, but only shows up through navigator.userActivation.
    const t = setInterval(check, 700);
    window.addEventListener("pointerdown", on);
    window.addEventListener("keydown", on);
    window.addEventListener("touchend", on);
    return () => {
      clearInterval(t);
      window.removeEventListener("pointerdown", on);
      window.removeEventListener("keydown", on);
      window.removeEventListener("touchend", on);
    };
  }, []);
  const sound = soundPref && activated;
  const soundRef = useRef(sound);
  useEffect(() => {
    soundRef.current = sound;
  });

  // Which clips are in the list (the observer below re-attaches whenever this changes, including when
  // the first batch is swapped for a reordered one of the same length).
  const reelIds = reels.map((r) => r.clipId).join(",");

  const goTo = useCallback((i: number) => {
    const el = box.current?.querySelector<HTMLElement>(`[data-index="${i}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Which clip is on screen: the one at least 60% visible.
  useEffect(() => {
    const root = box.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = Number((e.target as HTMLElement).dataset.index);
          setActive(i);
          if (i > 0) setMoved(true);
        }
      },
      { root, threshold: 0.6 },
    );
    root.querySelectorAll<HTMLElement>("[data-index]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [reelIds]);

  useEffect(() => {
    const seen = readSeen();
    seenAtStart.current = seen;
    const seenSet = new Set(seen);
    const needsReorder = !query && initial.some((r) => seenSet.has(r.clipId)); // search results keep their order
    let cancelled = false;
    loading.current = true;
    (needsReorder ? loadMore(0, seen, game, null) : Promise.resolve(null))
      .then((first) => {
        if (cancelled || !first) return;
        setReels(first.reels);
        setHasMore(first.hasMore);
      })
      .catch(() => {}) // keep the original order
      .finally(() => {
        loading.current = false;
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [initial, loadMore, game, query]);

  // A clip that stays on screen for a couple of seconds counts as watched; moving on hides the hint.
  const activeId = ready ? reels[active]?.clipId : undefined;
  useEffect(() => {
    if (!activeId) return;
    const t = setTimeout(() => markSeen(activeId), WATCHED_AFTER_MS);
    return () => clearTimeout(t);
  }, [activeId]);
  useEffect(() => {
    if (!moved) return;
    try {
      window.localStorage.setItem(HINT_KEY, "1");
    } catch {}
  }, [moved]);

  // YouTube Shorts: move to the next clip when one ends. (Twitch's clip player can't tell us that.)
  // The player only reports its state once told someone is listening, so the "listening" message is
  // sent a few times until it answers. If the Short ends with no clip after it, it plays again; and if
  // the player never answers at all, Reels moves on after the Short's length (so it can't sit frozen).
  const heard = useRef(false);
  const ytCommand = (func: string, args: unknown[] = []) =>
    frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");
  const onShortEnded = useCallback(() => {
    if (active + 1 < reels.length) goTo(active + 1);
    else {
      ytCommand("seekTo", [0, true]);
      ytCommand("playVideo");
    }
  }, [active, reels.length, goTo]);
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!/^https:\/\/www\.youtube(-nocookie)?\.com$/.test(e.origin) || typeof e.data !== "string") return;
      if (e.source !== frame.current?.contentWindow) return; // only the clip on screen
      try {
        const msg = JSON.parse(e.data) as { event?: string; info?: unknown };
        if (!heard.current && soundRef.current) ytCommand("unMute"); // first word from the player: turn sound on
        heard.current = true;
        const state = msg.event === "onStateChange" ? msg.info : msg.event === "infoDelivery" ? (msg.info as { playerState?: number } | null)?.playerState : undefined;
        if (state === 0) onShortEnded();
      } catch {}
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onShortEnded]);
  const current = ready ? reels[active] : undefined;
  // Sound switched on or off while a Short is playing.
  useEffect(() => {
    if (current?.platform === "youtube") ytCommand(sound ? "unMute" : "mute");
  }, [sound, current]);
  useEffect(() => {
    heard.current = false;
    if (!current || current.platform !== "youtube") return;
    const hello = () => {
      if (!heard.current) frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*");
    };
    const timers = [500, 1500, 3000, 6000].map((ms) => setTimeout(hello, ms));
    // Safety net: no word from the player at all -> move on once the Short should be over.
    const length = (current.duration && current.duration > 0 ? current.duration : 60) + 5;
    timers.push(setTimeout(() => {
      if (!heard.current && active + 1 < reels.length) goTo(active + 1);
    }, length * 1000));
    return () => timers.forEach(clearTimeout);
  }, [current, active, reels.length, goTo]);
  // Also say hello as soon as the player has loaded.
  const listenToYouTube = useCallback((el: HTMLIFrameElement | null) => {
    frame.current = el;
    if (!el || !el.src.includes("youtube")) return;
    el.addEventListener("load", () => el.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*"));
  }, []);

  // Desktop: arrow keys / J and K move between clips.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey) return; // Ctrl+J, Ctrl+K... belong to the browser
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable || t.closest("details, nav, select"))) return;
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        goTo(active + 1);
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        goTo(Math.max(0, active - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, goTo]);

  const more = useCallback(async () => {
    if (loading.current || !hasMore || !ready) return;
    loading.current = true;
    try {
      const next = await loadMore(reels.length, seenAtStart.current, game, query);
      setReels((cur) => [...cur, ...next.reels.filter((r) => !cur.some((c) => c.clipId === r.clipId))]);
      setHasMore(next.hasMore);
    } catch {
      showToast(t("media.reels.loadMoreFailed"));
    } finally {
      loading.current = false;
    }
  }, [hasMore, loadMore, reels.length, ready, game, query, t]);

  // Load the next batch a few clips before the end.
  useEffect(() => {
    if (active >= reels.length - 3) void more();
  }, [active, reels.length, more]);

  const roundTop = "pointer-events-auto shrink-0 rounded-full bg-white/15 p-1.5 text-white backdrop-blur hover:bg-white/25";
  const searchIcon = <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current" strokeWidth={2}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>;
  const clearHref = game ? `/reels?game=${game}` : "/reels";
  const topBar = (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-2 bg-gradient-to-b from-black/70 to-transparent px-3 pb-6 pt-3">
    <div className="flex items-center gap-2">
      <h1 className="sr-only">{t("media.reels.heading")}</h1>
      {searchOpen ? (
        // Search: player tags, characters, channels (the words in clip titles and channel names).
        <Form action="/reels" role="search" className="pointer-events-auto flex min-w-0 flex-1 items-center gap-1.5 rounded-full bg-black/60 py-1 pl-3 pr-1 ring-1 ring-white/25 backdrop-blur" onSubmit={() => setSearchOpen(false)}>
          {game && <input type="hidden" name="game" value={game} />}
          <input
            name="q"
            type="search"
            required
            autoFocus
            maxLength={60}
            defaultValue={query ?? ""}
            enterKeyHint="search"
            placeholder={t("media.reels.searchPlaceholder")}
            aria-label={t("media.reels.searchLabel")}
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/50"
          />
          <button type="submit" aria-label={t("media.reels.searchGo")} className="shrink-0 rounded-full bg-white/15 p-1 text-white hover:bg-white/25">{searchIcon}</button>
          <button type="button" onClick={() => setSearchOpen(false)} aria-label={t("media.reels.searchClose")} className="shrink-0 rounded-full p-1 text-white/80 hover:bg-white/15">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current" strokeWidth={2}><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </Form>
      ) : (<>
      <div className="pointer-events-auto min-w-0 flex-1">
        <GameTabs games={games} current={game} query={query} t={t} />
      </div>
      <button type="button" onClick={() => setSearchOpen(true)} aria-label={t("media.reels.searchLabel")} title={t("media.reels.searchLabel")} className={roundTop}>
        {searchIcon}
      </button>
      <button
        type="button"
        onClick={() => {
          setSoundPress((n) => n + 1);
          if (sound) setSoundPref(false);
          else {
            setActivated(true); // this click is the interaction browsers need
            setSoundPref(true);
          }
        }}
        aria-pressed={sound}
        aria-label={t(sound ? "media.reels.soundOnAria" : "media.reels.soundOffAria")}
        title={t(sound ? "media.reels.soundOn" : "media.reels.soundOff")}
        className={roundTop}
      >
        {sound ? (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current" strokeWidth={2}><path d="M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current" strokeWidth={2}><path d="M4 9h4l5-4v14l-5-4H4zM17 9l5 6M22 9l-5 6" /></svg>
        )}
      </button>
      <Link href="/reels/share" className="pointer-events-auto shrink-0 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-white backdrop-blur hover:bg-white/25">
        {t("media.reels.shareButton")}
      </Link>
      </>)}
    </div>
    {query && !searchOpen && (
      <div className="pointer-events-auto flex max-w-full items-center gap-2 self-start rounded-full bg-black/60 py-1 pl-3 pr-1 text-sm text-white ring-1 ring-white/20 backdrop-blur">
        <button type="button" onClick={() => setSearchOpen(true)} className="min-w-0 truncate text-left">
          {t("media.reels.searchResults", { q: query })}
        </button>
        <Link href={clearHref} aria-label={t("media.reels.searchClear")} className="shrink-0 rounded-full p-1 text-white/80 hover:bg-white/15">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current" strokeWidth={2.5}><path d="M6 6l12 12M18 6L6 18" /></svg>
        </Link>
      </div>
    )}
    </div>
  );

  if (!reels.length) {
    return (
      <div className="relative flex h-[calc(100dvh-5rem-env(safe-area-inset-bottom))] flex-col items-center justify-center gap-3 bg-neutral-950 px-6 text-center text-white md:h-dvh">
        {topBar}
        {query ? (<>
          <p className="text-lg font-bold">{t("media.reels.searchNone", { q: query })}</p>
          <p className="text-sm text-white/70">{t("media.reels.searchNoneBody")}</p>
          <Link href={clearHref} className="btn btn-md btn-primary">{t("media.reels.searchBack")}</Link>
        </>) : (<>
        <p className="text-lg font-bold">{t("media.reels.noneTitle")}</p>
        <p className="text-sm text-white/70">{t("media.reels.noneBody")}</p>
        <Link href="/reels/share" className="btn btn-md btn-primary">{t("media.reels.shareAClip")}</Link>
        </>)}
      </div>
    );
  }

  return (
    <div className="relative bg-neutral-950">
      {topBar}
      <div
        ref={box}
        tabIndex={0}
        aria-label={t("media.reels.feedAria")}
        className="h-[calc(100dvh-5rem-env(safe-area-inset-bottom))] snap-y snap-mandatory overflow-y-scroll overscroll-contain outline-none [scrollbar-width:none] md:h-dvh"
      >
        {reels.map((r, i) => (
          <div key={r.clipId} data-index={i} className="h-full snap-start snap-always">
            <ReelItem
              reel={r}
              likedAtLoad={likedAtLoad.has(r.clipId)}
              active={ready && shown && i === active}
              hostname={hostname}
              signedIn={signedIn}
              liked={likedIds.has(r.clipId)}
              saved={savedIds.has(r.clipId)}
              frameRef={ready && i === active ? listenToYouTube : undefined}
              sound={sound}
              soundPress={soundPress}
              onEnded={() => (i + 1 < reels.length ? goTo(i + 1) : undefined)}
              onLike={(on) => setLikedIds((cur) => {
                const next = new Set(cur);
                if (on) next.add(r.clipId);
                else next.delete(r.clipId);
                return next;
              })}
              onSave={(on) => setSavedIds((cur) => {
                const next = new Set(cur);
                if (on) next.add(r.clipId);
                else next.delete(r.clipId);
                return next;
              })}
            />
          </div>
        ))}
        {!hasMore && (
          <div className="flex h-full snap-start flex-col items-center justify-center gap-2 px-6 text-center text-white">
            <p className="text-lg font-bold">{t(query ? "media.reels.searchEnd" : "media.reels.caughtUp")}</p>
            <p className="text-sm text-white/70">{t("media.reels.caughtUpBody")}</p>
            <Link href={query ? clearHref : "/reels/share"} className="btn btn-sm btn-primary mt-2">{t(query ? "media.reels.searchBack" : "media.reels.shareAClip")}</Link>
          </div>
        )}
      </div>

      {/* Desktop: previous / next buttons beside the clip. */}
      <div className="absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-2 md:flex">
        <button type="button" onClick={() => goTo(Math.max(0, active - 1))} disabled={active === 0} aria-label={t("media.reels.prev")} className="rounded-full bg-white/15 p-2 text-white backdrop-blur hover:bg-white/25 disabled:opacity-30">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current" strokeWidth={2.5}><path d="M6 15l6-6 6 6" /></svg>
        </button>
        <button type="button" onClick={() => goTo(active + 1)} aria-label={t("media.reels.next")} className="rounded-full bg-white/15 p-2 text-white backdrop-blur hover:bg-white/25">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current" strokeWidth={2.5}><path d="M6 9l6 6 6-6" /></svg>
        </button>
      </div>

      {soundPref && !activated && ready && (
        <button
          type="button"
          onClick={() => {
            setActivated(true);
            setSoundPress((n) => n + 1);
          }}
          className={`absolute left-1/2 ${query ? "top-28" : "top-16"} z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/70 px-4 py-2 text-sm font-semibold text-white shadow-lg ring-1 ring-white/20 backdrop-blur`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current" strokeWidth={2}><path d="M4 9h4l5-4v14l-5-4H4zM17 9l5 6M22 9l-5 6" /></svg>
          {t("media.reels.tapForSound")}
        </button>
      )}

      {hint && ready && reels.length > 1 && (
        <button
          type="button"
          onClick={() => goTo(1)}
          className="absolute bottom-40 left-1/2 z-20 flex -translate-x-1/2 animate-bounce items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-black shadow-lg"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current" strokeWidth={2.5}><path d="M6 15l6-6 6 6" /></svg>
          {t("media.reels.swipeHint")}
        </button>
      )}
    </div>
  );
}
